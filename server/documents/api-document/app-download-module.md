# App Download Module Documentation

## Tổng Quan

Module `app-download` quản lý việc phân phối ứng dụng (Windows .exe) thông qua hệ thống lời mời (Invite System).
Quy trình:
1. Admin gửi lời mời qua email cho user
2. User nhận được email chứa link tải với token bảo mật
3. User click link để tải ứng dụng
4. Hệ thống track số lượt tải và giới hạn theo tracking rules

---

## Permission

| Action | Permission Key | Mô tả |
|--------|----------------|-------|
| Xem danh sách | `app-download.list` | Xem danh sách các link chia sẻ |
| Xem chi tiết | `app-download.read` | Xem chi tiết link chia sẻ |
| Tạo lời mời | `app-download.invite` | Tạo và gửi email mời tải mới |
| Gửi lại lời mời | `app-download.resend_invite` | Gửi lại email cho lời mời đã có |
| Xóa lời mời | `app-download.delete` | Vô hiệu hóa lời mời |

---

## API Endpoints

### 1. Quản lý Lời Mời (Invites)

#### 1.1 Tạo lời mời mới

**POST** `/app-download/shares/invite`

**Mô tả:** Tạo link download và gửi email cho người nhận.

**Body Examples:**

<details>
<summary><b>Lời mời tiêu chuẩn (7 ngày)</b></summary>

```json
{
  "email": "user@example.com"
}
```
</details>

<details>
<summary><b>Lời mời dùng 1 lần</b></summary>

```json
{
  "email": "one-time@example.com",
  "max_download": 1,
  "expires_in_days": 3
}
```
</details>

<details>
<summary><b>Lời mời vĩnh viễn (VIP)</b></summary>

```json
{
  "email": "vip@example.com",
  "is_permanent": true
}
```
</details>

#### 1.2 Gửi lại lời mời

**POST** `/app-download/invites/:id/resend`

**Mô tả:** Gửi lại email invitation cho user nếu họ chưa nhận được hoặc làm mất email.
Token cũ vẫn giữ nguyên (nếu còn hạn) hoặc tạo token mới (tùy logic service).

#### 1.3 Xóa lời mời

**DELETE** `/app-download/invites/:id`

**Mô tả:** Vô hiệu hóa link download ngay lập tức. User click vào link cũ sẽ báo lỗi 404.

---

### 2. Danh Sách & Báo Cáo

#### 2.1 Lấy danh sách Shares

**GET** `/app-download/shares`

**Response:**
Trả về danh sách các link shares đã tạo, bao gồm thông tin:
- Token
- Số lượt đã tải / Giới hạn tải
- Ngày hết hạn
- Trạng thái (Active/Deleted)

#### 2.2 Chi tiết Share

**GET** `/app-download/shares/:id`

---

### 3. Public Download (User Facing)

#### 3.1 Tải ứng dụng

**GET** `/app-download/download/:token`

**Access:** Public (Không cần Login Header)

**Mô tả:**
- Validate token (còn hạn? còn lượt tải?)
- Nếu hợp lệ: Stream file `.exe` xuống browser
- Increment download count
- Nếu không hợp lệ: Trả về 404 Not Found hoặc HTML error page

**Response:** Binary File Stream
