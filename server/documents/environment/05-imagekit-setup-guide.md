# Hướng Dẫn Cấu Hình ImageKit

> [!NOTE]
> Tài liệu này hướng dẫn cách đăng ký và cấu hình ImageKit.io để upload và quản lý hình ảnh.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Đăng Ký Tài Khoản](#2-đăng-ký-tài-khoản)
3. [Lấy API Keys](#3-lấy-api-keys)
4. [Cập Nhật File .env](#4-cập-nhật-file-env)
5. [Xác Minh Cấu Hình](#5-xác-minh-cấu-hình)
6. [Xử Lý Lỗi Thường Gặp](#6-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

**ImageKit.io** là dịch vụ quản lý và tối ưu hóa hình ảnh trên cloud, được GEN-HUB sử dụng cho:
- **Upload ảnh** - Avatar, hình ảnh kho bãi, sản phẩm
- **Image transformation** - Resize, crop, watermark tự động
- **CDN delivery** - Phân phối nhanh qua global CDN

### Các biến môi trường cần cấu hình:

| Biến | Mô tả |
|------|-------|
| `IMAGEKIT_PUBLIC_KEY` | Public key để upload từ client |
| `IMAGEKIT_PRIVATE_KEY` | Private key để server authentication |
| `IMAGEKIT_URL_ENDPOINT` | URL endpoint để truy cập ảnh |

### Free Tier Limits:
- 20 GB bandwidth/tháng
- 20 GB storage
- Unlimited transformations

---

## 2. Đăng Ký Tài Khoản

### Bước 1: Truy cập website
1. Truy cập: https://imagekit.io
2. Click **"Start Free"** hoặc **"Sign Up"**

### Bước 2: Đăng ký
1. Đăng ký bằng:
   - **Google Account** (nhanh nhất)
   - **GitHub**
   - **Email và password**
2. Xác minh email (nếu đăng ký bằng email)

### Bước 3: Hoàn thành onboarding
1. Sau khi đăng nhập, bạn sẽ được hỏi một số câu hỏi:
   - Use case của bạn
   - Quy mô dự án
2. Có thể skip hoặc điền thông tin
3. Bạn sẽ được chuyển đến Dashboard

---

## 3. Lấy API Keys

### Bước 1: Vào Developer Options

1. Đăng nhập vào https://imagekit.io/dashboard
2. Click vào **avatar** của bạn (góc phải trên)
3. Chọn **"Developer options"** hoặc vào menu bên trái chọn **"Developer"**

### Bước 2: Copy các keys

Bạn sẽ thấy 3 thông tin cần thiết:

1. **URL Endpoint**:
   ```
   https://ik.imagekit.io/your_imagekit_id
   ```
   → Đây là `IMAGEKIT_URL_ENDPOINT`

2. **Public Key**:
   ```
   public_xxxxxxxxxxxxxxxxxxxx
   ```
   → Đây là `IMAGEKIT_PUBLIC_KEY`

3. **Private Key**:
   ```
   private_xxxxxxxxxxxxxxxxxxxx
   ```
   → Đây là `IMAGEKIT_PRIVATE_KEY`

> [!CAUTION]
> **Private Key** là bí mật, không share công khai hoặc commit vào git!

### Bước 3: Tạo thêm API Key (Tùy chọn)

Nếu cần keys riêng cho từng môi trường:

1. Vào **Developer options** → **API Keys**
2. Click **"Create new key"**
3. Đặt tên (VD: `genhub-production`)
4. Copy Public Key và Private Key mới

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
# ImageKit Configuration (for image upload)
# ===================

IMAGEKIT_PUBLIC_KEY=public_xxxxxxxxxxxxxxxxxxxx
IMAGEKIT_PRIVATE_KEY=private_xxxxxxxxxxxxxxxxxxxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id

# Watermark Configuration (tùy chọn)
WATERMARK_ENABLED=true
WATERMARK_PATH=./assets/watermark.png
WATERMARK_POSITION=northeast
WATERMARK_OPACITY=0.5
```

### Giải thích các biến:

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `IMAGEKIT_PUBLIC_KEY` | `public_xxx...` | Key công khai, dùng cho client-side upload |
| `IMAGEKIT_PRIVATE_KEY` | `private_xxx...` | Key bí mật, chỉ dùng ở server |
| `IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/xxx` | Base URL để truy cập ảnh đã upload |
| `WATERMARK_ENABLED` | `true/false` | Bật/tắt watermark tự động |
| `WATERMARK_POSITION` | `northeast` | Vị trí watermark (north, south, east, west, center, northeast, etc.) |

---

## 5. Xác Minh Cấu Hình

### 5.1. Khởi động Server

```bash
cd server
npm run start:dev
```

### 5.2. Kiểm tra Logs

Logs thành công:
```
[ImageKitService] ImageKit initialized
[ImageKitService] URL Endpoint: https://ik.imagekit.io/xxx
```

### 5.3. Test Upload

**Qua API (nếu có endpoint):**
```bash
curl -X POST http://localhost:4000/api/upload/test \
  -F "file=@test-image.jpg"
```

**Hoặc kiểm tra trực tiếp trên ImageKit Dashboard:**
1. Vào **Media Library**
2. Thử upload một ảnh
3. Kiểm tra ảnh accessible qua URL Endpoint

### 5.4. Test Transformation

Mở URL ảnh với transformation:
```
https://ik.imagekit.io/your_id/image.jpg?tr=w-200,h-200
```

Nếu ảnh hiển thị với kích thước 200x200 → Cấu hình thành công.

---

## 6. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: `Invalid API credentials`

**Nguyên nhân**: Sai Public Key hoặc Private Key

**Giải pháp**:
- Kiểm tra lại keys trong Developer options
- Đảm bảo copy đầy đủ không thiếu ký tự

---

### ❌ Lỗi: `401 Unauthorized` khi upload

**Nguyên nhân**: Private Key không đúng

**Giải pháp**:
- Kiểm tra `IMAGEKIT_PRIVATE_KEY`
- Đảm bảo server đang sử dụng đúng key

---

### ❌ Lỗi: `CORS error` từ client

**Nguyên nhân**: Domain chưa được whitelist

**Giải pháp**:
1. Vào ImageKit Dashboard → **Settings** → **URL Endpoints**
2. Hoặc **Settings** → **Security** → **Allowed origins**
3. Thêm domain của bạn (VD: `https://gen-hub.dev`)

---

### ❌ Lỗi: Ảnh không hiển thị (404)

**Nguyên nhân**: 
- Sai URL Endpoint
- Ảnh chưa được upload
- Path không đúng

**Giải pháp**:
- Kiểm tra `IMAGEKIT_URL_ENDPOINT` có đúng format
- Kiểm tra ảnh tồn tại trong Media Library
- Kiểm tra path đầy đủ

---

### ❌ Lỗi: `Bandwidth limit exceeded`

**Nguyên nhân**: Vượt quá 20GB bandwidth/tháng của free tier

**Giải pháp**:
- Nâng cấp plan
- Tối ưu image sizes
- Implement caching

---

## Tính Năng Nâng Cao

### Image Transformations

ImageKit hỗ trợ nhiều transformations qua URL:

```
# Resize
https://ik.imagekit.io/xxx/image.jpg?tr=w-300,h-200

# Crop
https://ik.imagekit.io/xxx/image.jpg?tr=w-300,h-200,c-maintain_ratio

# Watermark
https://ik.imagekit.io/xxx/image.jpg?tr=l-image,i-watermark.png,lx-10,ly-10

# Format conversion
https://ik.imagekit.io/xxx/image.jpg?tr=f-webp

# Quality
https://ik.imagekit.io/xxx/image.jpg?tr=q-80
```

### Folder Structure

Organize ảnh theo folders:
```
/avatars/user-123.jpg
/warehouses/warehouse-456/image-1.jpg
/products/product-789.jpg
```

---

## Tài Liệu Tham Khảo

- [ImageKit Documentation](https://docs.imagekit.io/)
- [ImageKit Node.js SDK](https://docs.imagekit.io/api-reference/api-introduction/sdk/nodejs-sdk)
- [Transformation Parameters](https://docs.imagekit.io/features/image-transformations)
- [ImageKit Dashboard](https://imagekit.io/dashboard)

---

> **Cập nhật lần cuối**: 08/01/2026

> Nếu gặp vấn đề, vui lòng liên hệ TANK ZENITH GEN team hoặc tạo issue trên repository.
