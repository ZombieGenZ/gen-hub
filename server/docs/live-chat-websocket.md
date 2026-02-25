# 📡 WebSocket Live Chat – Tài liệu tích hợp (Guest)

> **Mục tiêu tài liệu**: Hướng dẫn đầy đủ để tích hợp Live Chat (khách vãng lai – Guest) vào hệ thống tư vấn khách hàng bên ngoài, bao gồm luồng REST API khởi tạo phiên, cơ chế WebSocket realtime và toàn bộ các event cần lắng nghe.

---

## 1. Tổng quan kiến trúc

```
[ Guest Client / Customer Widget ]
         │  1. POST /contact/chat/start  → Lấy sessionId
         │
         │  2. Kết nối WebSocket (không cần token)
         │     URL: ws://<host>/
         │
         │  3. Emit 'chat:join' với { sessionId }
         │     → Server join socket vào room: chat:<sessionId>
         │     → Server emit 'chat:joined' xác nhận
         │
         │  4. Gửi tin nhắn: POST /contact/chat/:sessionId/message
         │
         │  5. Nhận reply realtime:
         │     ← event 'contact:messageCreated' (từ room chat:<sessionId>)
         │        sender_type: 'STAFF' | 'AI'
         │
         │  6. Đóng: Emit 'chat:leave' hoặc ngắt kết nối
         ▾
[ GEN-HUB Server – NestJS + Socket.io ]
         │
         │  Emit tới admin_room: contact:created, contact:messageCreated ...
         │  Emit tới chat:<sessionId>: contact:messageCreated (staff/AI reply)
         ▾
[ Admin / Staff Dashboard – nhận sự kiện realtime ]
```

**Namespace WebSocket chính:** `/` (default namespace)  
**Thư viện Server:** Socket.io (NestJS WebSocketGateway)  
**Transport:** `websocket`, `polling`

---

## 2. Bước 1 – Khởi tạo phiên chat (REST API)

Trước khi kết nối WebSocket, phía client phải gọi API để tạo phiên chat và nhận `sessionId`.

### `POST /contact/chat/start`

**Authentication:** ❌ Không cần (Public endpoint)

**Request Body:**
```json
{
  "uid": "session-abc-123",
  "initialMessage": "Tôi muốn hỏi về dịch vụ thuê kho"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `uid` | `string` | ✅ | UID phiên làm việc của guest (tạo bằng UUID/nanoid từ client). Tối đa 200 ký tự |
| `initialMessage` | `string` | ❌ | Tin nhắn đầu tiên (tùy chọn). Tối đa 2000 ký tự |

**Response thành công (201):**
```json
{
  "code": "contact.live_chat.session_created",
  "message": "Đã tạo phiên chat",
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "code": "TK-20260225001",
    "welcomeMessage": "Xin chào! Tôi là AI Assistant của GEN-HUB, tôi có thể giúp gì cho bạn?"
  }
}
```

| Trường | Mô tả |
|---|---|
| `sessionId` | UUID phiên chat – **lưu lại để dùng cho các bước tiếp theo** |
| `code` | Mã ticket (VD: `TK-20260225001`) |
| `welcomeMessage` | Tin nhắn chào từ AI (nếu AI được bật). `undefined` nếu AI tắt |

> ⚠️ **Lưu ý:** `uid` và `sessionId` là hai thứ khác nhau!  
> - `uid` = ID do client tạo để định danh browser session  
> - `sessionId` = UUID server tạo, dùng để identify cuộc hội thoại

---

## 3. Bước 2 – Kết nối WebSocket

### Thông tin kết nối

| Thuộc tính | Giá trị |
|---|---|
| URL | `ws://<host>/` hoặc `wss://<host>/` |
| Namespace | `/` (mặc định) |
| Transports | `['websocket', 'polling']` |
| Authentication | **Không bắt buộc** (Guest kết nối không cần token) |

### Ví dụ kết nối (JavaScript – socket.io-client)

```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.genhub.dev', {
  transports: ['websocket', 'polling'],
  // Guest không cần auth token
  // Nếu có JWT token (staff/admin), thêm:
  // auth: { token: 'Bearer <jwt_token>' }
});

// Lắng nghe sự kiện kết nối thành công
socket.on('connected', (data) => {
  console.log('Kết nối thành công:', data);
  // data = { socketId: '...', userId: null, authenticated: false, timestamp: '...' }
});
```

### Event `connected` (Server → Client)

Server sẽ emit event này ngay sau khi kết nối thành công:

