# Hướng Dẫn Cấu Hình Cloudflare (Turnstile + Analytics)

> [!NOTE]
> Tài liệu này hướng dẫn cách cấu hình Cloudflare Turnstile Captcha và Analytics API.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Đăng Ký Tài Khoản Cloudflare](#2-đăng-ký-tài-khoản-cloudflare)
3. [Cấu Hình Turnstile Captcha](#3-cấu-hình-turnstile-captcha)
4. [Cấu Hình Analytics API](#4-cấu-hình-analytics-api)
5. [Cập Nhật File .env](#5-cập-nhật-file-env)
6. [Xác Minh Cấu Hình](#6-xác-minh-cấu-hình)
7. [Xử Lý Lỗi Thường Gặp](#7-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

GEN-HUB sử dụng Cloudflare cho:
- **Turnstile Captcha**: Bảo vệ form đăng ký/đăng nhập khỏi bot
- **Analytics API**: Lấy dữ liệu traffic, visitors để hiển thị trên dashboard

### Các biến môi trường cần cấu hình:

**Turnstile Captcha:**
| Biến | Mô tả |
|------|-------|
| `USE_CLOUDFLARE_CAPTCHA` | Bật/tắt captcha (`true`/`false`) |
| `CLOUDFLARE_TURNSTILE_SECRETKEY` | Secret key để verify captcha |

**Analytics API:**
| Biến | Mô tả |
|------|-------|
| `CLOUDFLARE_EMAIL` | Email tài khoản Cloudflare |
| `CLOUDFLARE_API_KEY` | Global API Key |
| `CLOUDFLARE_ZONE_ID` | Zone ID của domain |
| `CLOUDFLARE_START_ANALYTICS_DATE` | Ngày bắt đầu lấy analytics |

---

## 2. Đăng Ký Tài Khoản Cloudflare

### Bước 1: Truy cập website
1. Truy cập: https://dash.cloudflare.com/sign-up
2. Nhập email và password
3. Click **"Sign Up"**

### Bước 2: Xác minh email
1. Kiểm tra hộp thư email
2. Click link xác minh

### Bước 3: Thêm domain (cho Analytics)
1. Sau khi đăng nhập, click **"Add a Site"**
2. Nhập domain của bạn (VD: `gen-hub.dev`)
3. Chọn plan **Free**
4. Làm theo hướng dẫn để cập nhật nameservers
5. Đợi vài phút để domain active

> [!TIP]
> Nếu chỉ cần Turnstile Captcha (không cần Analytics), có thể bỏ qua bước thêm domain.

---

## 3. Cấu Hình Turnstile Captcha

### Bước 1: Truy cập Turnstile

1. Đăng nhập https://dash.cloudflare.com
2. Vào menu bên trái → **Turnstile**
3. Hoặc truy cập trực tiếp: https://dash.cloudflare.com/?to=/:account/turnstile

### Bước 2: Tạo Turnstile Widget

1. Click **"Add Widget"** hoặc **"Create"**
2. Điền thông tin:
   - **Widget name**: `GEN-HUB Captcha`
   - **Domains**: Thêm domains sẽ sử dụng:
     ```
     gen-hub.dev
     localhost
     127.0.0.1
     ```
   - **Widget Mode**: Chọn mode phù hợp:
     - **Managed**: Cloudflare tự động quyết định (khuyến nghị)
     - **Non-interactive**: Không hiển thị challenge
     - **Invisible**: Hoàn toàn ẩn

3. Click **"Create"**

### Bước 3: Lấy Keys

Sau khi tạo, bạn sẽ thấy:

1. **Site Key** (sử dụng ở frontend):
   ```
   0x4AAAAAAXXXXXXXXXXXXXXXXX
   ```

2. **Secret Key** (sử dụng ở backend):
   ```
   0x4AAAAAAXXXXXXXXXXXXXXXXX-XXXXXXXXXX
   ```

> [!IMPORTANT]
> **Secret Key** chính là `CLOUDFLARE_TURNSTILE_SECRETKEY`.
> Site Key cần được cấu hình ở frontend/client.

### Bước 4: Test Keys (Development)

Cloudflare cung cấp test keys cho development:

| Key Type | Value | Result |
|----------|-------|--------|
| Site Key | `1x00000000000000000000AA` | Always passes |
| Secret Key | `1x0000000000000000000000000000000AA` | Always passes |
| Site Key | `2x00000000000000000000AB` | Always fails |
| Secret Key | `2x0000000000000000000000000000000AB` | Always fails |

---

## 4. Cấu Hình Analytics API

### Bước 1: Lấy Zone ID

1. Đăng nhập Cloudflare Dashboard
2. Chọn domain của bạn
3. Cuộn xuống phần **"API"** ở sidebar phải
4. Copy **Zone ID**:
   ```
   abc123def456ghi789jkl012mno345pq
   ```

> [!TIP]
> Hoặc vào **Overview** page của domain, Zone ID hiển thị ở sidebar phải.

### Bước 2: Lấy Global API Key

1. Click vào avatar (góc phải trên) → **"My Profile"**
2. Chọn tab **"API Tokens"**
3. Tìm mục **"Global API Key"**
4. Click **"View"**
5. Xác nhận bằng password
6. Copy API Key:
   ```
   1234567890abcdef1234567890abcdef12345
   ```

> [!CAUTION]
> **Global API Key** có full access đến tài khoản. Giữ bí mật tuyệt đối!

### Bước 3: Xác định Email

Email là email đăng nhập Cloudflare của bạn:
```
your-email@example.com
```

### Bước 4: Chọn Analytics Start Date

Chọn ngày bắt đầu muốn lấy dữ liệu analytics:
```
2024-01-01
```

---

## 5. Cập Nhật File .env

### Mở file `.env`:

```bash
# Windows
notepad server\.env

# hoặc VS Code
code server\.env
```

### Cập nhật các biến:

```env
# ===================
# Cloudflare Turnstile Captcha
# ===================

# Set to true to enable captcha verification on auth endpoints
# Set to false to skip captcha verification (for development)
USE_CLOUDFLARE_CAPTCHA=false
CLOUDFLARE_TURNSTILE_SECRETKEY=0x4AAAAAAXXXXXXXXXXXXXXXXX-XXXXXXXXXX

# ===================
# Cloudflare Analytics API
# ===================

CLOUDFLARE_EMAIL=your-email@example.com
CLOUDFLARE_API_KEY=1234567890abcdef1234567890abcdef12345
CLOUDFLARE_ZONE_ID=abc123def456ghi789jkl012mno345pq
CLOUDFLARE_START_ANALYTICS_DATE=2024-01-01
```

### Giải thích các biến:

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `USE_CLOUDFLARE_CAPTCHA` | `false` | Development: `false`, Production: `true` |
| `CLOUDFLARE_TURNSTILE_SECRETKEY` | `0x4AAA...` | Secret key từ Turnstile widget |
| `CLOUDFLARE_EMAIL` | `email@example.com` | Email tài khoản Cloudflare |
| `CLOUDFLARE_API_KEY` | `123456...` | Global API Key |
| `CLOUDFLARE_ZONE_ID` | `abc123...` | Zone ID của domain |
| `CLOUDFLARE_START_ANALYTICS_DATE` | `2024-01-01` | Ngày bắt đầu lấy data (format: YYYY-MM-DD) |

---

## 6. Xác Minh Cấu Hình

### 6.1. Test Turnstile Captcha

**Bước 1: Kiểm tra integration**

```javascript
// Test verify endpoint
const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    secret: 'YOUR_SECRET_KEY',
    response: 'TOKEN_FROM_CLIENT',
  }),
});
const result = await response.json();
console.log(result);
// { success: true, ... }
```

**Bước 2: Test với test keys**

Sử dụng test keys (luôn pass):
- Secret: `1x0000000000000000000000000000000AA`ố
- Token: `XXXX.DUMMY.TOKEN.XXXX`

### 6.2. Test Analytics API

**Verify API connection:**

```bash
curl -X GET "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/analytics/dashboard" \
  -H "X-Auth-Email: your-email@example.com" \
  -H "X-Auth-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

**Response thành công:**
```json
{
  "success": true,
  "result": {
    "totals": { ... },
    "timeseries": [ ... ]
  }
}
```

### 6.3. Khởi động Server

```bash
cd server
npm run start:dev
```

Kiểm tra logs:
```
[CloudflareService] Turnstile captcha enabled
[CloudflareService] Analytics API initialized for zone: abc123...
```

---

## 7. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: Turnstile verification failed

**Nguyên nhân**:
- Secret key không đúng
- Token hết hạn (token chỉ valid 5 phút)
- Domain không match

**Giải pháp**:
- Kiểm tra `CLOUDFLARE_TURNSTILE_SECRETKEY`
- Verify token ngay khi nhận được từ client
- Thêm domain vào Turnstile settings

---

### ❌ Lỗi: `401 Unauthorized` - Analytics API

**Nguyên nhân**: Sai email hoặc API key

**Giải pháp**:
- Kiểm tra `CLOUDFLARE_EMAIL` đúng email đăng nhập
- Kiểm tra `CLOUDFLARE_API_KEY` là Global API Key (không phải API Token)

---

### ❌ Lỗi: `403 Forbidden` - Zone not found

**Nguyên nhân**: Zone ID không đúng hoặc không có quyền

**Giải pháp**:
- Kiểm tra `CLOUDFLARE_ZONE_ID` từ đúng domain
- Đảm bảo domain đã active trên Cloudflare

---

### ❌ Lỗi: Captcha không hiển thị trên client

**Nguyên nhân**: Site key không đúng hoặc domain không match

**Giải pháp**:
- Kiểm tra Site Key ở frontend đúng
- Thêm `localhost` vào allowed domains trong Turnstile settings

---

### ❌ Lỗi: Analytics trả về empty data

**Nguyên nhân**:
- Domain mới, chưa có traffic
- `CLOUDFLARE_START_ANALYTICS_DATE` quá xa trong quá khứ

**Giải pháp**:
- Đợi vài giờ sau khi có traffic
- Điều chỉnh start date gần hơn

---

## Tài Liệu Tham Khảo

- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Turnstile Server-side Validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Analytics API](https://developers.cloudflare.com/analytics/)
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)

---

> **Cập nhật lần cuối**: 08/01/2026

> Nếu gặp vấn đề, vui lòng liên hệ TANK ZENITH GEN team hoặc tạo issue trên repository.
