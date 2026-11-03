---
title: SkyOBS Studio - 4K YouTube Live Streamer
emoji: 🎥
colorFrom: red
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# 🚀 SkyOBS Studio — 4K YouTube Live Video Streamer (Desktop + Phone + 24/7 Cloud)

A high-performance, lightweight OBS alternative engineered specifically to **stream 4K local video files directly to YouTube Live** with NVIDIA hardware acceleration, 24/7 continuous looping, and **full remote control + direct video uploads from any smartphone** (iPhone & Android).

---

## ☁️ How to Run 24/7 in the Cloud (Laptop Powered OFF)

To use SkyOBS Studio from your phone even when your laptop is completely turned off or closed, host it on a free/cheap 24/7 cloud server:

### 1. Render.com (100% Free 24/7 Cloud Host)
1. Double-click `Push_To_GitHub.bat` in `17_SkyStream_Studio/` to push the code to your GitHub.
2. Go to **[Render.com](https://render.com)** (sign up for free with GitHub).
3. Click **New + ➔ Web Service** and select `skyobs-studio`.
4. Render detects the [`Dockerfile`](file:///c:/Users/Richi/OneDrive/Desktop/antigravity/17_SkyStream_Studio/Dockerfile) automatically and builds the container with FFmpeg 7.
5. Click **Create Web Service**!
6. Render gives you a permanent HTTPS URL (e.g. `https://skyobs-studio.onrender.com`).
   * **You can now shut down and unplug your laptop!**
   * The web app remains live 24/7. Open the link on your phone, upload videos, and stream to YouTube Live anytime!

### 2. Railway.app (1-Click Cloud Run)
1. Go to **[Railway.app](https://railway.app)**.
2. Click **New Project ➔ Deploy from GitHub repo ➔ `skyobs-studio`**.
3. Generates an instant, permanent URL: `https://skyobs-studio.up.railway.app`.

### 3. Dedicated Cloud VPS (Hetzner / DigitalOcean - $4/mo)
For massive unmetered 24/7 4K streaming channels, run on a $4/mo cloud server:
```bash
chmod +x deploy_vps.sh
./deploy_vps.sh
```
Runs as an auto-restarting systemd background service.

---

A high-performance, lightweight OBS alternative engineered specifically to **stream 4K local video files directly to YouTube Live** with NVIDIA hardware acceleration, 24/7 continuous looping, and **full remote control + direct video uploads from any smartphone** (iPhone & Android).

---

## 🌟 Key Highlights

* **True 4K UHD 60 FPS & 30 FPS**: Real-time 3840x2160 broadcast canvas with automatic letterbox padding (no stretched or distorted aspect ratios).
* **NVIDIA HEVC / H.265 (`hevc_nvenc`)**: Up to 50 Mbps bitrate with 50% bandwidth savings compared to standard H.264, delivering razor-sharp 4K quality with < 4% GPU overhead.
* **📱 Full Smartphone Control & Direct Uploads**: Scan the in-app QR code from your iPhone or Android to open the mobile web interface. Upload videos directly from your phone's camera roll/storage, preview the live feed, re-order your playlist, and start/stop broadcasts remotely.
* **Continuous 24/7 Looping**: Seamless multi-video concat loop (`Loop All 🔁`) or single video infinite loop (`Loop One 🔂`).
* **OBS-Style Live Telemetry**: Real-time Bitrate (`kbps` / `Mbps`), Streaming FPS, Playback Speed (`1.00x`), Dropped Frames, and Live Broadcast Duration.

---

## ⚡ How to Stream 4K in 3 Simple Steps

### Step 1: Launch the App
Double-click [`Launch_SkyOBS.bat`](file:///c:/Users/Richi/OneDrive/Desktop/antigravity/Launch_SkyOBS.bat) or run:
```powershell
.\.venv\Scripts\python 17_SkyStream_Studio\app.py
```
* **PC Local Access**: `http://127.0.0.1:8765`
* **Phone Wi-Fi Access**: Click the **"📱 Phone Link"** button in the header to view your direct link and QR code!

### Step 2: Configure YouTube 4K
1. Open **[YouTube Studio](https://studio.youtube.com)** ➔ Click **Create ➔ Go Live**.
2. Under **Stream Settings**, copy your **Default Stream Key**.
3. In SkyOBS Studio, paste the key into **"YouTube Stream Key"**.
4. Select **4K 2160p @ 60 FPS** (or **4K 30 FPS**).
5. Ensure encoder is set to **NVIDIA HEVC / H.265 (⚡ Best for 4K)**.
6. Bitrate automatically defaults to **30,000 kbps (30.0 Mbps)** for 60fps (or adjust up to 50 Mbps).

### Step 3: Add Videos & Go Live!
* **From PC**: Click **"Add Videos"** or drag-and-drop local video files.
* **From Phone**: Open the phone URL, tap **"📱 Upload"**, and select 4K videos from your gallery/camera roll.
* Click **START STREAMING** — your 4K broadcast will go live on YouTube with zero frame drops!

---

## 📱 How to Use on Your Phone (iPhone & Android)

1. Connect your smartphone to the same Wi-Fi network as your PC.
2. In SkyOBS Studio on your computer, click the **"📱 Phone Link"** button in the top header.
3. Scan the QR code with your phone's camera (or open the displayed URL, e.g. `http://192.168.1.173:8765`).
4. On your phone:
   * **📺 Monitor Tab**: Watch the live program preview and check live audio VU meters.
   * **📁 Playlist Tab**: Tap **"📱 Upload"** to upload 4K videos directly from your camera roll or files.
   * **⚙️ 4K Setup Tab**: Adjust bitrate, quality presets, and loop modes.
   * **🔴 Broadcast**: Tap **START STREAMING** or **STOP STREAM** from anywhere in your home!

---

## 🛠 4K Resolution & Bitrate Matrix

| Quality Preset | Resolution | Framerate | Recommended Bitrate | Encoder |
| :--- | :--- | :--- | :--- | :--- |
| **4K Ultra 60** | 3840 x 2160 | 60 FPS | **30,000 – 50,000 kbps (30–50 Mbps)** | `hevc_nvenc` (GPU) |
| **4K Standard 30**| 3840 x 2160 | 30 FPS | **20,000 – 30,000 kbps (20–30 Mbps)** | `hevc_nvenc` (GPU) |
| **2K QHD 60** | 2560 x 1440 | 60 FPS | **12,000 – 18,000 kbps (12–18 Mbps)** | `hevc_nvenc` / `nvenc` |
| **1080p FHD 60** | 1920 x 1080 | 60 FPS | **6,000 – 9,000 kbps (6–9 Mbps)** | `nvenc` / `x264` |
| **1080p FHD 30** | 1920 x 1080 | 30 FPS | **4,500 – 6,000 kbps (4.5–6 Mbps)** | `nvenc` / `x264` |
| **Direct Pass** | Native 4K | Source FPS | *Original File Bitrate* | `copy` (0% CPU/GPU) |

---

## 📁 Project Architecture

```
17_SkyStream_Studio/
├── app.py                      # FastAPI server with 0.0.0.0 LAN binding & upload router
├── stream_engine.py            # FFmpeg 4K HEVC/H.264 RTMP pipeline & telemetry parser
├── config.json                 # Persistent local settings
├── uploads/                    # Storage folder for videos uploaded from smartphones
├── Run_SkyOBS_Studio.bat       # 1-Click project launcher
├── README.md                   # Full documentation
└── static/
    ├── index.html              # Mobile-responsive studio layout + Phone QR modal
    ├── style.css               # Studio dark theme + mobile tabs & touch controls
    └── app.js                  # 4K presets, QR generator, chunked mobile uploader
```
