# Hướng Dẫn Cấu Hình Discord Bot Integration

> [!NOTE]
> Tài liệu này hướng dẫn cách tạo Discord Bot và cấu hình integration cho hệ thống support tickets.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Tạo Discord Application & Bot](#2-tạo-discord-application--bot)
3. [Lấy Bot Token](#3-lấy-bot-token)
4. [Thiết Lập Discord Server](#4-thiết-lập-discord-server)
5. [Invite Bot vào Server](#5-invite-bot-vào-server)
6. [Lấy IDs cần thiết](#6-lấy-ids-cần-thiết)
7. [Cập Nhật File .env](#7-cập-nhật-file-env)
8. [Xác Minh Cấu Hình](#8-xác-minh-cấu-hình)
9. [Xử Lý Lỗi Thường Gặp](#9-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

GEN-HUB tích hợp Discord để:
- **Support Tickets**: Mỗi ticket support tạo một channel riêng trên Discord
- **Realtime Chat**: Staff support có thể trả lời qua Discord
- **Notifications**: Thông báo ticket mới, cập nhật

### Cách hoạt động:
1. User tạo ticket trên website
2. Bot tạo private channel trong Discord server
3. Staff trả lời qua Discord
4. Message được sync về website

### Các biến môi trường cần cấu hình:

| Biến | Mô tả |
|------|-------|
| `DISCORD_ENABLED` | Bật/tắt Discord integration |
| `DISCORD_BOT_TOKEN` | Token để authenticate bot |
| `DISCORD_GUILD_ID` | ID của Discord server |
| `DISCORD_SUPPORT_CATEGORY_ID` | ID của category chứa support channels |
| `DISCORD_CLOSED_CATEGORY_ID` | ID của category chứa closed tickets |

---

## 2. Tạo Discord Application & Bot

### Bước 1: Truy cập Discord Developer Portal

1. Truy cập: https://discord.com/developers/applications
2. Đăng nhập bằng tài khoản Discord

### Bước 2: Tạo Application

1. Click **"New Application"**
2. Nhập tên: `GEN-HUB Support Bot`
3. Đồng ý Terms of Service
4. Click **"Create"**

### Bước 3: Tạo Bot

1. Trong menu bên trái, chọn **"Bot"**
2. Click **"Add Bot"** (hoặc **"Reset Token"** nếu đã có bot)
3. Confirm **"Yes, do it!"**

### Bước 4: Cấu hình Bot Settings

Trong trang Bot settings:

1. **Username**: Có thể đổi tên bot (VD: `GEN-HUB Support`)
2. **Icon**: Upload avatar cho bot (tùy chọn)
3. **PUBLIC BOT**: Tắt nếu không muốn người khác invite bot
4. **Privileged Gateway Intents**: Bật các intents sau:
   - ✅ **PRESENCE INTENT** (tùy chọn)
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **MESSAGE CONTENT INTENT** (quan trọng!)

> [!IMPORTANT]
> **MESSAGE CONTENT INTENT** bắt buộc phải bật để bot đọc được nội dung tin nhắn.

---

## 3. Lấy Bot Token

### Bước 1: Vào trang Bot

1. Trong Discord Developer Portal
2. Chọn Application đã tạo
3. Vào menu **"Bot"**

### Bước 2: Lấy Token

1. Tìm mục **"Token"**
2. Click **"Reset Token"** hoặc **"Copy"** (nếu token đã hiển thị)
3. Xác nhận bằng 2FA nếu có
4. **Copy token ngay lập tức**

Token có dạng:
```
MTIzNDU2Nzg5MDEyMzQ1Njc4.ABC123.xyzXYZ_abcABC-123456789
```

> [!CAUTION]
> **QUAN TRỌNG**:
> - Token chỉ hiển thị **MỘT LẦN** sau khi reset
> - Nếu lộ token, phải reset ngay lập tức
> - KHÔNG commit token vào git!

---

## 4. Thiết Lập Discord Server

### Bước 1: Tạo Server (nếu chưa có)

1. Mở Discord App
2. Click dấu **"+"** ở sidebar trái
3. Chọn **"Create My Own"**
4. Chọn **"For me and my friends"** hoặc **"For a club or community"**
5. Đặt tên server (VD: `GEN-HUB Support`)
6. Click **"Create"**

### Bước 2: Tạo Categories

Tạo 2 categories để tổ chức tickets:

**Category 1: Support Tickets (mở)**
1. Click chuột phải vào tên server
2. Chọn **"Create Category"**
3. Tên: `📩 Support Tickets`
4. Click **"Create Category"**

**Category 2: Closed Tickets (đã đóng)**
1. Tạo thêm category mới
2. Tên: `📁 Closed Tickets`
3. Click **"Create Category"**

### Bước 3: Cấu hình Permissions (Tùy chọn)

Để bảo mật, set permissions cho categories:

1. Click chuột phải vào category → **"Edit Category"**
2. Vào tab **"Permissions"**
3. Cho **@everyone**:
   - ❌ View Channel
4. Bot sẽ set permissions riêng cho từng ticket channel

---

## 5. Invite Bot vào Server

### Bước 1: Tạo Invite Link

1. Trong Discord Developer Portal
2. Vào **"OAuth2"** → **"URL Generator"**

### Bước 2: Chọn Scopes

Chọn các scopes:
- ✅ `bot`
- ✅ `applications.commands` (tùy chọn, cho slash commands)

### Bước 3: Chọn Bot Permissions

Chọn các permissions cần thiết:
- ✅ **Manage Channels** - Tạo/xóa channels
- ✅ **Manage Roles** - Quản lý permissions
- ✅ **View Channels** - Xem channels
- ✅ **Send Messages** - Gửi tin nhắn
- ✅ **Read Message History** - Đọc lịch sử tin nhắn
- ✅ **Embed Links** - Gửi embeds
- ✅ **Attach Files** - Gửi files
- ✅ **Add Reactions** - Thêm reactions
- ✅ **Use External Emojis** - Dùng emojis khác

Hoặc chọn **Administrator** cho đơn giản (không khuyến nghị cho production).

### Bước 4: Copy và mở Link

1. Copy **Generated URL** ở cuối trang
2. Mở link trong browser
3. Chọn server muốn add bot
4. Click **"Authorize"**
5. Complete captcha

---

## 6. Lấy IDs cần thiết

### Bật Developer Mode

1. Mở Discord Settings (⚙️)
2. Vào **"Advanced"**
3. Bật **"Developer Mode"**

### Lấy Guild ID (Server ID)

1. Click chuột phải vào **tên server** (ở sidebar)
2. Chọn **"Copy Server ID"**
3. ID có dạng: `123456789012345678`

→ Đây là `DISCORD_GUILD_ID`

### Lấy Support Category ID

1. Click chuột phải vào category **"📩 Support Tickets"**
2. Chọn **"Copy Channel ID"**
3. ID có dạng: `123456789012345678`

→ Đây là `DISCORD_SUPPORT_CATEGORY_ID`

### Lấy Closed Category ID

1. Click chuột phải vào category **"📁 Closed Tickets"**
2. Chọn **"Copy Channel ID"**

→ Đây là `DISCORD_CLOSED_CATEGORY_ID`

---

## 7. Cập Nhật File .env

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
# Discord Integration (Optional)
# ===================

# Set to true to enable Discord integration for support tickets
DISCORD_ENABLED=false
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.ABC123.xyzXYZ_abcABC-123456789
DISCORD_GUILD_ID=123456789012345678
DISCORD_SUPPORT_CATEGORY_ID=234567890123456789
DISCORD_CLOSED_CATEGORY_ID=345678901234567890
```

### Giải thích:

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `DISCORD_ENABLED` | `false` | Set `true` để bật Discord integration |
| `DISCORD_BOT_TOKEN` | `MTIz...` | Token của bot |
| `DISCORD_GUILD_ID` | `12345...` | Server ID |
| `DISCORD_SUPPORT_CATEGORY_ID` | `23456...` | Category ID cho tickets mở |
| `DISCORD_CLOSED_CATEGORY_ID` | `34567...` | Category ID cho tickets đã đóng |

---

## 8. Xác Minh Cấu Hình

### 8.1. Khởi động Server

```bash
cd server
npm run start:dev
```

### 8.2. Kiểm tra Logs

Logs thành công:
```
[DiscordService] Discord bot initializing...
[DiscordService] Bot logged in as: GEN-HUB Support#1234
[DiscordService] Connected to guild: GEN-HUB Support
[DiscordService] Support category found: 📩 Support Tickets
[DiscordService] Closed category found: 📁 Closed Tickets
```

### 8.3. Kiểm tra Bot Online

1. Mở Discord server
2. Xem phần Members ở sidebar phải
3. Bot phải hiển thị với trạng thái **Online** (chấm xanh)

### 8.4. Test tạo Ticket

1. Tạo một support ticket qua website
2. Kiểm tra Discord:
   - Channel mới được tạo trong category "📩 Support Tickets"
   - Tin nhắn đầu tiên hiển thị thông tin ticket

---

## 9. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: `Invalid token`

**Nguyên nhân**: Bot token không đúng

**Giải pháp**:
- Kiểm tra token trong `.env`
- Reset token mới trong Developer Portal

---

### ❌ Lỗi: `Missing Access` hoặc `Missing Permissions`

**Nguyên nhân**: Bot thiếu permissions

**Giải pháp**:
- Kiểm tra bot có đủ permissions trong server
- Re-invite bot với đúng permissions
- Kiểm tra role của bot cao hơn roles cần quản lý

---

### ❌ Lỗi: `Unknown Guild`

**Nguyên nhân**: Sai Guild ID hoặc bot chưa được invite

**Giải pháp**:
- Kiểm tra `DISCORD_GUILD_ID`
- Đảm bảo bot đã được invite vào server đó

---

### ❌ Lỗi: `Unknown Channel`

**Nguyên nhân**: Sai Category ID hoặc category đã bị xóa

**Giải pháp**:
- Kiểm tra lại Category IDs
- Đảm bảo categories tồn tại

---

### ❌ Bot offline (không hiển thị trong members)

**Nguyên nhân**: 
- Server chưa chạy
- Token sai
- Intents chưa được bật

**Giải pháp**:
- Kiểm tra server logs
- Kiểm tra intents trong Developer Portal đã bật

---

### ❌ Bot không đọc được messages

**Nguyên nhân**: MESSAGE CONTENT INTENT chưa bật

**Giải pháp**:
1. Vào Developer Portal → Bot
2. Bật **MESSAGE CONTENT INTENT**
3. Restart server

---

## Tài Liệu Tham Khảo

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord.js Guide](https://discordjs.guide/)
- [Discord API Documentation](https://discord.com/developers/docs)
- [Bot Permissions Calculator](https://discordapi.com/permissions.html)

---

> **Cập nhật lần cuối**: 08/01/2026

> Nếu gặp vấn đề, vui lòng liên hệ TANK ZENITH GEN team hoặc tạo issue trên repository.
