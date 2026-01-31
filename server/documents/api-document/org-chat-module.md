# Organization Chat Module

## Overview

Module `Organization Chat` cung cấp giải pháp, back-end cho tính năng nhắn tin và gọi điện thời gian thực (Real-time Communication) trong tổ chức, tích hợp với **Agora Platform**.

## Architecture & Integration

Hệ thống sử dụng mô hình Hybrid:
- **Signaling & Chat (Real-time)**: Sử dụng **Agora RTM (Real-time Messaging)**. Client kết nối trực tiếp với Agora SDK để gửi nhận tin nhắn tức thời.
- **Audio/Video Calls**: Sử dụng **Agora RTC (Real-time Communication)**.
- **Persistence & Management**: Server đóng vai trò cấp phát Tokens (Authentication), lưu trữ lịch sử tin nhắn (Sync), và quản lý trạng thái cuộc gọi.

### Data Flow

#### Chat Flow
1. **Client** gọi `GET /token/rtm` để lấy token.
2. **Client** login vào Agora RTM SDK.
3. Khi người dùng gửi tin nhắn:
   - Client gửi qua Agora RTM (đến các users khác).
   - Client gọi `POST /messages/sync` để báo cho Server lưu tin nhắn vào Database (cho mục đích lịch sử).
4. Khi người dùng xem lịch sử:
   - Client gọi `GET /messages` từ Server.

#### Call Flow
1. **User A** gọi `POST /calls` để bắt đầu cuộc gọi. Server tạo `Call Session` và trả về RTC Token + Channel Name.
2. **User A** join Agora RTC Channel.
3. **User B** nhận noti (qua Socket/RTM), gọi `GET /calls/active` hoặc `POST /calls/:ids/join` để lấy RTC Token.
4. **User B** join Agora RTC Channel.

## API Endpoints

Base URL: `/organizations/:orgId/chat`

### 1. Authentication (Tokens)

#### GET /token/rtm
**Summary**: Lấy RTM Token (Chat)
**Description**: Token dùng để login Agora RTM SDK. Token có TTL giới hạn.

#### GET /token/rtc/:callId
**Summary**: Lấy RTC Token (Call)
**Description**: Token dùng để join Video/Voice channel cụ thể.

### 2. Messaging

#### GET /messages
**Summary**: Lấy lịch sử tin nhắn
**Query**: `limit`, `offset`, `keywords`.

#### POST /messages/sync
**Summary**: Đồng bộ tin nhắn
**Description**: Lưu tin nhắn từ Client lên Server. Hỗ trợ batch sync.
**Body**:
```json
{
  "messages": [
    {
      "agora_message_id": "...",
      "content": "Hello",
      "sent_at": "..."
    }
  ]
}
```

#### DELETE /messages/:id
**Summary**: Xóa tin nhắn
**Description**: Soft delete tin nhắn.

### 3. Calling

#### GET /calls
**Summary**: Lịch sử cuộc gọi

#### GET /calls/active
**Summary**: Kiểm tra cuộc gọi đang diễn ra
**Description**: Trả về cuộc gọi đang Active của Org (nếu có).

#### POST /calls
**Summary**: Bắt đầu cuộc gọi
**Body**: `{ "call_type": "VIDEO" | "VOICE" }`

#### POST /calls/:id/join
**Summary**: Tham gia cuộc gọi
**Response**: Trả về Token và Channel info.

#### POST /calls/:id/leave
**Summary**: Rời cuộc gọi

#### POST /calls/:id/end
**Summary**: Kết thúc cuộc gọi
**Description**: Kết thúc phiên gọi cho tất cả mọi người.

## Response Codes

| Code | Message |
|------|---------|
| `ORG_CHAT_TOKEN_SUCCESS` | Lấy token thành công |
| `ORG_CHAT_MESSAGES_SUCCESS`| Lấy tin nhắn thành công |
| `ORG_CHAT_SYNC_SUCCESS` | Sync tin nhắn thành công |
| `ORG_CHAT_CALL_STARTED` | Bắt đầu cuộc gọi thành công |
