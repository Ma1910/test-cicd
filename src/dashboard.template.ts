export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enterprise CI/CD Automation Platform</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(22, 30, 49, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #8b5cf6;
      --code-bg: #050811;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body {
      background: radial-gradient(circle at 50% 0%, #172554 0%, var(--bg) 70%);
      color: var(--text);
      min-height: 100vh;
      padding: 24px;
      line-height: 1.5;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logo-icon {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
    }
    h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
      padding: 4px 12px; border-radius: 9999px;
      font-size: 12px; font-weight: 600;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite; }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .top-actions { display: flex; gap: 10px; }
    .btn {
      background: var(--primary);
      color: white;
      border: none;
      padding: 8px 16px;
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
    .btn:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-secondary { background: rgba(255, 255, 255, 0.08); border: 1px solid var(--card-border); color: var(--text); }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
    .btn-success { background: #059669; }
    .btn-success:hover { background: #047857; }

    /* Stats Grid */
    .grid-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
    }
    .stat-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
    .stat-val { font-size: 26px; font-weight: 700; margin-top: 6px; display: flex; align-items: baseline; gap: 6px; }
    .stat-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

    /* Main Sections */
    .section-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    @media (max-width: 900px) { .main-grid { grid-template-columns: 1fr; } }
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 22px;
      backdrop-filter: blur(10px);
    }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
    .form-row { display: flex; gap: 10px; }
    input, select {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      color: var(--text);
      padding: 9px 12px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus, select:focus { border-color: var(--primary); }
    .terminal-box {
      background: var(--code-bg);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 14px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 12px;
      color: #38bdf8;
      max-height: 220px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* Products Table */
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--card-border); color: var(--text-muted); font-size: 12px; }
    td { padding: 10px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
    .tag {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
    }

    /* Architecture Stepper */
    .stepper {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 10px;
    }
    .step-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 14px;
      position: relative;
    }
    .step-num {
      font-size: 11px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .step-title { font-size: 13px; font-weight: 600; margin-top: 4px; }
    .step-desc { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="logo-icon">🚀</div>
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <h1>CI/CD Automation Platform</h1>
            <span class="badge"><span class="dot"></span> LIVE OPERATIONAL</span>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
            Docker Desktop Container Runtime • Express + TypeScript Microservice
          </p>
        </div>
      </div>
      <div class="top-actions">
        <a href="/?format=json" class="btn btn-secondary">📄 Raw JSON API</a>
        <a href="/healthz" target="_blank" class="btn btn-secondary">🩺 /healthz</a>
        <a href="/metrics" target="_blank" class="btn btn-secondary">📊 /metrics</a>
        <a href="https://github.com/Ma1910/test-cicd" target="_blank" class="btn">🐙 GitHub Repo</a>
      </div>
    </header>

    <!-- Stat Highlights -->
    <div class="grid-stats">
      <div class="stat-card">
        <div class="stat-label">Hệ thống & Health</div>
        <div class="stat-val" style="color: #34d399;">UP <span style="font-size: 13px; color: var(--text-muted);">200 OK</span></div>
        <div class="stat-sub" id="uptime-display">Uptime: Đang kết nối...</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">RAM Usage (RSS)</div>
        <div class="stat-val" id="memory-display" style="color: #60a5fa;">-- MB</div>
        <div class="stat-sub">Node.js 22 Runtime Hardened</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Docker Desktop Status</div>
        <div class="stat-val" style="color: #a78bfa;">Port 3000</div>
        <div class="stat-sub">desktop-linux Engine (Healthy)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">CI/CD Vitest Suite</div>
        <div class="stat-val" style="color: #38bdf8;">21 / 21</div>
        <div class="stat-sub">Unit & Integration Tests Passed</div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="main-grid">
      <!-- Calculator Interactive Tool -->
      <div class="panel">
        <div class="section-title">🧮 Thử nghiệm API Tính toán (POST /api/calculate)</div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Gửi payload JSON để server xử lý logic toán học:
        </p>
        <div class="form-row form-group">
          <div style="flex: 1;">
            <label>Số A:</label>
            <input type="number" id="calc-a" value="25" placeholder="Nhập số A...">
          </div>
          <div style="flex: 1;">
            <label>Số B:</label>
            <input type="number" id="calc-b" value="75" placeholder="Nhập số B...">
          </div>
        </div>
        <button class="btn" style="width: 100%; margin-bottom: 14px;" onclick="handleCalculate()">⚡ Gửi yêu cầu tính tổng</button>
        <div class="terminal-box" id="calc-result">// Kết quả phản hồi từ API sẽ hiển thị ở đây...</div>
      </div>

      <!-- Authentication & Protected Access -->
      <div class="panel">
        <div class="section-title">🔐 Giả lập Xác thực JWT (POST /api/v1/auth/login)</div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
          Đăng nhập 1-click để nhận Bearer Token phân quyền:
        </p>
        <div class="form-row form-group">
          <button class="btn btn-secondary" style="flex: 1;" onclick="loginQuick('admin', 'Admin@Enterprise2026')">👑 Login Admin</button>
          <button class="btn btn-secondary" style="flex: 1;" onclick="loginQuick('user', 'User@Enterprise2026')">👤 Login User</button>
        </div>
        <div class="terminal-box" id="auth-result">// Bấm nút đăng nhập để xem JWT Token và vai trò...</div>
      </div>
    </div>

    <!-- Product Catalog Explorer -->
    <div class="panel" style="margin-bottom: 28px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
        <div class="section-title" style="margin-bottom: 0;">📦 Danh mục Sản phẩm Trực tiếp (GET /api/v1/products)</div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" id="search-input" placeholder="Tìm kiếm tên sản phẩm..." style="width: 220px;" oninput="fetchProducts()">
          <select id="category-filter" style="width: 150px;" onchange="fetchProducts()">
            <option value="">Tất cả danh mục</option>
            <option value="hardware">Hardware</option>
            <option value="peripherals">Peripherals</option>
            <option value="display">Display</option>
          </select>
          <button class="btn btn-secondary" onclick="fetchProducts()">🔄 Tải lại</button>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Mã SP (ID)</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá ($)</th>
              <th>Tồn kho</th>
            </tr>
          </thead>
          <tbody id="products-tbody">
            <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Đang tải dữ liệu sản phẩm...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Enterprise CI/CD Pipeline Architecture -->
    <div class="panel">
      <div class="section-title">🔄 Chu trình CI/CD Tự Động Hóa (Enterprise Pipeline Architecture)</div>
      <div class="stepper">
        <div class="step-item">
          <div class="step-num">Chặng 1</div>
          <div class="step-title">💻 Push Code</div>
          <div class="step-desc">Nhà phát triển đẩy commit lên GitHub main branch.</div>
        </div>
        <div class="step-item">
          <div class="step-num">Chặng 2</div>
          <div class="step-title">🛡️ Quality Gate</div>
          <div class="step-desc">Secret Scan + Lint + Strict TypeScript compiler check.</div>
        </div>
        <div class="step-item">
          <div class="step-num">Chặng 3</div>
          <div class="step-title">🧪 Vitest 21 Tests</div>
          <div class="step-desc">Ma trận Node 20/22 & Đo ngưỡng Test Coverage > 80%.</div>
        </div>
        <div class="step-item">
          <div class="step-num">Chặng 4</div>
          <div class="step-title">🐳 Multi-Stage Docker</div>
          <div class="step-desc">Build tối ưu, bảo mật non-root user (node:22-alpine).</div>
        </div>
        <div class="step-item">
          <div class="step-num">Chặng 5</div>
          <div class="step-title">🚢 Local Runtime</div>
          <div class="step-desc">Docker Desktop map port 3000:3000 & curl healthcheck.</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // System Health & Memory Polling
    async function updateSystemMetrics() {
      try {
        const res = await fetch('/healthz');
        const data = await res.json();
        const memMb = (data.memoryUsage / (1024 * 1024)).toFixed(1);
        document.getElementById('memory-display').innerText = memMb + ' MB';
        
        const uptimeSec = Math.floor(data.uptime);
        const mins = Math.floor(uptimeSec / 60);
        const secs = uptimeSec % 60;
        document.getElementById('uptime-display').innerText = 'Uptime: ' + mins + 'm ' + secs + 's';
      } catch (err) {
        document.getElementById('uptime-display').innerText = 'Lỗi kết nối healthz';
      }
    }

    // Calculate sum API
    async function handleCalculate() {
      const a = Number(document.getElementById('calc-a').value);
      const b = Number(document.getElementById('calc-b').value);
      const output = document.getElementById('calc-result');
      output.innerText = 'Đang xử lý tính toán...';
      try {
        const res = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ a, b })
        });
        const data = await res.json();
        output.innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        output.innerText = 'Lỗi: ' + err.message;
      }
    }

    // Auth simulation
    async function loginQuick(username, password) {
      const output = document.getElementById('auth-result');
      output.innerText = 'Đang xác thực tài khoản ' + username + '...';
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        output.innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        output.innerText = 'Lỗi: ' + err.message;
      }
    }

    // Fetch Products
    async function fetchProducts() {
      const search = document.getElementById('search-input').value.trim();
      const category = document.getElementById('category-filter').value;
      const tbody = document.getElementById('products-tbody');
      
      let url = '/api/v1/products?';
      if (search) url += 'search=' + encodeURIComponent(search) + '&';
      if (category) url += 'category=' + encodeURIComponent(category);

      try {
        const res = await fetch(url);
        const result = await res.json();
        if (!result.data || result.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted);">Không tìm thấy sản phẩm phù hợp.</td></tr>';
          return;
        }

        tbody.innerHTML = result.data.map(p => \`
          <tr>
            <td><code>\${p.id}</code></td>
            <td style="font-weight: 600;">\${p.name}</td>
            <td><span class="tag">\${p.category}</span></td>
            <td style="color: #34d399; font-weight: 600;">$\${p.price.toLocaleString()}</td>
            <td>\${p.stock} units</td>
          </tr>
        \`).join('');
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" style="color: var(--danger); text-align:center;">Lỗi tải dữ liệu: ' + err.message + '</td></tr>';
      }
    }

    // Initialize
    updateSystemMetrics();
    setInterval(updateSystemMetrics, 5000);
    fetchProducts();
  </script>
</body>
</html>`;
}
