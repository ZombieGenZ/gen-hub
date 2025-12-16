# Realtime Events Documentation

## 📡 Kết nối WebSocket

### Kết nối có xác thực (Authenticated)
```javascript
const socket = io('http://localhost:4000', {
  auth: { token: 'Bearer <access_token>' },
  transports: ['websocket', 'polling']
});
```

### Kết nối không xác thực (Guest)
```javascript
const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling']
});
```

> **Note:** Guest chỉ có thể join vào public rooms.

---

## 🏠 Rooms

| Room | Loại | Cách Join | Yêu cầu Auth |
|------|------|-----------|--------------|
| `user:{userId}` | Private | Tự động (khi có token) | ✅ Có |
| `public` | Public | Tự động (tất cả) | ❌ Không |
| `notifications` | Private | `subscribe` | ✅ Có |
| `announcements` | Public | `subscribe` | ❌ Không |
| `system-status` | Public | `subscribe` | ❌ Không |

### Cách subscribe:
```javascript
socket.emit('subscribe', { rooms: ['announcements', 'notifications'] });
```

---

## 📤 Client → Server Events

| Event | Data | Chức năng |
|-------|------|-----------|
| `ping` | `{}` | Giữ kết nối và cập nhật heartbeat (user online status) |
| `subscribe` | `{ rooms: string[] }` | Join room |

---

## 📥 Server → Client Events

### 🔌 Connection Events

#### `connected`
**Chức năng:** Xác nhận kết nối thành công

```json
{
  "socketId": "abc123xyz",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "authenticated": true,
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```
> Guest sẽ có `userId: null` và `authenticated: false`

---

#### `subscribed`
**Chức năng:** Xác nhận join room

```json
{
  "rooms": ["announcements"],
  "rejected": ["notifications"],
  "success": true
}
```
> `rejected` chỉ xuất hiện nếu guest cố join private room

---

### 🏠 User Room Events (Yêu cầu Auth)

#### `user:logout`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "tokenId": "token-abc-123",
  "timestamp": "2025-12-13T10:00:00.000Z",
  "message": "Đã đăng xuất thành công"
}
```

---

#### `user:logoutAll`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z",
  "message": "Đã đăng xuất khỏi tất cả thiết bị",
  "excludeSocketId": "socket-id-caller"
}
```

---

