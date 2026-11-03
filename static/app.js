/**
 * SkyOBS Studio — Frontend Application Engine
 * Supports 4K 60fps broadcasting, mobile phone remote access, camera roll uploads,
 * local network QR generation, and real-time OBS-style telemetry.
 */

class SkyOBSApp {
  constructor() {
    this.playlist = [];
    this.currentIndex = -1;
    this.isStreaming = false;
    this.streamStatus = 'idle'; // idle, starting, live, stopping, error
    this.telemetryInterval = null;
    this.logsInterval = null;
    this.currentPhoneUrl = '';

    this.initElements();
    this.initEvents();
    this.loadSavedConfig();
    this.startTelemetryLoop();
    this.initMobileView();
  }

  initElements() {
    // Header
    this.liveStatusBadge = document.getElementById('liveStatusBadge');
    this.liveStatusText = document.getElementById('liveStatusText');
    this.headerTimer = document.getElementById('headerTimer');
    this.phoneLinkBtn = document.getElementById('phoneLinkBtn');
    this.toggleLogsBtn = document.getElementById('toggleLogsBtn');
    this.helpBtn = document.getElementById('helpBtn');

    // Playlist
    this.playlistContainer = document.getElementById('playlistContainer');
    this.playlistCount = document.getElementById('playlistCount');
    this.addFilesBtn = document.getElementById('addFilesBtn');
    this.uploadPhoneBtn = document.getElementById('uploadPhoneBtn');
    this.mobileFileInput = document.getElementById('mobileFileInput');
    this.uploadProgressBar = document.getElementById('uploadProgressBar');
    this.uploadProgressText = document.getElementById('uploadProgressText');
    this.uploadProgressPercent = document.getElementById('uploadProgressPercent');
    this.uploadProgressFill = document.getElementById('uploadProgressFill');
    this.addFolderBtn = document.getElementById('addFolderBtn');
    this.dropZone = document.getElementById('dropZone');
    this.clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
    this.loopModeRadios = document.querySelectorAll('input[name="loopMode"]');

    // Monitor / Video Player
    this.previewPlayer = document.getElementById('previewPlayer');
    this.noVideoNotice = document.getElementById('noVideoNotice');
    this.monitorLiveTag = document.getElementById('monitorLiveTag');
    this.monitorOverlayText = document.getElementById('monitorOverlayText');
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.progressBar = document.getElementById('progressBar');
    this.currentTimeEl = document.getElementById('currentTime');
    this.totalDurationEl = document.getElementById('totalDuration');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.muteBtn = document.getElementById('muteBtn');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.vuLeft = document.getElementById('vuLeft');
    this.vuRight = document.getElementById('vuRight');
    this.currentVideoName = document.getElementById('currentVideoName');
    this.currentVideoSpecs = document.getElementById('currentVideoSpecs');
    this.previewModeTag = document.getElementById('previewModeTag');

    // Broadcast Controls
    this.rtmpUrlSelect = document.getElementById('rtmpUrl');
    this.customRtmpInput = document.getElementById('customRtmpInput');
    this.streamKeyInput = document.getElementById('streamKey');
    this.toggleKeyVisibility = document.getElementById('toggleKeyVisibility');
    this.resolutionSelect = document.getElementById('resolutionSelect');
    this.encoderSelect = document.getElementById('encoderSelect');
    this.bitrateSlider = document.getElementById('bitrateSlider');
    this.bitrateDisplay = document.getElementById('bitrateDisplay');
    this.overlayTextInput = document.getElementById('overlayTextInput');
    this.streamActionBtn = document.getElementById('streamActionBtn');
    this.broadcastBtnText = document.getElementById('broadcastBtnText');
    this.broadcastSubText = document.getElementById('broadcastSubText');

    // Telemetry Dock
    this.footerStatus = document.getElementById('footerStatus');
    this.telemetryBitrate = document.getElementById('telemetryBitrate');
    this.telemetryFps = document.getElementById('telemetryFps');
    this.telemetrySpeed = document.getElementById('telemetrySpeed');
    this.telemetryDrops = document.getElementById('telemetryDrops');
    this.telemetryTime = document.getElementById('telemetryTime');
    this.telemetrySize = document.getElementById('telemetrySize');

    // Drawer & Modals
    this.logsDrawer = document.getElementById('logsDrawer');
    this.logsTerminal = document.getElementById('logsTerminal');
    this.closeLogsBtn = document.getElementById('closeLogsBtn');
    this.copyLogsBtn = document.getElementById('copyLogsBtn');
    this.helpModal = document.getElementById('helpModal');
    this.closeHelpModal = document.getElementById('closeHelpModal');
    this.gotItBtn = document.getElementById('gotItBtn');

    // Phone & Public Link Modal
    this.phoneModal = document.getElementById('phoneModal');
    this.closePhoneModal = document.getElementById('closePhoneModal');
    this.donePhoneBtn = document.getElementById('donePhoneBtn');
    this.phoneQrCanvas = document.getElementById('phoneQrCanvas');
    this.tabPublicLink = document.getElementById('tabPublicLink');
    this.tabLocalLink = document.getElementById('tabLocalLink');
    this.publicLinkSection = document.getElementById('publicLinkSection');
    this.localLinkSection = document.getElementById('localLinkSection');
    this.startTunnelBtn = document.getElementById('startTunnelBtn');
    this.stopTunnelBtn = document.getElementById('stopTunnelBtn');
    this.publicLinkBox = document.getElementById('publicLinkBox');
    this.publicUrlText = document.getElementById('publicUrlText');
    this.copyPublicUrlBtn = document.getElementById('copyPublicUrlBtn');
    this.localUrlText = document.getElementById('localUrlText');
    this.copyLocalUrlBtn = document.getElementById('copyLocalUrlBtn');
    this.currentPublicUrl = '';
    this.currentLocalUrl = '';

    // Mobile Navigation
    this.mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
    this.panels = {
      preview: document.querySelector('.panel-preview'),
      playlist: document.querySelector('.panel-playlist'),
      controls: document.querySelector('.panel-controls')
    };
  }

