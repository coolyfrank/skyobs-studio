import os
import re
import sys
import time
import shutil
import threading
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

class TunnelManager:
    """
    Manages high-speed Cloudflare Tunnels (trycloudflare.com) to provide
    free, secure, public HTTPS links for anyone anywhere in the world to
    access SkyOBS Studio without port forwarding or router setup.
    """
    def __init__(self, port: int = 8765):
        self.port = port
        self.process: Optional[subprocess.Popen] = None
        self.public_url: Optional[str] = None
        self.is_active = False
        self.error_message = ""
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self.bin_path = self._locate_binary()

    def _locate_binary(self) -> str:
        # Check local folder first
        local_bin = Path(__file__).parent / ("cloudflared.exe" if sys.platform == "win32" else "cloudflared")
        if local_bin.exists():
            return str(local_bin.resolve())
        
        # Check system PATH
        which_bin = shutil.which("cloudflared")
        if which_bin:
            return which_bin
            
        return "cloudflared"

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            # Check if process died
            if self.process and self.process.poll() is not None:
                self.is_active = False
                self.public_url = None
                if not self.error_message:
                    self.error_message = "Tunnel process stopped unexpectedly."
                    
            return {
                "is_active": self.is_active,
                "public_url": self.public_url,
                "error": self.error_message,
                "binary_ready": Path(self.bin_path).exists() or shutil.which("cloudflared") is not None
            }

    def start_tunnel(self, timeout: int = 25) -> Optional[str]:
        with self._lock:
            if self.is_active and self.public_url:
                return self.public_url

            self.error_message = ""
            self.public_url = None
            self._stop_event.clear()

            cmd = [
                self.bin_path,
                "tunnel",
                "--url", f"http://127.0.0.1:{self.port}"
            ]

            try:
                creationflags = 0
                if sys.platform == "win32":
                    creationflags = subprocess.CREATE_NO_WINDOW

                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                    creationflags=creationflags
                )
            except Exception as e:
                self.error_message = f"Failed to execute cloudflared: {str(e)}"
                return None

        # Parse stderr for trycloudflare.com URL
        start_time = time.time()
        url_found = None

        while time.time() - start_time < timeout:
            if self.process.poll() is not None:
                self.error_message = "Tunnel exited before establishing connection."
                break

            line = self.process.stderr.readline()
            if not line:
                time.sleep(0.1)
                continue

            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
            if match:
                url_found = match.group(0)
                break

        with self._lock:
            if url_found:
                self.public_url = url_found
                self.is_active = True
                self.error_message = ""
                # Start background log consumer thread to prevent pipe buffer stalls
                threading.Thread(target=self._drain_logs, daemon=True).start()
                return url_found
            else:
                if not self.error_message:
                    self.error_message = "Timeout waiting for Cloudflare public tunnel URL."
                self.stop_tunnel()
                return None

    def _drain_logs(self):
        """Drains stderr so pipe buffer doesn't fill up."""
        if not self.process or not self.process.stderr:
            return
        try:
            for _ in iter(self.process.stderr.readline, ""):
                if self._stop_event.is_set():
                    break
        except Exception:
            pass

    def stop_tunnel(self) -> bool:
        with self._lock:
            self._stop_event.set()
            if not self.process:
                self.is_active = False
                self.public_url = None
                return True

            try:
                self.process.terminate()
                try:
                    self.process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    self.process.kill()
            except Exception:
                pass
            finally:
                self.process = None
                self.is_active = False
                self.public_url = None

            return True

# Singleton tunnel manager instance
tunnel_manager = TunnelManager(port=8765)
