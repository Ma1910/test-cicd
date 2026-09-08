export function renderHealthHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Health & Diagnostics • CI/CD Platform</title>
  <style>
    :root {
      --bg: #070a13;
      --card-bg: rgba(15, 23, 42, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.25);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --code-bg: #020617;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body {
      background-color: var(--bg);
      background-image: radial-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px);
      background-size: 20px 20px;
      color: var(--text);
      min-height: 100vh;
      padding: 24px 16px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--card-border);
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .heart-icon {
      width: 42px; height: 42px;
      background: linear-gradient(135deg, #059669, #10b981);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);
      animation: heartbeat 1.5s ease-in-out infinite;
    }
    @keyframes heartbeat {
      0%, 70%, 100% { transform: scale(1); }
      14%, 42% { transform: scale(1.1); }
    }
    h1 { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
    .nav-actions { display: flex; gap: 8px; }
    .btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn:hover { background: rgba(255, 255, 255, 0.12); transform: translateY(-1px); }
    .btn-primary { background: #059669; border: none; }
    .btn-primary:hover { background: #047857; }

    /* Hero Banner */
    .hero-banner {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.08) 100%);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 14px;
      padding: 22px 24px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.12);
    }
    .hero-status { display: flex; align-items: center; gap: 14px; }
    .status-ping {
      width: 14px; height: 14px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 6px var(--success-glow);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .hero-title { font-size: 18px; font-weight: 800; color: #34d399; }
    .hero-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .badge-ok {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px 18px;
    }
    .metric-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; }
    .metric-value { font-size: 20px; font-weight: 800; margin-top: 4px; }
    .metric-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* Clean Panel */
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .panel-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }
    .log-box {
      background: var(--code-bg);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 14px;
      font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
      font-size: 12px;
      color: #34d399;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .auto-refresh-bar {
      height: 3px;
      background: rgba(16, 185, 129, 0.15);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 14px;
    }
    .auto-refresh-progress {
      height: 100%;
      background: #10b981;
      width: 100%;
      transition: width 0.1s linear;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="heart-icon">🩺</div>
        <div>
          <h1>Trạng Thái Hoạt Động & Sức Khỏe Hệ Thống</h1>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Service Availability & Healthcheck Monitor • Docker Desktop Live
          </p>
        </div>
      </div>
      <div class="nav-actions">
        <a href="/" class="btn">🏠 Trang Chủ</a>
        <a href="/healthz?format=json" class="btn">📄 Raw JSON</a>
        <button class="btn btn-primary" onclick="loadHealthData()">🔄 Kiểm tra ngay</button>
      </div>
    </header>

    <!-- Hero Banner -->
    <div class="hero-banner">
      <div class="hero-status">
        <div class="status-ping"></div>
        <div>
          <div class="hero-title" id="status-title">Hệ Thống Đang Hoạt Động Ổn Định</div>
          <div class="hero-subtitle" id="last-checked">Lần kiểm tra gần nhất: Đang cập nhật...</div>
        </div>
      </div>
      <div>
        <span class="badge-ok" id="http-code-badge">HTTP 200 OK</span>
      </div>
    </div>

    <!-- Live Metric Cards (Only Real System Data) -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Trạng Thái (Status)</div>
        <div class="metric-value" style="color: #34d399;" id="status-text">UP</div>
        <div class="metric-sub">Sẵn sàng nhận request</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Thời Gian Chạy (Uptime)</div>
        <div class="metric-value" style="color: #60a5fa;" id="uptime-text">--</div>
        <div class="metric-sub" id="uptime-seconds">0 giây liên tục</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Bộ Nhớ RAM (RSS)</div>
        <div class="metric-value" style="color: #a78bfa;" id="memory-text">-- MB</div>
        <div class="metric-sub">Tối ưu trong Docker Alpine</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Độ Trễ Ping (Latency)</div>
        <div class="metric-value" style="color: #38bdf8;" id="latency-text">-- ms</div>
        <div class="metric-sub">Phản hồi cục bộ thực tế</div>
      </div>
    </div>

    <!-- Live JSON Response Viewer -->
    <div class="panel">
      <div class="panel-title">
        <span>📡 Dữ Liệu Phản Hồi Từ /healthz (Live Real Payload)</span>
        <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">Tự động cập nhật mỗi 3s</span>
      </div>
      <div class="log-box" id="json-box">Đang truy vấn dữ liệu chẩn đoán...</div>
      <div class="auto-refresh-bar">
        <div class="auto-refresh-progress" id="progress-bar"></div>
      </div>
    </div>
  </div>

  <script>
    let countdown = 30;
    let currentCountdown = countdown;

    async function loadHealthData() {
      const startTime = performance.now();
      try {
        const res = await fetch('/healthz?format=json');
        const latency = Math.round(performance.now() - startTime);
        const data = await res.json();

        document.getElementById('http-code-badge').innerText = 'HTTP ' + res.status + ' OK';
        document.getElementById('status-text').innerText = data.status || 'UP';
        
        const memMb = (data.memoryUsage / (1024 * 1024)).toFixed(1);
        document.getElementById('memory-text').innerText = memMb + ' MB';

        const totalSec = Math.floor(data.uptime || 0);
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        let uptimeStr = '';
        if (hours > 0) uptimeStr += hours + 'h ';
        if (mins > 0 || hours > 0) uptimeStr += mins + 'm ';
        uptimeStr += secs + 's';
        document.getElementById('uptime-text').innerText = uptimeStr;
        document.getElementById('uptime-seconds').innerText = totalSec.toLocaleString() + ' giây liên tục';

        document.getElementById('latency-text').innerText = latency + ' ms';
        document.getElementById('last-checked').innerText = 'Lần kiểm tra gần nhất: ' + new Date().toLocaleTimeString();
        document.getElementById('json-box').innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        document.getElementById('status-title').innerText = 'Cảnh Báo: Mất Kết Nối Server';
        document.getElementById('status-title').style.color = '#f43f5e';
        document.getElementById('status-text').innerText = 'DOWN';
        document.getElementById('status-text').style.color = '#f43f5e';
        document.getElementById('json-box').innerText = '// Lỗi: ' + err.message;
      }
    }

    setInterval(() => {
      currentCountdown--;
      if (currentCountdown <= 0) {
        currentCountdown = countdown;
        loadHealthData();
      }
      const percent = (currentCountdown / countdown) * 100;
      const bar = document.getElementById('progress-bar');
      if (bar) bar.style.width = percent + '%';
    }, 100);

    loadHealthData();
  </script>
</body>
</html>`;
}
