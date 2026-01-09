# Hướng Dẫn Cấu Hình Database (PostgreSQL)

> [!NOTE]
> Tài liệu này hướng dẫn cách tạo và cấu hình `DATABASE_URL` để kết nối với PostgreSQL database.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Lựa Chọn Database Provider](#2-lựa-chọn-database-provider)
3. [Cài Đặt PostgreSQL Local](#3-cài-đặt-postgresql-local)
4. [Sử Dụng Cloud Database](#4-sử-dụng-cloud-database)
5. [Cập Nhật File .env](#5-cập-nhật-file-env)
6. [Xác Minh Kết Nối](#6-xác-minh-kết-nối)
7. [Xử Lý Lỗi Thường Gặp](#7-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

**PostgreSQL** là hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở, được GEN-HUB sử dụng làm database chính.

### Biến môi trường cần cấu hình:

| Biến | Mô tả |
|------|-------|
| `DATABASE_URL` | Connection string để kết nối PostgreSQL |

### Format của DATABASE_URL:

```
postgresql://[username]:[password]@[host]:[port]/[database_name]?schema=[schema]
```

**Ví dụ:**
```
postgresql://postgres:mypassword@localhost:5432/genhub?schema=public
```

---

## 2. Lựa Chọn Database Provider

### Môi trường Development (Local)
- **PostgreSQL Local** - Cài đặt trực tiếp trên máy
- **Docker** - Chạy PostgreSQL trong container

### Môi trường Production (Cloud)
- **Supabase** - Có gói miễn phí, dễ setup ⭐ Khuyến nghị
- **Neon** - Serverless PostgreSQL, có gói miễn phí
- **Railway** - Dễ deploy, có gói miễn phí
- **Amazon RDS** - Enterprise, tính phí theo usage
- **DigitalOcean** - Managed database

---

## 3. Cài Đặt PostgreSQL Local

### 3.1. Windows

#### Bước 1: Tải PostgreSQL
1. Truy cập: https://www.postgresql.org/download/windows/
2. Tải **Windows x86-64** installer
3. Chạy file `.exe` đã tải

#### Bước 2: Cài đặt
1. Chọn thư mục cài đặt (mặc định: `C:\Program Files\PostgreSQL\16`)
2. Chọn components:
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4 (giao diện quản lý)
   - ✅ Command Line Tools
3. Chọn thư mục data
4. **Nhập password cho user `postgres`** - **GHI NHỚ PASSWORD NÀY!**
5. Port: `5432` (mặc định)
6. Locale: Default
7. Click **Next** và hoàn tất cài đặt

#### Bước 3: Tạo Database
1. Mở **pgAdmin 4** (tìm trong Start Menu)
2. Kết nối đến server `PostgreSQL 16` (nhập password đã tạo)
3. Click chuột phải vào **Databases** → **Create** → **Database**
4. Database name: `genhub`
5. Owner: `postgres`
6. Click **Save**

#### DATABASE_URL cho Local:
```
postgresql://postgres:your_password@localhost:5432/genhub?schema=public
```

---

### 3.2. macOS

#### Sử dụng Homebrew:
```bash
# Cài đặt PostgreSQL
brew install postgresql@16

# Khởi động PostgreSQL
brew services start postgresql@16

# Tạo database
createdb genhub
```

#### DATABASE_URL cho macOS:
```
postgresql://localhost:5432/genhub?schema=public
```

---

### 3.3. Docker

#### Bước 1: Tạo file `docker-compose.yml`
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: genhub-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: genhub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Bước 2: Chạy container
```bash
docker-compose up -d
```

#### DATABASE_URL cho Docker:
```
postgresql://postgres:your_secure_password@localhost:5432/genhub?schema=public
```

---

## 4. Sử Dụng Cloud Database

### 4.1. Supabase (Khuyến nghị - Miễn phí)

#### Bước 1: Tạo tài khoản
1. Truy cập: https://supabase.com
2. Click **Start your project**
3. Đăng nhập bằng **GitHub** hoặc **Email**

#### Bước 2: Tạo Project mới
1. Click **New Project**
2. Điền thông tin:
   - **Name**: `genhub` (hoặc tên tùy ý)
   - **Database Password**: Tạo password mạnh → **LƯU LẠI!**
   - **Region**: Chọn region gần nhất (VD: `Singapore`)
3. Click **Create new project**
4. Đợi 2-3 phút để project được tạo

#### Bước 3: Lấy Connection String
1. Vào **Project Settings** (icon bánh răng ⚙️)
2. Chọn **Database** ở sidebar trái
3. Cuộn xuống phần **Connection string**
4. Chọn tab **URI**
5. Copy connection string:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

> [!IMPORTANT]
> Thay `[password]` bằng Database Password bạn đã tạo ở Bước 2.

#### Bước 4: Chọn Connection Mode
- **Session mode (port 5432)**: Cho development, hỗ trợ prepared statements
- **Transaction mode (port 6543)**: Cho production với connection pooling

**Khuyến nghị Production:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

### 4.2. Neon (Serverless PostgreSQL)

#### Bước 1: Tạo tài khoản
1. Truy cập: https://neon.tech
2. Click **Sign Up**
3. Đăng nhập bằng **GitHub**, **Google**, hoặc **Email**

#### Bước 2: Tạo Project
1. Click **Create a project**
2. Điền thông tin:
   - **Project name**: `genhub`
   - **Postgres version**: `16`
   - **Region**: Chọn region gần nhất
3. Click **Create project**

#### Bước 3: Lấy Connection String
1. Sau khi tạo, bạn sẽ thấy connection string ngay trên dashboard
2. Click **Copy** để copy connection string
3. Format:
   ```
   postgresql://[user]:[password]@[endpoint]/[database]?sslmode=require
   ```

---

### 4.3. Railway

#### Bước 1: Tạo tài khoản
1. Truy cập: https://railway.app
2. Đăng nhập bằng **GitHub**

#### Bước 2: Tạo PostgreSQL
1. Click **New Project**
2. Chọn **Provision PostgreSQL**
3. Đợi database được tạo (khoảng 30 giây)

#### Bước 3: Lấy Connection String
1. Click vào PostgreSQL service
2. Chọn tab **Variables**
3. Tìm biến `DATABASE_URL`
4. Click để copy giá trị

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
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/genhub?schema=public
```

### 5.3. Ví dụ cho các môi trường khác nhau

**Local (Development):**
```env
DATABASE_URL=postgresql://postgres:dev_password@localhost:5432/genhub?schema=public
```

**Supabase (Production):**
```env
DATABASE_URL=postgresql://postgres.abcdefghij:MySecurePass123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Neon:**
```env
DATABASE_URL=postgresql://genhub_owner:AbCdEf123@ep-cool-darkness-123456.ap-southeast-1.aws.neon.tech/genhub?sslmode=require
```

---

## 6. Xác Minh Kết Nối

### 6.1. Sử dụng Prisma CLI

```bash
cd server

# Kiểm tra kết nối
npx prisma db pull

# Nếu thành công, generate Prisma Client
npx prisma generate

# Chạy migrations
npx prisma migrate dev
```

### 6.2. Kiểm tra qua pgAdmin hoặc DBeaver

1. Mở **pgAdmin** hoặc **DBeaver**
2. Tạo connection mới với thông tin từ DATABASE_URL:
   - Host: `localhost` hoặc cloud host
   - Port: `5432` hoặc `6543`
   - Database: `genhub` hoặc `postgres`
   - Username: `postgres`
   - Password: password của bạn
3. Test connection

### 6.3. Khởi động Server

```bash
cd server
npm run start:dev
```

Kiểm tra logs để xác nhận:
```
[Prisma] Database connected successfully
```

---

## 7. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: `ECONNREFUSED` hoặc `Connection refused`

**Nguyên nhân**: PostgreSQL chưa chạy hoặc sai port

**Giải pháp**:
- Windows: Mở **Services** → Tìm `postgresql-x64-16` → Start
- Docker: `docker-compose up -d`
- Kiểm tra port đúng (mặc định: 5432)

---

### ❌ Lỗi: `password authentication failed`

**Nguyên nhân**: Sai password trong DATABASE_URL

**Giải pháp**:
- Kiểm tra lại password trong connection string
- Nếu quên password, reset qua pgAdmin hoặc cloud dashboard

---

### ❌ Lỗi: `database "genhub" does not exist`

**Nguyên nhân**: Chưa tạo database

**Giải pháp**:
```bash
# Qua psql
psql -U postgres -c "CREATE DATABASE genhub;"

# Hoặc qua pgAdmin: Click chuột phải Databases → Create → Database
```

---

### ❌ Lỗi: `SSL connection is required` (Cloud Database)

**Nguyên nhân**: Cloud database yêu cầu SSL

**Giải pháp**: Thêm `?sslmode=require` vào cuối DATABASE_URL:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

---

### ❌ Lỗi: `too many connections`

**Nguyên nhân**: Vượt quá giới hạn connections

**Giải pháp**:
- Sử dụng connection pooling (PgBouncer)
- Supabase: Dùng port `6543` với `?pgbouncer=true`
- Neon: Đã có pooling mặc định

---

## Tài Liệu Tham Khảo

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [Prisma - PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Supabase Documentation](https://supabase.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Railway Documentation](https://docs.railway.app)

---

> **Cập nhật lần cuối**: 08/01/2026

> Nếu gặp vấn đề, vui lòng liên hệ TANK ZENITH GEN team hoặc tạo issue trên repository.
