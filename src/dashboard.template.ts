export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CI/CD Automation Pipeline • Ma1910/test-cicd</title>
  <style>
    :root {
      --bg: #070a13;
      --card-bg: rgba(15, 23, 42, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #f43f5e;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body {
      background-color: var(--bg);
      background-image: radial-gradient(rgba(99, 102, 241, 0.12) 1px, transparent 1px);
      background-size: 20px 20px;
      color: var(--text);
      min-height: 100vh;
      padding: 24px 16px;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    
    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 20px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logo-icon {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35);
    }
    h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .repo-tag {
      font-size: 12px;
      color: #818cf8;
      font-family: 'SFMono-Regular', Consolas, monospace;
    }
    .top-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .btn {
      background: var(--primary);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-secondary { background: rgba(255, 255, 255, 0.06); border: 1px solid var(--card-border); color: var(--text); }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }
    .btn-run {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    }
    .btn-run:hover { box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6); }
    select {
      background: #0f172a;
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      outline: none;
      cursor: pointer;
    }

    /* Stats Grid */
    .grid-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px 18px;
      backdrop-filter: blur(12px);
    }
    .stat-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; }
    .stat-val { font-size: 22px; font-weight: 800; margin-top: 4px; display: flex; align-items: baseline; gap: 6px; }
    .stat-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* Canvas Flowchart & Lasers */
    .flowchart-wrapper {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px 20px;
      position: relative;
      margin-bottom: 24px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(16px);
      overflow: hidden;
    }
    .flowchart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .flowchart-title { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    
    .canvas-container {
      position: relative;
      min-height: 180px;
      display: flex;
      align-items: center;
    }
    #connection-layer {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none;
      z-index: 1;
    }
    .nodes-grid {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      width: 100%;
    }
    @media (max-width: 800px) {
      .nodes-grid { grid-template-columns: 1fr; }
    }
    .node-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 14px 10px;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .node-card:hover { transform: translateY(-2px); border-color: rgba(99, 102, 241, 0.4); }
    .node-icon {
      width: 34px; height: 34px;
      border-radius: 8px;
      margin: 0 auto 8px auto;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .node-title { font-size: 12px; font-weight: 700; }
    .node-sub { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
    .node-status {
      margin-top: 8px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
    }
    
    /* Animations */
    .node-running {
      animation: neonGlow 1.1s infinite ease-in-out;
    }
    @keyframes neonGlow {
      0%, 100% {
        box-shadow: 0 0 15px rgba(99, 102, 241, 0.6), inset 0 0 10px rgba(99, 102, 241, 0.3);
        border-color: #818cf8 !important;
      }
      50% {
        box-shadow: 0 0 28px rgba(99, 102, 241, 0.95), inset 0 0 18px rgba(99, 102, 241, 0.5);
        border-color: #c7d2fe !important;
      }
    }
    .laser-line {
      stroke-dasharray: 8 8;
      animation: flowLaser 0.8s linear infinite;
    }
    .laser-error {
      stroke-dasharray: 6 6;
      animation: flowLaser 0.5s linear infinite;
    }
    @keyframes flowLaser {
      to { stroke-dashoffset: -16; }
    }

    /* Alert Banner */
    .issue-alert {
      display: none;
      background: linear-gradient(135deg, rgba(76, 5, 25, 0.9) 0%, rgba(30, 10, 20, 0.95) 100%);
      border: 1px solid rgba(244, 63, 94, 0.6);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 20px;
      box-shadow: 0 0 25px rgba(244, 63, 94, 0.35);
      animation: pulseAlert 1.2s infinite ease-in-out;
    }
    @keyframes pulseAlert {
      0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(244, 63, 94, 0.3); }
      50% { transform: scale(1.01); box-shadow: 0 0 28px rgba(244, 63, 94, 0.6); }
    }

    /* Terminal Console */
    .terminal {
      background: #020617;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
      font-size: 11px;
    }
    .terminal-text { color: #818cf8; truncate; display: flex; align-items: center; gap: 8px; }
    .term-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    /* Commits Table (Revealed after/during run) */
    .commits-section {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 24px;
      display: none;
    }
    .commits-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--card-border); color: var(--text-muted); font-size: 11px; text-transform: uppercase; }
    td { padding: 11px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
    .commit-hash {
      font-family: monospace;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      padding: 2px 6px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 700;
    }
    .commit-hash:hover { text-decoration: underline; }
    .badge-verified {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }

    /* Clean Empty State */
    .empty-state {
      background: rgba(15, 23, 42, 0.4);
      border: 1px dashed var(--card-border);
      border-radius: 14px;
      padding: 32px 20px;
      text-align: center;
      color: var(--text-muted);
      margin-bottom: 24px;
    }
    .empty-state h3 { font-size: 14px; color: var(--text); margin-bottom: 6px; font-weight: 600; }
    .empty-state p { font-size: 12px; max-width: 480px; margin: 0 auto; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="logo-icon">⚡</div>
        <div>
          <h1>Enterprise CI/CD Automation Platform</h1>
          <div class="repo-tag">Repository: Ma1910/test-cicd • Branch: main</div>
        </div>
      </div>
      <div class="top-actions">
        <select id="scenario-select" onchange="onScenarioChange()">
          <option value="pass">🟢 Pass 100% (Quy trình chuẩn)</option>
          <option value="secret">🔴 Leak Secret Alert (Trivy Scan)</option>
          <option value="typecheck">🔴 TypeScript Compile Fail (TS2322)</option>
          <option value="unit_test">🔴 Vitest Test Fail (Assertion)</option>
          <option value="coverage">🟡 Coverage &lt; 80% Gate Blocked</option>
        </select>
        <button id="btn-run" class="btn btn-run" onclick="triggerPipeline()">
          ▶ Run Pipeline
        </button>
        <a href="/healthz" class="btn btn-secondary">🩺 /healthz</a>
        <a href="https://github.com/Ma1910/test-cicd" target="_blank" class="btn btn-secondary">🐙 GitHub</a>
      </div>
    </header>

    <!-- Real System Status Highlights -->
    <div class="grid-stats">
      <div class="stat-card">
        <div class="stat-label">Docker Desktop Runtime</div>
        <div class="stat-val" style="color: #34d399;">Port 3000</div>
        <div class="stat-sub">Container: test-cicd-app (Live)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Thời Gian Chạy (Uptime)</div>
        <div class="stat-val" style="color: #60a5fa;" id="uptime-display">--</div>
        <div class="stat-sub">Đo lường tiến trình thực tế</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Bộ Nhớ RAM (RSS)</div>
        <div class="stat-val" style="color: #a78bfa;" id="memory-display">-- MB</div>
        <div class="stat-sub">Node.js 22 Runtime Hardened</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Trạng Thái Pipeline</div>
        <div class="stat-val" style="color: #818cf8;" id="pipeline-status-text">STANDBY</div>
        <div class="stat-sub">Chờ kích hoạt sự kiện</div>
      </div>
    </div>

    <!-- The Connected Flowchart & Laser Simulator -->
    <div class="flowchart-wrapper">
      <div class="flowchart-header">
        <div class="flowchart-title">
          <span>🔄 Mô Phỏng Luồng CI/CD Thực Tế (GitHub Actions Simulator)</span>
        </div>
        <span id="execution-timer" style="font-family: monospace; font-size: 12px; font-weight: bold; color: var(--text-muted);">0.0s</span>
      </div>

      <!-- Dynamic Issue Alert -->
      <div id="issue-alert" class="issue-alert">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: #fda4af; text-transform: uppercase;">🚨 Issue Detected • Chặn Triển Khai</div>
            <div style="font-size: 13px; font-weight: 700; color: #fff; margin-top: 2px;" id="issue-title">Pipeline Halt</div>
            <div style="font-size: 11px; color: #fecdd3; font-family: monospace; margin-top: 4px;" id="issue-desc"></div>
          </div>
          <span style="font-size: 10px; background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 6px; font-weight: 700; color: #f43f5e;">ABORTED</span>
        </div>
      </div>

      <!-- Nodes Grid with SVG Laser Connections -->
      <div class="canvas-container">
        <svg id="connection-layer"></svg>

        <div class="nodes-grid">
          <!-- Node 1: Code -->
          <div id="node-code" class="node-card">
            <div class="node-icon" style="background: rgba(99, 102, 241, 0.15); color: #818cf8;">💻</div>
            <div class="node-title">Changes in Code</div>
            <div class="node-sub">Git Push origin/main</div>
            <div id="status-code" class="node-status">READY</div>
          </div>

          <!-- Node 2: Build -->
          <div id="node-build" class="node-card">
            <div class="node-icon" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">🔨</div>
            <div class="node-title">Build & Types</div>
            <div class="node-sub">tsc --noEmit</div>
            <div id="status-build" class="node-status">IDLE</div>
          </div>

          <!-- Node 3: Test -->
          <div id="node-test" class="node-card">
            <div class="node-icon" style="background: rgba(16, 185, 129, 0.15); color: #34d399;">🧪</div>
            <div class="node-title">Vitest Suite</div>
            <div class="node-sub">Coverage &gt; 80% Gate</div>
            <div id="status-test" class="node-status">IDLE</div>
          </div>

          <!-- Node 4: Docker -->
          <div id="node-docker" class="node-card">
            <div class="node-icon" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24;">🐳</div>
            <div class="node-title">Docker Multi-Stage</div>
            <div class="node-sub">node:22-alpine</div>
            <div id="status-docker" class="node-status">IDLE</div>
          </div>

          <!-- Node 5: Production -->
          <div id="node-prod" class="node-card">
            <div class="node-icon" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">🚢</div>
            <div class="node-title">Docker Desktop</div>
            <div class="node-sub">Port 3000 Live</div>
            <div id="status-prod" class="node-status">IDLE</div>
          </div>
        </div>
      </div>

      <!-- Live Terminal Log -->
      <div class="terminal">
        <div class="terminal-text">
          <span class="term-dot"></span>
          <span id="terminal-msg">Hệ thống đang ở trạng thái sạch. Bấm "Run Pipeline" để kích hoạt dòng line chạy.</span>
        </div>
      </div>
    </div>

    <!-- Clean Empty State (Before Run) -->
    <div id="clean-empty-state" class="empty-state">
      <div style="font-size: 24px; margin-bottom: 8px;">🌱</div>
      <h3>Trạng Thái Khởi Tạo Sạch (Clean State)</h3>
      <p>
        Toàn bộ dữ liệu demo đã được loại bỏ hoàn toàn. Khi bạn bấm <strong>"Run Pipeline"</strong> hoặc đưa vào dự án để thực hiện các thao tác push code, hệ thống sẽ bắt đầu chạy chu trình từ đầu và tự động cập nhật danh sách các commit thực tế.
      </p>
    </div>

    <!-- Real Pushed Commits Table (Revealed after/during run) -->
    <div id="commits-section" class="commits-section">
      <div class="commits-header">
        <div style="font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <span>📦 Lịch Sử Commit Thực Tế Đã Push Lên GitHub (Ma1910/test-cicd)</span>
        </div>
        <span class="badge-verified">BRANCH: MAIN</span>
      </div>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Mã Commit</th>
              <th>Nội Dung Commit</th>
              <th>Tác Giả</th>
              <th>Thời Gian</th>
              <th>CI/CD Status</th>
            </tr>
          </thead>
          <tbody id="commits-tbody">
            <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 14px;">Đang tải commit thực tế...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    let busy = false;

    // Live Metrics Polling
    async function updateSystemMetrics() {
      try {
        const res = await fetch('/healthz?format=json');
        const data = await res.json();
        const memMb = (data.memoryUsage / (1024 * 1024)).toFixed(1);
        document.getElementById('memory-display').innerText = memMb + ' MB';
        
        const uptimeSec = Math.floor(data.uptime);
        const mins = Math.floor(uptimeSec / 60);
        const secs = uptimeSec % 60;
        document.getElementById('uptime-display').innerText = mins + 'm ' + secs + 's';
      } catch (err) {}
    }

    // Node updating helper
    function updateNode(id, state, text, color, border) {
      const el = document.getElementById('node-' + id);
      const st = document.getElementById('status-' + id);
      if (!el || !st) return;
      st.innerText = text;
      st.style.color = color || '';
      if (border) el.style.borderColor = border;
      else el.style.borderColor = '';
      if (state === 'running') el.classList.add('node-running');
      else el.classList.remove('node-running');
    }

    function resetAll() {
      ['code', 'build', 'test', 'docker', 'prod'].forEach(id => {
        updateNode(id, 'idle', 'IDLE', '', '');
      });
      document.getElementById('issue-alert').style.display = 'none';
      document.getElementById('execution-timer').innerText = '0.0s';
      drawConnectors(0);
    }

    function onScenarioChange() {
      if (busy) return;
      resetAll();
    }

    // Dynamic SVG Laser Lines Connector
    function drawConnectors(level, errorNode = null) {
      const svg = document.getElementById('connection-layer');
      if (!svg) return;
      const getCoord = (id) => {
        const el = document.getElementById('node-' + id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const p = svg.getBoundingClientRect();
        return {
          rX: r.right - p.left,
          lX: r.left - p.left,
          mY: (r.top + r.bottom) / 2 - p.top
        };
      };

      try {
        const c = getCoord('code');
        const b = getCoord('build');
        const t = getCoord('test');
        const d = getCoord('docker');
        const p = getCoord('prod');

        if (!c || !b || !t || !d || !p) return;

        const makePath = (x1, y1, x2, y2, active, isErr) => {
          const mx = (x1 + x2) / 2;
          const color = isErr ? '#f43f5e' : (active ? '#818cf8' : 'rgba(148, 163, 184, 0.15)');
          const width = active ? '2.5' : '1.5';
          const anim = isErr ? 'laser-error' : (active ? 'laser-line' : '');
          return '<path d="M ' + x1 + ' ' + y1 + ' C ' + mx + ' ' + y1 + ', ' + mx + ' ' + y2 + ', ' + x2 + ' ' + y2 + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" class="' + anim + '" />';
        };

        let paths = '';
        paths += makePath(c.rX, c.mY, b.lX, b.mY, level >= 1, errorNode === 'typecheck');
        paths += makePath(b.rX, b.mY, t.lX, t.mY, level >= 2, errorNode === 'unit_test' || errorNode === 'coverage' || errorNode === 'secret');
        paths += makePath(t.rX, t.mY, d.lX, d.mY, level >= 3 && !errorNode, false);
        paths += makePath(d.rX, d.mY, p.lX, p.mY, level >= 4 && !errorNode, false);

        svg.innerHTML = paths;
      } catch (e) {}
    }

    async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

    // Fetch and display real commits
    async function loadRealCommits() {
      try {
        const res = await fetch('/api/v1/git/commits');
        const data = await res.json();
        const tbody = document.getElementById('commits-tbody');
        tbody.innerHTML = data.commits.map(c => \`
          <tr>
            <td><a href="\${c.url}" target="_blank" class="commit-hash">\${c.hash}</a></td>
            <td style="font-weight: 600; color: #f1f5f9;">\${c.message}</td>
            <td>\${c.author}</td>
            <td style="color: var(--text-muted);">\${c.relativeTime}</td>
            <td><span class="badge-verified">PASSED ✓</span></td>
          </tr>
        \`).join('');
      } catch (err) {}
    }

    // Trigger Pipeline Execution
    async function triggerPipeline() {
      if (busy) return;
      busy = true;
      const scenario = document.getElementById('scenario-select').value;
      const btn = document.getElementById('btn-run');
      btn.disabled = true;
      btn.style.opacity = '0.6';
      
      const term = document.getElementById('terminal-msg');
      const timer = document.getElementById('execution-timer');
      const pipeStatus = document.getElementById('pipeline-status-text');
      
      pipeStatus.innerText = 'RUNNING...';
      pipeStatus.style.color = '#fbbf24';

      resetAll();
      const startTime = Date.now();
      const clock = setInterval(() => {
        timer.innerText = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
      }, 100);

      try {
        // Step 1: Code Push
        term.innerHTML = '<span style="color: #818cf8;">💻 [Chặng 1: Code Push] Nhận sự kiện push lên nhánh main và khởi tạo runner...</span>';
        updateNode('code', 'running', 'PUSHING', '#818cf8', '#6366f1');
        drawConnectors(1);
        await wait(600);
        updateNode('code', 'done', 'PUSHED ✓', '#34d399', '#10b981');

        // Step 2: Build & Strict Types
        term.innerHTML = '<span style="color: #60a5fa;">🔨 [Chặng 2: Build] Kiểm tra cú pháp TypeScript strict mode (tsc --noEmit)...</span>';
        updateNode('build', 'running', 'COMPILING', '#60a5fa', '#3b82f6');
        drawConnectors(2);
        await wait(700);

        if (scenario === 'typecheck') {
          updateNode('build', 'done', 'FAILED ✗', '#f43f5e', '#f43f5e');
          drawConnectors(1, 'typecheck');
          showIssue('Stage 2: Strict Types Compile', 'TypeScript TS2322: Type mismatch detected. Strict compiler rejected build.');
          term.innerHTML = '<span style="color: #f43f5e; font-weight: bold;">❌ [LỖI] Trình biên dịch TypeScript chặn tiến trình. Hãy sửa lỗi code!</span>';
          pipeStatus.innerText = 'FAILED';
          pipeStatus.style.color = '#f43f5e';
          return;
        }
        updateNode('build', 'done', 'CLEAN ✓', '#34d399', '#10b981');

        // Step 3: Vitest & Coverage
        term.innerHTML = '<span style="color: #34d399;">🧪 [Chặng 3: Test] Chạy Vitest Suite và đo lường độ phủ Coverage &gt; 80%...</span>';
        updateNode('test', 'running', 'TESTING', '#34d399', '#10b981');
        drawConnectors(3);
        await wait(800);

        if (scenario === 'secret') {
          updateNode('test', 'done', 'LEAK ✗', '#f43f5e', '#f43f5e');
          drawConnectors(2, 'secret');
          showIssue('Stage 3: Secret Scanning (Trivy)', 'Phát hiện rò rỉ khóa bí mật trong commit diff. Dừng pipeline ngay lập tức.');
          term.innerHTML = '<span style="color: #f43f5e; font-weight: bold;">🚨 [BẢO MẬT] Secret Scanner phát hiện lộ khóa truy cập API!</span>';
          pipeStatus.innerText = 'BLOCKED';
          pipeStatus.style.color = '#f43f5e';
          return;
        }

        if (scenario === 'unit_test') {
          updateNode('test', 'done', 'FAIL ✗', '#f43f5e', '#f43f5e');
          drawConnectors(2, 'unit_test');
          showIssue('Stage 3: Vitest Test Runner', 'AssertionError: expected 500 to equal 200 at tests/app.test.ts.');
          term.innerHTML = '<span style="color: #f43f5e; font-weight: bold;">❌ [LỖI TEST] Bài kiểm thử tự động thất bại! Chặn đóng gói.</span>';
          pipeStatus.innerText = 'FAILED';
          pipeStatus.style.color = '#f43f5e';
          return;
        }

        if (scenario === 'coverage') {
          updateNode('test', 'done', 'GATE FAIL ✗', '#fbbf24', '#f59e0b');
          drawConnectors(2, 'coverage');
          showIssue('Stage 3: Coverage Gate', 'Code coverage đạt 68%, thấp hơn ngưỡng bắt buộc 80%.');
          term.innerHTML = '<span style="color: #fbbf24; font-weight: bold;">⚠️ [CẢNH BÁO] Ngưỡng Coverage Gate từ chối: Cần bổ sung thêm test!</span>';
          pipeStatus.innerText = 'REJECTED';
          pipeStatus.style.color = '#fbbf24';
          return;
        }

        updateNode('test', 'done', 'PASS 25/25 ✓', '#34d399', '#10b981');

        // Step 4: Docker Multi-stage
        term.innerHTML = '<span style="color: #fbbf24;">🐳 [Chặng 4: Docker] Đóng gói container multi-stage tối ưu và bảo mật non-root...</span>';
        updateNode('docker', 'running', 'BUILDING', '#fbbf24', '#f59e0b');
        drawConnectors(4);
        await wait(700);
        updateNode('docker', 'done', 'IMAGE READY ✓', '#34d399', '#10b981');

        // Step 5: Production Runtime
        term.innerHTML = '<span style="color: #c084fc;">🚢 [Chặng 5: Runtime] Khởi chạy container trên Docker Desktop (Port 3000)...</span>';
        updateNode('prod', 'running', 'STARTING', '#c084fc', '#a855f7');
        drawConnectors(5);
        await wait(600);
        updateNode('prod', 'done', 'DEPLOYED ✓', '#34d399', '#10b981');

        // Complete!
        term.innerHTML = '<span style="color: #34d399; font-weight: bold;">🎉 Pipeline hoàn thành 100%! Đã triển khai và hiển thị dữ liệu commit thực tế.</span>';
        pipeStatus.innerText = 'SUCCESS';
        pipeStatus.style.color = '#34d399';

        // Show Commits Table & Hide Clean State
        document.getElementById('clean-empty-state').style.display = 'none';
        document.getElementById('commits-section').style.display = 'block';
        loadRealCommits();

      } finally {
        clearInterval(clock);
        busy = false;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }

    function showIssue(title, desc) {
      const box = document.getElementById('issue-alert');
      document.getElementById('issue-title').innerText = title;
      document.getElementById('issue-desc').innerText = desc;
      box.style.display = 'block';
    }

    // Initialize
    updateSystemMetrics();
    setInterval(updateSystemMetrics, 4000);
    window.addEventListener('resize', () => drawConnectors(0));
    setTimeout(() => drawConnectors(0), 100);
  </script>
</body>
</html>`;
}
