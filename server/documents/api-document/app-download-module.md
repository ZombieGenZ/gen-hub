# App Download Module - Tài Liệu API

## Tổng Quan

Module `app-download` quản lý việc phân phối ứng dụng GenHub (Windows .exe) thông qua hệ thống lời mời dựa trên token bảo mật.

### Quy Trình Hoạt Động

1. **Admin tạo lời mời**: Admin/Super Admin tạo lời mời tải ứng dụng cho người dùng cụ thể
2. **Gửi email tự động**: Hệ thống tự động gửi email chứa link tải với token duy nhất
3. **Người dùng tải ứng dụng**: Người nhận click vào link trong email để tải ứng dụng
4. **Theo dõi và giới hạn**: Hệ thống tự động theo dõi số lượt tải và áp dụng các giới hạn đã cấu hình

### Tính Năng Chính

- ✅ Tạo link tải với token bảo mật duy nhất
- ✅ Gửi email lời mời tự động
- ✅ Giới hạn số lượt tải (có thể cấu hình hoặc không giới hạn)
- ✅ Thiết lập thời hạn sử dụng (theo ngày hoặc ngày cụ thể)
- ✅ Link vĩnh viễn cho người dùng VIP
- ✅ Theo dõi số lượt tải thực tế
- ✅ Tự động xóa các lời mời hết hạn (scheduler)
- ✅ Redis caching để tối ưu hiệu suất
- ✅ Hỗ trợ đa ngôn ngữ (i18n)

---

## Permissions

Tất cả các quyền sau được seed sẵn cho vai trò **Admin** và **Super Admin**:

| Action | Permission Key | Mô tả |
|--------|----------------|-------|
| Xem danh sách | `app-download.list` | Xem danh sách tất cả các link chia sẻ đã tạo |
| Xem chi tiết | `app-download.read` | Xem thông tin chi tiết của một link chia sẻ |
| Tạo lời mời | `app-download.invite` | Tạo link chia sẻ mới và gửi email lời mời |
| Gửi lại lời mời | `app-download.resend_invite` | Gửi lại email lời mời cho share đã tồn tại |
| Xóa lời mời | `app-download.delete` | Xóa (soft delete) và vô hiệu hóa link chia sẻ |

> **Lưu ý**: Endpoint download (`/app-download/download/:token`) là **public** và không yêu cầu xác thực.

---

## API Endpoints

### 1. Quản Lý Shares

#### 1.1 Lấy Danh Sách Tất Cả Shares

**Endpoint:** `GET /app-download/shares`

**Permission:** `app-download.list`

