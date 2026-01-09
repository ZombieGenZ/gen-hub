# Hướng Dẫn Cấu Hình SEPAY Payment

> [!NOTE]
> Tài liệu này hướng dẫn cách đăng ký và cấu hình SEPAY để nhận thanh toán tự động qua chuyển khoản ngân hàng.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Đăng Ký Tài Khoản SEPAY](#2-đăng-ký-tài-khoản-sepay)
3. [Liên Kết Tài Khoản Ngân Hàng](#3-liên-kết-tài-khoản-ngân-hàng)
4. [Lấy API Key](#4-lấy-api-key)
5. [Cấu Hình Webhook](#5-cấu-hình-webhook)
6. [Cập Nhật File .env](#6-cập-nhật-file-env)
7. [Xác Minh Cấu Hình](#7-xác-minh-cấu-hình)
8. [Xử Lý Lỗi Thường Gặp](#8-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

**SEPAY** là dịch vụ thanh toán tự động, cho phép xác nhận giao dịch chuyển khoản ngân hàng theo thời gian thực thông qua webhook.

### Cách hoạt động:
1. Khách hàng chuyển khoản với nội dung có mã đơn hàng
2. SEPAY nhận thông báo từ ngân hàng
3. SEPAY gửi webhook đến server của bạn
4. Server xác nhận và xử lý đơn hàng

### Các biến môi trường cần cấu hình:

| Biến | Mô tả |
|------|-------|
| `SEPAY_ACCOUNT_NUMBER` | Số tài khoản ngân hàng |
| `SEPAY_BANK_NAME` | Tên ngân hàng (VD: MBBank) |
| `SEPAY_ACCOUNT_HOLDER` | Tên chủ tài khoản |
| `SEPAY_API_KEY` | API key để xác thực |

### Ngân hàng hỗ trợ:
- ✅ MBBank (khuyến nghị - realtime)
- ✅ Techcombank
- ✅ ACB
- ✅ VPBank
- ✅ TPBank
- ✅ VietinBank
- ✅ Vietcombank
- ✅ Và nhiều ngân hàng khác...

---

## 2. Đăng Ký Tài Khoản SEPAY

### Bước 1: Truy cập website
1. Truy cập: https://my.sepay.vn
2. Click **"Đăng ký"** hoặc **"Register"**

### Bước 2: Điền thông tin đăng ký
1. **Email**: Email của bạn
2. **Mật khẩu**: Tạo mật khẩu mạnh
3. **Số điện thoại**: Số điện thoại liên hệ
4. **Mã giới thiệu**: (tùy chọn)
5. Click **"Đăng ký"**

### Bước 3: Xác minh email
1. Kiểm tra hộp thư email
2. Click vào link xác minh
3. Đăng nhập vào tài khoản

### Bước 4: Hoàn thiện thông tin
1. Vào **Profile** hoặc **Thông tin tài khoản**
2. Điền đầy đủ thông tin cá nhân/doanh nghiệp
3. Upload CMND/CCCD hoặc Giấy phép kinh doanh (nếu yêu cầu)

---

## 3. Liên Kết Tài Khoản Ngân Hàng

### Bước 1: Vào phần Quản lý tài khoản

1. Đăng nhập vào https://my.sepay.vn
2. Vào menu **"Tài khoản ngân hàng"** hoặc **"Bank Accounts"**
3. Click **"Thêm tài khoản"** hoặc **"Add Account"**

### Bước 2: Chọn ngân hàng

1. Chọn ngân hàng từ danh sách (VD: **MBBank**)
2. Nhập thông tin:
   - **Số tài khoản**: Số tài khoản của bạn
   - **Tên chủ tài khoản**: Tên chính xác như trên ngân hàng

### Bước 3: Kết nối tài khoản

**Cách 1: Liên kết qua Internet Banking (Khuyến nghị)**
1. Đăng nhập Internet Banking của ngân hàng
2. Tìm phần **"Liên kết dịch vụ"** hoặc **"API Banking"**
3. Kết nối với SEPAY theo hướng dẫn trên màn hình

**Cách 2: Liên kết qua App MBBank (cho MBBank)**
1. Mở app **MBBank**
2. Vào **Cài đặt** → **Liên kết tài khoản**
3. Tìm **SEPAY** và làm theo hướng dẫn

### Bước 4: Xác minh liên kết

1. SEPAY sẽ gửi một giao dịch test nhỏ (VD: 1,000 VND)
2. Kiểm tra số tiền nhận được
3. Nhập số tiền để xác minh trên SEPAY

> [!IMPORTANT]
> **Lưu lại thông tin sau khi liên kết thành công:**
> - Số tài khoản: `SEPAY_ACCOUNT_NUMBER`
> - Tên ngân hàng: `SEPAY_BANK_NAME`
> - Tên chủ tài khoản: `SEPAY_ACCOUNT_HOLDER`

---

## 4. Lấy API Key

### Bước 1: Vào phần API

1. Đăng nhập https://my.sepay.vn
2. Vào menu **"API"** hoặc **"Tích hợp API"**

### Bước 2: Tạo API Key

1. Click **"Tạo API Key"** hoặc **"Generate API Key"**
2. Nhập **Tên key** (VD: `genhub-production`)
3. Chọn **Quyền**:
   - ✅ Đọc giao dịch (Read transactions)
   - ✅ Webhook
4. Click **"Tạo"**

### Bước 3: Lưu API Key

1. **QUAN TRỌNG**: Copy ngay API Key được hiển thị
2. API Key có dạng:
   ```
   SEPAY_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

> [!CAUTION]
> API Key chỉ hiển thị **MỘT LẦN**. Lưu ngay vào nơi an toàn!

---

## 5. Cấu Hình Webhook

### Bước 1: Vào cấu hình Webhook

1. Trong menu **"API"** → **"Webhook"**
2. Click **"Thêm webhook"** hoặc **"Add webhook"**

### Bước 2: Cấu hình URL

1. **Webhook URL**: URL endpoint của server
   ```
   https://api.gen-hub.dev/webhooks/sepay
   ```
2. **Method**: POST
3. **Event types**: Chọn các events cần nhận:
   - ✅ Giao dịch mới (New transaction)
   - ✅ Giao dịch thành công (Transaction success)

### Bước 3: Bảo mật (Tùy chọn)

1. **Secret key**: Nhập một chuỗi random để xác thực webhook
2. **IP Whitelist**: Có thể giới hạn IP server nếu cần

### Bước 4: Test Webhook

1. Click **"Test webhook"**
2. Kiểm tra server có nhận được request không
3. Response 200 OK = thành công

---

## 6. Cập Nhật File .env

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
# Payment Configuration (SEPAY)
# ===================

# Thông tin tài khoản ngân hàng
SEPAY_ACCOUNT_NUMBER=0123456789
SEPAY_BANK_NAME=MBBank
SEPAY_ACCOUNT_HOLDER=NGUYEN VAN A

# API Key (lấy từ Bước 4)
SEPAY_API_KEY="SEPAY_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Payment Code Configuration
PAYMENT_CODE_PREFIX=GENHUB
PAYMENT_CODE_LENGTH=8
CONTRACT_PENDING_EXPIRE_HOURS=24
```

### Giải thích các biến:

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `SEPAY_ACCOUNT_NUMBER` | `0123456789` | Số tài khoản ngân hàng đã liên kết |
| `SEPAY_BANK_NAME` | `MBBank` | Tên ngân hàng (viết đúng format) |
| `SEPAY_ACCOUNT_HOLDER` | `NGUYEN VAN A` | Tên chủ tài khoản (VIẾT HOA) |
| `SEPAY_API_KEY` | `SEPAY_xxx...` | API key để xác thực với SEPAY |
| `PAYMENT_CODE_PREFIX` | `GENHUB` | Prefix cho mã thanh toán |
| `PAYMENT_CODE_LENGTH` | `8` | Độ dài mã thanh toán |

### Danh sách Bank Names hỗ trợ:

| Giá trị | Ngân hàng |
|---------|-----------|
| `MBBank` | Ngân hàng Quân đội |
| `Techcombank` | Ngân hàng Kỹ thương |
| `VietinBank` | Ngân hàng Công thương |
| `Vietcombank` | Ngân hàng Ngoại thương |
| `ACB` | Ngân hàng Á Châu |
| `VPBank` | Ngân hàng Việt Nam Thịnh Vượng |
| `TPBank` | Ngân hàng Tiên Phong |
| `Sacombank` | Ngân hàng Sài Gòn Thương Tín |
| `HDBank` | Ngân hàng Phát triển TP.HCM |
| `OCB` | Ngân hàng Phương Đông |

---

## 7. Xác Minh Cấu Hình

### 7.1. Khởi động Server

```bash
cd server
npm run start:dev
```

### 7.2. Kiểm tra Logs

Logs thành công:
```
[SepayService] SEPAY payment service initialized
[SepayService] Bank: MBBank, Account: ****6789
```

### 7.3. Test Webhook

1. Vào dashboard SEPAY → Webhook → Test webhook
2. Kiểm tra server logs nhận được request:
   ```
   [SepayWebhook] Received payment notification
   [SepayWebhook] Transaction ID: xxx, Amount: 100000
   ```

### 7.4. Test với giao dịch thật (Development)

1. Tạo một đơn hàng test với mã thanh toán
2. Chuyển khoản một số tiền nhỏ (VD: 10,000 VND) với đúng nội dung
3. Kiểm tra:
   - Dashboard SEPAY có giao dịch
   - Webhook được gửi đến server
   - Đơn hàng được cập nhật trạng thái

---

## 8. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: Không nhận được webhook

**Nguyên nhân**: 
- URL webhook không accessible
- SSL không hợp lệ
- Server response lỗi

**Giải pháp**:
1. Kiểm tra URL accessible từ internet
2. Đảm bảo SSL certificate valid
3. Kiểm tra endpoint trả về 200 OK
4. Kiểm tra logs SEPAY để xem error message

---

### ❌ Lỗi: `401 Unauthorized` khi gọi API

**Nguyên nhân**: API Key không hợp lệ

**Giải pháp**:
- Kiểm tra API Key trong `.env` có dấu ngoặc kép
- Tạo API Key mới nếu cần

---

### ❌ Lỗi: Giao dịch không được nhận diện

**Nguyên nhân**: 
- Nội dung chuyển khoản không đúng format
- Tài khoản chưa được liên kết đúng

**Giải pháp**:
- Kiểm tra mã thanh toán trong nội dung chuyển khoản
- Đảm bảo khách hàng nhập đúng mã
- Kiểm tra tài khoản đã active trên SEPAY

---

### ❌ Lỗi: Webhook bị duplicate

**Nguyên nhân**: SEPAY retry khi không nhận được response 200

**Giải pháp**:
- Đảm bảo endpoint trả về 200 OK ngay lập tức
- Implement idempotency check theo transaction ID
- Xử lý async nếu cần thời gian dài

---

### ❌ Lỗi: Tài khoản ngân hàng mất liên kết

**Nguyên nhân**: Session hết hạn hoặc thay đổi mật khẩu Internet Banking

**Giải pháp**:
- Đăng nhập lại SEPAY
- Liên kết lại tài khoản ngân hàng
- Kiểm tra Internet Banking vẫn hoạt động

---

## Lưu Ý Quan Trọng

> [!WARNING]
> - **Bảo mật API Key**: Không commit API Key vào git, sử dụng biến môi trường
> - **Kiểm tra kỹ nội dung chuyển khoản**: Mã thanh toán phải unique và đủ dài
> - **Handle webhook failures**: Implement retry logic và error handling
> - **Monitor giao dịch**: Kiểm tra định kỳ trên dashboard SEPAY

---

## Tài Liệu Tham Khảo

- [SEPAY Documentation](https://docs.sepay.vn)
- [SEPAY API Reference](https://docs.sepay.vn/api)
- [SEPAY Dashboard](https://my.sepay.vn)

---

> **Cập nhật lần cuối**: 08/01/2026

> Nếu gặp vấn đề, vui lòng liên hệ TANK ZENITH GEN team hoặc tạo issue trên repository.
