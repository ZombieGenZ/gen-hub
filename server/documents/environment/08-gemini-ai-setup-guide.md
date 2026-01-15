# Hướng Dẫn Cấu Hình Gemini AI

> [!NOTE]
> Tài liệu này hướng dẫn cách lấy API Key và cấu hình Gemini AI của Google cho tính năng AI trong GEN-HUB.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Tạo API Key từ Google AI Studio](#2-tạo-api-key-từ-google-ai-studio)
3. [Cấu Hình Multiple API Keys](#3-cấu-hình-multiple-api-keys)
4. [Chọn Model Phù Hợp](#4-chọn-model-phù-hợp)
5. [Cập Nhật File .env](#5-cập-nhật-file-env)
6. [Xác Minh Cấu Hình](#6-xác-minh-cấu-hình)
7. [Xử Lý Lỗi Thường Gặp](#7-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

**Gemini AI** là mô hình AI của Google, được GEN-HUB sử dụng cho:
- **AI Auto-Reply**: Tự động trả lời câu hỏi hỗ trợ
- **Text Generation**: Tạo nội dung, tóm tắt
- **Analysis**: Phân tích dữ liệu, sentiment

### Các biến môi trường cần cấu hình:

| Biến | Mô tả |
|------|-------|
| `GEMINI_API_KEYS` | API key(s), hỗ trợ multiple keys ngăn cách bằng dấu phẩy |
| `GEMINI_MODEL` | Tên model sử dụng (VD: `gemini-1.5-flash`) |

### Free Tier Limits:
- **gemini-1.5-flash**: 15 RPM (requests/minute), 1M TPM (tokens/minute)
- **gemini-1.5-pro**: 2 RPM, 32K TPM
- 1500 requests/day

---

## 2. Tạo API Key từ Google AI Studio

### Bước 1: Truy cập Google AI Studio

1. Truy cập: https://aistudio.google.com/app/apikey
2. Đăng nhập bằng tài khoản Google

### Bước 2: Tạo API Key

1. Click **"Create API key"**
2. Chọn project:
   - **Create API key in new project**: Tạo project mới (khuyến nghị)
   - Hoặc chọn project Google Cloud có sẵn
3. Click **"Create API key in new project"**

### Bước 3: Copy API Key

1. API Key sẽ được hiển thị:
   ```
   AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
2. Click **"Copy"** để copy
3. **LƯU LẠI** API Key

> [!CAUTION]
> API Key chỉ hiển thị một lần. Nếu mất, có thể xem lại trong Google Cloud Console hoặc tạo key mới.

---

## 3. Cấu Hình Multiple API Keys

GEN-HUB hỗ trợ **nhiều API keys** để rotation khi quota của một key hết.

### Tại sao cần multiple keys?
- Mỗi key có giới hạn RPM (requests per minute)
- Khi key A hết quota → tự động chuyển sang key B
- Tăng throughput tổng hợp

### Tạo thêm API Keys:

1. Tạo thêm 2-3 API keys từ https://aistudio.google.com/app/apikey
2. Ghi lại tất cả các keys
3. Cấu hình trong `.env` ngăn cách bằng dấu phẩy:
   ```
   GEMINI_API_KEYS=AIzaSy_key1,AIzaSy_key2,AIzaSy_key3
   ```

> [!TIP]
> Có thể tạo keys từ nhiều Google accounts khác nhau để tăng quota.

---

## 4. Chọn Model Phù Hợp

### Các model khả dụng:

| Model | Đặc điểm | Use Case |
|-------|----------|----------|
| `gemini-1.5-flash` | Nhanh, rẻ, tốt cho hầu hết tasks | Chat, auto-reply ⭐ Khuyến nghị |
| `gemini-1.5-flash-8b` | Nhẹ hơn, nhanh hơn | Simple tasks, high volume |
| `gemini-1.5-pro` | Mạnh mẽ, phức tạp hơn | Complex analysis, long context |
| `gemini-2.0-flash-exp` | Latest, experimental | Testing new features |

### Khuyến nghị:
- **Production**: `gemini-1.5-flash` - Cân bằng tốt giữa chất lượng và tốc độ
- **High volume**: `gemini-1.5-flash-8b` - Xử lý nhiều requests
- **Complex tasks**: `gemini-1.5-pro` - Cần reasoning phức tạp

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
# Gemini AI Configuration
# ===================

# Supports multiple API keys (separated by commas) for rotation when quotas are exhausted.
GEMINI_API_KEYS=AIzaSyXXXXXXXXXXXXXXXXXXXXXXX,AIzaSyYYYYYYYYYYYYYYYYYYYYYYY
GEMINI_MODEL=gemini-1.5-flash
```

### Giải thích:

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `GEMINI_API_KEYS` | `AIzaSy...,AIzaSy...` | Multiple keys ngăn cách bằng dấu phẩy |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Model sử dụng |

### Ví dụ cấu hình:

**Một API key:**
```env
GEMINI_API_KEYS=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_MODEL=gemini-1.5-flash
```

**Multiple API keys:**
```env
GEMINI_API_KEYS=AIzaSy_key1,AIzaSy_key2,AIzaSy_key3
GEMINI_MODEL=gemini-1.5-flash
```

---

## 6. Xác Minh Cấu Hình

### 6.1. Test API trực tiếp

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts":[{"text": "Hello! Tell me a joke."}]
    }]
  }'
```

**Response thành công:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "Why don't scientists trust atoms? Because they make up everything!"
      }],
      "role": "model"
    }
  }]
}
```

### 6.2. Khởi động Server

```bash
cd server
npm run start:dev
```

### 6.3. Kiểm tra Logs

Logs thành công:
```
[GeminiService] Gemini AI initialized
[GeminiService] Model: gemini-1.5-flash
[GeminiService] API Keys configured: 3 keys
```

### 6.4. Test với endpoint (nếu có)

```bash
curl -X POST http://localhost:4000/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello AI!"}'
```

---

## 7. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: `400 Bad Request - API key not valid`

**Nguyên nhân**: API Key không hợp lệ

**Giải pháp**:
- Kiểm tra API Key có đúng không
- Tạo API Key mới

---

### ❌ Lỗi: `429 Resource Exhausted`

**Nguyên nhân**: Vượt quá quota (RPM hoặc daily)

**Giải pháp**:
- Thêm API keys để rotation
- Đợi quota reset (mỗi phút hoặc mỗi ngày)
- Giảm số lượng requests

---

### ❌ Lỗi: `403 Forbidden - User location is not supported`

**Nguyên nhân**: Gemini API không khả dụng ở một số quốc gia

**Giải pháp**:
- Sử dụng VPN
- Deploy server ở region được hỗ trợ

---

### ❌ Lỗi: Model not found

**Nguyên nhân**: Tên model không đúng

**Giải pháp**:
- Kiểm tra `GEMINI_MODEL` có đúng tên không
- Sử dụng model từ danh sách ở mục 4

---

### ❌ Response chậm hoặc timeout

**Nguyên nhân**: 
- Model `gemini-1.5-pro` chậm hơn `flash`
- Network issues

**Giải pháp**:
- Chuyển sang `gemini-1.5-flash` cho tasks đơn giản
- Tăng timeout configuration

---

## Tài Liệu Tham Khảo

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Model Overview](https://ai.google.dev/models/gemini)
- [API Quickstart](https://ai.google.dev/gemini-api/docs/quickstart)

---

> **Cập nhật lần cuối**: 08/01/2026

> Nếu gặp vấn đề, vui lòng liên hệ TANK ZENITH GEN team hoặc tạo issue trên repository.