**Mô tả:** Lấy danh sách tất cả các link chia sẻ tải ứng dụng đã tạo, bao gồm thông tin về token, số lượt tải, thời hạn và danh sách lời mời email.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response 200 - Success:**
```json
{
  "code": "app-download.list_shares",
  "success": true,
  "message": "Lấy danh sách chia sẻ thành công",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "token": "abc123xyz789",
      "max_download": 5,
      "current_download": 2,
      "is_permanent": false,
      "expires_at": "2024-12-31T23:59:59.000Z",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "is_deleted": false,
      "deleted_at": null,
      "created_by": "550e8400-e29b-41d4-a716-446655440002",
      "deleted_by": null,
      "invites": [
        {
          "id": "650e8400-e29b-41d4-a716-446655440003",
          "email": "user@example.com",
          "sent_at": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

---

#### 1.2 Lấy Chi Tiết Share Theo ID

**Endpoint:** `GET /app-download/shares/:id`

**Permission:** `app-download.read`

**Mô tả:** Lấy thông tin chi tiết của một link chia sẻ cụ thể, bao gồm tất cả lời mời email đã gửi.

**Path Parameters:**
- `id` (UUID, required): ID của share

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response 200 - Success:**
```json
{
  "code": "app-download.get_share",
  "success": true,
  "message": "Lấy chi tiết chia sẻ thành công",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "token": "abc123xyz789",
    "max_download": 5,
    "current_download": 2,
    "is_permanent": false,
    "expires_at": "2024-12-31T23:59:59.000Z",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "invites": [
      {
        "id": "650e8400-e29b-41d4-a716-446655440003",
        "email": "user@example.com",
        "sent_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Response 404 - Not Found:**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy share"
}
```

---

### 2. Quản Lý Lời Mời

#### 2.1 Tạo Lời Mời Mới

**Endpoint:** `POST /app-download/shares/invite`

**Permission:** `app-download.invite`

**Mô tả:** Tạo một link chia sẻ mới với token duy nhất và gửi email lời mời tải ứng dụng đến địa chỉ email được chỉ định. Link có thể được cấu hình với giới hạn số lần tải và thời hạn sử dụng.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body Schema:**

| Field | Type | Required | Default | Mô tả |
|-------|------|----------|---------|-------|
| `email` | string | ✅ | - | Địa chỉ email người nhận lời mời |
| `max_download` | number | ❌ | -1 | Số lượt tải tối đa (-1 = không giới hạn) |
| `is_permanent` | boolean | ❌ | false | Link vĩnh viễn (true) hoặc có thời hạn (false) |
| `expires_at` | string (ISO 8601) | ❌ | - | Ngày giờ hết hạn cụ thể (ưu tiên hơn expires_in_days) |
| `expires_in_days` | number | ❌ | 7 | Số ngày hết hạn tính từ thời điểm tạo |

**Body Examples:**

<details>
<summary><b>Example 1: Lời mời cơ bản (7 ngày, không giới hạn lượt tải)</b></summary>

```json
{
  "email": "user@example.com"
}
```

**Kết quả:**
- Thời hạn: 7 ngày kể từ khi tạo
- Số lượt tải: Không giới hạn
- Email được gửi ngay lập tức

</details>

<details>
<summary><b>Example 2: Giới hạn 5 lượt tải, hết hạn sau 30 ngày</b></summary>

```json
{
  "email": "partner@company.com",
  "max_download": 5,
  "expires_in_days": 30
}
```

**Kết quả:**
- Thời hạn: 30 ngày kể từ khi tạo
- Số lượt tải: Tối đa 5 lần
- Link sẽ vô hiệu sau 5 lượt tải hoặc 30 ngày (tùy điều kiện nào đến trước)

</details>

<details>
<summary><b>Example 3: Hết hạn vào ngày cụ thể</b></summary>

```json
{
  "email": "client@business.com",
  "max_download": 3,
  "expires_at": "2024-12-31T23:59:59Z"
}
```

**Kết quả:**
- Thời hạn: Đến 23:59:59 ngày 31/12/2024
- Số lượt tải: Tối đa 3 lần
- Thích hợp cho các chiến dịch có thời hạn cụ thể

</details>

<details>
<summary><b>Example 4: Link vĩnh viễn, không giới hạn (VIP)</b></summary>

```json
{
  "email": "vip@example.com",
  "is_permanent": true,
  "max_download": -1
}
```

**Kết quả:**
- Thời hạn: Vĩnh viễn (không bao giờ hết hạn)
- Số lượt tải: Không giới hạn
- Thích hợp cho khách hàng VIP hoặc đối tác lâu dài

</details>

<details>
<summary><b>Example 5: Lời mời dùng 1 lần (One-time download)</b></summary>

```json
{
  "email": "one-time@example.com",
  "max_download": 1,
  "expires_in_days": 3
}
```

**Kết quả:**
- Thời hạn: 3 ngày
- Số lượt tải: Chỉ 1 lần duy nhất
- Link tự động vô hiệu sau lần tải đầu tiên

</details>

**Response 201 - Created:**
```json
{
  "code": "app-download.create_invite",
  "success": true,
  "message": "Tạo liên kết chia sẻ thành công",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "token": "abc123xyz789",
    "max_download": 5,
    "current_download": 0,
    "is_permanent": false,
    "expires_at": "2024-02-07T10:46:50.000Z",
    "is_active": true,
    "created_at": "2024-01-31T10:46:50.000Z",
    "invites": [
      {
        "id": "650e8400-e29b-41d4-a716-446655440003",
        "email": "user@example.com",
        "sent_at": "2024-01-31T10:46:50.000Z"
      }
    ]
  }
}
```

**Response 400 - Validation Error:**
```json
{
  "statusCode": 400,
  "message": [
    "Địa chỉ email không hợp lệ",
    "Số lượt tải tối đa phải là số"
  ],
  "error": "Bad Request"
}
```

---

#### 2.2 Gửi Lại Email Lời Mời

**Endpoint:** `POST /app-download/invites/:id/resend`

**Permission:** `app-download.resend_invite`

**Mô tả:** Gửi lại email lời mời tải ứng dụng cho một share đã tồn tại. Hữu ích khi người dùng không nhận được email hoặc email bị mất.

**Path Parameters:**
- `id` (UUID, required): ID của share cần gửi lại email

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response 200 - Success:**
```json
{
  "code": "app-download.resend_invite",
  "success": true,
  "message": "Gửi lời mời thành công",
  "data": null
}
```

**Response 404 - Not Found:**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy share hoặc lời mời"
}
```

**Use Cases:**
- Người dùng không nhận được email (spam folder, email server issue)
- Email bị xóa nhầm
- Cần gửi lại cho người dùng khác (cùng share)

---

#### 2.3 Xóa Lời Mời

**Endpoint:** `DELETE /app-download/invites/:id`

**Permission:** `app-download.delete`

**Mô tả:** Xóa (soft delete) một lời mời tải ứng dụng. Link tải sẽ không còn hoạt động sau khi xóa.

**Path Parameters:**
- `id` (UUID, required): ID của share cần xóa

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response 200 - Success:**
```json
{
  "code": "app-download.delete_invite",
  "success": true,
  "message": "Xóa lời mời thành công",
  "data": null
}
```

**Response 404 - Not Found:**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy lời mời"
}
```

**Lưu ý:**
- Đây là soft delete, dữ liệu vẫn tồn tại trong database nhưng được đánh dấu `is_deleted = true`
- Link tải sẽ ngay lập tức trả về lỗi 400 khi người dùng cố gắng tải
- Hành động này được ghi log với thông tin người thực hiện

---

### 3. Public Download Endpoint

#### 3.1 Tải Ứng Dụng Với Token

**Endpoint:** `GET /app-download/download/:token`

**Permission:** ❌ Public (Không yêu cầu xác thực)

**Mô tả:** Endpoint công khai cho phép tải ứng dụng GenHub bằng token duy nhất. Token được cung cấp qua email lời mời. Endpoint này kiểm tra tính hợp lệ của token, giới hạn số lần tải, thời hạn và tự động theo dõi số lượt tải.

**Path Parameters:**
- `token` (string, required): Token duy nhất để tải ứng dụng (được cung cấp trong email)

**Headers:**
```
(Không yêu cầu headers)
```

**Response 200 - Success:**
- **Content-Type:** `application/octet-stream`
- **Body:** Binary file stream (GenHubApp.exe)
- **Behavior:** Trình duyệt sẽ tự động tải file về

**Response 400 - Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Token không hợp lệ"
}
```