```json
{
  "socketId": "abc123xyz",
  "userId": null,
  "authenticated": false,
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

> - `authenticated: false` + `userId: null` → Guest connection (không có token)
> - `authenticated: true` + `userId: "<uuid>"` → Authenticated user (có JWT)

---

## 4. Bước 3 – Join vào room của phiên chat (WebSocket)

Sau khi kết nối, guest cần **emit event `chat:join`** với `sessionId` để join vào room riêng `chat:<sessionId>`. Sau đó guest sẽ nhận được realtime reply từ staff/AI qua event `contact:messageCreated`.

### Cách join room cho guest

```javascript
// Sau khi nhận sessionId từ API start, emit event join
socket.emit('chat:join', { sessionId: '<uuid-session>' });

// Server xác nhận join thành công
socket.on('chat:joined', (data) => {
  console.log('Joined room:', data.room);
  // data = { sessionId: '...', room: 'chat:...', timestamp: '...' }
});

// Trường hợp lỗi (sessionId không hợp lệ)
socket.on('chat:error', (err) => {
  console.error(err.code, err.message);
  // err = { code: 'INVALID_SESSION', message: 'sessionId is required' }
});

// Nhận tin nhắn realtime từ staff hoặc AI
socket.on('contact:messageCreated', (data) => {
  const { message } = data;
  console.log(`[${message.sender_type}] ${message.sender_name}: ${message.content}`);
  // Hiển thị lên chat UI
});
```

### Event `chat:join` (Client → Server)

| Trường | Kiểu | Mô tả |
|---|---|---|
| `sessionId` | `string` | UUID của phiên chat (nhận từ API start) |

### Event `chat:joined` (Server → Client)

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "room": "chat:550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

### Event `chat:leave` (Client → Server)

Gửi khi guest đóng cửa sổ chat:

```javascript
socket.emit('chat:leave', { sessionId: '<uuid-session>' });

