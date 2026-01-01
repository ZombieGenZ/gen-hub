# Hướng dẫn cấu hình Gmail API với Push Notifications

Tài liệu hướng dẫn thiết lập Gmail API với Google Cloud Pub/Sub để nhận email realtime.

---

## 1. Tạo Google Cloud Project

### Bước 1: Truy cập Google Cloud Console
1. Truy cập: https://console.cloud.google.com
2. Đăng nhập bằng tài khoản Google có quyền quản trị

### Bước 2: Tạo Project mới
1. Click vào dropdown "Select a project" ở thanh trên
2. Click "New Project"
3. Nhập tên project (VD: `genhub-email-inbound`)
4. Click "Create"

---

## 2. Enable APIs

### Bước 1: Enable Gmail API
1. Vào **APIs & Services** > **Library**
2. Tìm kiếm "Gmail API"
3. Click vào kết quả Gmail API
4. Click **"Enable"**

### Bước 2: Enable Cloud Pub/Sub API
1. Tìm kiếm "Cloud Pub/Sub API"
2. Click vào kết quả
3. Click **"Enable"**

---

## 3. Tạo OAuth2 Credentials

### Bước 1: Cấu hình OAuth Consent Screen
1. Vào **APIs & Services** > **OAuth consent screen**
2. Chọn **External** (hoặc Internal nếu là Google Workspace)
3. Điền thông tin:
   - App name: `GEN-HUB Email Service`
   - User support email: email của bạn
   - Developer contact: email của bạn
4. Click "Save and Continue"

### Bước 2: Thêm Scopes
1. Click **"Add or Remove Scopes"**
2. Tìm và thêm các scopes sau:
   ```
   https://mail.google.com/
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/pubsub
   ```
3. Click "Update" > "Save and Continue"

### Bước 3: Thêm Test Users (Development)
1. Thêm email address sẽ sử dụng để test
2. Click "Save and Continue"

### Bước 4: Tạo OAuth Client ID
1. Vào **APIs & Services** > **Credentials**
2. Click **"+ Create Credentials"** > **"OAuth client ID"**
3. Chọn **Web application**
4. Nhập tên: `GEN-HUB Backend`
5. Thêm **Authorized redirect URIs**:
   ```
   https://developers.google.com/oauthplayground
   ```
6. Click **"Create"**
7. **LƯU LẠI** `Client ID` và `Client Secret`

---

## 4. Lấy Refresh Token

### Bước 1: Sử dụng OAuth Playground
1. Truy cập: https://developers.google.com/oauthplayground
2. Click biểu tượng ⚙️ (Settings) góc phải
3. Check **"Use your own OAuth credentials"**
4. Nhập `Client ID` và `Client Secret` đã tạo

### Bước 2: Authorize APIs
1. Trong phần "Select & authorize APIs", tìm **Gmail API v1**
2. Chọn các scopes:
   ```
   https://mail.google.com/
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/gmail.readonly
   ```
3. Click **"Authorize APIs"**
4. Đăng nhập bằng tài khoản email sẽ dùng (VD: `no-reply@gen-hub.dev`)
5. Cho phép các quyền

### Bước 3: Exchange code for tokens
1. Click **"Exchange authorization code for tokens"**
2. **LƯU LẠI** `Refresh Token`

---

## 5. Cấu hình Cloud Pub/Sub

### Bước 1: Tạo Topic
1. Vào **Pub/Sub** > **Topics**
2. Click **"+ Create Topic"**
3. Topic ID: `gmail-push`
4. **KHÔNG** check "Add a default subscription"
5. Click **"Create"**

### Bước 2: Cấp quyền cho Gmail
1. Chọn topic vừa tạo
2. Click tab **"Permissions"**
3. Click **"Add Principal"**
4. Principal:
   ```
   gmail-api-push@system.gserviceaccount.com
   ```
5. Role: **Pub/Sub Publisher**
6. Click **"Save"**

### Bước 3: Tạo Push Subscription
1. Vào **Subscriptions** > **+ Create Subscription**
2. Subscription ID: `gmail-push-sub`
3. Chọn topic: `projects/<project-id>/topics/gmail-push`
4. **Delivery type**: Push
5. **Endpoint URL**: (URL webhook của server, VD: `https://api.gen-hub.dev/webhooks/gmail`)
6. Click **"Create"**

> **Lưu ý**: Endpoint phải là HTTPS với SSL certificate hợp lệ

---

## 6. Cấu hình .env

Thêm các biến sau vào file `.env`:

```bash
# Google OAuth2
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
EMAIL_PRIMARY_ADDRESS=no-reply@gen-hub.dev

# Gmail API Push Notifications
GMAIL_PUBSUB_TOPIC=projects/your-project-id/topics/gmail-push
GMAIL_PUBSUB_SUBSCRIPTION=projects/your-project-id/subscriptions/gmail-push-sub
GMAIL_WATCH_LABEL_IDS=INBOX
GMAIL_WATCH_RENEW_INTERVAL_HOURS=24

# Webhook endpoint (tương đối với BACKEND_URL)
GMAIL_WEBHOOK_ENDPOINT=/webhooks/gmail
GMAIL_WEBHOOK_SECRET=generate-a-random-secret-string
```

---

## 7. Xác thực hoạt động

### Test 1: Verify Gmail API access
```bash
# Từ server, call API test
curl -H "Authorization: Bearer <access_token>" \
  "https://gmail.googleapis.com/gmail/v1/users/me/profile"
```

### Test 2: Setup Gmail Watch
Server sẽ tự động gọi `users.watch` khi khởi động để đăng ký push notifications.

### Test 3: Send test email
1. Gửi một email đến địa chỉ đã cấu hình
2. Kiểm tra log server để thấy notification từ Pub/Sub
3. Kiểm tra email đã được xử lý

---

## Troubleshooting

### Lỗi "Access token not found"
- Kiểm tra `GOOGLE_REFRESH_TOKEN` có hợp lệ
- Thử lấy lại refresh token từ OAuth Playground

### Lỗi "Insufficient permissions"
- Kiểm tra scopes đã đúng
- Re-authorize trong OAuth Playground

### Không nhận được push notifications
- Kiểm tra webhook endpoint có accessible từ internet
- Kiểm tra SSL certificate hợp lệ
- Kiểm tra `gmail-api-push@system.gserviceaccount.com` đã có quyền publish vào topic

### Watch expired
- Server cần renew watch mỗi 7 ngày (hoặc theo config `GMAIL_WATCH_RENEW_INTERVAL_HOURS`)
- Kiểm tra cron job renew đang hoạt động

---

## Tham khảo

- [Gmail API Push Notifications](https://developers.google.com/gmail/api/guides/push)
- [Cloud Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
- [OAuth2 for Server-side Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
