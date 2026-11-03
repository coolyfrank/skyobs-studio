import os
import sys
import json
import time
import shutil
import socket
import threading
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Request, Response, BackgroundTasks, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from stream_engine import stream_engine
from tunnel_manager import tunnel_manager

# Paths
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
CONFIG_FILE = BASE_DIR / "config.json"
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

def get_local_ip() -> str:
    """Detects the primary LAN IPv4 address so phones on the same Wi-Fi can connect."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

app = FastAPI(title="SkyOBS Studio", description="OBS-style 4K YouTube Live Video Streamer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- CONFIGURATION MANAGEMENT ----------------- #
DEFAULT_CONFIG = {
    "rtmp_url": "rtmp://a.rtmp.youtube.com/live2",
    "stream_key": "",
    "loop_mode": "playlist",    # single, playlist, none
    "resolution": "4k",         # 4k, 1440p, 1080p, 720p, native
    "target_fps": 60,           # 30, 60
    "bitrate_kbps": 30000,      # kbps (30 Mbps for 4K 60fps)
    "encoder": "hevc_nvenc",    # hevc_nvenc, nvenc, x265, x264, copy
    "audio_bitrate_kbps": 192,
    "overlay_text": "",
    "recent_playlist": []
}

def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                merged = {**DEFAULT_CONFIG, **data}
                return merged
        except Exception:
            return DEFAULT_CONFIG.copy()
    return DEFAULT_CONFIG.copy()

def save_config(cfg: dict):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"Error saving config: {e}")

# ----------------- REQUEST SCHEMAS ----------------- #
class StartStreamRequest(BaseModel):
    playlist: List[str]
    stream_key: str
    rtmp_url: Optional[str] = "rtmp://a.rtmp.youtube.com/live2"
    loop_mode: Optional[str] = "playlist"
    resolution: Optional[str] = "1080p"
    target_fps: Optional[int] = 30
    bitrate_kbps: Optional[int] = 4500
    encoder: Optional[str] = "nvenc"
    audio_bitrate_kbps: Optional[int] = 192
    overlay_text: Optional[str] = ""

class ConfigRequest(BaseModel):
    rtmp_url: Optional[str] = None
    stream_key: Optional[str] = None
    loop_mode: Optional[str] = None
    resolution: Optional[str] = None
    target_fps: Optional[int] = None
    bitrate_kbps: Optional[int] = None
    encoder: Optional[str] = None
    audio_bitrate_kbps: Optional[int] = None
    overlay_text: Optional[str] = None
    recent_playlist: Optional[List[str]] = None

# ----------------- API ENDPOINTS ----------------- #

@app.get("/api/status")
def get_status():
    """Returns real-time streaming engine status and telemetry."""
    return stream_engine.get_status()

@app.get("/api/logs")
def get_logs():
    """Returns recent FFmpeg logs for diagnostics."""
    return {"logs": stream_engine.get_logs(150)}

@app.get("/api/network-info")
def get_network_info():
    """Returns local LAN IP, direct Wi-Fi URL, and active public Cloudflare URL."""
    ip = get_local_ip()
    port = 8765
    tun = tunnel_manager.get_status()
    return {
        "local_ip": ip,
        "port": port,
        "phone_url": f"http://{ip}:{port}",
        "public_url": tun.get("public_url"),
        "tunnel_active": tun.get("is_active", False)
    }

@app.get("/api/tunnel/status")
def get_tunnel_status():
    """Returns Cloudflare public link status."""
    return tunnel_manager.get_status()

@app.post("/api/tunnel/start")
def start_tunnel():
    """Generates an instant public HTTPS link accessible worldwide."""
    url = tunnel_manager.start_tunnel()
    if url:
        return {"success": True, "public_url": url}
    else:
        raise HTTPException(status_code=500, detail=tunnel_manager.error_message or "Failed to start public tunnel")

@app.post("/api/tunnel/stop")
def stop_tunnel():
    """Shuts down the public Cloudflare tunnel."""
    tunnel_manager.stop_tunnel()
    return {"success": True, "message": "Public tunnel stopped"}

@app.post("/api/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """Accepts direct video uploads from smartphones (camera roll / files) or browser."""
    try:
        clean_filename = Path(file.filename).name.replace(" ", "_")
        target_path = UPLOADS_DIR / clean_filename
        
        with open(target_path, "wb") as f_out:
            while chunk := await file.read(1024 * 1024 * 4):  # 4MB chunks
                f_out.write(chunk)
                
        info = stream_engine.get_video_info(str(target_path.resolve()))
        return {"success": True, "file": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload video: {str(e)}")

@app.get("/api/config")
def get_config():
    """Returns saved configuration."""
    cfg = load_config()
    # Mask stream key for security in display, but allow full key usage
    masked_key = ""
    if cfg.get("stream_key"):
        raw_key = cfg["stream_key"]
        if len(raw_key) > 6:
            masked_key = raw_key[:4] + ("*" * (len(raw_key) - 6)) + raw_key[-2:]
        else:
            masked_key = "******"
    return {
        "config": cfg,
        "masked_key": masked_key,
        "has_saved_key": bool(cfg.get("stream_key"))
    }

@app.post("/api/config")
def update_config(data: ConfigRequest):
    """Saves updated user configuration."""
    current = load_config()
    update_dict = data.dict(exclude_unset=True)
    for k, v in update_dict.items():
        if v is not None:
            current[k] = v
    save_config(current)
    return {"success": True, "config": current}

@app.post("/api/stream/start")
def start_stream(req: StartStreamRequest):
    """Starts the YouTube live stream using FFmpeg."""
    success = stream_engine.start_stream(
        playlist=req.playlist,
        stream_key=req.stream_key,
        rtmp_url=req.rtmp_url or "rtmp://a.rtmp.youtube.com/live2",
        loop_mode=req.loop_mode or "playlist",
        resolution=req.resolution or "1080p",
        target_fps=req.target_fps or 30,
        bitrate_kbps=req.bitrate_kbps or 4500,
        encoder=req.encoder or "nvenc",
        audio_bitrate_kbps=req.audio_bitrate_kbps or 192,
        overlay_text=req.overlay_text or ""
    )

    if success:
        # Save playlist and settings to config
        cfg = load_config()
        cfg["recent_playlist"] = req.playlist
        cfg["stream_key"] = req.stream_key
        cfg["loop_mode"] = req.loop_mode
        cfg["resolution"] = req.resolution
        cfg["target_fps"] = req.target_fps
        cfg["bitrate_kbps"] = req.bitrate_kbps
        cfg["encoder"] = req.encoder
        save_config(cfg)
        return {"success": True, "message": "Stream starting..."}
    else:
        raise HTTPException(status_code=400, detail=stream_engine.error_message or "Failed to start stream.")

@app.post("/api/stream/stop")
def stop_stream():
    """Stops the active live stream gracefully."""
    success = stream_engine.stop_stream()
    return {"success": success, "message": "Stream stopped."}

# ----------------- NATIVE FILE SELECTION ----------------- #

def _open_file_dialog() -> List[str]:
    """Helper to open native Windows file dialog in a separate thread."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        
        filetypes = [
            ("Video Files", "*.mp4;*.mkv;*.mov;*.avi;*.webm;*.flv;*.ts;*.wmv;*.m4v"),
            ("MP4 Videos", "*.mp4"),
            ("MKV Videos", "*.mkv"),
            ("All Files", "*.*")
        ]
        
        files = filedialog.askopenfilenames(
            title="Select Video Files to Stream",
            filetypes=filetypes
        )
        root.destroy()
        return list(files)
    except Exception as e:
        print(f"File dialog error: {e}")
        return []

