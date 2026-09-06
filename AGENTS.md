# 🤖 AI Agent & Developer Guidelines (Enterprise Standards)

> **Dành cho tất cả các AI Coding Agents (Antigravity, Cursor, Claude Code, Copilot, Windsurf) & Developers khi làm việc trên Repository này.**

Repository này được bảo vệ bởi hệ thống **Automated CI/CD Pipeline & Quality Gates nghiêm ngặt**. Bất kỳ commit nào vi phạm các nguyên tắc dưới đây đều sẽ bị GitHub Actions từ chối merge hoặc hủy pipeline lập tức.

---

## 📋 1. Quy Trình Làm Việc Bắt Buộc (Mandatory Workflow)

Trước khi thực hiện bất kỳ thay đổi nào hoặc kết thúc một nhiệm vụ, AI PHẢI tuân thủ 4 bước:

### Bước 1: Đồng bộ mã nguồn (Pre-work Sync)
Trước khi viết code mới, luôn kiểm tra và kéo code mới nhất của đồng đội về:
```bash
npm run sync
```

### Bước 2: Viết code theo phong cách "Ponytail" (Zero-Bloat Minimalism)
* **YAGNI**: Không tự ý cài đặt thêm thư viện bên ngoài nếu standard library của Node.js hoặc Express đã giải quyết được.
* **Bảo mật**: Tuyệt đối không hardcode secret key, mật khẩu, JWT token vào mã nguồn.
* **Strict Types**: Luôn khai báo đầy đủ kiểu dữ liệu TypeScript, không sử dụng `any` bừa bãi.

### Bước 3: Kiểm tra chất lượng cục bộ trước khi Push (Pre-push Verification)
AI bắt buộc phải chạy và xác nhận cả 3 lệnh sau đều trả về **Exit code 0**:
```bash
# 1. Kiểm tra toàn bộ kiểu dữ liệu TypeScript (Zero errors)
npm run typecheck

# 2. Chạy toàn bộ 21+ test cases và kiểm tra ngưỡng Code Coverage (Phải >= 80%)
npm run test:coverage

# 3. Biên dịch bản build production
npm run build
```

### Bước 4: Commit và mở PR
* Viết commit message rõ ràng theo chuẩn Conventional Commits (ví dụ: `feat: ...`, `fix: ...`, `test: ...`).
* Nếu có test case mới được bổ sung, hãy đảm bảo tỷ lệ coverage không bị tụt dưới **80%**.

---

## 🛡️ 2. Các Cổng Kiểm Duyệt CI/CD Cần Lưu Ý (Quality & Defense Gates)

| Cổng kiểm tra | Yêu cầu kỹ thuật | Hậu quả nếu vi phạm |
| :--- | :--- | :--- |
| **Secret Scan (Trivy)** | Không chứa credentials, token AWS/GCP, mật khẩu | Pipeline dừng ngay lập tức tại Stage 1 |
| **TypeScript Strict** | `tsc --noEmit` phải đạt 0 warning / 0 error | Build bị dừng ngay tại Stage 2 |
| **Matrix Test (Node 20 & 22)** | Chạy pass trên cả 2 phiên bản LTS song song | Bị đánh dấu ❌ đỏ tại Stage 3 |
| **Coverage Gate** | Tỷ lệ code coverage phải $\ge 80\%$ | Nút Merge PR bị khóa tự động |
| **Docker Hardening** | Chạy dưới quyền user không đặc quyền (`USER node`) | Bị từ chối xuất bản Image lên GHCR |
| **Smoke Test** | Endpoint `/healthz` phải phản hồi HTTP 200 OK | Kích hoạt cơ chế Auto-Rollback |

---

## 💡 3. Các Lệnh Tiện Ích Sẵn Có

```bash
# Bật trình duyệt xem simulator trực quan:
npm run cicd

# Mở trang GitHub Actions Runs để xem DAG real-time:
npm run cicd:actions

# Khởi động server phát triển cục bộ:
npm run dev
```

---
*Tuân thủ các nguyên tắc trên sẽ đảm bảo code của bạn và đồng đội luôn tích hợp mượt mà, ổn định và sẵn sàng cho môi trường Production!*