**Các trường hợp trả về 400:**
- Token không tồn tại trong hệ thống
- Link đã bị xóa (`is_deleted = true`)
- Link không còn hoạt động (`is_active = false`)
- Link đã hết hạn (`expires_at < now` và `is_permanent = false`)
- Đã đạt giới hạn tải xuống (`current_download >= max_download` và `max_download != -1`)

**Response 404 - Not Found:**
```json
{
  "statusCode": 404,
  "message": "Installer file not found on server."
}
```

**Quy Trình Xử Lý:**

1. **Validate Token:**
   - Kiểm tra token có tồn tại không
   - Kiểm tra trạng thái active
   - Kiểm tra thời hạn sử dụng
   - Kiểm tra giới hạn số lượt tải

2. **Track Download:**
   - Tăng `current_download` lên 1
   - Ghi log thời gian tải
   - Cập nhật cache (nếu có)

3. **Stream File:**
   - Đọc file từ đường dẫn cấu hình (`APP_RELEASE_PATH`)
   - Stream file về client
   - Set header `Content-Disposition: attachment; filename="GenHubApp.exe"`

**Environment Variables:**
```env
APP_RELEASE_PATH=uploads/GenHubApp.exe
```

---

## Data Models

### AppDownloadShare

Bảng chính lưu trữ thông tin về các link chia sẻ.

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| `id` | UUID | ❌ | ID duy nhất của share |
| `token` | String | ❌ | Token duy nhất để tải ứng dụng |
| `max_download` | Integer | ❌ | Số lượt tải tối đa (-1 = không giới hạn) |
| `current_download` | Integer | ❌ | Số lượt đã tải hiện tại |
| `is_permanent` | Boolean | ❌ | Link vĩnh viễn hay không |
| `expires_at` | DateTime | ❌ | Ngày giờ hết hạn |
| `is_active` | Boolean | ❌ | Trạng thái hoạt động |
| `created_at` | DateTime | ❌ | Ngày tạo |
| `updated_at` | DateTime | ❌ | Ngày cập nhật cuối |
| `is_deleted` | Boolean | ❌ | Đã bị xóa hay chưa |
| `deleted_at` | DateTime | ✅ | Ngày xóa |
| `created_by` | UUID | ❌ | ID người tạo |
| `deleted_by` | UUID | ✅ | ID người xóa |

