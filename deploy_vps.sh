#!/usr/bin/env bash
# ==============================================================================
# SkyOBS Studio — Automated Cloud Server Deployment Script (Ubuntu / Debian)
# Usage: curl -sSL https://.../deploy_vps.sh | bash
# ==============================================================================

set -e

echo "🚀 Deploying SkyOBS Studio 4K Streamer to Server..."

# 1. Update and install prerequisites
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip python3-venv ffmpeg curl git

# 2. Setup virtual environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 3. Create systemd service for 24/7 background running
SERVICE_FILE="/etc/systemd/system/skyobs.service"
CURRENT_DIR=$(pwd)

sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=SkyOBS Studio 4K YouTube Live Streamer
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$CURRENT_DIR
ExecStart=$CURRENT_DIR/venv/bin/python app.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable skyobs
sudo systemctl restart skyobs

echo "✅ SkyOBS Studio is now running 24/7 as a background service!"
echo "   Access it at: http://$(curl -s ifconfig.me):8765"