#### `user:tokenRevoked`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "password_changed",
  "timestamp": "2025-12-13T10:00:00.000Z",
  "message": "Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại."
}
```
> Reason: `password_changed` | `admin_revoke` | `security_alert`

---

#### `user:profileUpdated`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "updatedFields": ["name", "language"],
  "profile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Nguyễn Văn A",
    "email": "user@example.com",
    "language": "vi"
  },
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `user:onlineStatus`
**Chức năng:** Thông báo khi trạng thái online của user thay đổi (broadcast đến tất cả authenticated users)

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "isOnline": true,
  "lastOnline": null,
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

**Khi user offline:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "isOnline": false,
  "lastOnline": "2025-12-13T10:00:00.000Z",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

> **Lưu ý:**
> - Event này được broadcast đến tất cả users khi có ai đó online/offline
> - `lastOnline` là `null` khi user đang online
> - User được coi là offline khi:
>   - Ngắt kết nối tất cả socket
>   - Không gửi `ping` trong khoảng thời gian `USER_ONLINE_TIMEOUT_SECONDS` (mặc định 60s)

---

### 🏢 Organization Events (Yêu cầu Auth)

#### `organization:created`
```json
{
  "organizationId": "org-123-uuid",
  "name": "My Company",
  "ownerId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `organization:updated`
```json
{
  "organizationId": "org-123-uuid",
  "name": "My Company Updated",
  "updatedBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `organization:deleted`
```json
{
  "organizationId": "org-123-uuid",
  "deletedBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `organization:memberInvited`
```json
{
  "organizationId": "org-123-uuid",
  "organizationName": "My Company",
  "invitedUserId": "invited-user-uuid",
  "invitedBy": "owner-user-uuid",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `organization:memberRemoved`
```json
{
  "organizationId": "org-123-uuid",
  "memberId": "member-uuid",
  "removedBy": "owner-user-uuid",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `organization:ownershipTransferred`
```json
{
  "organizationId": "org-123-uuid",
  "organizationName": "My Company",
  "oldOwnerId": "old-owner-uuid",
  "newOwnerId": "new-owner-uuid",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

### 🏭 WarehouseTemplate Events (Global Broadcast)

#### `warehouseTemplate:created`
```json
{
  "warehouseTemplateId": "template-123-uuid",
  "name": "Template Kho Hàng A",
  "createdBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `warehouseTemplate:updated`
```json
{
  "warehouseTemplateId": "template-123-uuid",
  "name": "Template Kho Hàng A Updated",
  "updatedFields": ["name", "description"],
  "updatedBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `warehouseTemplate:deleted`
```json
{
  "warehouseTemplateId": "template-123-uuid",
  "name": "Template Kho Hàng A",
  "deletedBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `warehouseTemplate:layoutUpdated`
```json
{
  "warehouseTemplateId": "template-123-uuid",
  "name": "Template Kho Hàng A",
  "updatedBy": "550e8400-e29b-41d4-a716-446655440000",
  "summary": {
    "rowsCreated": 2,
    "rowsUpdated": 1,
    "rowsDeleted": 0,
    "racksCreated": 5,
    "racksUpdated": 3,
    "racksDeleted": 1,
    "shelvesCreated": 10,
    "shelvesUpdated": 5,
    "shelvesDeleted": 2,
    "blocksCreated": 20,
    "blocksUpdated": 10,
    "blocksDeleted": 5
  },
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

### 🔔 Global Notification Events (Global Broadcast)

#### `globalNotification:created`
```json
{
  "notificationId": "notification-123-uuid",
  "title": "Thông báo bảo trì",
  "createdBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `globalNotification:updated`
```json
{
  "notificationId": "notification-123-uuid",
  "title": "Thông báo bảo trì (cập nhật)",
  "updatedFields": ["title", "content"],
  "updatedBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `globalNotification:deleted`
```json
{
  "notificationId": "notification-123-uuid",
  "title": "Thông báo bảo trì",
  "deletedBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

### 📨 User Notification Events (Private, user:{userId})

#### `userNotification:received`
```json
{
  "notificationId": "notification-123-uuid",
  "title": "Thông báo mới",
  "content": "Nội dung thông báo cho bạn",
  "type": "INFO",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `userNotification:read`
```json
{
  "notificationId": "notification-123-uuid",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `userNotification:allRead`
```json
{
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

### 🏢 Organization Notification Events (organization:{orgId})

#### `orgNotification:created`
```json
{
  "organizationId": "org-123-uuid",
  "notificationId": "notification-123-uuid",
  "title": "Thông báo nội bộ",
  "createdBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `orgNotification:updated`
```json
{
  "organizationId": "org-123-uuid",
  "notificationId": "notification-123-uuid",
  "title": "Thông báo nội bộ (cập nhật)",
  "updatedFields": ["title", "content"],
  "updatedBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

#### `orgNotification:deleted`
```json
{
  "organizationId": "org-123-uuid",
  "notificationId": "notification-123-uuid",
  "title": "Thông báo nội bộ",
  "deletedBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-13T10:00:00.000Z"
}
```

---

### 🏗️ Amenity Events (Global Broadcast)

#### `amenity:created`
**Chức năng:** Thông báo khi tạo tiện ích mới

```json
{
  "amenityId": "amenity-123-uuid",
  "name": "WiFi",
  "createdBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

#### `amenity:updated`
**Chức năng:** Thông báo khi cập nhật tiện ích

```json
{
  "amenityId": "amenity-123-uuid",
  "name": "WiFi tốc độ cao",
  "updatedFields": ["name", "description"],
  "updatedBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

#### `amenity:deleted`
**Chức năng:** Thông báo khi xóa tiện ích

```json
{
  "amenityId": "amenity-123-uuid",
  "name": "WiFi",
  "deletedBy": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

### 🤝 Partner Events (organization:{orgId})

#### `partner:created`
**Chức năng:** Thông báo khi tạo đối tác mới

```json
{
  "id": "partner-123-uuid",
  "organizationId": "org-123-uuid",
  "name": "Công ty TNHH ABC",
  "code": "ABC001",
  "type": "CUSTOMER",
  "actorId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

#### `partner:updated`
**Chức năng:** Thông báo khi cập nhật đối tác

```json
{
  "id": "partner-123-uuid",
  "organizationId": "org-123-uuid",
  "name": "Công ty TNHH ABC",
  "changedFields": ["name", "phone"],
  "actorId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

#### `partner:deleted`
**Chức năng:** Thông báo khi xóa đối tác

```json
{
  "id": "partner-123-uuid",
  "organizationId": "org-123-uuid",
  "name": "Công ty TNHH ABC",
  "actorId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

### 📦 Product Events (organization:{orgId})

#### `product:created`
**Chức năng:** Thông báo khi tạo sản phẩm mới

```json
{
  "id": "product-123-uuid",
  "organizationId": "org-123-uuid",
  "name": "Nước suối Aquafina 500ml",
  "sku": "AQUA-500ML",
  "actorId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

#### `product:updated`
**Chức năng:** Thông báo khi cập nhật sản phẩm

```json
{
  "id": "product-123-uuid",
  "organizationId": "org-123-uuid",
  "name": "Nước suối Aquafina 500ml",
  "changedFields": ["name", "cost_price", "units"],
  "actorId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

#### `product:deleted`
**Chức năng:** Thông báo khi xóa sản phẩm

```json
{
  "id": "product-123-uuid",
  "organizationId": "org-123-uuid",
  "name": "Nước suối Aquafina 500ml",
  "actorId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

### 📋 Batch Events (organization:{orgId})

#### `batch:created`
**Chức năng:** Thông báo khi tạo lô hàng mới

```json
{
  "id": "batch-123-uuid",
  "organizationId": "org-123-uuid",
  "code": "LOT-2024-001",
  "productId": "product-123-uuid",
  "actorId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

#### `batch:updated`
**Chức năng:** Thông báo khi cập nhật lô hàng

```json
{
  "id": "batch-123-uuid",
  "organizationId": "org-123-uuid",
  "code": "LOT-2024-001",
  "changedFields": ["expiry_date", "import_price"],
  "actorId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

#### `batch:deleted`
**Chức năng:** Thông báo khi xóa lô hàng

```json
{
  "id": "batch-123-uuid",
  "organizationId": "org-123-uuid",
  "code": "LOT-2024-001",
  "actorId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

## 📋 Tổng hợp

| Room | Auth | Events |
|------|------|--------|
| `user:{userId}` | ✅ | `user:*`, `organization:*`, `userNotification:*` |
| `organization:{orgId}` | ✅ | `orgNotification:*`, `partner:*`, `product:*`, `batch:*` |
| `public` | ❌ | (tự động join) |
| `notifications` | ✅ | `userNotification:*` |
| `announcements` | ❌ | (chờ implement) |
| `system-status` | ❌ | (chờ implement) |
| Global | - | `warehouseTemplate:*`, `globalNotification:*`, `amenity:*`, `user:onlineStatus`, `pong`, `error` |