### AppDownloadInvite

Bảng lưu trữ thông tin về các email lời mời đã gửi.

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| `id` | UUID | ❌ | ID duy nhất của invite |
| `share_id` | UUID | ❌ | ID của share (foreign key) |
| `email` | String | ❌ | Địa chỉ email người nhận |
| `sent_at` | DateTime | ❌ | Thời gian gửi email |
| `created_at` | DateTime | ❌ | Ngày tạo |

---

## Redis Caching

Module sử dụng Redis để cache dữ liệu và tối ưu hiệu suất:

### Cache Keys

```typescript
// Cache cho share theo ID
app-download:share:{shareId}

// Cache cho share theo token
app-download:share:token:{token}

// Cache cho danh sách shares
app-download:shares:all
```

### TTL Configuration

```env
# Cache TTL cho share (mặc định: 1 giờ)
REDIS_CACHE_APP_DOWNLOAD_SHARE_TTL=3600

# Cache TTL cho danh sách shares (mặc định: 5 phút)
REDIS_CACHE_APP_DOWNLOAD_SHARES_LIST_TTL=300
```

### Cache Invalidation

Cache được tự động invalidate khi:
- Tạo share mới
- Cập nhật share (resend, track download)
- Xóa share

---

## Scheduler - Tự Động Xóa Lời Mời Hết Hạn

Module có scheduler tự động chạy để xóa các lời mời đã hết hạn.

### Cấu Hình

```env
# Cron expression (mặc định: chạy mỗi ngày lúc 2:00 AM)
APP_DOWNLOAD_CLEANUP_CRON=0 2 * * *

# Số ngày giữ lại sau khi hết hạn trước khi xóa vĩnh viễn (mặc định: 30 ngày)
APP_DOWNLOAD_CLEANUP_RETENTION_DAYS=30
```

### Quy Trình

1. Tìm tất cả shares có:
   - `is_permanent = false`
   - `expires_at < (now - RETENTION_DAYS)`
   - `is_deleted = false`

2. Soft delete các shares này:
   - Set `is_deleted = true`
   - Set `deleted_at = now`
   - Set `is_active = false`

3. Invalidate cache liên quan

4. Ghi log kết quả

---

## Internationalization (i18n)

Module hỗ trợ đa ngôn ngữ với các message keys sau:

### Success Messages (`vi/app-download.json`)

```json
{
  "success": {
    "share_created": "Tạo liên kết chia sẻ thành công",
    "invite_sent": "Gửi lời mời thành công",
    "invite_deleted": "Xóa lời mời thành công",
    "list_shares": "Lấy danh sách chia sẻ thành công",
    "get_share": "Lấy chi tiết chia sẻ thành công"
  }
}
```

### Error Messages

```json
{
  "errors": {
    "share_not_found": "Không tìm thấy chia sẻ",
    "invite_not_found": "Không tìm thấy lời mời",
    "invalid_token": "Token không hợp lệ",
    "link_inactive": "Liên kết không còn hoạt động",
    "link_expired": "Liên kết đã hết hạn",
    "limit_reached": "Đã đạt giới hạn tải xuống",
    "send_email_failed": "Gửi email lời mời thất bại",
    "no_permission": "Bạn không có quyền thực hiện thao tác này"
  }
}
```

