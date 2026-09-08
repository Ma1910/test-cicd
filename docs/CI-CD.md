# Kiến Trúc CI/CD Toàn Diện (Production Architecture & Operations)

Tài liệu kỹ thuật giải thích chi tiết toàn bộ kiến trúc quy trình CI/CD, cơ chế kiểm soát chất lượng, đóng gói Docker, triển khai Production và khôi phục sự cố (Rollback) cho dự án.

---

## 1. Kiến Trúc Tổng Quan (Pipeline Architecture)

```
Developer (Local)
      ↓ (git push / Pull Request)
GitHub Repository (Ma1910/test-cicd)
      ↓
GitHub Actions Runner
  ├── [Job 1: Quality & Security Gate]
  │     ├── 1. Checkout repository & setup Node.js 22 LTS
  │     ├── 2. Caching dependencies (`npm ci`)
  │     ├── 3. Strict Typecheck (`tsc --noEmit`)
  │     ├── 4. Vitest Suite & Code Coverage Gate (>80% required)
  │     └── 5. Trivy Secret Scanning (Quét rò rỉ khóa bí mật, API key)
  │
  ├── [Job 2: Docker Multi-Stage Build & Push] (Chỉ chạy khi push main/develop)
  │     ├── 1. Setup Docker Buildx & GitHub Actions Layer Cache
  │     ├── 2. Build multi-stage image (`node:22-alpine` non-root)
  │     └── 3. Push hardened image lên GitHub Container Registry (ghcr.io)
  │
  └── [Job 3: Production Deploy & Automated Rollback] (Chỉ chạy trên nhánh main)
        ├── 1. Kết nối an toàn qua SSH tới máy chủ Production
        ├── 2. Lưu snapshot container hiện tại làm bản sao dự phòng (`rollback tag`)
        ├── 3. Kéo image mới nhất từ GHCR
        ├── 4. Docker Compose rolling restart dịch vụ
        ├── 5. Thực hiện 10 lần kiểm tra liveness (`curl -f /healthz`)
        └── 6. NẾU THẤT BẠI: Tự động kích hoạt cơ chế Rollback về phiên bản trước!
```

---

## 2. Git Workflow Đề Xuất (Trunk-based / Simplified Git Flow)

Phù hợp với tiêu chuẩn **Ponytail (Minimal Code, Maximum Practicality)**:

```
main (Production Release - Đòi hỏi PR review & CI pass)
  ↑
develop (Staging / Integration testing)
  ↑
feature/*  hoặc  fix/*
```

* **Branch `main`**: Môi trường Production. Bắt buộc bảo vệ nhánh (*Branch Protection*), chỉ merge qua PR khi tất cả các kiểm tra CI đều đạt tích xanh (Pass 100%).
* **Branch `develop`**: Môi trường Staging để kiểm thử tích hợp.
* **Feature Branches (`feature/ten-tinh-nang`, `fix/loi-cu-the`)**: Nhánh làm việc hàng ngày của lập trình viên.

---

## 3. Hệ Thống Biến Môi Trường & Bảo Mật Bí Mật (Secrets Management)

### Quy tắc phân định:
1. **Public Configuration**: Đặt trong file `.env.example` hoặc tệp config (ví dụ: `PORT=3000`, `NODE_ENV=production`).
2. **Private Secrets**: **Tuyệt đối KHÔNG commit vào Git**. Thiết lập trong GitHub Secrets (`Settings -> Secrets and Variables -> Actions`):
   - `PROD_HOST`: Địa chỉ IP hoặc tên miền máy chủ production.
   - `PROD_USER`: Tên tài khoản deploy trên server (ví dụ: `deployer` hoặc `ubuntu`).
   - `PROD_SSH_KEY`: Khóa SSH Private Key tương ứng để đăng nhập.
   - `JWT_SECRET`: Chuỗi khóa bảo mật tạo token xác thực.

---

## 4. Tối Ưu Hóa Docker & Layer Caching

* **Multi-Stage Build**:
  - `Stage 1 (builder)`: Sử dụng đầy đủ `node:22-alpine`, cài đặt devDependencies để biên dịch TypeScript sang JavaScript trong thư mục `dist/`, sau đó chạy `npm prune --production`.
  - `Stage 2 (runner)`: Chỉ copy `dist/` và `node_modules/` đã được lọc sang image cuối cùng. Loại bỏ toàn bộ trình biên dịch và devDependencies.
* **Bảo Mật Container**: Chạy dưới quyền người dùng không có đặc quyền `USER node` (Non-Root) để chống leo thang đặc quyền (Privilege Escalation).
* **Healthcheck Tích Hợp**: Docker Daemon định kỳ 15 giây gọi lệnh `curl -f http://localhost:3000/healthz` để theo dõi tình trạng sống của container.

---

## 5. Quy Trình Khôi Phục Sự Cố (Rollback Strategy)

1. **Rollback Tự Động Trong CI/CD**:
   - Trong quá trình triển khai tại bước `deploy-production`, script trên server sẽ kiểm tra phản hồi của endpoint `/healthz` liên tục tối đa 10 lần (mỗi lần cách nhau 3 giây).
   - Nếu container không trả về `{"status":"UP"}` trong vòng 30 giây, script sẽ lập tức khởi chạy lại bản sao container trước đó (`cicd-app-previous:rollback`) và thoát với mã lỗi 1 để gửi thông báo cảnh báo.

2. **Rollback Thủ Công (Manual Rollback khi cần)**:
   - Nếu phát hiện lỗi logic nghiệp vụ sau khi deploy thành công, đăng nhập vào máy chủ và chạy:
     ```bash
     cd /opt/app
     DOCKER_IMAGE=ghcr.io/ma1910/ci-cd-quicktest:<COMMIT_SHA_TRUOC_DO> docker compose -f docker-compose.prod.yml up -d
     ```

---

## 6. Giám Sát & Vận Hành (Monitoring & Telemetry)

* **Healthcheck & Liveness**: Endpoint `GET /healthz` trả về trạng thái UP, thời gian chạy và dung lượng RAM tiêu thụ.
* **Prometheus Metrics**: Endpoint `GET /metrics` xuất định dạng chuẩn cho hệ thống Prometheus/Grafana thu thập số lượng request, HTTP status codes và uptime.
* **Log Rotation**: Cấu hình trong `docker-compose.prod.yml` giới hạn kích thước file log tối đa 10MB và tối đa 3 file xoay vòng để tránh làm đầy ổ đĩa server.
