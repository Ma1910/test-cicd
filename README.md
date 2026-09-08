# 🚀 Enterprise-Grade CI/CD Automation Platform

<div align="center">

  <!-- Interactive Live Simulator Launch Button -->
  <a href="https://ma1910.github.io/test-cicd/" target="_blank">
    <img src="https://img.shields.io/badge/🎮_LAUNCH_LIVE_INTERACTIVE_SIMULATOR-ONLINE_PLAYGROUND-6366f1?style=for-the-badge&logo=rocket&logoColor=white" alt="Launch Interactive Simulator" />
  </a>

  <br/><br/>

  <p align="center">
    <em>Nền tảng CI/CD Production chuẩn hóa theo triết lý Ponytail: Tối giản, an toàn cao, tự động kiểm thử toàn diện, đóng gói Docker hardened, triển khai qua SSH với cơ chế tự động Rollback khi gặp sự cố.</em>
  </p>

</div>

---

## 📚 Mục Lục & Tài Liệu Kỹ Thuật

| Tài liệu / Liên kết | Mô tả chi tiết |
| :--- | :--- |
| 🎮 **[Live Interactive Simulator](https://ma1910.github.io/test-cicd/)** | Trình mô phỏng trực tuyến luồng pipeline và 8 kịch bản lỗi trên GitHub Pages. |
| 📖 **[docs/CI-CD.md](docs/CI-CD.md)** | Tài liệu kiến trúc CI/CD, Git workflow, tiêu chuẩn bảo mật và chiến lược Rollback. |
| 🚢 **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Hướng dẫn từng bước thiết lập máy chủ VPS, tường lửa, Docker, Nginx và SSH deploy. |
| 🛡️ **[Workflows CI/CD](.github/workflows/ci.yml)** | Định nghĩa luồng kiểm thử tự động, build Docker và deploy production. |

---

## 📁 Cấu Trúc Thư Mục Chuẩn Hóa (Clean Repository Structure)

Dự án đã được sắp xếp khoa học, tách biệt rõ ràng giữa mã nguồn, kiểm thử, cấu hình triển khai và tài liệu:

```text
.
├── .github/                  # Cấu hình GitHub Actions CI/CD và quy chuẩn Copilot
│   ├── copilot-instructions.md
│   └── workflows/
│       ├── ci.yml            # Pipeline chính: Quality Gate ➔ Docker GHCR ➔ Deploy Production
│       └── pages.yml         # Tự động xuất bản tài liệu & Simulator lên GitHub Pages
├── docs/                     # Toàn bộ tài liệu kỹ thuật & sơ đồ kiến trúc
│   ├── CI-CD.md              # Thiết kế chi tiết hệ thống CI/CD
│   ├── DEPLOYMENT.md         # Hướng dẫn deploy máy chủ VPS thực tế
│   ├── index.html            # Mã nguồn trang Interactive Simulator
│   ├── pipeline-diagram.png  # Sơ đồ kiến trúc độ phân giải cao
│   └── pipeline-diagram.svg  # Sơ đồ kiến trúc vector
├── nginx/                    # Cấu hình Reverse Proxy Nginx cho production
│   └── nginx.conf            # Gzip, SSL termination & Security headers
├── scripts/                  # Toàn bộ script cài đặt và hỗ trợ vận hành
│   ├── setup.ps1             # Cài đặt 1-click cho Windows PowerShell
│   ├── setup.sh              # Cài đặt 1-click cho Linux / macOS
│   ├── setup.js              # Cài đặt cross-platform Node.js
│   ├── check-updates.js      # Kiểm tra cập nhật mới từ đồng đội
│   ├── open-cicd.js          # Mở nhanh dashboard và simulator
│   └── watch-team.js         # Lắng nghe thông báo push commit theo thời gian thực
├── src/                      # Mã nguồn ứng dụng (Microservice TypeScript)
│   ├── app.ts                # Khởi tạo Express API & Routing
│   ├── auth.service.ts       # Xác thực JWT & phân quyền RBAC
│   ├── dashboard.template.ts # Giao diện Web Dashboard tích hợp laser simulator
│   ├── git.service.ts        # Quản lý và trích xuất commit thực tế
│   ├── health.template.ts    # Giao diện giám sát sức khỏe (/healthz)
│   ├── index.ts              # Entrypoint server & Graceful Shutdown
│   ├── metrics.service.ts    # Prometheus telemetry exporter
│   └── products.service.ts   # Quản lý tài nguyên sản phẩm
├── tests/                    # Bộ kiểm thử tự động
│   └── app.test.ts           # 26 bài test Unit & Integration (Vitest + Supertest)
├── .dockerignore             # Loại trừ file rác khi build Docker
├── .env.example              # Mẫu biến môi trường an toàn (không lộ secret)
├── .gitignore                # Chặn rò rỉ secret và file biên dịch tạm
├── docker-compose.yml        # Khởi chạy môi trường local / development
├── docker-compose.prod.yml   # Khởi chạy production (giới hạn RAM/CPU, log rotation)
├── Dockerfile                # Multi-stage build tối ưu node:22-alpine non-root
├── package.json              # Quản lý dependencies và lệnh vận hành
├── tsconfig.json             # Cấu hình TypeScript Strict Mode
└── vitest.config.ts          # Cấu hình kiểm thử và ngưỡng Coverage Gate (>80%)
```

---

## ⚡ Các Lệnh Thao Tác Nhanh (NPM Scripts)

Mọi thao tác phát triển, kiểm thử và vận hành Docker đều được gom gọn gàng trong `package.json`:

### 1. Phát Triển & Kiểm Thử Mã Nguồn
```bash
# Khởi động môi trường phát triển (Hot-reload):
npm run dev

# Kiểm tra cú pháp và kiểu dữ liệu (Strict Mode):
npm run lint
npm run typecheck

# Chạy toàn bộ 26 bài test tự động:
npm test

# Chạy test và đo lường độ phủ mã nguồn (Coverage Gate > 80%):
npm run test:coverage

# Chạy kiểm tra nhanh endpoint sức khỏe (Smoke test):
npm run test:smoke

# Biên dịch mã nguồn ra thư mục dist/:
npm run build
```

### 2. Vận Hành Docker & Container
```bash
# Đóng gói Docker Image cục bộ:
npm run docker:build

# Khởi chạy container phát triển (cổng 3000):
npm run docker:dev

# Khởi chạy container Production kèm Nginx proxy:
npm run docker:prod

# Dừng toàn bộ container:
npm run docker:down
```

### 3. Đồng Bộ Đội Ngũ (Teamwork)
```bash
# Kiểm tra xem đồng đội có push commit mới không:
npm run check:team

# Kéo mã nguồn mới nhất về máy:
npm run sync

# Mở giao diện CI/CD Dashboard trên trình duyệt:
npm run cicd:web
```

---

## 🛡️ Quy Trình CI/CD 3 Chặng Chuẩn Production

1. **Chặng 1 — Quality & Security Gate (Khi Push hoặc mở Pull Request):**
   * Tự động chạy `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`.
   * Quét bảo mật bằng Trivy: Nếu phát hiện rò rỉ API key hoặc Token bí mật, **lập tức đánh rớt và khóa nút Merge PR**.
   * Xuất bảng báo cáo **CI Quality Gate Summary** trực tiếp trên giao diện GitHub Web.
2. **Chặng 2 — Containerization & GHCR Push (Khi merge vào `main` hoặc `develop`):**
   * Đóng gói Docker Multi-Stage (`node:22-alpine`, non-root user `node`, dung lượng siêu nhẹ ~61MB).
   * Tận dụng GitHub Actions Layer Cache (`type=gha`) giúp thời gian build chỉ mất vài giây.
   * Đẩy image lên GitHub Container Registry (`ghcr.io/ma1910/ci-cd-quicktest`) có gắn tag Commit SHA.
3. **Chặng 3 — Triển Khai Production & Tự Động Rollback (Khi merge vào `main`):**
   * Kết nối SSH an toàn vào máy chủ VPS.
   * Sao lưu snapshot container hiện tại làm bản sao khôi phục (`rollback tag`).
   * Cập nhật container qua Docker Compose.
   * Thử nghiệm 10 lần liveness probe tại `http://localhost:3000/healthz`.
   * **Nếu thất bại:** Tự động hoàn tác (*Rollback*) về bản cũ ngay lập tức để bảo vệ hệ thống không bị gián đoạn.

---

## 📥 Tải Về & Khởi Chạy Trên Máy Tính

#### 🪟 Windows (PowerShell)
```powershell
git clone https://github.com/Ma1910/test-cicd.git
cd test-cicd
npm install
npm run dev
```

#### 🐧 Linux & 🍎 macOS (Bash)
```bash
git clone https://github.com/Ma1910/test-cicd.git
cd test-cicd
npm install
npm run dev
```

Sau khi chạy, truy cập trình duyệt tại:
* 🌐 Dashboard trực quan: **`http://localhost:3000`**
* 🩺 Giám sát sức khỏe: **`http://localhost:3000/healthz`**
* 📊 Số liệu Prometheus: **`http://localhost:3000/metrics`**