### Validation Messages

```json
{
  "validation": {
    "email_invalid": "Địa chỉ email không hợp lệ",
    "email_required": "Vui lòng nhập email",
    "expires_at_date": "Ngày hết hạn không hợp lệ",
    "max_download_number": "Số lượt tải tối đa phải là số",
    "is_permanent_boolean": "Trạng thái vĩnh viễn phải là boolean"
  }
}
```

---

## Email Template

Email lời mời được gửi tự động với nội dung:

**Subject:** Lời mời tải ứng dụng GenHub

**Body:**
```
Xin chào,

Bạn đã được mời tải ứng dụng GenHub. Vui lòng click vào link bên dưới để tải:

[Tải ứng dụng GenHub]

Link tải: {DOWNLOAD_URL}
Token: {TOKEN}

Thông tin:
- Số lượt tải tối đa: {MAX_DOWNLOAD}
- Thời hạn: {EXPIRES_AT}

Lưu ý:
- Link này chỉ dành riêng cho bạn
- Không chia sẻ link này với người khác
- Link sẽ hết hạn sau thời gian quy định

Trân trọng,
GenHub Team
```

---

## Best Practices

### 1. Bảo Mật

- ✅ Token được tạo ngẫu nhiên và duy nhất
- ✅ Không expose token trong logs
- ✅ Validate tất cả input từ client
- ✅ Rate limiting cho endpoint download
- ✅ Soft delete thay vì hard delete

### 2. Hiệu Suất

- ✅ Sử dụng Redis cache cho các truy vấn thường xuyên
- ✅ Invalidate cache khi có thay đổi
- ✅ Stream file thay vì load toàn bộ vào memory
- ✅ Index database cho các trường thường query (token, email)

### 3. Monitoring

- ✅ Log tất cả các hành động quan trọng
- ✅ Track số lượt tải thành công/thất bại
- ✅ Monitor email delivery rate
- ✅ Alert khi có lỗi gửi email

### 4. User Experience

- ✅ Email template rõ ràng, dễ hiểu
- ✅ Error messages thân thiện
- ✅ Hướng dẫn chi tiết trong email
- ✅ Support team có thể resend email nếu cần

---

## Troubleshooting

### Vấn Đề 1: Email không được gửi

**Nguyên nhân:**
- SMTP server không hoạt động
- Email bị spam filter chặn
- Thông tin SMTP không đúng

**Giải pháp:**
- Kiểm tra cấu hình SMTP trong `.env`
- Kiểm tra logs để xem lỗi cụ thể
- Test SMTP connection
- Whitelist email sender trong spam filter

### Vấn Đề 2: Download link trả về 400

**Nguyên nhân:**
- Token không hợp lệ
- Link đã hết hạn
- Đã đạt giới hạn tải

**Giải pháp:**
- Kiểm tra trạng thái share trong database
- Resend invite nếu cần
- Tạo invite mới với thời hạn dài hơn

### Vấn Đề 3: File không tải được (404)

**Nguyên nhân:**
- File .exe không tồn tại trên server
- Đường dẫn `APP_RELEASE_PATH` không đúng

**Giải pháp:**
- Kiểm tra file tồn tại tại đường dẫn cấu hình
- Cập nhật `APP_RELEASE_PATH` trong `.env`
- Upload file .exe lên server

---

## Related Modules

- **Email Module**: Gửi email lời mời
- **Redis Module**: Caching
- **Logger Module**: Ghi log
- **Scheduler Module**: Tự động xóa lời mời hết hạn

---

## Changelog

### Version 1.0.0 (2024-02-08)
- ✅ Tạo module cơ bản
- ✅ Tích hợp Redis caching
- ✅ Hỗ trợ i18n
- ✅ Thêm scheduler tự động xóa
- ✅ Cập nhật Swagger documentation chi tiết
- ✅ Thêm permissions riêng cho từng endpoint
