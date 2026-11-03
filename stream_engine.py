import os
import sys
import time
import json
import shutil
import threading
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

class StreamEngine:
    """
    OBS-style RTMP Live Streaming Engine for YouTube using local video files and FFmpeg.
    Supports single video loop, seamless multi-video playlist, NVENC hardware acceleration,
    real-time telemetry monitoring, and graceful control.
    """
    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.status = "idle"  # idle, starting, live, stopping, error
        self.error_message = ""
        self.manifest_path: Optional[str] = None
        
        # Telemetry stats
        self.stats = {
            "fps": 0.0,
            "bitrate": "0 kbps",
            "bitrate_num": 0,
            "speed": "0.0x",
            "out_time": "00:00:00",
            "out_time_seconds": 0,
            "frames": 0,
            "dropped_frames": 0,
            "total_size_mb": 0.0,
            "start_timestamp": None,
            "uptime_seconds": 0,
            "current_video": "",
            "playlist_count": 0
        }
        
        # Logs buffer
        self.recent_logs: List[str] = []
        self._max_logs = 300
        self._lock = threading.Lock()
        
        # Monitor threads
        self._stdout_thread: Optional[threading.Thread] = None
        self._stderr_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self.has_nvenc = self._check_nvenc()

    def _check_nvenc(self) -> bool:
        """Checks if NVIDIA hardware encoder is supported by FFmpeg on this system."""
        try:
            res = subprocess.run(["ffmpeg", "-encoders"], capture_output=True, text=True, timeout=5)
            return "h264_nvenc" in res.stdout
        except Exception:
            return False
        
    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            # Check if process is still alive if marked as live
            if self.process and self.process.poll() is not None:
                exit_code = self.process.poll()
                if self.status in ["live", "starting"]:
                    self.status = "error" if exit_code != 0 else "idle"
                    if exit_code != 0 and not self.error_message:
                        self.error_message = f"FFmpeg exited with error code {exit_code}. Check console logs."
            
            uptime = 0
            if self.stats["start_timestamp"] and self.status == "live":
                uptime = int(time.time() - self.stats["start_timestamp"])
            self.stats["uptime_seconds"] = uptime
            
            return {
                "status": self.status,
                "error": self.error_message,
                "stats": dict(self.stats),
                "is_active": self.status in ["starting", "live"]
            }

    def get_logs(self, limit: int = 100) -> List[str]:
        with self._lock:
            return self.recent_logs[-limit:]

    def _log(self, message: str):
        timestamp = time.strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message.strip()}"
        with self._lock:
            self.recent_logs.append(log_entry)
            if len(self.recent_logs) > self._max_logs:
                self.recent_logs.pop(0)

    def start_stream(
        self,
        playlist: List[str],
        stream_key: str,
        rtmp_url: str = "rtmp://a.rtmp.youtube.com/live2",
        loop_mode: str = "playlist",  # "single", "playlist", "none"
        resolution: str = "1080p",    # "1080p", "720p", "native"
        target_fps: int = 30,          # 30, 60
        bitrate_kbps: int = 4500,     # kbps
        encoder: str = "nvenc",       # "nvenc", "x264", "copy"
        audio_bitrate_kbps: int = 192,
        overlay_text: str = ""
    ) -> bool:
        if self.status in ["live", "starting"]:
            self.error_message = "Stream is already running. Stop it before starting a new one."
            return False

        if not playlist:
            self.error_message = "Playlist is empty. Add at least one local video file."
            return False

        # Validate that video files actually exist on disk
        valid_files = []
        for file_path in playlist:
            p = Path(file_path)
            if p.exists() and p.is_file():
                valid_files.append(str(p.resolve()))
            else:
                self._log(f"Warning: File not found: {file_path}")

        if not valid_files:
            self.error_message = "None of the selected video files exist on this device."
            return False

        if not stream_key or not stream_key.strip():
            self.error_message = "YouTube Stream Key is required."
            return False

        # Clean stream key and prepare RTMP destination
        stream_key = stream_key.strip()
        rtmp_url = rtmp_url.strip().rstrip('/')
        full_dest = f"{rtmp_url}/{stream_key}"

        self.status = "starting"
        self.error_message = ""
        self._stop_event.clear()
        
        # Reset telemetry
        with self._lock:
            self.stats = {
                "fps": 0.0,
                "bitrate": "0 kbps",
                "bitrate_num": 0,
                "speed": "0.0x",
                "out_time": "00:00:00",
                "out_time_seconds": 0,
                "frames": 0,
                "dropped_frames": 0,
                "total_size_mb": 0.0,
                "start_timestamp": time.time(),
                "uptime_seconds": 0,
                "current_video": Path(valid_files[0]).name,
                "playlist_count": len(valid_files)
            }

        self._log(f"Initializing stream for {len(valid_files)} video(s)...")
        self._log(f"Destination: {rtmp_url} (Key masked)")
        self._log(f"Mode: {loop_mode} | Resolution: {resolution} @ {target_fps}fps | Encoder: {encoder}")

        # Cloud auto-fallback if GPU NVENC requested on a CPU-only server
        if "nvenc" in encoder and not self.has_nvenc:
            self._log("Notice: NVENC GPU not available on this cloud server. Falling back to software encoder.")
            if "hevc" in encoder:
                encoder = "x265"
            else:
                encoder = "x264"

        # Check if input has audio
        has_audio = False
        for f in valid_files:
            inf = self.get_video_info(f)
            if inf.get("audio_codec") and inf.get("audio_codec") != "none":
                has_audio = True
                break

        # Assemble FFmpeg Command
        cmd = ["ffmpeg", "-hide_banner", "-y"]

        # Handle input and looping mode
        if len(valid_files) == 1 and loop_mode == "single":
            # Single file infinite loop
            cmd.extend([
                "-stream_loop", "-1",
                "-re",
                "-i", valid_files[0]
            ])
            if not has_audio:
                # Add infinite silent audio track
                cmd.extend(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"])
        elif len(valid_files) == 1 and loop_mode == "none":
            # Single file play once
            cmd.extend([
                "-re",
                "-i", valid_files[0]
            ])
            if not has_audio:
                cmd.extend(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"])
        else:
            # Multi-file playlist or loop playlist
            manifest_file = Path(__file__).parent / "active_playlist.txt"
            with open(manifest_file, "w", encoding="utf-8") as f:
                for video_path in valid_files:
                    escaped_path = video_path.replace("\\", "/").replace("'", "'\\''")
                    f.write(f"file '{escaped_path}'\n")
            self.manifest_path = str(manifest_file.resolve())

            if loop_mode == "playlist":
                cmd.extend([
                    "-f", "concat",
                    "-safe", "0",
                    "-stream_loop", "-1",
                    "-re",
                    "-i", str(manifest_file)
                ])
            else:
                cmd.extend([
                    "-f", "concat",
                    "-safe", "0",
                    "-re",
                    "-i", str(manifest_file)
                ])
            if not has_audio:
                cmd.extend(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"])

        # Video filters (Resolution standardizer, padding, FPS, and optional watermark overlay)
        res_map = {
            "4k": (3840, 2160),
            "2160p": (3840, 2160),
            "1440p": (2560, 1440),
            "1080p": (1920, 1080),
            "720p": (1280, 720),
            "480p": (854, 480)
        }
        
        vf_filters = []
        if resolution in res_map and encoder != "copy":
            width, height = res_map[resolution]
            # Standardize aspect ratio to broadcast canvas with letterbox/pillarbox padding
            vf_filters.append(
                f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1"
            )
            vf_filters.append(f"fps={target_fps}")
        elif encoder != "copy":
            vf_filters.append(f"fps={target_fps}")

        if overlay_text and overlay_text.strip() and encoder != "copy":
            clean_text = overlay_text.replace(":", "\\:").replace("'", "\\'")
            vf_filters.append(
                f"drawtext=text='{clean_text}':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.65:boxborderw=8:x=32:y=32"
            )

        if vf_filters and encoder != "copy":
            cmd.extend(["-vf", ",".join(vf_filters)])

        # Audio standardization
        if encoder != "copy":
            cmd.extend([
                "-af", "aresample=44100,aformat=channel_layouts=stereo"
            ])

        # Codecs & Encoding parameters
        gop = target_fps * 2  # 2 second keyframe cadence for YouTube Live
        bufsize = bitrate_kbps * 2

        if encoder == "copy" and len(valid_files) == 1:
            cmd.extend([
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", f"{audio_bitrate_kbps}k"
            ])
        elif encoder == "hevc_nvenc":
            cmd.extend([
                "-c:v", "hevc_nvenc",
                "-preset", "p4",
                "-tune", "hq",
                "-rc", "cbr",
                "-b:v", f"{bitrate_kbps}k",
                "-maxrate", f"{bitrate_kbps}k",
                "-bufsize", f"{bufsize}k",
                "-g", str(gop),
                "-keyint_min", str(gop),
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", f"{audio_bitrate_kbps}k",
                "-ar", "44100",
                "-ac", "2"
            ])
        elif encoder == "x265":
            cmd.extend([
                "-c:v", "libx265",
                "-preset", "veryfast",
                "-b:v", f"{bitrate_kbps}k",
                "-maxrate", f"{bitrate_kbps}k",
                "-bufsize", f"{bufsize}k",
                "-g", str(gop),
                "-keyint_min", str(gop),
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", f"{audio_bitrate_kbps}k",
                "-ar", "44100",
                "-ac", "2"
            ])
        elif encoder == "nvenc":
            cmd.extend([
                "-c:v", "h264_nvenc",
                "-preset", "p4",
                "-tune", "hq",
                "-rc", "cbr",
                "-b:v", f"{bitrate_kbps}k",
                "-maxrate", f"{bitrate_kbps}k",
                "-bufsize", f"{bufsize}k",
                "-g", str(gop),
                "-keyint_min", str(gop),
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", f"{audio_bitrate_kbps}k",
                "-ar", "44100",
                "-ac", "2"
            ])
        else:  # Software x264
            cmd.extend([
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-tune", "zerolatency",
                "-b:v", f"{bitrate_kbps}k",
                "-maxrate", f"{bitrate_kbps}k",
                "-bufsize", f"{bufsize}k",
                "-g", str(gop),
                "-keyint_min", str(gop),
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", f"{audio_bitrate_kbps}k",
                "-ar", "44100",
                "-ac", "2"
            ])

        if not has_audio:
            cmd.extend(["-shortest"])

        # Container & Output Settings
        cmd.extend([
            "-f", "flv",
            "-flvflags", "no_duration_filesize",
            "-progress", "pipe:1",
            full_dest
        ])

        # Launch FFmpeg process
        try:
            creationflags = 0
            if sys.platform == "win32":
                creationflags = subprocess.CREATE_NO_WINDOW

            self.process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                creationflags=creationflags
            )
            
            # Start monitoring threads
            self._stdout_thread = threading.Thread(target=self._read_stdout, daemon=True)
            self._stderr_thread = threading.Thread(target=self._read_stderr, daemon=True)
            self._stdout_thread.start()
            self._stderr_thread.start()
            
            self._log("FFmpeg process launched successfully. Connecting to YouTube Live...")
            return True

        except Exception as e:
            self.status = "error"
            self.error_message = f"Failed to launch FFmpeg: {str(e)}"
            self._log(f"Error launching FFmpeg: {str(e)}")
            return False

    def _read_stdout(self):
        """Reads FFmpeg -progress output line-by-line to parse real-time stream telemetry."""
        if not self.process or not self.process.stdout:
            return

        has_connected = False
        try:
            for line in iter(self.process.stdout.readline, ""):
                if self._stop_event.is_set():
                    break
                line = line.strip()
                if not line:
                    continue
                
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip()

                    with self._lock:
                        if key == "fps":
                            try:
                                self.stats["fps"] = round(float(val), 1)
                            except ValueError:
                                pass
                        elif key == "bitrate":
                            self.stats["bitrate"] = val
                            if "kbits/s" in val:
                                try:
                                    self.stats["bitrate_num"] = int(float(val.replace("kbits/s", "")))
                                except ValueError:
                                    pass
                        elif key == "speed":
                            self.stats["speed"] = val
                        elif key == "frame":
                            try:
                                self.stats["frames"] = int(val)
                            except ValueError:
                                pass
                        elif key == "drop_frames":
                            try:
                                self.stats["dropped_frames"] = int(val)
                            except ValueError:
                                pass
                        elif key == "total_size":
                            try:
                                bytes_val = int(val)
                                self.stats["total_size_mb"] = round(bytes_val / (1024 * 1024), 2)
                            except ValueError:
                                pass
                        elif key == "out_time":
                            if "." in val:
                                val = val.split(".")[0]
                            self.stats["out_time"] = val
                        elif key == "progress":
                            if val == "continue" and not has_connected:
                                has_connected = True
                                self.status = "live"
                                self._log("SUCCESS: Connected to YouTube RTMP! Live broadcast is ACTIVE.")
        except Exception as e:
            self._log(f"Stdout monitoring exception: {str(e)}")

    def _read_stderr(self):
        """Reads FFmpeg stderr messages for errors, warnings, and informational logs."""
        if not self.process or not self.process.stderr:
            return

        try:
            for line in iter(self.process.stderr.readline, ""):
                if self._stop_event.is_set():
                    break
                line = line.strip()
                if line:
                    self._log(line)
                    # Detect common critical errors
                    lower_line = line.lower()
                    if "connection refused" in lower_line or "server error" in lower_line or "cannot open connection" in lower_line:
                        self.error_message = f"YouTube Connection Error: {line}"
                    elif "already in use" in lower_line:
                        self.error_message = "Stream key might be already in use or stream destination busy."
        except Exception as e:
            self._log(f"Stderr monitoring exception: {str(e)}")

    def stop_stream(self) -> bool:
        """Gracefully stops the active live stream and disconnects from YouTube."""
        if not self.process or self.status not in ["live", "starting"]:
            self.status = "idle"
            return True

        self.status = "stopping"
        self._log("Stopping YouTube live stream...")
        self._stop_event.set()

        try:
            # Send 'q' to stdin to let FFmpeg flush properly
            if self.process.stdin:
                try:
                    self.process.stdin.write("q\n")
                    self.process.stdin.flush()
                except (BrokenPipeError, OSError):
                    pass

            # Wait for exit
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._log("FFmpeg did not exit within timeout. Terminating...")
                self.process.terminate()
                try:
                    self.process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    self.process.kill()

            self._log("Live stream stopped successfully. Status: OFFLINE.")
        except Exception as e:
            self._log(f"Error while stopping stream: {str(e)}")
        finally:
            self.process = None
            self.status = "idle"
            # Cleanup temporary concat file if it was created
            if self.manifest_path and os.path.exists(self.manifest_path):
                try:
                    os.remove(self.manifest_path)
                except OSError:
                    pass
                self.manifest_path = None

        return True

    def get_video_info(self, file_path: str) -> Dict[str, Any]:
        """Uses ffprobe to inspect video metadata (dimensions, duration, codecs, size)."""
        p = Path(file_path)
        if not p.exists() or not p.is_file():
            return {"error": "File does not exist"}

        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration,size,bit_rate:stream=width,height,codec_name,codec_type,r_frame_rate",
            "-of", "json",
            str(p.resolve())
        ]
        
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if res.returncode == 0:
                data = json.loads(res.stdout)
                v_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
                a_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), {})
                fmt = data.get("format", {})
                
                duration_sec = float(fmt.get("duration", 0))
                hours = int(duration_sec // 3600)
                minutes = int((duration_sec % 3600) // 60)
                seconds = int(duration_sec % 60)
                formatted_duration = f"{hours:02d}:{minutes:02d}:{seconds:02d}" if hours > 0 else f"{minutes:02d}:{seconds:02d}"

                size_bytes = int(fmt.get("size", 0))
                size_mb = round(size_bytes / (1024 * 1024), 1)
                
                fps_eval = 0
                r_fps = v_stream.get("r_frame_rate", "30/1")
                if "/" in r_fps:
                    num, den = r_fps.split("/")
                    fps_eval = round(float(num) / float(den), 1) if float(den) > 0 else 30

                return {
                    "filename": p.name,
                    "path": str(p.resolve()),
                    "size_mb": size_mb,
                    "duration_sec": duration_sec,
                    "formatted_duration": formatted_duration,
                    "width": v_stream.get("width", 1920),
                    "height": v_stream.get("height", 1080),
                    "resolution": f"{v_stream.get('width', 1920)}x{v_stream.get('height', 1080)}",
                    "video_codec": v_stream.get("codec_name", "unknown"),
                    "audio_codec": a_stream.get("codec_name", "none"),
                    "fps": fps_eval
                }
            else:
                return {"error": res.stderr.strip() or "ffprobe failed"}
        except Exception as e:
            return {"error": str(e)}

# Singleton engine instance
stream_engine = StreamEngine()