def _open_folder_dialog() -> str:
    """Helper to open native Windows folder browser."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        
        folder = filedialog.askdirectory(title="Select Folder Containing Videos")
        root.destroy()
        return folder
    except Exception as e:
        print(f"Folder dialog error: {e}")
        return ""

@app.post("/api/browse-files")
def browse_files():
    """Opens Windows file picker and returns video metadata."""
    # Run tkinter file dialog in thread to prevent blocking FastAPI
    result = []
    thread = threading.Thread(target=lambda: result.extend(_open_file_dialog()))
    thread.start()
    thread.join(timeout=60)
    
    videos_info = []
    for f in result:
        info = stream_engine.get_video_info(f)
        if "error" not in info:
            videos_info.append(info)
        else:
            p = Path(f)
            videos_info.append({
                "filename": p.name,
                "path": str(p.resolve()),
                "size_mb": round(p.stat().st_size / (1024*1024), 1) if p.exists() else 0,
                "formatted_duration": "--:--",
                "resolution": "Unknown",
                "video_codec": "unknown",
                "fps": 30
            })
            
    return {"files": videos_info}

@app.post("/api/browse-folder")
def browse_folder():
    """Opens Windows folder picker, scans for video files, and returns their metadata."""
    result = []
    thread = threading.Thread(target=lambda: result.append(_open_folder_dialog()))
    thread.start()
    thread.join(timeout=60)
    
    folder_path = result[0] if result else ""
    if not folder_path or not os.path.exists(folder_path):
        return {"files": []}

    extensions = {".mp4", ".mkv", ".mov", ".avi", ".webm", ".flv", ".ts", ".wmv", ".m4v"}
    found_videos = []
    
    for root_dir, _, files in os.walk(folder_path):
        for f in files:
            p = Path(root_dir) / f
            if p.suffix.lower() in extensions:
                info = stream_engine.get_video_info(str(p.resolve()))
                if "error" not in info:
                    found_videos.append(info)
                else:
                    found_videos.append({
                        "filename": p.name,
                        "path": str(p.resolve()),
                        "size_mb": round(p.stat().st_size / (1024*1024), 1),
                        "formatted_duration": "--:--",
                        "resolution": "Unknown",
                        "video_codec": "unknown",
                        "fps": 30
                    })
                    
    return {"folder": folder_path, "files": found_videos}

@app.get("/api/video/info")
def get_video_info(path: str):
    """Returns detailed metadata for a specific local video path."""
    info = stream_engine.get_video_info(path)
    return info

# ----------------- LOCAL PREVIEW VIDEO STREAMING ----------------- #

@app.get("/api/video/stream")
def stream_local_video(path: str, request: Request):
    """
    Streams a local video file with HTTP 206 Partial Content (Byte Range) support
    so the HTML5 preview player can smoothly seek, scrub, and buffer any video.
    """
    file_path = Path(path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Video file not found")

    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    # Determine mime type
    suffix = file_path.suffix.lower()
    mime_types = {
        ".mp4": "video/mp4",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".ts": "video/mp2t",
        ".flv": "video/x-flv"
    }
    content_type = mime_types.get(suffix, "video/mp4")

    if not range_header:
        # Full content response
        def iterfile():
            with open(file_path, mode="rb") as f:
                while chunk := f.read(1024 * 1024):
                    yield chunk
        return StreamingResponse(
            iterfile(),
            media_type=content_type,
            headers={
                "Content-Length": str(file_size),
                "Accept-Ranges": "bytes"
            }
        )

    # Parse byte range header
    try:
        range_val = range_header.replace("bytes=", "").strip()
        start_str, end_str = range_val.split("-")
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
        if end >= file_size:
            end = file_size - 1
        content_length = (end - start) + 1
    except Exception:
        raise HTTPException(status_code=416, detail="Requested Range Not Satisfiable")

    def range_iterfile():
        with open(file_path, mode="rb") as f:
            f.seek(start)
            bytes_left = content_length
            while bytes_left > 0:
                chunk_to_read = min(1024 * 1024, bytes_left)
                data = f.read(chunk_to_read)
                if not data:
                    break
                bytes_left -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": content_type
    }

    return StreamingResponse(range_iterfile(), status_code=206, headers=headers)

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>SkyOBS Studio is loading...</h1>")

# ----------------- DESKTOP LAUNCHER ----------------- #

def start_server_and_ui():
    """Starts FastAPI on 0.0.0.0 and opens desktop window + provides phone connection."""
    port = int(os.environ.get("PORT", 7860 if os.environ.get("SPACE_ID") else 8765))
    host = "0.0.0.0"
    local_ip = get_local_ip()

    # Check if running in headless cloud container (Hugging Face Spaces, Docker, Cloud VPS)
    is_headless = os.environ.get("SPACE_ID") is not None or sys.platform != "win32" or "--server" in sys.argv or "--headless" in sys.argv
    if is_headless:
        print(f"\n=======================================================")
        print(f"🚀 SkyOBS Studio running in 24/7 Cloud Server Mode on port {port}")
        print(f"=======================================================\n")
        uvicorn.run(app, host=host, port=port, log_level="info")
        return

    # Start Uvicorn bound to all interfaces
    server_thread = threading.Thread(
        target=lambda: uvicorn.run(app, host=host, port=port, log_level="warning"),
        daemon=True
    )
    server_thread.start()
    time.sleep(1.2)  # Allow server to bind

    local_url = f"http://127.0.0.1:{port}"
    phone_url = f"http://{local_ip}:{port}"
    print(f"\n=======================================================")
    print(f"🚀 SkyOBS Studio 4K Engine is ACTIVE!")
    print(f"   💻 PC Desktop Access: {local_url}")
    print(f"   📱 Phone Web Access:  {phone_url}")
    print(f"=======================================================\n")

    # Try launching with pywebview for a native desktop application window
    try:
        import webview
        print("Launching native desktop window via pywebview...")
        window = webview.create_window(
            title="SkyOBS Studio — 4K YouTube Live Streamer",
            url=local_url,
            width=1320,
            height=860,
            min_size=(1024, 680),
            background_color="#121316"
        )
        webview.start()
        # When desktop window is closed:
        stream_engine.stop_stream()
        tunnel_manager.stop_tunnel()
        sys.exit(0)
    except Exception as e:
        print(f"pywebview notice ({e}). Falling back to standalone browser app mode...")
        opened = False
        for browser_cmd in [
            f'start msedge --app="{local_url}"',
            f'start chrome --app="{local_url}"',
            f'start {local_url}'
        ]:
            try:
                subprocess.run(browser_cmd, shell=True)
                opened = True
                break
            except Exception:
                continue

        if not opened:
            import webbrowser
            webbrowser.open(local_url)

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            stream_engine.stop_stream()
            tunnel_manager.stop_tunnel()
            print("SkyOBS Studio shutdown.")

if __name__ == "__main__":
    start_server_and_ui()