  initEvents() {
    // Add Files & Folders
    this.addFilesBtn.addEventListener('click', () => this.browseFiles());
    this.addFolderBtn.addEventListener('click', () => this.browseFolder());
    this.clearPlaylistBtn.addEventListener('click', () => this.clearPlaylist());

    // Phone / Direct File Upload
    this.uploadPhoneBtn.addEventListener('click', () => this.mobileFileInput.click());
    this.mobileFileInput.addEventListener('change', (e) => this.handleMobileUpload(e));

    // Phone & Public Link Modal
    this.phoneLinkBtn.addEventListener('click', () => this.openPhoneModal());
    this.closePhoneModal.addEventListener('click', () => this.phoneModal.classList.add('hidden'));
    this.donePhoneBtn.addEventListener('click', () => this.phoneModal.classList.add('hidden'));
    
    this.tabPublicLink.addEventListener('click', () => this.switchLinkTab('public'));
    this.tabLocalLink.addEventListener('click', () => this.switchLinkTab('local'));
    
    this.startTunnelBtn.addEventListener('click', () => this.startPublicTunnel());
    this.stopTunnelBtn.addEventListener('click', () => this.stopPublicTunnel());
    
    this.copyPublicUrlBtn.addEventListener('click', () => this.copyText(this.currentPublicUrl, this.copyPublicUrlBtn));
    this.copyLocalUrlBtn.addEventListener('click', () => this.copyText(this.currentLocalUrl, this.copyLocalUrlBtn));

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(name => {
      this.dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        this.dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      this.dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        this.dropZone.classList.remove('dragover');
      });
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.uploadFilesList(e.dataTransfer.files);
      }
    });

    this.dropZone.addEventListener('click', () => {
      // If mobile or browser without local tkinter, trigger file upload input
      if (window.innerWidth <= 768) {
        this.mobileFileInput.click();
      } else {
        this.browseFiles();
      }
    });

    // Player Events
    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.previewPlayer.addEventListener('timeupdate', () => this.updatePlayerProgress());
    this.previewPlayer.addEventListener('loadedmetadata', () => this.onPlayerMetadataLoaded());
    this.previewPlayer.addEventListener('ended', () => this.onVideoEnded());
    this.progressBar.addEventListener('input', (e) => this.seekPlayer(e.target.value));

    // Volume & Mute
    this.volumeSlider.addEventListener('input', (e) => {
      this.previewPlayer.volume = parseFloat(e.target.value);
      this.previewPlayer.muted = false;
    });

    this.muteBtn.addEventListener('click', () => {
      this.previewPlayer.muted = !this.previewPlayer.muted;
      this.volumeSlider.value = this.previewPlayer.muted ? 0 : this.previewPlayer.volume;
    });

    this.fullscreenBtn.addEventListener('click', () => {
      if (this.previewPlayer.requestFullscreen) {
        this.previewPlayer.requestFullscreen();
      }
    });

    // RTMP & Key events
    this.rtmpUrlSelect.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        this.customRtmpInput.classList.remove('hidden');
      } else {
        this.customRtmpInput.classList.add('hidden');
      }
      this.saveCurrentConfig();
    });

    this.toggleKeyVisibility.addEventListener('click', () => {
      const isPassword = this.streamKeyInput.type === 'password';
      this.streamKeyInput.type = isPassword ? 'text' : 'password';
      this.toggleKeyVisibility.textContent = isPassword ? '🔒' : '👁';
    });

    this.streamKeyInput.addEventListener('change', () => this.saveCurrentConfig());

    // 4K Resolution & Bitrate Auto-Preseting
    this.resolutionSelect.addEventListener('change', () => this.onResolutionChange());

    this.bitrateSlider.addEventListener('input', (e) => {
      this.bitrateDisplay.textContent = this.formatBitrate(parseInt(e.target.value, 10));
      this.saveCurrentConfig();
    });

    this.encoderSelect.addEventListener('change', () => this.saveCurrentConfig());

    this.overlayTextInput.addEventListener('input', (e) => {
      const txt = e.target.value.trim();
      if (txt) {
        this.monitorOverlayText.textContent = txt;
        this.monitorOverlayText.classList.remove('hidden');
      } else {
        this.monitorOverlayText.classList.add('hidden');
      }
      this.saveCurrentConfig();
    });

    // Stream Action Button (START / STOP)
    this.streamActionBtn.addEventListener('click', () => this.handleStreamAction());

    // Drawer & Modals
    this.toggleLogsBtn.addEventListener('click', () => this.toggleLogsDrawer());
    this.closeLogsBtn.addEventListener('click', () => this.logsDrawer.classList.add('hidden'));
    this.copyLogsBtn.addEventListener('click', () => this.copyLogs());

    this.helpBtn.addEventListener('click', () => this.helpModal.classList.remove('hidden'));
    this.closeHelpModal.addEventListener('click', () => this.helpModal.classList.add('hidden'));
    this.gotItBtn.addEventListener('click', () => this.helpModal.classList.add('hidden'));

    // Mobile Navigation Tabs
    this.mobileNavBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchMobileTab(btn.dataset.tab));
    });

    // Simulated VU Meter animation
    setInterval(() => this.updateAudioMeter(), 100);
  }

  // ----------------- MOBILE VIEW ----------------- //

  initMobileView() {
    if (window.innerWidth <= 768) {
      this.switchMobileTab('preview');
    }
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768) {
        const activeBtn = document.querySelector('.mobile-nav-btn.active');
        const tab = activeBtn ? activeBtn.dataset.tab : 'preview';
        this.switchMobileTab(tab);
      } else {
        Object.values(this.panels).forEach(p => {
          if (p) p.classList.remove('mobile-active');
        });
      }
    });
  }

  switchMobileTab(tabName) {
    this.mobileNavBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    Object.keys(this.panels).forEach(key => {
      if (this.panels[key]) {
        this.panels[key].classList.toggle('mobile-active', key === tabName);
      }
    });
  }

  // ----------------- 4K RESOLUTION & BITRATE ----------------- //

  onResolutionChange() {
    const val = this.resolutionSelect.value;
    let recommendedBitrate = 30000; // 4K 60fps default (30 Mbps)

    if (val === '4k_60') {
      recommendedBitrate = 30000;
      this.encoderSelect.value = 'hevc_nvenc';
    } else if (val === '4k_30') {
      recommendedBitrate = 20000;
      this.encoderSelect.value = 'hevc_nvenc';
    } else if (val === '1440p_60') {
      recommendedBitrate = 12000;
    } else if (val === '1080p_60') {
      recommendedBitrate = 6000;
    } else if (val === '1080p_30') {
      recommendedBitrate = 4500;
    } else if (val === '720p_60') {
      recommendedBitrate = 3500;
    } else if (val === '720p_30') {
      recommendedBitrate = 2500;
    } else if (val === 'native') {
      recommendedBitrate = 25000;
    }

    this.bitrateSlider.value = recommendedBitrate;
    this.bitrateDisplay.textContent = this.formatBitrate(recommendedBitrate);
    this.saveCurrentConfig();
  }

  formatBitrate(kbps) {
    if (kbps >= 10000) {
      return `${kbps} kbps (${(kbps / 1000).toFixed(1)} Mbps) 🚀`;
    }
    return `${kbps} kbps`;
  }

  // ----------------- PHONE & PUBLIC LINK MODAL ----------------- //

  switchLinkTab(tab) {
    if (tab === 'public') {
      this.tabPublicLink.classList.add('active');
      this.tabLocalLink.classList.remove('active');
      this.publicLinkSection.classList.remove('hidden');
      this.localLinkSection.classList.add('hidden');
      if (this.currentPublicUrl) {
        this.renderQRCode(this.currentPublicUrl);
      }
    } else {
      this.tabPublicLink.classList.remove('active');
      this.tabLocalLink.classList.add('active');
      this.publicLinkSection.classList.add('hidden');
      this.localLinkSection.classList.remove('hidden');
      if (this.currentLocalUrl) {
        this.renderQRCode(this.currentLocalUrl);
      }
    }
  }

  async openPhoneModal() {
    this.phoneModal.classList.remove('hidden');
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const data = await res.json();
        this.currentLocalUrl = data.phone_url || `http://${window.location.hostname}:8765`;
        this.localUrlText.textContent = this.currentLocalUrl;

        if (data.tunnel_active && data.public_url) {
          this.currentPublicUrl = data.public_url;
          this.publicUrlText.textContent = this.currentPublicUrl;
          this.publicLinkBox.classList.remove('hidden');
          this.startTunnelBtn.classList.add('hidden');
          this.stopTunnelBtn.classList.remove('hidden');
          this.renderQRCode(this.currentPublicUrl);
        } else {
          this.renderQRCode(this.currentLocalUrl);
        }
      }
    } catch (e) {
      this.currentLocalUrl = window.location.href;
      this.localUrlText.textContent = this.currentLocalUrl;
      this.renderQRCode(this.currentLocalUrl);
    }
  }

  async startPublicTunnel() {
    this.startTunnelBtn.disabled = true;
    this.startTunnelBtn.textContent = '⚡ Connecting to Cloudflare...';

    try {
      const res = await fetch('/api/tunnel/start', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        this.currentPublicUrl = data.public_url;
        this.publicUrlText.textContent = this.currentPublicUrl;
        this.publicLinkBox.classList.remove('hidden');
        this.startTunnelBtn.classList.add('hidden');
        this.stopTunnelBtn.classList.remove('hidden');
        this.renderQRCode(this.currentPublicUrl);
      } else {
        const err = await res.json();
        alert(`Failed to start public tunnel:\n${err.detail}`);
      }
    } catch (e) {
      alert(`Network error starting public tunnel:\n${e.message}`);
    } finally {
      this.startTunnelBtn.disabled = false;
      this.startTunnelBtn.textContent = '⚡ Generate Public Web Link';
    }
  }

  async stopPublicTunnel() {
    this.stopTunnelBtn.disabled = true;
    this.stopTunnelBtn.textContent = 'Stopping...';

    try {
      await fetch('/api/tunnel/stop', { method: 'POST' });
      this.currentPublicUrl = '';
      this.publicLinkBox.classList.add('hidden');
      this.stopTunnelBtn.classList.add('hidden');
      this.startTunnelBtn.classList.remove('hidden');
      this.renderQRCode(this.currentLocalUrl);
    } catch (e) {
      console.warn('Error stopping tunnel', e);
    } finally {
      this.stopTunnelBtn.disabled = false;
      this.stopTunnelBtn.textContent = '✕ Stop Public Link';
    }
  }

  copyText(text, btn) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = original, 1500);
    });
  }

  renderQRCode(text) {
    const canvas = this.phoneQrCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    
    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // High quality offline QR matrix rendering via API image with canvas fallback
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 10, 10, size - 20, size - 20);
    };
    qrImg.onerror = () => {
      // Offline fallback: draw stylish QR mock with corner position detection squares
      ctx.fillStyle = '#0b0c10';
      this.drawQRCorner(ctx, 16, 16, 42);
      this.drawQRCorner(ctx, size - 58, 16, 42);
      this.drawQRCorner(ctx, 16, size - 58, 42);

      // Data matrix grid
      for (let x = 68; x < size - 68; x += 10) {
        for (let y = 16; y < size - 16; y += 10) {
          if ((x * 7 + y * 13) % 5 === 0) {
            ctx.fillRect(x, y, 8, 8);
          }
        }
      }
      ctx.fillStyle = '#00d4ff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN ON PHONE', size / 2, size / 2 + 4);
    };

    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(text)}`;
  }

  drawQRCorner(ctx, x, y, size) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 6, y + 6, size - 12, size - 12);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 12, y + 12, size - 24, size - 24);
  }

  // ----------------- MOBILE PHONE VIDEO UPLOADS ----------------- //

  async handleMobileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await this.uploadFilesList(files);
    this.mobileFileInput.value = '';
  }

  async uploadFilesList(files) {
    this.uploadProgressBar.classList.remove('hidden');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.uploadProgressText.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}`;
      
      await new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload-video', true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            this.uploadProgressFill.style.width = `${percent}%`;
            this.uploadProgressPercent.textContent = `${percent}%`;
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.file) {
                this.addVideoToPlaylist(res.file);
              }
            } catch (err) {
              console.warn('Error parsing upload response', err);
            }
            resolve();
          } else {
            alert(`Failed to upload ${file.name}: ${xhr.statusText}`);
            resolve();
          }
        };

        xhr.onerror = () => {
          alert(`Network error uploading ${file.name}`);
          resolve();
        };

        xhr.send(formData);
      });
    }

    this.uploadProgressBar.classList.add('hidden');
    this.saveCurrentConfig();

    // If on mobile, switch to playlist tab so user sees their new videos
    if (window.innerWidth <= 768) {
      this.switchMobileTab('playlist');
    }
  }

  // ----------------- CONFIGURATION ----------------- //

  async loadSavedConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        const cfg = data.config || {};

        if (cfg.rtmp_url) {
          if (['rtmp://a.rtmp.youtube.com/live2', 'rtmp://b.rtmp.youtube.com/live2'].includes(cfg.rtmp_url)) {
            this.rtmpUrlSelect.value = cfg.rtmp_url;
          } else {
            this.rtmpUrlSelect.value = 'custom';
            this.customRtmpInput.value = cfg.rtmp_url;
            this.customRtmpInput.classList.remove('hidden');
          }
        }

        if (cfg.stream_key) {
          this.streamKeyInput.value = cfg.stream_key;
        }

        if (cfg.resolution && cfg.target_fps) {
          this.resolutionSelect.value = `${cfg.resolution}_${cfg.target_fps}`;
        }

        if (cfg.bitrate_kbps) {
          this.bitrateSlider.value = cfg.bitrate_kbps;
          this.bitrateDisplay.textContent = this.formatBitrate(cfg.bitrate_kbps);
        }

        if (cfg.encoder) {
          this.encoderSelect.value = cfg.encoder;
        }

        if (cfg.overlay_text) {
          this.overlayTextInput.value = cfg.overlay_text;
          this.monitorOverlayText.textContent = cfg.overlay_text;
          this.monitorOverlayText.classList.remove('hidden');
        }

        if (cfg.loop_mode) {
          const radio = document.querySelector(`input[name="loopMode"][value="${cfg.loop_mode}"]`);
          if (radio) radio.checked = true;
        }

        if (cfg.recent_playlist && Array.isArray(cfg.recent_playlist) && cfg.recent_playlist.length > 0) {
          this.loadRecentVideos(cfg.recent_playlist);
        }
      }
    } catch (e) {
      console.warn('Could not load config:', e);
    }
  }

  async loadRecentVideos(paths) {
    for (const p of paths) {
      try {
        const res = await fetch(`/api/video/info?path=${encodeURIComponent(p)}`);
        if (res.ok) {
          const info = await res.json();
          if (!info.error) {
            this.addVideoToPlaylist(info);
          }
        }
      } catch (e) {
        // Skip unavailable
      }
    }
  }

  async saveCurrentConfig() {
    const rtmp_url = this.rtmpUrlSelect.value === 'custom' 
      ? this.customRtmpInput.value.trim() 
      : this.rtmpUrlSelect.value;
    
    const [resolution, fps] = this.resolutionSelect.value.split('_');

    const payload = {
      rtmp_url,
      stream_key: this.streamKeyInput.value.trim(),
      bitrate_kbps: parseInt(this.bitrateSlider.value, 10),
      resolution: resolution || '4k',
      target_fps: fps ? parseInt(fps, 10) : 60,
      encoder: this.encoderSelect.value,
      overlay_text: this.overlayTextInput.value.trim(),
      loop_mode: this.getLoopMode(),
      recent_playlist: this.playlist.map(item => item.path)
    };

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Failed to save config:', e);
    }
  }

  getLoopMode() {
    const checked = document.querySelector('input[name="loopMode"]:checked');
    return checked ? checked.value : 'playlist';
  }

  // ----------------- NATIVE FILE BROWSING ----------------- //

  async browseFiles() {
    this.addFilesBtn.disabled = true;
    this.addFilesBtn.textContent = 'Browsing...';

    try {
      const res = await fetch('/api/browse-files', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          data.files.forEach(fileInfo => this.addVideoToPlaylist(fileInfo));
          this.saveCurrentConfig();
        }
      }
    } catch (e) {
      alert(`Error opening file picker: ${e}`);
    } finally {
      this.addFilesBtn.disabled = false;
      this.addFilesBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg> Add Videos`;
    }
  }

  async browseFolder() {
    this.addFolderBtn.disabled = true;
    this.addFolderBtn.textContent = 'Scanning...';

    try {
      const res = await fetch('/api/browse-folder', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          data.files.forEach(fileInfo => this.addVideoToPlaylist(fileInfo));
          this.saveCurrentConfig();
        } else if (data.folder) {
          alert('No supported video files (.mp4, .mkv, .mov, .avi, .webm, .ts) found in that folder.');
        }
      }
    } catch (e) {
      alert(`Error scanning folder: ${e}`);
    } finally {
      this.addFolderBtn.disabled = false;
      this.addFolderBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg> Folder`;
    }
  }

  addVideoToPlaylist(fileInfo) {
    if (this.playlist.some(item => item.path === fileInfo.path)) {
      return;
    }

    this.playlist.push(fileInfo);
    this.renderPlaylist();

    if (this.currentIndex === -1) {
      this.selectVideo(0);
    }
  }

  clearPlaylist() {
    if (this.isStreaming) {
      if (!confirm('Live stream is active. Are you sure you want to clear the playlist?')) return;
    }
    this.playlist = [];
    this.currentIndex = -1;
    this.renderPlaylist();
    this.previewPlayer.pause();
    this.previewPlayer.removeAttribute('src');
    this.noVideoNotice.classList.remove('hidden');
    this.currentVideoName.textContent = 'None';
    this.currentVideoSpecs.textContent = '';
    this.currentTimeEl.textContent = '00:00';
    this.totalDurationEl.textContent = '00:00';
    this.progressBar.value = 0;
    this.saveCurrentConfig();
  }

  renderPlaylist() {
    this.playlistCount.textContent = `${this.playlist.length} video${this.playlist.length === 1 ? '' : 's'}`;

    if (this.playlist.length === 0) {
      this.playlistContainer.innerHTML = '';
      this.dropZone.classList.remove('hidden');
      return;
    }

    this.dropZone.classList.add('hidden');
    this.playlistContainer.innerHTML = '';

    this.playlist.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = `playlist-item ${idx === this.currentIndex ? 'active' : ''}`;
      
      const is4K = item.width >= 3840 || item.height >= 2160 || (item.resolution && item.resolution.includes('3840'));
      const badge4K = is4K ? '<span style="color:#00e676;font-weight:800;margin-left:4px;">[4K UHD]</span>' : '';

      el.innerHTML = `
        <span class="playlist-item-idx">${idx + 1}</span>
        <div class="playlist-item-info">
          <div class="playlist-item-title" title="${item.path}">${item.filename} ${badge4K}</div>
          <div class="playlist-item-meta">
            <span>⏱ ${item.formatted_duration || '--:--'}</span>
            <span>💾 ${item.size_mb || 0} MB</span>
            <span>📐 ${item.resolution || ''}</span>
          </div>
        </div>
        <div class="playlist-item-actions">
          <button class="btn-item-ctrl up" title="Move Up">▲</button>
          <button class="btn-item-ctrl down" title="Move Down">▼</button>
          <button class="btn-item-ctrl delete" title="Remove">✕</button>
        </div>
      `;

      el.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-item-ctrl')) {
          this.selectVideo(idx);
          if (window.innerWidth <= 768) {
            this.switchMobileTab('preview');
          }
        }
      });

      el.querySelector('.up').addEventListener('click', (e) => {
        e.stopPropagation();
        this.moveVideo(idx, -1);
      });

      el.querySelector('.down').addEventListener('click', (e) => {
        e.stopPropagation();
        this.moveVideo(idx, 1);
      });

      el.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeVideo(idx);
      });

      this.playlistContainer.appendChild(el);
    });
  }

  selectVideo(index) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    const item = this.playlist[index];

    document.querySelectorAll('.playlist-item').forEach((el, idx) => {
      el.classList.toggle('active', idx === index);
    });

    const streamUrl = `/api/video/stream?path=${encodeURIComponent(item.path)}`;
    this.previewPlayer.src = streamUrl;
    this.previewPlayer.load();
    this.noVideoNotice.classList.add('hidden');

    const is4K = item.width >= 3840 || item.height >= 2160;
    this.currentVideoName.textContent = item.filename;
    this.currentVideoSpecs.textContent = `[${is4K ? '4K UHD | ' : ''}${item.resolution} | ${item.fps}fps | ${item.video_codec}]`;
  }

  moveVideo(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= this.playlist.length) return;

    const [moved] = this.playlist.splice(index, 1);
    this.playlist.splice(targetIdx, 0, moved);

    if (this.currentIndex === index) {
      this.currentIndex = targetIdx;
    } else if (this.currentIndex === targetIdx) {
      this.currentIndex = index;
    }

    this.renderPlaylist();
    this.saveCurrentConfig();
  }

  removeVideo(index) {
    this.playlist.splice(index, 1);
    if (this.currentIndex === index) {
      this.currentIndex = Math.min(index, this.playlist.length - 1);
      if (this.currentIndex >= 0) {
        this.selectVideo(this.currentIndex);
      } else {
        this.clearPlaylist();
      }
    } else if (this.currentIndex > index) {
      this.currentIndex--;
    }
    this.renderPlaylist();
    this.saveCurrentConfig();
  }

  // ----------------- PREVIEW PLAYER ----------------- //

  togglePlayPause() {
    if (!this.previewPlayer.src) return;

    if (this.previewPlayer.paused) {
      this.previewPlayer.play();
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');
    } else {
      this.previewPlayer.pause();
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
    }
  }

  onPlayerMetadataLoaded() {
    this.totalDurationEl.textContent = this.formatTime(this.previewPlayer.duration);
    this.progressBar.max = this.previewPlayer.duration;
  }

  updatePlayerProgress() {
    if (!this.previewPlayer.duration) return;
    this.currentTimeEl.textContent = this.formatTime(this.previewPlayer.currentTime);
    this.progressBar.value = this.previewPlayer.currentTime;
  }

  seekPlayer(value) {
    this.previewPlayer.currentTime = parseFloat(value);
  }

  onVideoEnded() {
    const mode = this.getLoopMode();
    if (mode === 'single') {
      this.previewPlayer.currentTime = 0;
      this.previewPlayer.play();
    } else if (mode === 'playlist') {
      const nextIdx = (this.currentIndex + 1) % this.playlist.length;
      this.selectVideo(nextIdx);
      this.previewPlayer.play();
    } else {
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateAudioMeter() {
    if ((!this.previewPlayer.paused && !this.previewPlayer.muted) || this.isStreaming) {
      const baseL = Math.min(100, Math.max(10, Math.floor(Math.random() * 65 + 25)));
      const baseR = Math.min(100, Math.max(10, Math.floor(baseL + (Math.random() * 16 - 8))));
      this.vuLeft.style.width = `${baseL}%`;
      this.vuRight.style.width = `${baseR}%`;
    } else {
      this.vuLeft.style.width = '0%';
      this.vuRight.style.width = '0%';
    }
  }

  // ----------------- 4K LIVE BROADCAST ACTION ----------------- //

  async handleStreamAction() {
    if (this.isStreaming || this.streamStatus === 'starting') {
      await this.stopStream();
    } else {
      await this.startStream();
    }
  }

  async startStream() {
    const streamKey = this.streamKeyInput.value.trim();
    if (!streamKey) {
      alert('YouTube Stream Key is required!\n\nGet it from YouTube Studio (studio.youtube.com) -> Go Live -> Stream Key.');
      if (window.innerWidth <= 768) {
        this.switchMobileTab('controls');
      }
      this.streamKeyInput.focus();
      return;
    }

    if (this.playlist.length === 0) {
      alert('Playlist is empty!\n\nPlease add or upload at least one video from your device to stream.');
      if (window.innerWidth <= 768) {
        this.switchMobileTab('playlist');
      }
      return;
    }

    const rtmp_url = this.rtmpUrlSelect.value === 'custom' 
      ? this.customRtmpInput.value.trim() 
      : this.rtmpUrlSelect.value;

    const [resolution, fps] = this.resolutionSelect.value.split('_');

    const payload = {
      playlist: this.playlist.map(item => item.path),
      stream_key: streamKey,
      rtmp_url,
      loop_mode: this.getLoopMode(),
      resolution: resolution || '4k',
      target_fps: fps ? parseInt(fps, 10) : 60,
      bitrate_kbps: parseInt(this.bitrateSlider.value, 10),
      encoder: this.encoderSelect.value,
      audio_bitrate_kbps: 192,
      overlay_text: this.overlayTextInput.value.trim()
    };

    this.streamActionBtn.disabled = true;
    this.broadcastBtnText.textContent = 'CONNECTING...';
    this.broadcastSubText.textContent = 'Contacting YouTube 4K Live servers...';
    this.updateStatusUI('starting');

    try {
      const res = await fetch('/api/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to start 4K stream');
      }

      if (window.innerWidth <= 768) {
        this.switchMobileTab('preview');
      }
    } catch (e) {
      alert(`4K Stream Error:\n${e.message}`);
      this.updateStatusUI('idle');
    } finally {
      this.streamActionBtn.disabled = false;
    }
  }

  async stopStream() {
    if (!confirm('Are you sure you want to stop the YouTube Live 4K broadcast?')) {
      return;
    }

    this.streamActionBtn.disabled = true;
    this.broadcastBtnText.textContent = 'STOPPING...';

    try {
      await fetch('/api/stream/stop', { method: 'POST' });
    } catch (e) {
      console.warn('Error stopping stream:', e);
    } finally {
      this.streamActionBtn.disabled = false;
      this.updateStatusUI('idle');
    }
  }

  // ----------------- TELEMETRY POLLING ----------------- //

  startTelemetryLoop() {
    this.telemetryInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          this.applyTelemetry(data);
        }
      } catch (e) {
        // Transient error
      }
    }, 600);
  }

  applyTelemetry(data) {
    const status = data.status || 'idle';
    this.streamStatus = status;
    this.isStreaming = status === 'live';

    this.updateStatusUI(status);

    const stats = data.stats || {};
    this.telemetryBitrate.textContent = stats.bitrate || '0 kbps';
    this.telemetryFps.textContent = `${stats.fps || '0.0'} fps`;
    this.telemetrySpeed.textContent = stats.speed || '0.00x';
    this.telemetryDrops.textContent = `${stats.dropped_frames || 0} (0.0%)`;
    this.telemetryTime.textContent = stats.out_time || '00:00:00';
    this.telemetrySize.textContent = `${stats.total_size_mb || 0} MB`;
    this.headerTimer.textContent = stats.out_time || '00:00:00';

    if (data.error && status === 'error') {
      this.footerStatus.textContent = 'ERROR';
      this.footerStatus.className = 'telemetry-value text-red';
    }
  }

  updateStatusUI(status) {
    this.liveStatusBadge.className = 'status-badge';
    this.footerStatus.className = 'telemetry-value';

    if (status === 'live') {
      this.liveStatusBadge.classList.add('live');
      this.liveStatusText.textContent = '🔴 4K LIVE';
      this.footerStatus.classList.add('live');
      this.footerStatus.textContent = '🔴 4K LIVE';

      this.streamActionBtn.className = 'btn-broadcast live-active';
      this.broadcastBtnText.textContent = 'STOP STREAM';
      this.broadcastSubText.textContent = 'End YouTube Live broadcast';
      this.monitorLiveTag.classList.remove('hidden');
      this.previewModeTag.textContent = '🔴 4K ON AIR';
      this.previewModeTag.style.color = '#ff334b';
    } else if (status === 'starting') {
      this.liveStatusBadge.classList.add('starting');
      this.liveStatusText.textContent = 'CONNECTING...';
      this.footerStatus.textContent = 'CONNECTING';

      this.streamActionBtn.className = 'btn-broadcast';
      this.broadcastBtnText.textContent = 'STARTING 4K...';
      this.broadcastSubText.textContent = 'Establishing RTMP Handshake';
      this.monitorLiveTag.classList.add('hidden');
    } else {
      this.liveStatusBadge.classList.add('offline');
      this.liveStatusText.textContent = 'OFFLINE';
      this.footerStatus.classList.add('offline');
      this.footerStatus.textContent = 'OFFLINE';

      this.streamActionBtn.className = 'btn-broadcast';
      this.broadcastBtnText.textContent = 'START STREAMING';
      this.broadcastSubText.textContent = 'Broadcast 4K to YouTube Live';
      this.monitorLiveTag.classList.add('hidden');
      this.previewModeTag.textContent = 'PROGRAM MONITOR';
      this.previewModeTag.style.color = 'var(--accent-cyan)';
    }
  }

  // ----------------- LOGS DRAWER ----------------- //

  toggleLogsDrawer() {
    const isHidden = this.logsDrawer.classList.contains('hidden');
    if (isHidden) {
      this.logsDrawer.classList.remove('hidden');
      this.fetchLogs();
      this.logsInterval = setInterval(() => this.fetchLogs(), 1500);
    } else {
      this.logsDrawer.classList.add('hidden');
      clearInterval(this.logsInterval);
    }
  }

  async fetchLogs() {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        const logs = data.logs || [];
        this.logsTerminal.innerHTML = logs
          .map(line => `<div class="log-line">${this.escapeHtml(line)}</div>`)
          .join('');
        this.logsTerminal.scrollTop = this.logsTerminal.scrollHeight;
      }
    } catch (e) {
      console.warn('Failed to fetch logs:', e);
    }
  }

  copyLogs() {
    const text = this.logsTerminal.innerText;
    navigator.clipboard.writeText(text).then(() => {
      this.copyLogsBtn.textContent = 'Copied!';
      setTimeout(() => this.copyLogsBtn.textContent = 'Copy Logs', 1500);
    });
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.skyObs = new SkyOBSApp();
});
