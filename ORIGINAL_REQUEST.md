# Original User Request

## 2026-09-08T18:02:42Z

Refactor trực tiếp repository CI/CD hiện tại thành nền tảng CI/CD tự động hóa thực tế (Zero-Mock): tự động nhận diện webhook GitHub khi developer push code, checkout đúng commit SHA vào workspace cách ly, thực thi kiểm tra trên source code thật với exit code thật, lưu trữ pipeline bằng SQLite, stream log realtime qua SSE lên Dashboard, và gửi Commit Status/Check Run về GitHub để chặn merge khi có lỗi.

Working directory: C:\Users\Asus\.gemini\antigravity\scratch\ci-cd-quicktest
Integrity mode: development

## Requirements

### R1. Audit & Loại Bỏ Hoàn Toàn Kiến Trúc Mock / Simulation
Kiểm tra toàn bộ codebase hiện tại, loại bỏ tất cả các logic giả lập:
- Xóa bỏ các dữ liệu hard-coded (Pass 100%, commit cố định, metrics cố định, dropdown kịch bản giả lập scenario-select).
- Xóa bỏ các hàm wait(ms) và chuỗi setTimeout mô phỏng tiến trình pipeline.
- Giữ nguyên các module nghiệp vụ thực tế và cấu trúc chuẩn của repo.

### R2. GitHub Webhook Receiver Chuẩn Bảo Mật (HMAC-SHA256)
Xây dựng endpoint POST /webhooks/github xử lý các sự kiện push và pull_request:
- Trích xuất đầy đủ thông tin thực tế: repository, branch, commit SHA, author, commit message.
- Xác thực chữ ký số X-Hub-Signature-256 bằng HMAC-SHA256 với secret từ biến môi trường GITHUB_WEBHOOK_SECRET.
- Từ chối ngay lập tức (HTTP 401/403) nếu chữ ký sai hoặc thiếu, tuyệt đối không tạo hay chạy pipeline.

### R3. Workspace Cách Ly & Checkout Đúng Commit SHA
Mỗi lần kích hoạt pipeline, hệ thống phải cấp phát một workspace độc lập (ví dụ workspaces/pipeline-<id>):
- Checkout chính xác commit SHA mà GitHub gửi về (không dùng latest hoặc HEAD).
- Sau khi hoàn thành hoặc thất bại, dọn dẹp workspace an toàn để tránh tràn ổ đĩa.

### R4. Tự Phát Hiện Command & Thực Thi Kiểm Tra Thật (Quality Gates)
Pipeline worker phải tự động đọc cấu hình project (package.json, build files) để xác định command thực tế:
- Tuần tự thực thi: Install/Prepare -> Lint & TypeCheck (npm run lint / tsc --noEmit) -> Unit & Integration Tests (npm test) -> Production Build (npm run build) -> Docker Build (nếu có Dockerfile).
- Tuyệt đối không dùng || true hoặc echo giả để che giấu lỗi. Nếu bất kỳ command nào có exit code != 0, pipeline phải đánh dấu FAILED và dừng ngay các bước tiếp theo.

### R5. Database Persistence (SQLite) & Live Realtime Log Streaming
Lưu trữ toàn bộ dữ liệu pipeline và logs thực tế bằng SQLite (tận dụng node:sqlite có sẵn trên Node v24):
- Bảng pipelines: id, repository, branch, commit_sha, commit_message, author, event, status (QUEUED, RUNNING, PASSED, FAILED, CANCELLED), started_at, finished_at, duration.
- Bảng pipeline_steps: pipeline_id, name, status, started_at, finished_at, exit_code, stdout, stderr, error.
- Cung cấp endpoint Server-Sent Events (SSE) /api/pipelines/:id/stream để truyền log và trạng thái realtime tới trình duyệt.

### R6. Tích Hợp GitHub Commit Status / Check Run & Chặn Merge Thật
Sau khi và trong quá trình chạy pipeline:
- Gửi trạng thái thực tế (pending, success, failure) về GitHub Commit Status API (/repos/{owner}/{repo}/statuses/{sha}).
- Đính kèm URL dẫn về trang Dashboard của pipeline để developer có thể bấm vào xem chi tiết lỗi.
- Hướng dẫn thiết lập GitHub Branch Protection Rule yêu cầu status check bắt buộc để chặn merge khi pipeline FAILED.

### R7. Dashboard UI Trực Quan & Nút Run/Re-run Thật
Cập nhật giao diện Web Dashboard:
- Hiển thị danh sách commit và pipeline thực tế từ SQLite.
- Hiển thị tiến trình pipeline thật, log stdout/stderr thực tế của từng step khi click vào.
- Nút "Run Pipeline" cho phép trigger chạy lại pipeline hoặc chọn branch/commit thật để thực thi.
- Endpoint /healthz kiểm tra tính sẵn sàng thực tế của hệ thống (database, runner workspace, worker status).

## Acceptance Criteria

### Xác Thực & Nhận Diện Webhook
- [ ] Gửi webhook push hợp lệ kèm chữ ký X-Hub-Signature-256 chính xác -> Pipeline được tạo với status QUEUED và chạy tự động.
- [ ] Gửi webhook với chữ ký sai hoặc giả mạo -> Request bị từ chối 401, không có pipeline nào được tạo.

### Thực Thi Mã Nguồn Thật & Chặn Lỗi
- [ ] Khi commit có lỗi TypeScript syntax/type (tsc --noEmit exit code != 0) -> Step TypeCheck báo FAILED, toàn bộ pipeline FAILED, các bước Build/Deploy bị chặn.
- [ ] Khi commit có Unit Test bị fail -> Step Test báo FAILED, pipeline báo FAILED.
- [ ] Khi commit code chuẩn đạt mọi test -> Pipeline báo PASSED với exit code 0 cho toàn bộ các step.
- [ ] Hai commit khác nhau push liên tiếp -> Hệ thống phân biệt rõ 2 pipeline độc lập với đúng commit SHA tương ứng.

### Dữ Liệu & Giao Diện Realtime
- [ ] Không còn bất kỳ mock timer (wait()), mock percentage hay dữ liệu giả nào trên Frontend.
- [ ] Khi pipeline đang chạy, Dashboard tự động cập nhật qua SSE (status RUNNING, logs chảy theo thời gian thực) mà không cần reload trang.
- [ ] Log từng bước hiển thị chính xác stdout/stderr từ tiến trình OS thực tế.

### Báo Cáo Trạng Thái Về GitHub
- [ ] GitHub Commit Status nhận được trạng thái pending khi bắt đầu và success/failure khi hoàn tất kèm target_url.

### Chuẩn Ponytail (Zero-Bloat)
- [ ] Tận dụng tối đa Node.js native (node:sqlite, node:crypto, node:child_process, fetch), không cài đặt các thư viện cồng kềnh ngoài luồng.
- [ ] Toàn bộ bộ kiểm thử tự động nội bộ của platform đạt 100% pass.
