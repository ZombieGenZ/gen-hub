# Hướng Dẫn Cấu Hình Gmail API và Email

> [!NOTE]
> Tài liệu này hướng dẫn chi tiết cách thiết lập Gmail API với OAuth2, cấu hình gửi email SMTP, và Push Notifications via Pub/Sub.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Tạo Google Cloud Project](#2-tạo-google-cloud-project)
3. [Enable APIs](#3-enable-apis)
4. [Tạo OAuth2 Credentials](#4-tạo-oauth2-credentials)
5. [Lấy Refresh Token](#5-lấy-refresh-token)
6. [Cấu Hình Email Addresses](#6-cấu-hình-email-addresses)
7. [Cấu Hình Cloud Pub/Sub](#7-cấu-hình-cloud-pubsub)
8. [Cấu Hình Polling Mode](#8-cấu-hình-polling-mode)
9. [Cập Nhật File .env](#9-cập-nhật-file-env)
10. [Xác Minh Cấu Hình](#10-xác-minh-cấu-hình)
11. [Xử Lý Lỗi Thường Gặp](#11-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

GEN-HUB sử dụng Gmail API cho các chức năng:
- **Gửi email** - Xác minh tài khoản, thông báo, hỗ trợ
- **Nhận email** - Realtime qua Push Notifications hoặc Polling
- **Quản lý hộp thư** - Đọc, đánh dấu, xóa email

### Các biến môi trường cần cấu hình:

| Biến | Mô tả |
|------|-------|
| `GOOGLE_CLIENT_ID` | OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth2 Client Secret |
| `GOOGLE_REFRESH_TOKEN` | Refresh token để lấy access token |
| `EMAIL_PRIMARY_ADDRESS` | Email chính dùng để gửi/nhận |
| `EMAIL_SEND_ADDRESS` | Địa chỉ hiển thị cho người nhận (display name) |
| `EMAIL_SUPPORT_ADDRESS` | Email cho phản hồi của người dùng |
| `GMAIL_PUBSUB_TOPIC` | Topic Pub/Sub cho push notifications |
| `GMAIL_PUBSUB_SUBSCRIPTION` | Subscription của topic |
| `GMAIL_WATCH_LABEL_IDS` | Labels cần theo dõi (VD: INBOX) |
| `GMAIL_WATCH_RENEW_INTERVAL_HOURS` | Interval renew watch (giờ) |
| `GMAIL_WEBHOOK_SECRET` | Secret để xác thực webhook |

---

## 2. Tạo Google Cloud Project

### Bước 1: Truy cập Google Cloud Console
1. Truy cập: https://console.cloud.google.com
2. Đăng nhập bằng tài khoản Google có quyền quản trị

### Bước 2: Tạo Project mới
1. Click vào dropdown **"Select a project"** ở thanh trên
2. Click **"New Project"**
3. Điền thông tin:
   - **Project name**: `gen-hub` (hoặc tên tùy ý)
   - **Organization**: Chọn organization (nếu có)
4. Click **"Create"**
5. Đợi project được tạo và chuyển sang project mới

> [!TIP]
> Ghi nhớ **Project ID** (hiển thị dưới tên project), sẽ cần dùng sau này.

---

## 3. Enable APIs

### Bước 1: Enable Gmail API
1. Vào **Navigation Menu** (☰) → **APIs & Services** → **Library**
2. Tìm kiếm **"Gmail API"**
3. Click vào kết quả **Gmail API**
4. Click **"Enable"**
5. Đợi API được enable

### Bước 2: Enable Cloud Pub/Sub API
1. Quay lại **Library**
2. Tìm kiếm **"Cloud Pub/Sub API"**
3. Click vào kết quả
4. Click **"Enable"**

> [!NOTE]
> Nếu bạn chỉ muốn dùng Polling mode (không cần realtime), có thể bỏ qua Enable Pub/Sub API.

---

## 4. Tạo OAuth2 Credentials

### Bước 1: Cấu hình OAuth Consent Screen

1. Vào **APIs & Services** → **OAuth consent screen**
2. Chọn **User Type**:
   - **Internal**: Chỉ users trong Google Workspace organization
   - **External**: Cho tất cả users (chọn này nếu không có Workspace)
3. Click **"Create"**

4. **Điền thông tin App:**
   - **App name**: `GEN-HUB Service`
   - **User support email**: Email của bạn
   - **App logo**: Upload logo (tùy chọn)
   
5. **App domain** (tùy chọn):
   - Application home page: `https://gen-hub.dev`
   - Application privacy policy: `https://gen-hub.dev/privacy`
   - Application terms of service: `https://gen-hub.dev/terms`

6. **Developer contact information**:
   - Email addresses: Email của developer
   
7. Click **"Save and Continue"**

### Bước 2: Thêm Scopes

1. Click **"Add or Remove Scopes"**
2. Tìm và chọn các scopes sau:

   | Scope | Mô tả |
   |-------|-------|
   | `https://mail.google.com/` | Full access Gmail (cần cho gửi/nhận) |
   | `https://www.googleapis.com/auth/gmail.modify` | Đọc, gửi, xóa email |
   | `https://www.googleapis.com/auth/gmail.readonly` | Chỉ đọc email |
   | `https://www.googleapis.com/auth/pubsub` | Pub/Sub access |

3. Click **"Update"**
4. Click **"Save and Continue"**

### Bước 3: Thêm Test Users (Development)

> [!IMPORTANT]
> Với app ở trạng thái "Testing", chỉ có Test Users mới có thể authorize. Thêm email sẽ sử dụng vào đây.

1. Click **"Add Users"**
2. Nhập email address sẽ sử dụng để gửi/nhận email (VD: `support@gen-hub.dev`)
3. Click **"Add"**
4. Click **"Save and Continue"**

### Bước 4: Tạo OAuth Client ID

1. Vào **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. **Application type**: Chọn **Web application**
4. **Name**: `GEN-HUB Backend`
5. **Authorized JavaScript origins**: (để trống hoặc thêm domain nếu cần)
6. **Authorized redirect URIs**: 
   ```
   https://developers.google.com/oauthplayground
   ```
7. Click **"Create"**

8. **LƯU LẠI thông tin hiển thị:**
   - `Client ID`: `xxxxxxxxxxxx.apps.googleusercontent.com`
   - `Client Secret`: `GOCSPX-xxxxxxxxxxxxxx`

> [!CAUTION]
> Lưu Client Secret ở nơi an toàn. Bạn có thể xem lại sau nhưng khuyến nghị lưu ngay.

---

## 5. Lấy Refresh Token

### Bước 1: Mở OAuth Playground

1. Truy cập: https://developers.google.com/oauthplayground
2. Click biểu tượng **⚙️ Settings** (góc phải trên)
3. Check **"Use your own OAuth credentials"**
4. Nhập:
   - **OAuth Client ID**: Client ID đã tạo
   - **OAuth Client secret**: Client Secret đã tạo
5. Click **"Close"**

### Bước 2: Authorize APIs

1. Trong panel bên trái **"Select & authorize APIs"**
2. Tìm **"Gmail API v1"** và mở rộng
3. Chọn các scopes:
   - ✅ `https://mail.google.com/`
   - ✅ `https://www.googleapis.com/auth/gmail.modify`
   - ✅ `https://www.googleapis.com/auth/gmail.readonly`
4. Click **"Authorize APIs"**

### Bước 3: Đăng nhập và cấp quyền

1. Chọn tài khoản Google email sẽ sử dụng (VD: `support@gen-hub.dev`)
2. Nếu thấy warning **"Google hasn't verified this app"**:
   - Click **"Advanced"**
   - Click **"Go to GEN-HUB Email Service (unsafe)"**
3. Review và click **"Continue"** để cấp quyền
4. Bạn sẽ được redirect về OAuth Playground

### Bước 4: Exchange code for tokens

1. Click **"Exchange authorization code for tokens"**
2. Bạn sẽ thấy response chứa:
   ```json
   {
     "access_token": "ya29.xxxxxxxx",
     "refresh_token": "1//xxxxxxxxxx",
     "token_type": "Bearer",
     "expires_in": 3599
   }
   ```
3. **LƯU LẠI** `refresh_token` - Đây là `GOOGLE_REFRESH_TOKEN`

> [!CAUTION]
> **Refresh Token chỉ hiển thị MỘT LẦN** trong lần đầu authorize. Nếu mất, bạn phải thực hiện lại từ Bước 2.

---

## 6. Cấu Hình Email Addresses

### Giải thích các biến Email:

| Biến | Ví dụ | Mô tả |
|------|-------|-------|
| `EMAIL_PRIMARY_ADDRESS` | `support@gen-hub.dev` | Email thực có trong Gmail, dùng để authenticate |
| `EMAIL_SEND_ADDRESS` | `no-reply@gen-hub.dev` | Địa chỉ hiển thị trong "From" (có thể khác với primary) |
| `EMAIL_SUPPORT_ADDRESS` | `support@gen-hub.dev` | Địa chỉ "Reply-To", nơi nhận phản hồi |

### Cấu hình Send-As Address (Tùy chọn)

Nếu bạn muốn `EMAIL_SEND_ADDRESS` khác với `EMAIL_PRIMARY_ADDRESS`:

1. Mở **Gmail** (https://mail.google.com)
2. Vào **Settings** (⚙️) → **See all settings**
3. Chọn tab **"Accounts and Import"**
4. Tìm **"Send mail as"** → Click **"Add another email address"**
5. Nhập email muốn sử dụng (VD: `no-reply@gen-hub.dev`)
6. Làm theo hướng dẫn xác minh

> [!NOTE]
> Nếu không cấu hình Send-As, `EMAIL_SEND_ADDRESS` và `EMAIL_PRIMARY_ADDRESS` nên giống nhau.

---

## 7. Cấu Hình Cloud Pub/Sub

> [!TIP]
> Pub/Sub cho phép nhận email theo thời gian thực (push). Nếu không cần realtime, bạn có thể dùng [Polling Mode](#8-cấu-hình-polling-mode).

### Bước 1: Tạo Topic

1. Vào **Pub/Sub** trong Google Cloud Console (Navigation Menu → Pub/Sub)
2. Click **"+ Create Topic"**
3. **Topic ID**: `gmail-push`
4. **KHÔNG** check "Add a default subscription"
5. Click **"Create"**

### Bước 2: Cấp quyền cho Gmail

Gmail service account cần quyền publish vào topic:

1. Chọn topic `gmail-push` vừa tạo
2. Click tab **"Permissions"** (hoặc nút **"Show Info Panel"** bên phải)
3. Click **"Add Principal"**
4. **New principals**: 
   ```
   gmail-api-push@system.gserviceaccount.com
   ```
5. **Role**: Chọn **Pub/Sub Publisher**
6. Click **"Save"**

### Bước 3: Tạo Push Subscription

1. Vào **Subscriptions** → Click **"+ Create Subscription"**
2. **Subscription ID**: `gmail-push-sub`
3. **Select a Cloud Pub/Sub topic**: Chọn `projects/<project-id>/topics/gmail-push`
4. **Delivery type**: Chọn **Push**
5. **Endpoint URL**: URL webhook của server
   ```
   https://api.gen-hub.dev/webhooks/gmail
   ```
6. **Authentication** (quan trọng):
   - Enable **"Enable authentication"**
   - Audience: URL endpoint của bạn
7. Click **"Create"**

> [!IMPORTANT]
> - Endpoint **PHẢI** là HTTPS với SSL certificate hợp lệ
> - Endpoint phải accessible từ internet
> - Development có thể dùng ngrok: `https://xxx.ngrok.io/webhooks/gmail`

### Bước 4: Generate Webhook Secret

Tạo một random string để xác thực webhook:

```bash
# Linux/macOS
openssl rand -hex 32

# hoặc online: https://www.random.org/strings/
```

Ví dụ output:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

Đây là `GMAIL_WEBHOOK_SECRET`.

---

## 8. Cấu Hình Polling Mode

> [!NOTE]
> Polling mode là fallback khi không thể sử dụng Pub/Sub (VD: development local, firewall restrictions).

Polling định kỳ kiểm tra hộp thư mới thay vì nhận push notifications.

### Khi nào nên dùng Polling:
- Development environment (localhost)
- Firewall không cho phép incoming webhooks
- Không cần realtime (delay vài giây acceptable)

### Cấu hình:

```env
# Bật Polling mode
GMAIL_USE_POLLING=true

# Interval kiểm tra (giây) - tối thiểu 30s để tránh rate limit
GMAIL_POLL_INTERVAL_SECONDS=30
```

---

## 9. Cập Nhật File .env

### Mở file `.env`:

```bash
# Windows
notepad server\.env

# hoặc VS Code
code server\.env
```

### Cấu hình đầy đủ:

```env
# ===================
# Email Configuration (Gmail SMTP)
# ===================

# OAuth2 Credentials (từ Bước 4)
GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxx

# Refresh Token (từ Bước 5)
GOOGLE_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email Addresses (từ Bước 6)
EMAIL_PRIMARY_ADDRESS=support@gen-hub.dev
EMAIL_SEND_ADDRESS=no-reply@gen-hub.dev
EMAIL_SUPPORT_ADDRESS=support@gen-hub.dev

# ===================
# Gmail API Configuration
# ===================

# Push Notifications (Production - từ Bước 7)
GMAIL_PUBSUB_TOPIC=projects/genhub-email/topics/gmail-push
GMAIL_PUBSUB_SUBSCRIPTION=projects/genhub-email/subscriptions/gmail-push-sub
GMAIL_WATCH_LABEL_IDS=INBOX
GMAIL_WATCH_RENEW_INTERVAL_HOURS=24
GMAIL_WEBHOOK_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Polling Mode (Development - từ Bước 8)
GMAIL_USE_POLLING=false
GMAIL_POLL_INTERVAL_SECONDS=30
```

### Giải thích các biến:

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `GMAIL_WATCH_LABEL_IDS` | `INBOX` | Labels để watch. Có thể thêm nhiều: `INBOX,CATEGORY_PERSONAL` |
| `GMAIL_WATCH_RENEW_INTERVAL_HOURS` | `24` | Watch expire sau 7 ngày, renew mỗi 24h là an toàn |
| `GMAIL_USE_POLLING` | `false` | `true` để dùng polling thay vì push |
| `GMAIL_POLL_INTERVAL_SECONDS` | `30` | Interval polling, tối thiểu 30s |

---

## 10. Xác Minh Cấu Hình

### 10.1. Khởi động Server

```bash
cd server
npm run start:dev
```

### 10.2. Kiểm tra Logs

Logs thành công:
```
[GmailService] Gmail API initialized
[GmailService] Authenticated as: support@gen-hub.dev
[GmailService] Watch registered successfully. Expiration: ...
```

### 10.3. Test gửi email

```bash
# Từ server, call API test (nếu có endpoint)
curl -X POST http://localhost:4000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@gmail.com", "subject": "Test", "body": "Hello!"}'
```

### 10.4. Test nhận email (Push)

1. Gửi một email đến địa chỉ `EMAIL_PRIMARY_ADDRESS`
2. Kiểm tra logs server để thấy notification từ Pub/Sub:
   ```
   [GmailWebhook] Received push notification
   [GmailService] Processing new message: xxx
   ```

### 10.5. Verify Gmail API Access

```bash
curl -H "Authorization: Bearer <access_token>" \
  "https://gmail.googleapis.com/gmail/v1/users/me/profile"
```

Response thành công:
```json
{
  "emailAddress": "support@gen-hub.dev",
  "messagesTotal": 1234,
  "threadsTotal": 567,
  "historyId": "12345678"
}
```

---

## 11. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: `Invalid credentials` hoặc `401 Unauthorized`

**Nguyên nhân**: OAuth credentials không hợp lệ hoặc refresh token đã expire

**Giải pháp**:
- Kiểm tra `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Lấy lại refresh token từ OAuth Playground
- Đảm bảo email đã được add vào Test Users (nếu app ở testing mode)

---

### ❌ Lỗi: `Access token not found`

**Nguyên nhân**: `GOOGLE_REFRESH_TOKEN` không hợp lệ

**Giải pháp**:
- Thử lấy lại refresh token từ OAuth Playground
- Đảm bảo đã authorize đúng account

---

### ❌ Lỗi: `Insufficient permissions` hoặc `403 Forbidden`

**Nguyên nhân**: Thiếu scopes hoặc API chưa enabled

**Giải pháp**:
- Kiểm tra đã enable Gmail API
- Re-authorize trong OAuth Playground với đủ scopes
- Kiểm tra OAuth Consent Screen đã có đúng scopes

---

### ❌ Lỗi: Không nhận được push notifications

**Nguyên nhân**:
- Webhook endpoint không accessible
- SSL certificate không hợp lệ
- Thiếu permission cho Gmail service account

**Giải pháp**:
1. Test endpoint accessible từ internet:
   ```bash
   curl -X POST https://api.gen-hub.dev/webhooks/gmail
   ```
2. Kiểm tra SSL certificate valid
3. Xác nhận `gmail-api-push@system.gserviceaccount.com` có role Pub/Sub Publisher

---

### ❌ Lỗi: `Watch has expired`

**Nguyên nhân**: Gmail watch chỉ valid 7 ngày và chưa được renew

**Giải pháp**:
- Server cần có cron job tự động renew
- Kiểm tra `GMAIL_WATCH_RENEW_INTERVAL_HOURS` đang hoạt động
- Restart server để re-register watch

---

### ❌ Lỗi: `Daily Limit Exceeded` hoặc `429 Too Many Requests`

**Nguyên nhân**: Vượt quá quota Gmail API

**Giải pháp**:
- Giảm `GMAIL_POLL_INTERVAL_SECONDS` (nếu dùng polling)
- Optimize logic để giảm số API calls
- Check quotas trong Google Cloud Console → APIs & Services → Quotas

---

### ❌ Lỗi: Email vào spam hoặc không gửi được

**Nguyên nhân**: SPF, DKIM, DMARC không configured

**Giải pháp**:
- Cấu hình DNS records cho domain:
  - SPF record
  - DKIM signing
  - DMARC policy
- Sử dụng custom domain thay vì @gmail.com cho production

---

## Tài Liệu Tham Khảo

- [Gmail API Push Notifications](https://developers.google.com/gmail/api/guides/push)
- [Gmail API Guides](https://developers.google.com/gmail/api/guides)
- [Cloud Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
- [OAuth2 for Server-side Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OAuth Playground](https://developers.google.com/oauthplayground)

---

> **Cập nhật lần cuối**: 08/01/2026

> Nếu gặp vấn đề, vui lòng liên hệ TANK ZENITH GEN team hoặc tạo issue trên repository.
