# 🧪 Dự án Thực hành & Kiểm thử CI/CD (CI/CD QuickTest)

Dự án này được tạo ra nhằm giúp bạn **trải nghiệm, kiểm thử và thực hành toàn diện quy trình CI/CD** trên GitHub Actions một cách nhanh nhất (thời gian chạy mỗi lần chỉ ~30 giây).

---

## ⚡ 4 Kịch bản kiểm thử thực tế bạn có thể thử ngay

### Kịch bản 1: Kiểm thử luồng thành công (Happy Path)
1. Tạo một repository mới trên GitHub (ví dụ: `ci-cd-quicktest`).
2. Đẩy toàn bộ mã nguồn của dự án này lên GitHub:
   ```bash
   cd C:\Users\Asus\.gemini\antigravity\scratch\ci-cd-quicktest
   git remote add origin https://github.com/<username>/<repo-name>.git
   git push -u origin main
   ```
3. Mở tab **Actions** trên GitHub:
   - Bạn sẽ thấy workflow **`CI - Test & Build`** và **`CD - Container Build & Release`** chạy màu xanh lá (**Passed** ✅) chỉ sau chưa đầy 40 giây!

---

### Kịch bản 2: Kiểm thử tính năng Chặn code lỗi (Failure Gate)
*Mục đích: Đảm bảo CI sẽ lập tức báo đỏ và ngăn chặn code hỏng lọt vào hệ thống.*

1. Mở file [tests/app.test.ts](file:///C:/Users/Asus/.gemini/antigravity/scratch/ci-cd-quicktest/tests/app.test.ts)
2. Sửa dòng 32:
   ```typescript
   // Thay vì: const simulateFail = process.env.SIMULATE_FAIL === "true";
   // Bạn đổi thành:
   const simulateFail = true;
   ```
3. Commit và push lên GitHub:
   ```bash
   git commit -am "test: simulate broken code to test CI failure gate"
   git push origin main
   ```
4. Quan sát tab **Actions**:
   - Pipeline **CI sẽ báo lỗi ĐỎ (Failed ❌)** ngay tại bước `Run Automated Tests`.
   - Pipeline CD sẽ không được kích hoạt, bảo vệ an toàn cho sản phẩm.

---

### Kịch bản 3: Kiểm thử luồng Pull Request (PR Quality Gate)
*Mục đích: Xem cách CI bảo vệ nhánh chính khi làm việc nhóm.*

1. Tạo một nhánh mới:
   ```bash
   git checkout -b feature/awesome-update
   ```
2. Thực hiện một sửa đổi nhỏ trong `src/app.ts`, sau đó commit và push:
   ```bash
   git commit -am "feat: add new endpoint"
   git push origin feature/awesome-update
   ```
3. Lên GitHub tạo **Pull Request** từ nhánh `feature/awesome-update` vào `main`.
4. GitHub sẽ tự động gắn kết quả kiểm thử ngay bên dưới PR: Bạn sẽ thấy dòng chữ *"All checks have passed"* trước khi cho phép bấm **Merge pull request**.

---

### Kịch bản 4: Kiểm thử đóng gói Release Tag (CD Pipeline)
*Mục đích: Tạo phiên bản phát hành tự động.*

1. Tạo một Git Tag phiên bản:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. Quan sát tab **Actions**:
   - Workflow **`CD - Container Build & Release`** sẽ tự động đóng gói Docker image và publish trực tiếp lên **GitHub Packages / Container Registry (`ghcr.io`)**.

---

## 💻 Hướng dẫn chạy thử trên máy (Local)

```bash
# 1. Cài đặt thư viện
npm install

# 2. Chạy kiểm thử tự động
npm test

# 3. Kiểm tra kiểu dữ liệu TypeScript
npm run typecheck

# 4. Chạy ứng dụng
npm run dev

# 5. Kiểm tra API
# Mở trình duyệt hoặc curl: http://localhost:3000/healthz
```