socket.on('chat:left', (data) => {
  console.log('Left room:', data.room);
});
```

### Event `chat:error` (Server → Client)

```json
{
  "code": "INVALID_SESSION",
  "message": "sessionId is required"
}
```

---

## 5. Bước 4 – Gửi tin nhắn (REST API)

### `POST /contact/chat/:sessionId/message`

**Authentication:** ❌ Không cần (Public endpoint)

**URL Params:**
| Param | Mô tả |
|---|---|
| `sessionId` | UUID phiên chat (nhận được từ Bước 1) |

**Request Body:**
```json
{
  "content": "Xin chào, tôi cần tư vấn về dịch vụ thuê kho"
}
```

| Trường | Kiểu | Yêu cầu | Mô tả |
|---|---|---|---|
| `content` | `string` | ✅ | Nội dung tin nhắn. Min 1, Max 5000 ký tự |

**Response thành công (200):**
```json
{
  "code": "contact.live_chat.message_sent",
  "message": "Gửi tin nhắn thành công",
  "success": true,
  "data": {
    "message": {
      "id": "msg-uuid-123",
      "conversation_id": "conv-uuid-456",
      "sender_type": "CUSTOMER",
      "sender_name": "Guest 20260225001",
      "content": "Xin chào, tôi cần tư vấn về dịch vụ thuê kho",
      "message_type": "TEXT",
      "created_at": "2026-02-25T08:00:00.000Z"
    },
    "aiResponse": {
      "id": "msg-uuid-789",
      "sender_type": "AI",
      "sender_name": "GEN-HUB AI",
      "content": "Xin chào! Tôi có thể tư vấn cho bạn về...",
      "is_ai_response": true,
      "created_at": "2026-02-25T08:00:01.000Z"
    }
  }
}
```

> 💡 `aiResponse` sẽ là `null/undefined` nếu AI auto-reply bị tắt hoặc guest đang được staff phục vụ.

---

## 6. Bước 5 – Lấy lịch sử hội thoại (REST API)

### `GET /contact/chat/:sessionId`

**Authentication:** ❌ Không cần (Public endpoint)

**Response thành công (200):**
```json
{
  "code": "contact.live_chat.session",
  "message": "Lấy thông tin thành công",
  "success": true,
  "data": {
    "id": "conv-uuid-456",
    "code": "TK-20260225001",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "customer_name": "Guest 20260225001",
    "channel": "LIVE_CHAT",
    "status": "OPEN",
    "messages": [
      {
        "id": "msg-uuid-001",
        "sender_type": "AI",
        "sender_name": "GEN-HUB AI",
        "content": "Xin chào! Tôi có thể giúp gì cho bạn?",
        "created_at": "2026-02-25T08:00:00.000Z"
      },
      {
        "id": "msg-uuid-002",
        "sender_type": "CUSTOMER",
        "sender_name": "Guest 20260225001",
        "content": "Tôi cần tư vấn thuê kho",
        "created_at": "2026-02-25T08:00:05.000Z"
      }
    ]
  }
}
```

---

## 7. WebSocket Events – Server → Client

### 7.1 Events dành cho Admin/Staff Dashboard

> Các events này được emit vào **room `admin_room`** – chỉ staff/admin đã xác thực mới nhận được.

#### `contact:created` – Có conversation mới

```json
{
  "conversationId": "conv-uuid-456",
  "code": "TK-20260225001",
  "email": "",
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

| Trường | Mô tả |
|---|---|
| `conversationId` | UUID của conversation |
| `code` | Mã ticket (VD: `TK-20260225001`) |
| `email` | Email khách hàng (rỗng với LIVE_CHAT) |

---

#### `contact:messageCreated` – Có tin nhắn mới

```json
{
  "conversationId": "conv-uuid-456",
  "message": {
    "id": "msg-uuid-123",
    "sender_type": "CUSTOMER",
    "sender_name": "Guest 20260225001",
    "content": "Tôi muốn thuê kho 100m2",
    "is_internal": false,
    "created_at": "2026-02-25T08:00:00.000Z"
  },
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

**Kiểu `sender_type`:**
| Giá trị | Nghĩa |
|---|---|
| `CUSTOMER` | Khách hàng gửi |
| `STAFF` | Nhân viên tư vấn gửi |
| `AI` | AI tự động trả lời |

---

#### `contact:updated` – Conversation được cập nhật

```json
{
  "conversationId": "conv-uuid-456",
  "code": "TK-20260225001",
  "updatedFields": ["status", "assigned_to"],
  "updatedBy": "admin-user-id",
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

---

#### `contact:closed` – Conversation bị đóng

```json
{
  "conversationId": "conv-uuid-456",
  "code": "TK-20260225001",
  "closedBy": "admin-user-id",
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

---

#### `contact:reopened` – Conversation được mở lại

```json
{
  "conversationId": "conv-uuid-456",
  "code": "TK-20260225001",
  "reopenedBy": "admin-user-id",
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

---

#### `contact:deleted` – Conversation bị xóa

```json
{
  "conversationId": "conv-uuid-456",
  "deletedBy": "admin-user-id",
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

---

#### `contact:staffAssigned` – Gán nhân viên vào ticket

```json
{
  "conversationId": "conv-uuid-456",
  "code": "TK-20260225001",
  "staff": [
    { "staffId": "user-uuid-1", "staffName": "Nguyễn Văn A" }
  ],
  "assignedBy": "admin-user-id",
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

---

#### `contact:staffUnassigned` – Hủy gán nhân viên

```json
{
  "conversationId": "conv-uuid-456",
  "code": "TK-20260225001",
  "staffId": "user-uuid-1",
  "unassignedBy": "admin-user-id",
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

---

### 7.2 Events WebSocket tiện ích

#### `ping` / `pong` – Heartbeat

**Client gửi (emit):**
```javascript
socket.emit('ping');
```

**Server trả lời:**
```json
{
  "timestamp": "2026-02-25T08:00:00.000Z"
}
```

---

#### `error` – Lỗi kết nối

```json
{
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

**Mã lỗi có thể gặp:**
| Code | Mô tả |
|---|---|
| `UNAUTHORIZED` | Token không hợp lệ hoặc hết hạn |
| `INTERNAL_ERROR` | Lỗi server nội bộ |

---

## 8. Luồng tích hợp hoàn chỉnh (Guest Chat Widget)

```
1. User mở chat widget
   → generateUID() // tạo UUID ngẫu nhiên từ phía client

2. Gọi API: POST /contact/chat/start
   Body: { uid: "<uuid_client>" }
   → Nhận: { sessionId, code, welcomeMessage }

3. Hiển thị welcomeMessage (nếu có)
   → Lưu sessionId vào localStorage/sessionStorage

4. Kết nối WebSocket
   const socket = io('wss://api.genhub.dev', {
     transports: ['websocket']
   });

5. Sau khi nhận 'connected', join vào room của phiên:
   socket.emit('chat:join', { sessionId });
   → Chờ event 'chat:joined' xác nhận

6. Lắng nghe tin nhắn realtime từ staff/AI:
   socket.on('contact:messageCreated', (data) => {
     const msg = data.message;
     // Hiển thị nếu sender_type là 'STAFF' hoặc 'AI'
   });

7. Khi user gửi tin:
   → Gọi API: POST /contact/chat/{sessionId}/message
   → Hiển thị ngay tin nhắn của user lên UI
   → aiResponse trong response sẽ có nếu AI bật
   → AI reply cũng sẽ đến qua event WebSocket

8. Khi chat kết thúc / user đóng widget:
   socket.emit('chat:leave', { sessionId });
   socket.disconnect();
```

---

## 9. Tích hợp Admin/Staff Dashboard

Staff cần kết nối WebSocket với JWT token và join `admin_room` để nhận realtime events:

```javascript
// Staff kết nối với JWT
const socket = io('wss://api.genhub.dev', {
  auth: { token: 'Bearer <jwt_access_token>' },
  transports: ['websocket']
});

socket.on('connected', (data) => {
  if (data.authenticated) {
    // Join vào admin_room để nhận contact events
    socket.emit('subscribe', { rooms: ['announcements'] });
    // Lưu ý: admin_room hiện được join tự động theo logic server
    // (cần xác nhận với backend)
  }
});

// Lắng nghe tin nhắn mới từ bất kỳ conversation nào
socket.on('contact:messageCreated', (data) => {
  console.log('Tin nhắn mới:', data);
  // Hiển thị notification cho staff
});

// Lắng nghe conversation mới
socket.on('contact:created', (data) => {
  console.log('Khách mới:', data.code);
  // Thêm vào danh sách ticket
});
```

---

## 10. Tóm tắt REST APIs

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/contact/chat/start` | ❌ Public | Tạo phiên chat mới |
| `POST` | `/contact/chat/:sessionId/message` | ❌ Public | Gửi tin nhắn |
| `GET` | `/contact/chat/:sessionId` | ❌ Public | Lấy lịch sử hội thoại |
| `GET` | `/admin/contacts` | ✅ JWT | Xem danh sách tickets (Admin) |
| `GET` | `/admin/contacts/:id` | ✅ JWT | Chi tiết ticket (Admin) |
| `PATCH` | `/admin/contacts/:id` | ✅ JWT | Cập nhật ticket (Admin) |
| `POST` | `/admin/contacts/:id/reply` | ✅ JWT | Staff reply (Admin) |

---

## 11. Tóm tắt WebSocket Events

### Events cho Guest (Client → Server)

| Event | Payload | Mô tả |
|---|---|---|
| `chat:join` | `{ sessionId }` | Join vào room của phiên chat |
| `chat:leave` | `{ sessionId }` | Rời khỏi room |
| `ping` | _(không có)_ | Heartbeat |
| `subscribe` | `{ rooms[] }` | Join public rooms |

### Events Server → Guest (room `chat:<sessionId>`)

| Event | Mô tả |
|---|---|
| `connected` | Xác nhận kết nối |
| `chat:joined` | Xác nhận đã join room thành công |
| `chat:left` | Xác nhận đã rời room |
| `chat:error` | Lỗi (VD: sessionId không hợp lệ) |
| `contact:messageCreated` | Tin nhắn mới từ Staff hoặc AI |
| `pong` | Phản hồi ping |
| `error` | Lỗi kết nối WebSocket |

### Events Server → Admin Room (`admin_room`)

| Event | Mô tả |
|---|---|
| `contact:created` | Conversation mới từ guest |
| `contact:messageCreated` | Có tin nhắn mới (từ CUSTOMER, STAFF hoặc AI) |
| `contact:updated` | Cập nhật ticket |
| `contact:closed` | Đóng ticket |
| `contact:reopened` | Mở lại ticket |
| `contact:deleted` | Xóa ticket |
| `contact:staffAssigned` | Gán staff |
| `contact:staffUnassigned` | Hủy gán staff |

---

## 12. Các trường hợp đặc biệt cần lưu ý

### AI Auto-Reply
- Nếu config `enableAiAutoReply = true`, server sẽ **tự động** gọi AI (Coze) và lưu response vào DB.
- Tin nhắn AI được phân biệt bởi `sender_type: "AI"`.
- `welcomeMessage` trong response `startChatSession` là tin nhắn chào từ AI.

### Session hết hạn
- `sessionId` hiện không có TTL (không hết hạn tự động).
- Nếu POST `/contact/chat/:sessionId/message` trả về `404`, session đã bị xóa hoặc không tồn tại.

### Tên Guest tự động
- Server đặt tên Guest theo format: `Guest YYYYMMDDNNN`  
  VD: `Guest 20260225001` (ngày 25/02/2026, khách thứ 1 trong ngày)

### `uid` vs `sessionId`
- `uid`: Client tự tạo, dùng để phòng trường hợp reload trang (lookup lại session).
- `sessionId`: Server tạo, là ID thực sự của conversation trong DB.

---

## 13. Code mẫu hoàn chỉnh (JavaScript)

```javascript
class LiveChatClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.sessionId = null;
    this.socket = null;
    this.onMessageCallbacks = [];
  }

  // Bước 1: Khởi tạo phiên chat
  async startSession(uid, initialMessage = null) {
    const response = await fetch(`${this.serverUrl}/contact/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, initialMessage })
    });
    const json = await response.json();
    if (!json.success) throw new Error(json.message);

    this.sessionId = json.data.sessionId;

    // Kết nối WebSocket
    await this.connectWebSocket();

    // Join vào room của phiên chat
    await this.joinChatRoom();

    return json.data;
  }

  // Bước 2: Kết nối WebSocket
  connectWebSocket() {
    return new Promise((resolve) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling']
        // Guest không cần token
      });

      this.socket.on('connected', (data) => {
        console.log('[LiveChat] Connected:', data.socketId);
        resolve(data);
      });

      // Nhận reply từ staff/AI realtime
      this.socket.on('contact:messageCreated', (data) => {
        const { message } = data;
        // Chỉ hiển thị tin nhắn không phải do guest gửi
        if (message.sender_type !== 'CUSTOMER') {
          this.onMessageCallbacks.forEach(cb => cb(message));
        }
      });

      this.socket.on('chat:error', (err) => {
        console.error('[LiveChat] Chat error:', err);
      });

      this.socket.on('error', (err) => {
        console.error('[LiveChat] Socket error:', err);
      });

      this.socket.on('disconnect', () => {
        console.log('[LiveChat] Disconnected');
      });
    });
  }

  // Bước 3: Join vào room
  joinChatRoom() {
    return new Promise((resolve, reject) => {
      this.socket.emit('chat:join', { sessionId: this.sessionId });

      this.socket.once('chat:joined', (data) => {
        console.log('[LiveChat] Joined room:', data.room);
        resolve(data);
      });

      this.socket.once('chat:error', (err) => {
        reject(new Error(err.message));
      });
    });
  }

  // Bước 4: Gửi tin nhắn
  async sendMessage(content) {
    if (!this.sessionId) throw new Error('Session not started');

    const response = await fetch(
      `${this.serverUrl}/contact/chat/${this.sessionId}/message`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    );
    const json = await response.json();
    return json.data;
    // AI response sẽ tự động đến qua WebSocket event 'contact:messageCreated'
  }

  // Lấy lịch sử hội thoại
  async getHistory() {
    const response = await fetch(
      `${this.serverUrl}/contact/chat/${this.sessionId}`
    );
    const json = await response.json();
    return json.data;
  }

  // Đăng ký handler nhận tin nhắn mới (staff/AI)
  onMessage(callback) {
    this.onMessageCallbacks.push(callback);
  }

  // Gọi khi đóng chat
  async disconnect() {
    if (this.sessionId) {
      this.socket?.emit('chat:leave', { sessionId: this.sessionId });
    }
    this.socket?.disconnect();
  }
}

// ----- Sử dụng -----
const chat = new LiveChatClient('https://api.genhub.dev');

// Tạo UID từ client (persistent qua reload)
const uid = localStorage.getItem('chat_uid') || crypto.randomUUID();
localStorage.setItem('chat_uid', uid);

// Bắt đầu chat
const session = await chat.startSession(uid, 'Xin chào!');
console.log('Welcome:', session.welcomeMessage);

// Đăng ký nhận tin từ staff/AI
chat.onMessage((msg) => {
  console.log(`[${msg.sender_type}] ${msg.sender_name}: ${msg.content}`);
  // Append vào chat UI
});

// Gửi tin nhắn
const result = await chat.sendMessage('Tôi muốn thuê kho 100m2 ở Quận 7');
// AI reply sẽ đến tự động qua WebSocket

// Heartbeat
setInterval(() => chat.socket?.emit('ping'), 25000);
```

---

*Tài liệu cập nhật lần cuối: 2026-02-25 | Phiên bản: 1.1.0*

