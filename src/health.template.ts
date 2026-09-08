export function renderHealthHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Health & Diagnostics • CI/CD Platform</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(22, 30, 49, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #3b82f6;
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.25);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --code-bg: #050811;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body {
      background: radial-gradient(circle at 50% 0%, #064e3b 0%, var(--bg) 65%);
      color: var(--text);
      min-height: 100vh;
      padding: 24px;
      line-height: 1.5;
    }
    .container { max-width: 960px; margin: 0 auto; }
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
      0% { transform: scale(1); }
      14% { transform: scale(1.12); }
      28% { transform: scale(1); }
      42% { transform: scale(1.12); }
      70% { transform: scale(1); }
    }
    h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .nav-actions { display: flex; gap: 10px; }
    .btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover { background: rgba(255, 255, 255, 0.16); transform: translateY(-1px); }
    .btn-primary { background: #059669; border: none; }
    .btn-primary:hover { background: #047857; }

    /* Overall Status Banner */
    .hero-banner {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.1) 100%);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 16px;
      padding: 24px 28px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.15);
    }
    .hero-status { display: flex; align-items: center; gap: 14px; }
    .status-ping {
      width: 16px; height: 16px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 6px var(--success-glow);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .hero-title { font-size: 20px; font-weight: 700; color: #34d399; }
    .hero-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 18px;
      backdrop-filter: blur(10px);
    }
    .metric-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.05em; }
    .metric-value { font-size: 22px; font-weight: 700; margin-top: 6px; }
    .metric-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

    /* Services List */
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 22px;
      margin-bottom: 24px;
      backdrop-filter: blur(10px);
    }
    .panel-title { font-size: 15px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
    .service-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .service-info { display: flex; align-items: center; gap: 12px; }
    .service-dot { width: 10px; height: 10px; border-radius: 50%; background: #10b981; }
    .service-name { font-size: 13px; font-weight: 600; }
    .service-desc { font-size: 11px; color: var(--text-muted); }
    .badge-ok {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Live Telemetry Stream */
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
      background: rgba(16, 185, 129, 0.2);
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
            Hệ thống giám sát độ khả dụng (Service Availability & Healthcheck Monitor)
          </p>
        </div>
      </div>
      <div class="nav-actions">
        <a href="/" class="btn">🏠 Trang Chủ Dashboard</a>
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
        <span class="badge-ok" style="font-size: 13px; padding: 6px 14px;" id="http-code-badge">HTTP 200 OK</span>
      </div>
    </div>

    <!-- Live Metric Cards -->
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
        <div class="metric-sub">Phản hồi cục bộ cực nhanh</div>
      </div>
    </div>

    <!-- Sub-Services Checklist -->
    <div class="panel">
      <div class="panel-title">
        <span>📋 Danh Sách Phân Hệ Hoạt Động</span>
        <span style="font-size: 12px; color: var(--text-muted); font-weight: normal;">5/5 dịch vụ khả dụng</span>
      </div>

      <div class="service-row">
        <div class="service-info">
          <div class="service-dot"></div>
          <div>
            <div class="service-name">HTTP API Microservice Server</div>
            <div class="service-desc">Express v5 engine, cổng kết nối 3000</div>
          </div>
        </div>
        <span class="badge-ok">HOẠT ĐỘNG</span>
      </div>

      <div class="service-row">
        <div class="service-info">
          <div class="service-dot"></div>
          <div>
            <div class="service-name">Docker Engine Runtime</div>
            <div class="service-desc">Docker Desktop Linux daemon (Port 3000:3000)</div>
          </div>
        </div>
        <span class="badge-ok">KẾT NỐI</span>
      </div>

      <div class="service-row">
        <div class="service-info">
          <div class="service-dot"></div>
          <div>
            <div class="service-name">Bảo Mật & Giới Hạn Tần Suất (Rate Limiter)</div>
            <div class="service-desc">Chống spam (100 requests/phút) & ẩn x-powered-by</div>
          </div>
        </div>
        <span class="badge-ok">BẢO VỆ</span>
      </div>

      <div class="service-row">
        <div class="service-info">
          <div class="service-dot"></div>
          <div>
            <div class="service-name">Hệ Thống Xác Thực JWT (Auth Token Service)</div>
            <div class="service-desc">Xác thực quyền Admin/User mã hóa Bearer token</div>
          </div>
        </div>
        <span class="badge-ok">SẴN SÀNG</span>
      </div>

      <div class="service-row">
        <div class="service-info">
          <div class="service-dot"></div>
          <div>
            <div class="service-name">Bộ Đo Lường Prometheus (Telemetry Service)</div>
            <div class="service-desc">Thu thập số liệu request/latency tại /metrics</div>
          </div>
        </div>
        <span class="badge-ok">GHI NHẬN</span>
      </div>
    </div>

    <!-- Live JSON Response Viewer -->
    <div class="panel">
      <div class="panel-title">
        <span>📡 Dữ Liệu Phản Hồi Từ /healthz (Live Diagnostic Payload)</span>
        <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">Tự động cập nhật mỗi 3s</span>
      </div>
      <div class="log-box" id="json-box">Đang truy vấn dữ liệu chẩn đoán...</div>
      <div class="auto-refresh-bar">
        <div class="auto-refresh-progress" id="progress-bar"></div>
      </div>
    </div>
  </div>

  <script>
    let countdown = 30; // 3 seconds = 30 intervals of 100ms
    let currentCountdown = countdown;

    async function loadHealthData() {
      const startTime = performance.now();
      try {
        const res = await fetch('/healthz?format=json');
        const latency = Math.round(performance.now() - startTime);
        const data = await res.json();

        // Update indicators
        document.getElementById('http-code-badge').innerText = 'HTTP ' + res.status + ' OK';
        document.getElementById('status-text').innerText = data.status || 'UP';
        
        // Memory MB
        const memMb = (data.memoryUsage / (1024 * 1024)).toFixed(1);
        document.getElementById('memory-text').innerText = memMb + ' MB';

        // Uptime formatting
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

        // Latency
        document.getElementById('latency-text').innerText = latency + ' ms';
        document.getElementById('last-checked').innerText = 'Lần kiểm tra gần nhất: ' + new Date().toLocaleTimeString();

        // JSON payload
        document.getElementById('json-box').innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        document.getElementById('status-title').innerText = 'Cảnh Báo: Mất Kết Nối Server';
        document.getElementById('status-title').style.color = '#ef4444';
        document.getElementById('status-text').innerText = 'DOWN';
        document.getElementById('status-text').style.color = '#ef4444';
        document.getElementById('json-box').innerText = '// Lỗi khi lấy dữ liệu: ' + err.message;
      }
    }

    // Timer loop for auto-refresh
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

    // Initial load
    loadHealthData();
  </script>
</body>
</html>`;
}
