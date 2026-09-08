# Hướng Dẫn Triển Khai Máy Chủ Production (Production Deployment Guide)

Tài liệu hướng dẫn từng bước thiết lập một máy chủ Linux (Ubuntu 22.04/24.04 LTS), cấu hình tường lửa, Docker, Nginx, HTTPS và kết nối tự động với GitHub Actions CI/CD.

---

## Bước 1: Chuẩn Bị Máy Chủ VPS & Cấu Hình Tường Lửa (UFW Firewall)

1. Đăng nhập vào máy chủ mới qua SSH bằng tài khoản `root`:
   ```bash
   ssh root@<IP_MAY_CHU>
   ```

2. Cập nhật hệ thống:
   ```bash
   apt update && apt upgrade -y
   ```

3. Cấu hình tường lửa chỉ mở các cổng cần thiết:
   ```bash
   ufw default deny incoming
   ufw default allow outgoing
   ufw allow 22/tcp    # SSH
   ufw allow 80/tcp    # HTTP
   ufw allow 443/tcp   # HTTPS
   ufw enable
   ```

---

## Bước 2: Cài Đặt Docker & Docker Compose Plugin

1. Cài đặt Docker engine chính thức:
   ```bash
   apt install -y ca-certificates curl gnupg
   install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   chmod a+r /etc/apt/keyrings/docker.gpg

   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
     tee /etc/apt/sources.list.d/docker.list > /dev/null

   apt update
   apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

2. Kiểm tra Docker:
   ```bash
   docker --version
   docker compose version
   ```

---

## Bước 3: Tạo Deploy User Riêng Biệt & Thiết Lập SSH Key

1. Tạo người dùng deploy chuyên dụng:
   ```bash
   adduser --disabled-password --gecos "" deployer
   usermod -aG docker deployer
   ```

2. Tạo thư mục SSH cho user `deployer`:
   ```bash
   mkdir -p /home/deployer/.ssh
   chmod 700 /home/deployer/.ssh
   touch /home/deployer/.ssh/authorized_keys
   chmod 600 /home/deployer/.ssh/authorized_keys
   chown -R deployer:deployer /home/deployer/.ssh
   ```

3. Trên máy tính của bạn (hoặc tạo SSH key mới cho CI/CD):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key
   ```
   - Copy nội dung `deploy_key.pub` dán vào `/home/deployer/.ssh/authorized_keys` trên server.
   - Nội dung file `deploy_key` (khóa bí mật) sẽ được dùng để đưa vào GitHub Secrets.

---

## Bước 4: Chuẩn Bị Thư Mục Dự Án Trên Máy Chủ

1. Tạo thư mục chứa ứng dụng:
   ```bash
   mkdir -p /opt/app/nginx
   chown -R deployer:deployer /opt/app
   ```

2. Copy tệp `docker-compose.prod.yml` và `nginx/nginx.conf` lên máy chủ tại thư mục `/opt/app`.
3. Tạo file cấu hình môi trường bí mật trên máy chủ tại `/opt/app/.env.production`:
   ```bash
   cat << 'EOF' > /opt/app/.env.production
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your_real_production_jwt_secret_minimum_32_characters
   EOF
   chmod 600 /opt/app/.env.production
   chown deployer:deployer /opt/app/.env.production
   ```

---

## Bước 5: Cấu Hình GitHub Secrets Cho Repository

Truy cập repository trên GitHub: `Settings` ➔ `Secrets and variables` ➔ `Actions` ➔ `New repository secret`, thêm các secret sau:

| Tên Secret | Giá trị |
| :--- | :--- |
| `PROD_HOST` | Địa chỉ IP của máy chủ VPS của bạn |
| `PROD_USER` | `deployer` |
| `PROD_SSH_KEY` | Toàn bộ nội dung tệp khóa riêng tư `deploy_key` |
| `PROD_DOMAIN` | Tên miền của bạn (ví dụ: `api.yourdomain.com` hoặc để trống) |

---

## Bước 6: Kiểm Tra & Triển Khai Lần Đầu

1. Đẩy một commit lên nhánh `main`:
   ```bash
   git push origin main
   ```
2. Vào tab **Actions** trên GitHub để theo dõi tiến trình:
   - Job `Quality & Security Gate`: Chạy typecheck, vitest coverage, secret scan.
   - Job `Docker Build & Push`: Đóng gói image và đưa lên `ghcr.io`.
   - Job `Production Deployment`: Tự động SSH vào máy chủ, kéo image về, chạy docker compose và kiểm tra `/healthz`.
3. Khi hoàn tất, mở trình duyệt truy cập:
   `http://<IP_MAY_CHU>/` hoặc `http://<IP_MAY_CHU>/healthz`
