# Hướng Dẫn Cấu Hình Redis

> [!NOTE]
> Tài liệu này hướng dẫn cách tạo và cấu hình `REDIS_URL` để kết nối với Redis server.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Lựa Chọn Redis Provider](#2-lựa-chọn-redis-provider)
3. [Cài Đặt Redis Local](#3-cài-đặt-redis-local)
4. [Sử Dụng Cloud Redis](#4-sử-dụng-cloud-redis)
5. [Cập Nhật File .env](#5-cập-nhật-file-env)
6. [Xác Minh Kết Nối](#6-xác-minh-kết-nối)
7. [Xử Lý Lỗi Thường Gặp](#7-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

**Redis** là hệ thống lưu trữ key-value trong bộ nhớ, được GEN-HUB sử dụng cho:
- **Caching** - Tăng tốc độ truy vấn
- **Session storage** - Lưu phiên đăng nhập
- **Rate limiting** - Giới hạn request
- **Real-time features** - WebSocket, pub/sub

### Biến môi trường cần cấu hình:

| Biến | Mô tả |
|------|-------|
| `REDIS_URL` | Connection string để kết nối Redis |

### Format của REDIS_URL:

```
redis://[username]:[password]@[host]:[port]/[database]
```

**Ví dụ:**
```
redis://default:mypassword@localhost:6379/0
```

---

## 2. Lựa Chọn Redis Provider

### Môi trường Development (Local)
- **Redis Local** - Cài đặt trực tiếp (Linux/macOS)
- **Docker** - Chạy Redis trong container ⭐ Khuyến nghị cho Windows
- **Memurai** - Redis-compatible cho Windows

### Môi trường Production (Cloud)
- **Upstash** - Serverless Redis, có gói miễn phí ⭐ Khuyến nghị
- **Redis Cloud** - Managed Redis chính thức
- **Railway** - Dễ deploy, có gói miễn phí
- **Amazon ElastiCache** - Enterprise

---

## 3. Cài Đặt Redis Local

### 3.1. Windows (Docker - Khuyến nghị)

> [!IMPORTANT]
> Redis không hỗ trợ Windows chính thức. Sử dụng **Docker** hoặc **WSL2** để chạy Redis trên Windows.

#### Bước 1: Cài đặt Docker Desktop
1. Tải Docker Desktop: https://www.docker.com/products/docker-desktop
2. Cài đặt và khởi động Docker Desktop
3. Đảm bảo Docker đang chạy (icon trong system tray)

#### Bước 2: Chạy Redis container
```bash
# Chạy Redis với password
docker run -d --name genhub-redis -p 6379:6379 redis:alpine redis-server --requirepass your_redis_password

# Hoặc không có password (chỉ cho development)
docker run -d --name genhub-redis -p 6379:6379 redis:alpine
```

#### Bước 3: Kiểm tra Redis đang chạy
```bash
docker ps
# Sẽ thấy container genhub-redis đang chạy
```

#### REDIS_URL cho Docker:
```
# Có password
redis://default:your_redis_password@localhost:6379/0

# Không password
redis://localhost:6379/0
```

---

### 3.2. Windows (Memurai - Redis Alternative)

#### Bước 1: Tải Memurai
1. Truy cập: https://www.memurai.com/
2. Tải **Memurai Developer Edition** (miễn phí cho development)
3. Chạy installer

#### Bước 2: Cài đặt
1. Chấp nhận license agreement
2. Chọn thư mục cài đặt
3. Port: `6379` (mặc định)
4. Hoàn tất cài đặt

#### Bước 3: Khởi động Memurai
Memurai sẽ tự động chạy như Windows Service.

#### REDIS_URL cho Memurai:
```
redis://localhost:6379/0
```

---

### 3.3. Linux (Ubuntu/Debian)

```bash
# Cài đặt Redis
sudo apt update
sudo apt install redis-server

# Khởi động Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Kiểm tra
redis-cli ping
# Phản hồi: PONG
```

#### Cấu hình password (khuyến nghị):
```bash
# Mở file cấu hình
sudo nano /etc/redis/redis.conf

# Tìm và sửa dòng:
requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis-server
```

#### REDIS_URL cho Linux:
```
redis://default:your_redis_password@localhost:6379/0
```

---

### 3.4. macOS

```bash
# Cài đặt qua Homebrew
brew install redis

# Khởi động Redis
brew services start redis

# Kiểm tra
redis-cli ping
# Phản hồi: PONG
```

#### REDIS_URL cho macOS:
```
redis://localhost:6379/0
```

---

### 3.5. Docker Compose (Khuyến nghị)

#### Tạo file `docker-compose.yml`:
```yaml
version: '3.8'
services:
  redis:
    image: redis:alpine
    container_name: genhub-redis
    command: redis-server --requirepass your_redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

#### Chạy:
```bash
docker-compose up -d
```

---

## 4. Sử Dụng Cloud Redis

### 4.1. Upstash (Khuyến nghị - Serverless)

#### Bước 1: Tạo tài khoản
1. Truy cập: https://upstash.com
2. Click **Sign Up**
3. Đăng nhập bằng **GitHub**, **Google**, hoặc **Email**

#### Bước 2: Tạo Database
1. Click **Create Database**
2. Điền thông tin:
   - **Name**: `genhub-redis`
   - **Type**: Regional (hoặc Global nếu cần)
   - **Region**: Chọn region gần nhất (VD: `Singapore`)
3. Click **Create**

#### Bước 3: Lấy Connection String
1. Sau khi tạo, bạn sẽ thấy dashboard của database
2. Tìm mục **REST API** hoặc **Redis Connection**
3. Copy **Redis URL**:
   ```
   rediss://default:xxxxxxxxxxxxxx@apn1-example.upstash.io:6379
   ```

> [!IMPORTANT]
> Upstash sử dụng `rediss://` (có 2 chữ s) cho TLS connection.

#### Free Tier Limits:
- 10,000 commands/day
- 256 MB storage
- 1 database

---

### 4.2. Redis Cloud (Official)

#### Bước 1: Tạo tài khoản
1. Truy cập: https://redis.com/try-free/
2. Click **Get started free**
3. Đăng nhập bằng **Google** hoặc **Email**

#### Bước 2: Tạo Subscription
1. Chọn **Fixed plan** → **Free** (30 MB)
2. Cloud: **AWS** hoặc **GCP**
3. Region: Chọn region gần nhất
4. Click **Create subscription**

#### Bước 3: Tạo Database
1. Click **New Database**
2. Database name: `genhub`
3. Click **Activate**

#### Bước 4: Lấy Connection Info
1. Click vào database vừa tạo
2. Tìm mục **Public endpoint**:
   ```
   redis-12345.c1.ap-southeast-1-1.ec2.cloud.redislabs.com:12345
   ```
3. Copy **Default user password**

#### REDIS_URL cho Redis Cloud:
```
redis://default:your_password@redis-12345.c1.ap-southeast-1-1.ec2.cloud.redislabs.com:12345
```

---

### 4.3. Railway

#### Bước 1: Tạo Redis
1. Truy cập: https://railway.app
2. Đăng nhập bằng **GitHub**
3. Click **New Project** → **Provision Redis**

#### Bước 2: Lấy Connection String
1. Click vào Redis service
2. Chọn tab **Variables**
3. Tìm biến `REDIS_URL`
4. Click để copy

#### Format:
```
redis://default:xxxxx@containers-us-west-xxx.railway.app:6379
```

---

## 5. Cập Nhật File .env

### 5.1. Mở file `.env`

```bash
# Windows
notepad server\.env

# hoặc VS Code
code server\.env
```

### 5.2. Cập nhật biến

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379/0
```

### 5.3. Ví dụ cho các môi trường khác nhau

**Local Docker (Development):**
```env
REDIS_URL=redis://default:dev_password@localhost:6379/0
```

**Upstash (Production):**
```env
REDIS_URL=rediss://default:AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxM@apn1-example.upstash.io:6379
```

**Redis Cloud:**
```env
REDIS_URL=redis://default:MyPassword@redis-12345.c1.ap-southeast-1-1.ec2.cloud.redislabs.com:12345
```

---

## 6. Xác Minh Kết Nối

### 6.1. Sử dụng redis-cli

```bash
# Local
redis-cli -h localhost -p 6379 -a your_password ping
# Phản hồi: PONG

# Cloud (ví dụ Upstash)
redis-cli -u "rediss://default:password@host:port" ping
```

### 6.2. Kiểm tra từ Node.js

```bash
cd server

# Chạy script test (nếu có)
npm run test:redis
```

### 6.3. Khởi động Server

```bash
cd server
npm run start:dev
```

Kiểm tra logs để xác nhận:
```
[Redis] Connected to Redis successfully
[CacheModule] Redis cache initialized
```

---

## 7. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: `ECONNREFUSED` hoặc `Connection refused`

**Nguyên nhân**: Redis chưa chạy hoặc sai host/port

**Giải pháp**:
- Docker: `docker start genhub-redis`
- Linux: `sudo systemctl start redis-server`
- Kiểm tra port 6379 đang mở

---

### ❌ Lỗi: `NOAUTH Authentication required`

**Nguyên nhân**: Redis yêu cầu password nhưng không được cung cấp

**Giải pháp**:
```
# Thêm password vào REDIS_URL
redis://default:your_password@localhost:6379/0
```

---

### ❌ Lỗi: `WRONGPASS invalid username-password pair`

**Nguyên nhân**: Sai password

**Giải pháp**:
- Kiểm tra lại password trong REDIS_URL
- Nếu dùng Docker, kiểm tra `--requirepass` khi chạy container

---

### ❌ Lỗi: `ERR max number of clients reached`

**Nguyên nhân**: Vượt quá số lượng connections cho phép

**Giải pháp**:
- Tăng `maxclients` trong redis.conf
- Kiểm tra connection pooling trong ứng dụng

---

### ❌ Lỗi: `READONLY You can't write against a read only replica`

**Nguyên nhân**: Đang kết nối đến replica thay vì master

**Giải pháp**:
- Kiểm tra lại connection string
- Đảm bảo kết nối đến master node

---

### ❌ Lỗi: Certificate/SSL issues với Upstash

**Nguyên nhân**: Sai protocol hoặc thiếu TLS config

**Giải pháp**:
- Đảm bảo sử dụng `rediss://` (2 chữ s) thay vì `redis://`

---

## Tài Liệu Tham Khảo

- [Redis Official Documentation](https://redis.io/docs/)
- [Upstash Documentation](https://upstash.com/docs/redis)
- [Redis Cloud Documentation](https://redis.io/docs/latest/operate/rc/)
- [Docker Hub - Redis](https://hub.docker.com/_/redis)

---

> **Cập nhật lần cuối**: 08/01/2026

> Nếu gặp vấn đề, vui lòng liên hệ TANK ZENITH GEN team hoặc tạo issue trên repository.
