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
