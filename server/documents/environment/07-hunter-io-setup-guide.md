# Hướng Dẫn Cấu Hình Hunter.io Email Verification

> [!NOTE]
> Tài liệu này hướng dẫn cách đăng ký và cấu hình Hunter.io để xác minh tính hợp lệ của email khi đăng ký.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Đăng Ký Tài Khoản](#2-đăng-ký-tài-khoản)
3. [Lấy API Key](#3-lấy-api-key)
4. [Cập Nhật File .env](#4-cập-nhật-file-env)
5. [Xác Minh Cấu Hình](#5-xác-minh-cấu-hình)
6. [Xử Lý Lỗi Thường Gặp](#6-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

**Hunter.io** là dịch vụ xác minh email, giúp kiểm tra:
- Email có tồn tại không
- Email có nhận được mail không (deliverable)
- Email có phải là disposable/temporary không

### Khi nào cần dùng:
- Ngăn chặn đăng ký với email giả
- Giảm bounce rate khi gửi email
- Tăng chất lượng user database

### Các biến môi trường cần cấu hình:

| Biến | Mô tả |
|------|-------|
| `USE_HUNTER_EMAIL_VERIFICATION` | Bật/tắt verification (`true`/`false`) |
| `HUNTER_API_KEY` | API key để gọi Hunter API |

### Pricing:
- **Free**: 25 verifications/tháng
- **Starter ($49/mo)**: 1,000 verifications
- **Growth ($149/mo)**: 5,000 verifications

---

## 2. Đăng Ký Tài Khoản

### Bước 1: Truy cập website
1. Truy cập: https://hunter.io
2. Click **"Sign up free"**

### Bước 2: Đăng ký
1. Đăng ký bằng:
   - **Google Account**
   - **Email và password**
2. Xác minh email nếu đăng ký bằng email

### Bước 3: Hoàn thành onboarding
1. Trả lời một số câu hỏi (có thể skip)
2. Bạn sẽ được chuyển đến Dashboard

---

## 3. Lấy API Key

### Bước 1: Vào API Keys

1. Đăng nhập https://hunter.io
2. Click vào **avatar** (góc phải trên)
3. Chọn **"API"** hoặc truy cập: https://hunter.io/api-keys

### Bước 2: Copy API Key

1. Bạn sẽ thấy API Key của mình:
   ```
   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
2. Click **"Copy"** để copy

> [!TIP]
> Free account được cấp sẵn API Key, không cần tạo mới.

---

## 4. Cập Nhật File .env

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
# Hunter.io Email Verification
# ===================

# Set to true to verify email deliverability during registration
USE_HUNTER_EMAIL_VERIFICATION=false
HUNTER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Giải thích:

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `USE_HUNTER_EMAIL_VERIFICATION` | `false` | Development: `false`, Production: `true` (tùy nhu cầu) |
| `HUNTER_API_KEY` | `xxxx...` | API key từ Hunter.io |

> [!WARNING]
> - **Development**: Nên để `false` để không tốn quota
> - **Production**: Set `true` nếu muốn verify email khi đăng ký

---

## 5. Xác Minh Cấu Hình

### 5.1. Test API trực tiếp

```bash
curl -X GET "https://api.hunter.io/v2/email-verifier?email=test@gmail.com&api_key=YOUR_API_KEY"
```

**Response thành công:**
```json
{
  "data": {
    "status": "valid",
    "result": "deliverable",
    "score": 95,
    "email": "test@gmail.com",
    "regexp": true,
    "gibberish": false,
    "disposable": false,
    "webmail": true,
    "mx_records": true,
    "smtp_server": true,
    "smtp_check": true,
    "accept_all": false,
    "block": false
  }
}
```

### 5.2. Kiểm tra quota

```bash
curl -X GET "https://api.hunter.io/v2/account?api_key=YOUR_API_KEY"
```

**Response:**
```json
{
  "data": {
    "email": "your-email@example.com",
    "plan_name": "free",
    "requests": {
      "searches": {
        "used": 0,
        "available": 25
      },
      "verifications": {
        "used": 5,
        "available": 25
      }
    }
  }
}
```

### 5.3. Khởi động Server

```bash
cd server
npm run start:dev
```

Logs (nếu enabled):
```
[HunterService] Hunter.io email verification enabled
[HunterService] Remaining quota: 20/25 verifications
```

---

## 6. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: `401 Unauthorized`

**Nguyên nhân**: API Key không đúng

**Giải pháp**: Kiểm tra lại `HUNTER_API_KEY`

---

### ❌ Lỗi: `429 Too Many Requests`

**Nguyên nhân**: Hết quota hoặc rate limited

**Giải pháp**:
- Kiểm tra quota còn lại
- Nâng cấp plan nếu cần
- Rate limit: 10 requests/second

---

### ❌ Email bị reject khi đăng ký

**Nguyên nhân**: Email không deliverable

**Giải pháp**: Đây là behavior mong muốn - email không hợp lệ bị chặn

---

## Tài Liệu Tham Khảo

- [Hunter.io API Documentation](https://hunter.io/api-documentation)
- [Email Verifier API](https://hunter.io/api-documentation#email-verifier)
- [Hunter.io Dashboard](https://hunter.io/dashboard)

---

> **Cập nhật lần cuối**: 08/01/2026

> Nếu gặp vấn đề, vui lòng liên hệ TANK ZENITH GEN team hoặc tạo issue trên repository.
