# 📡 GEN-HUB Realtime Events Documentation

Tài liệu hướng dẫn tích hợp WebSocket cho frontend developers.

---

## 🔌 Kết nối WebSocket

### Cài đặt Socket.IO Client
```bash
npm install socket.io-client
```

### Kết nối có xác thực (Authenticated)
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: 'Bearer <access_token>' },
  transports: ['websocket', 'polling']
});

socket.on('connected', (data) => {
  console.log('✅ Đã kết nối:', data);
  // { socketId, userId, authenticated: true, timestamp }
});

socket.on('error', (error) => {
  console.error('❌ Lỗi:', error);
});
```

### Kết nối không xác thực (Guest)
```javascript
const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling']
});
// Guest chỉ nhận được events từ public rooms
```

---

## 🏠 Rooms & Subscriptions

### Bảng tổng hợp Rooms

| Room | Mô tả | Auth | Auto-Join |
|------|-------|------|-----------|
| `user:{userId}` | Events riêng cho user | ✅ | ✅ Có token |
| `organization:{orgId}` | Events cho tổ chức | ✅ | ❌ Subscribe |
| `public` | Events công khai | ❌ | ✅ Tất cả |
| `notifications` | Thông báo cá nhân | ✅ | ❌ Subscribe |
| `announcements` | Thông báo công cộng | ❌ | ❌ Subscribe |
| `admin_room` | Events dành cho Admin | ✅ | ❌ Auto-Join (Admin only) |

### Subscribe vào Room
```javascript
// Subscribe nhiều rooms cùng lúc
socket.emit('subscribe', { 
  rooms: ['organization:org-123-uuid', 'announcements'] 
});

socket.on('subscribed', (result) => {
  console.log('Joined:', result.rooms);
  console.log('Bị từ chối:', result.rejected); // Guest cố join private room
});
```

### Heartbeat (Giữ online status)
```javascript
// Gửi ping mỗi 30s để giữ trạng thái online
setInterval(() => {
  socket.emit('ping', {});
}, 30000);

socket.on('pong', () => {
  console.log('🏓 Server đã nhận');
});
```

---

## 📋 Tổng hợp Events

### Events theo Room

| Room | Events |
|------|--------|
| `user:{userId}` | `user:logout`, `user:logoutAll`, `user:tokenRevoked`, `user:passwordChanged`, `user:emailVerified`, `user:2faStatusChanged`, `user:profileUpdated` |
| `user:{userId}` | `organization:created`, `organization:updated`, `organization:deleted`, `organization:deletedMany` |
| `user:{userId}` | `organization:memberInvited`, `organization:ownershipTransferred` |
| `organization:{orgId}` | Member: `member:accepted`, `member:rejected`, `member:left`, `member:removed`, `member:rolesUpdated`, `member:permissionsUpdated`, `member:displayNameUpdated`, `member:onlineStatus` |
| `organization:{orgId}` | Role: `orgRole:created`, `orgRole:updated`, `orgRole:deleted`, `orgRole:deletedMany` |
| `organization:{orgId}` | API Key: `apiKey:created`, `apiKey:updated`, `apiKey:deleted`, `apiKey:deletedMany` |
| `organization:{orgId}` | Warehouse: `warehouse:updated`, `warehouse:layoutUpdated` |
| `organization:{orgId}` | Partner: `partner:created`, `partner:updated`, `partner:deleted`, `partner:deletedMany` |
| `organization:{orgId}` | Product: `product:created`, `product:updated`, `product:deleted`, `product:deletedMany` |
| `organization:{orgId}` | Batch: `batch:created`, `batch:updated`, `batch:deleted`, `batch:deletedMany` |
| `organization:{orgId}` | Notification: `orgNotification:created`, `orgNotification:updated`, `orgNotification:deleted`, `orgNotification:deletedMany` |
| `organization:{orgId}` | Contract: `rentalContract:created`, `rentalContract:updated`, `rentalContract:deleted`, `rentalContract:deletedMany`, `rentalContract:renewed` |
| `organization:{orgId}` | Payment: `payment:created`, `payment:updated` |
| `organization:{orgId}` | RefundRequest: `refundRequest:accepted`, `refundRequest:rejected`, `refundRequest:statusChanged`, `refundRequest:deleted` |
| Global (All) | Template: `warehouseTemplate:created`, `warehouseTemplate:updated`, `warehouseTemplate:deleted`, `warehouseTemplate:deletedMany`, `warehouseTemplate:layoutUpdated` |
| Global (All) | Template Image: `warehouseTemplateImage:created`, `warehouseTemplateImage:updated`, `warehouseTemplateImage:deleted`, `warehouseTemplateImage:deletedMany` |
| Global (All) | Notification: `globalNotification:created`, `globalNotification:updated`, `globalNotification:deleted` |
| Global (All) | Amenity: `amenity:created`, `amenity:updated`, `amenity:deleted`, `amenity:deletedMany` |
| Global (All) | Addon: `addon:created`, `addon:updated`, `addon:deleted`, `addon:deletedMany` |
| Global (All) | Insurance: `insurance:created`, `insurance:updated`, `insurance:deleted`, `insurance:deletedMany` |
| Global (All) | CouponSchedule: `couponSchedule:created`, `couponSchedule:updated`, `couponSchedule:deleted`, `couponSchedule:deletedMany`, `couponSchedule:executed` |
| Global (All) | Config: `config:updated` |
| Global (All) | User: `user:onlineStatus` |
| Global (All) | AddonType: `addonType:created`, `addonType:updated`, `addonType:deleted`, `addonType:deletedMany` |
| Global (All) | FAQ: `faq:created`, `faq:updated`, `faq:deleted`, `faq:deletedMany` |
| `notifications` | `userNotification:received`, `userNotification:read`, `userNotification:allRead` |
| Global (All) | Warning Category: `warningCategory:created`, `warningCategory:updated`, `warningCategory:deleted`, `warningCategory:deletedMany` |
| `user:{userId}` | User Management: `user:banned`, `user:unbanned`, `user:warned`, `user:unwarned`, `user:sessionRevoked`, `user:allSessionsRevoked` |
| `admin_room` | User Management: `user:banned`, `user:unbanned`, `user:warned`, `user:unwarned`, `user:sessionRevoked`, `user:allSessionsRevoked` |

---

## 🔐 Auth Events (Room: `user:{userId}`)

### `user:logout`
**Khi nào:** Khi user đăng xuất 1 thiết bị  
**Xử lý:** Redirect đến trang login nếu tokenId khớp

```javascript
socket.on('user:logout', (data) => {
  // {
  //   "userId": "550e8400-e29b-41d4-a716-446655440000",
  //   "tokenId": "token-abc-123",
  //   "message": "Đã đăng xuất thành công",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  if (data.tokenId === currentTokenId) {
    // Logout và redirect
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  }
});
```

---

### `user:logoutAll`
**Khi nào:** Khi user chọn đăng xuất tất cả thiết bị  
**Xử lý:** Logout trừ socket đang emit (excludeSocketId)

```javascript
socket.on('user:logoutAll', (data) => {
  // {
  //   "userId": "550e8400-e29b-41d4-a716-446655440000",
  //   "message": "Đã đăng xuất khỏi tất cả thiết bị",
  //   "excludeSocketId": "socket-id-caller",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  if (socket.id !== data.excludeSocketId) {
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  }
});
```

---

### `user:tokenRevoked`
**Khi nào:** Reset password, admin revoke, security alert  
**Xử lý:** Force logout

```javascript
socket.on('user:tokenRevoked', (data) => {
  // {
  //   "userId": "550e8400-e29b-41d4-a716-446655440000",
  //   "reason": "password_changed", // | "admin_revoke" | "security_alert"
  //   "message": "Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  showAlert(data.message);
  localStorage.removeItem('accessToken');
  window.location.href = '/login';
});
```

---

### `user:passwordChanged`
**Khi nào:** Khi đổi mật khẩu thành công  
**Xử lý:** Thông báo các thiết bị khác

```javascript
socket.on('user:passwordChanged', (data) => {
  // {
  //   "userId": "550e8400-e29b-41d4-a716-446655440000",
  //   "message": "Mật khẩu đã được thay đổi",
  //   "logoutOtherDevices": true,
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  if (data.logoutOtherDevices) {
    // Force logout
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  }
});
```

---

### `user:emailVerified`
**Khi nào:** Khi email được xác thực  
**Xử lý:** Ẩn alert yêu cầu verify email, cập nhật UI

```javascript
socket.on('user:emailVerified', (data) => {
  // {
  //   "userId": "550e8400-e29b-41d4-a716-446655440000",
  //   "email": "user@example.com",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  // Ẩn banner "Vui lòng xác thực email"
  hideEmailVerificationBanner();
  showSuccessToast('Email đã được xác thực!');
});
```

---

### `user:2faStatusChanged`
**Khi nào:** Bật/tắt 2FA  
**Xử lý:** Cập nhật UI trạng thái 2FA

```javascript
socket.on('user:2faStatusChanged', (data) => {
  // {
  //   "userId": "550e8400-e29b-41d4-a716-446655440000",
  //   "enabled": true, // hoặc false
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  update2faStatus(data.enabled);
  showToast(data.enabled ? '2FA đã được bật' : '2FA đã được tắt');
});
```

---

### `user:profileUpdated`
**Khi nào:** Cập nhật thông tin cá nhân  
**Xử lý:** Refresh profile data

```javascript
socket.on('user:profileUpdated', (data) => {
  // {
  //   "userId": "550e8400-e29b-41d4-a716-446655440000",
  //   "updatedFields": ["name", "language", "avatar"],
  //   "profile": {
  //     "id": "550e8400-e29b-41d4-a716-446655440000",
  //     "name": "Nguyễn Văn A",
  //     "email": "user@example.com",
  //     "avatar": "https://cdn.example.com/avatar.jpg",
  //     "language": "vi"
  //   },
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateUserProfile(data.profile);
});
```

---

## 🏢 Organization Events (Room: `user:{userId}`)

### `organization:created`
```javascript
socket.on('organization:created', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "name": "My Company",
  //   "ownerId": "550e8400-e29b-41d4-a716-446655440000",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  // Thêm org mới vào sidebar
  addOrganizationToList(data);
});
```

---

### `organization:updated`
```javascript
socket.on('organization:updated', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "name": "My Company Updated",
  //   "updatedFields": ["name"],
  //   "updatedBy": "550e8400-e29b-41d4-a716-446655440000",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateOrganizationInList(data);
});
```

---

### `organization:deleted`
```javascript
socket.on('organization:deleted', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "deletedBy": "550e8400-e29b-41d4-a716-446655440000",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  removeOrganizationFromList(data.organizationId);
});
```

---

### `organization:deletedMany`
```javascript
socket.on('organization:deletedMany', (data) => {
  // {
  //   "organizationIds": ["org-123-uuid", "org-456-uuid"],
  //   "deletedBy": "550e8400-e29b-41d4-a716-446655440000",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  data.organizationIds.forEach(removeOrganizationFromList);
});
```

---

### `organization:memberInvited`
**Emit đến:** User được invite

```javascript
socket.on('organization:memberInvited', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "organizationName": "My Company",
  //   "invitedUserId": "invited-user-uuid",
  //   "invitedEmail": "user@example.com",
  //   "invitedBy": "owner-user-uuid",
  //   "displayName": "Nguyễn Văn A",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  showInvitationModal(data);
});
```

---

### `organization:ownershipTransferred`
**Emit đến:** Old owner và new owner

```javascript
socket.on('organization:ownershipTransferred', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "organizationName": "My Company",
  //   "oldOwnerId": "old-owner-uuid",
  //   "newOwnerId": "new-owner-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  refreshOrganizationPermissions(data.organizationId);
});
```

---

## 👥 Member Events (Room: `organization:{orgId}`)

### Subscribe org room trước
```javascript
socket.emit('subscribe', { rooms: [`organization:${orgId}`] });
```

### `member:accepted`
```javascript
socket.on('member:accepted', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "memberId": "member-uuid",
  //   "userId": "user-uuid",
  //   "displayName": "Nguyễn Văn A",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  addMemberToList(data);
  showToast(`${data.displayName} đã tham gia`);
});
```

---

### `member:rejected`
```javascript
socket.on('member:rejected', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "memberId": "member-uuid",
  //   "userId": "user-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
});
```

---

### `member:left`
```javascript
socket.on('member:left', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "memberId": "member-uuid",
  //   "userId": "user-uuid",
  //   "displayName": "Nguyễn Văn A",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  removeMemberFromList(data.memberId);
  showToast(`${data.displayName} đã rời tổ chức`);
});
```

---

### `member:removed`
```javascript
socket.on('member:removed', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "memberId": "member-uuid",
  //   "removedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  removeMemberFromList(data.memberId);
});
```

---

### `member:rolesUpdated`
```javascript
socket.on('member:rolesUpdated', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "memberId": "member-uuid",
  //   "roles": [
  //     { "id": "role-1", "name": "Manager" },
  //     { "id": "role-2", "name": "Staff" }
  //   ],
  //   "updatedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateMemberRoles(data);
});
```

---

### `member:permissionsUpdated`
```javascript
socket.on('member:permissionsUpdated', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "memberId": "member-uuid",
  //   "permissions": [
  //     { "id": "perm-1", "key": "warehouse.read" }
  //   ],
  //   "updatedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateMemberPermissions(data);
});
```

---

### `member:displayNameUpdated`
```javascript
socket.on('member:displayNameUpdated', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "memberId": "member-uuid",
  //   "displayName": "Tên mới trong org",
  //   "updatedBy": "user-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateMemberDisplayName(data);
});
```

---

### `member:onlineStatus`
```javascript
socket.on('member:onlineStatus', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "memberId": "member-uuid",
  //   "userId": "user-uuid",
  //   "isOnline": true,
  //   "lastOnline": null, // hoặc timestamp khi offline
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateMemberOnlineIndicator(data);
});
```

---

## 🎭 Organization Role Events (Room: `organization:{orgId}`)

### `orgRole:created`
```javascript
socket.on('orgRole:created', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "role": {
  //     "id": "role-uuid",
  //     "name": "Manager",
  //     "description": "Quản lý"
  //   },
  //   "createdBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  addRoleToList(data.role);
});
```

---

### `orgRole:updated`
```javascript
socket.on('orgRole:updated', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "role": {
  //     "id": "role-uuid",
  //     "name": "Senior Manager",
  //     "description": "Quản lý cấp cao"
  //   },
  //   "updatedFields": ["name", "description"],
  //   "updatedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateRoleInList(data.role);
});
```

---

### `orgRole:deleted`
```javascript
socket.on('orgRole:deleted', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "roleId": "role-uuid",
  //   "deletedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  removeRoleFromList(data.roleId);
});
```

---

### `orgRole:deletedMany`
```javascript
socket.on('orgRole:deletedMany', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "roleIds": ["role-1", "role-2"],
  //   "deletedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  data.roleIds.forEach(removeRoleFromList);
});
```

---

## 🔑 API Key Events (Room: `organization:{orgId}`)

### `apiKey:created`
```javascript
socket.on('apiKey:created', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "apiKey": {
  //     "id": "key-uuid",
  //     "name": "Production Key",
  //     "keyPrefix": "genhub_xxx",
  //     "isActive": true
  //   },
  //   "createdBy": "user-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  addApiKeyToList(data.apiKey);
});
```

---

### `apiKey:updated`
```javascript
socket.on('apiKey:updated', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "apiKey": {
  //     "id": "key-uuid",
  //     "name": "Production Key Updated",
  //     "isActive": true
  //   },
  //   "updatedFields": ["name"],
  //   "updatedBy": "user-uuid",
  //   "isAdminAction": false,
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateApiKeyInList(data.apiKey);
});
```

---

### `apiKey:deleted` / `apiKey:deletedMany`
```javascript
socket.on('apiKey:deleted', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "apiKeyId": "key-uuid",
  //   "deletedBy": "user-uuid",
  //   "isAdminAction": false,
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  removeApiKeyFromList(data.apiKeyId);
});

socket.on('apiKey:deletedMany', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "apiKeyIds": ["key-1", "key-2"],
  //   "deletedBy": "user-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  data.apiKeyIds.forEach(removeApiKeyFromList);
});
```

---

## 🏭 Warehouse Template Events (Global Broadcast)

### `warehouseTemplate:created`
```javascript
socket.on('warehouseTemplate:created', (data) => {
  // {
  //   "warehouseTemplateId": "template-123-uuid",
  //   "name": "Kho hàng A",
  //   "createdBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  refreshTemplateList();
});
```

---

### `warehouseTemplate:updated`
```javascript
socket.on('warehouseTemplate:updated', (data) => {
  // {
  //   "warehouseTemplateId": "template-123-uuid",
  //   "name": "Kho hàng A Updated",
  //   "updatedFields": ["name", "description"],
  //   "updatedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
});
```

---

### `warehouseTemplate:deleted` / `warehouseTemplate:deletedMany`
```javascript
socket.on('warehouseTemplate:deleted', (data) => {
  // { "warehouseTemplateId", "name", "deletedBy", "timestamp" }
});

socket.on('warehouseTemplate:deletedMany', (data) => {
  // { "ids": [...], "deletedBy", "timestamp" }
});
```

---

### `warehouseTemplate:layoutUpdated`
```javascript
socket.on('warehouseTemplate:layoutUpdated', (data) => {
  // {
  //   "warehouseTemplateId": "template-123-uuid",
  //   "name": "Kho hàng A",
  //   "updatedBy": "admin-uuid",
  //   "summary": {
  //     "rowsCreated": 2, "rowsUpdated": 1, "rowsDeleted": 0,
  //     "racksCreated": 5, "racksUpdated": 3, "racksDeleted": 1,
  //     "shelvesCreated": 10, "shelvesUpdated": 5, "shelvesDeleted": 2,
  //     "blocksCreated": 20, "blocksUpdated": 10, "blocksDeleted": 5
  //   },
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  if (currentTemplateId === data.warehouseTemplateId) {
    refreshLayoutView();
  }
});
```

---

### Warehouse Template Image Events
```javascript
socket.on('warehouseTemplateImage:created', (data) => {
  // { "templateId", "image": { id, url, thumbnailUrl }, "createdBy", "timestamp" }
});

socket.on('warehouseTemplateImage:updated', (data) => {
  // { "templateId", "imageId", "image", "updatedBy", "timestamp" }
});

socket.on('warehouseTemplateImage:deleted', (data) => {
  // { "templateId", "imageId", "deletedBy", "timestamp" }
});

socket.on('warehouseTemplateImage:deletedMany', (data) => {
  // { "templateId", "imageIds": [...], "deletedBy", "timestamp" }
});
```

---

## 🏪 Warehouse Events (Room: `organization:{orgId}`)

### `warehouse:updated`
```javascript
socket.on('warehouse:updated', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "warehouse": {
  //     "id": "warehouse-uuid",
  //     "name": "Kho hàng 1",
  //     "description": "Mô tả mới"
  //   },
  //   "updatedFields": ["name", "description"],
  //   "updatedBy": "user-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateWarehouseInList(data.warehouse);
});
```

---

### `warehouse:layoutUpdated`
```javascript
socket.on('warehouse:layoutUpdated', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "warehouseId": "warehouse-uuid",
  //   "summary": { /* similar to template layout */ },
  //   "updatedBy": "user-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  if (currentWarehouseId === data.warehouseId) {
    refreshLayoutView();
  }
});
```

---

## 📝 Rental Contract Events (Room: `organization:{orgId}`)

### `rentalContract:created`
```javascript
socket.on('rentalContract:created', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "contract": {
  //     "id": "contract-uuid",
  //     "code": "HD-2024-001",
  //     "status": "PENDING"
  //   },
  //   "createdBy": "user-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  addContractToList(data.contract);
});
```

---

### `rentalContract:updated`
```javascript
socket.on('rentalContract:updated', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "contract": { id, code, status },
  //   "updatedFields": ["status"],
  //   "updatedBy": "user-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateContractInList(data.contract);
});
```

---

### `rentalContract:deleted` / `rentalContract:deletedMany`
```javascript
socket.on('rentalContract:deleted', (data) => {
  // { "organizationId", "contractId", "deletedBy", "timestamp" }
});

socket.on('rentalContract:deletedMany', (data) => {
  // { "organizationId", "ids": [...], "deletedBy", "timestamp" }
});
```

---

### `rentalContract:renewed`
```javascript
socket.on('rentalContract:renewed', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "contract": { id, code, status, expired_at },
  //   "renewedBy": "user-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateContractInList(data.contract);
  showToast('Hợp đồng đã được gia hạn');
});
```

---

## 💳 Payment Events (Room: `organization:{orgId}`)

### `payment:created`
```javascript
socket.on('payment:created', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "payment": {
  //     "id": "payment-uuid",
  //     "paymentCode": "GENHUB1702612345678",
  //     "amount": 5000000,
  //     "status": "PENDING",
  //     "qrCode": "base64..."
  //   },
  //   "contractId": "contract-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  showPaymentModal(data.payment);
});
```

---

### `payment:updated`
```javascript
socket.on('payment:updated', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "payment": {
  //     "id": "payment-uuid",
  //     "status": "PAID",
  //     "paidAt": "2025-12-17T10:00:00.000Z"
  //   },
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  if (data.payment.status === 'PAID') {
    showSuccessToast('Thanh toán thành công!');
    closePaymentModal();
    refreshContractList();
  }
});
```

---

## 🔔 Notification Events

### Global Notifications (Global Broadcast)
```javascript
socket.on('globalNotification:created', (data) => {
  // { "notificationId", "title", "createdBy", "timestamp" }
  showSystemNotification(data);
});

socket.on('globalNotification:updated', (data) => {
  // { "notificationId", "title", "updatedFields", "updatedBy", "timestamp" }
});

socket.on('globalNotification:deleted', (data) => {
  // { "notificationId", "title", "deletedBy", "timestamp" }
});
```

---

### User Notifications (Room: `notifications` hoặc `user:{userId}`)
```javascript
socket.on('userNotification:received', (data) => {
  // {
  //   "notificationId": "notification-uuid",
  //   "title": "Thông báo mới",
  //   "content": "Nội dung...",
  //   "type": "INFO", // INFO, SUCCESS, WARNING, ERROR
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  incrementNotificationBadge();
  showNotificationToast(data);
});

socket.on('userNotification:read', (data) => {
  // { "notificationId", "timestamp" }
  markNotificationAsRead(data.notificationId);
});

socket.on('userNotification:allRead', (data) => {
  // { "timestamp" }
  resetNotificationBadge();
});
```

---

### Organization Notifications (Room: `organization:{orgId}`)
```javascript
socket.on('orgNotification:created', (data) => {
  // {
  //   "organizationId": "org-123-uuid",
  //   "notificationId": "notification-uuid",
  //   "title": "Thông báo nội bộ",
  //   "createdBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
});

socket.on('orgNotification:updated', (data) => {
  // { "organizationId", "notificationId", "title", "updatedFields", "updatedBy", "timestamp" }
});

socket.on('orgNotification:deleted', (data) => {
  // { "organizationId", "notificationId", "title", "deletedBy", "timestamp" }
});

socket.on('orgNotification:deletedMany', (data) => {
  // { "organizationId", "ids": [...], "actorId", "timestamp" }
});
```

---

## 🛠️ Other Entity Events (Room: `organization:{orgId}`)

### Amenity Events (Global)
```javascript
socket.on('amenity:created', (data) => {
  // { "amenityId", "name", "createdBy", "timestamp" }
});
socket.on('amenity:updated', (data) => {
  // { "amenityId", "name", "updatedFields", "updatedBy", "timestamp" }
});
socket.on('amenity:deleted', (data) => {
  // { "amenityId", "name", "deletedBy", "timestamp" }
});
socket.on('amenity:deletedMany', (data) => {
  // { "amenityIds": [...], "deletedBy", "timestamp" }
});
```

---

### Partner Events
```javascript
socket.on('partner:created', (data) => {
  // { "id", "organizationId", "name", "code", "type", "actorId", "timestamp" }
});
socket.on('partner:updated', (data) => {
  // { "id", "organizationId", "name", "changedFields", "actorId", "timestamp" }
});
socket.on('partner:deleted', (data) => {
  // { "id", "organizationId", "name", "actorId", "timestamp" }
});
socket.on('partner:deletedMany', (data) => {
  // { "ids": [...], "actorId", "timestamp" }
});
```

---

### Product Events
```javascript
socket.on('product:created', (data) => {
  // { "id", "organizationId", "name", "sku", "actorId", "timestamp" }
});
socket.on('product:updated', (data) => {
  // { "id", "organizationId", "name", "changedFields", "actorId", "timestamp" }
});
socket.on('product:deleted', (data) => {
  // { "id", "organizationId", "name", "actorId", "timestamp" }
});
socket.on('product:deletedMany', (data) => {
  // { "ids": [...], "actorId", "timestamp" }
});
```

---

### Batch Events
```javascript
socket.on('batch:created', (data) => {
  // { "id", "organizationId", "code", "productId", "actorId", "timestamp" }
});
socket.on('batch:updated', (data) => {
  // { "id", "organizationId", "code", "changedFields", "actorId", "timestamp" }
});
socket.on('batch:deleted', (data) => {
  // { "id", "organizationId", "code", "actorId", "timestamp" }
});
socket.on('batch:deletedMany', (data) => {
  // { "ids": [...], "actorId", "timestamp" }
});
```

---

## ⚙️ Config Events (Global)

### `config:updated`
**Khi nào:** Admin update/reload/reset config  
**Xử lý:** Cập nhật config trong app

```javascript
socket.on('config:updated', (data) => {
  // {
  //   "action": "update", // | "reload" | "reset"
  //   "config": {
  //     "brandName": "GEN-HUB",
  //     "maintenanceMode": false,
  //     // ...other config values
  //   },
  //   "updatedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateAppConfig(data.config);
  if (data.config.maintenanceMode) {
    showMaintenanceOverlay();
  }
});
```

---

## 🌐 Online Status (Global Broadcast)

### `user:onlineStatus`
```javascript
socket.on('user:onlineStatus', (data) => {
  // {
  //   "userId": "550e8400-e29b-41d4-a716-446655440000",
  //   "isOnline": true,
  //   "lastOnline": null, // timestamp khi offline
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateUserOnlineIndicator(data.userId, data.isOnline);
});
```

---

## 🚨 Error Handling

```javascript
socket.on('error', (error) => {
  // {
  //   "code": "UNAUTHORIZED",
  //   "message": "Token không hợp lệ",
  //   "details": {}
  // }
  
  console.error('Socket error:', error);
  
  if (error.code === 'UNAUTHORIZED') {
    // Token hết hạn, cần refresh
    refreshToken();
  }
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Tự động reconnect sau 5s
  setTimeout(() => socket.connect(), 5000);
});
```

---

## 📱 Full Integration Example

```javascript
import { io } from 'socket.io-client';

class SocketManager {
  constructor(token) {
    this.socket = io('http://localhost:4000', {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    this.setupListeners();
    this.startHeartbeat();
  }
  
  setupListeners() {
    this.socket.on('connected', (data) => {
      console.log('Connected:', data);
    });
    
    // Auth events
    this.socket.on('user:logout', this.handleLogout.bind(this));
    this.socket.on('user:tokenRevoked', this.handleTokenRevoked.bind(this));
    
    // Profile events
    this.socket.on('user:profileUpdated', this.handleProfileUpdated.bind(this));
    
    // Errors
    this.socket.on('error', this.handleError.bind(this));
  }
  
  subscribeToOrganization(orgId) {
    this.socket.emit('subscribe', { rooms: [`organization:${orgId}`] });
  }
  
  startHeartbeat() {
    setInterval(() => {
      this.socket.emit('ping', {});
    }, 30000);
  }
  
  handleLogout(data) {
    localStorage.clear();
    window.location.href = '/login';
  }
  
  handleTokenRevoked(data) {
    alert(data.message);
    localStorage.clear();
    window.location.href = '/login';
  }
  
  handleProfileUpdated(data) {
    // Update global state
    store.dispatch(updateProfile(data.profile));
  }
  
  handleError(error) {
    console.error('Socket error:', error);
  }
  
  disconnect() {
    this.socket.disconnect();
  }
}

export default SocketManager;
```

---

## 🏭 Warehouse Management

### 1. Update Warehouse
**Event Name:** `warehouse:updated`
**Trigger:** Khi thông tin kho hàng được cập nhật (name, description...).
**Payload:**
```json
{
  "organizationId": "org_uuid",
  "warehouseId": "warehouse_uuid",
  "name": "Updated Name",
  "updatedFields": ["name", "description"],
  "updatedBy": "user_uuid",
  "timestamp": "2024-03-20T10:00:00Z"
}
```

### 2. Update Layout
**Event Name:** `warehouse:layoutUpdated`
**Trigger:** Khi layout kho được thay đổi (thêm/sửa/xóa rows, racks, shelves...).
**Payload:**
```json
{
  "organizationId": "org_uuid",
  "warehouseId": "warehouse_uuid",
  "name": "Warehouse A",
  "updatedBy": "user_uuid",
  "summary": {
    "rowsCreated": 1,
    "rowsUpdated": 2,
    "racksCreated": 5
  },
  "timestamp": "2024-03-20T10:00:00Z"
}
```

### 3. Delete Warehouse
**Event Name:** `warehouse:deleted`
**Trigger:** Khi kho hàng bị xóa.
**Payload:**
```json
{
  "organizationId": "org_uuid",
  "warehouseId": "warehouse_uuid",
  "deletedBy": "user_uuid",
  "timestamp": "2024-03-20T10:00:00Z"
}
```

---

## 🖼️ Warehouse Template Images

### 1. Upload Images
**Event Name:** `warehouseTemplateImage:created`
**Trigger:** Khi ảnh mới được upload lên template.
**Payload:**
```json
{
  "templateId": "template_uuid",
  "count": 3,
  "uploadedBy": "user_uuid",
  "timestamp": "2024-03-20T10:00:00Z"
}
```

### 2. Delete Image
**Event Name:** `warehouseTemplateImage:deleted`
**Payload:** `templateId`, `imageId`, `deletedBy`, `timestamp`.

### 3. Delete Many Images
**Event Name:** `warehouseTemplateImage:deletedMany`
**Payload:** `templateId`, `imageIds`, `count`, `deletedBy`, `timestamp`.

### 4. Reorder Images
**Event Name:** `warehouseTemplateImage:updated`
**Payload:** `templateId`, `action`: "reorder", `updatedBy`, `timestamp`.

---

## 📜 Rental Contracts

### 1. Contract Created
**Event Name:** `rentalContract:created`
**Trigger:** Khi hợp đồng thuê mới được tạo.
**Payload:**
```json
{
  "organizationId": "org_uuid",
  "contractId": "contract_uuid",
  "contractNumber": "GEN-123456",
  "createdBy": "user_uuid",
  "timestamp": "2024-03-20T10:00:00Z"
}
```

### 2. Contract Updated
**Event Name:** `rentalContract:updated`
**Payload:** `organizationId`, `contractId`, `contractNumber`, `status` (optional), `updatedBy`, `timestamp`.

### 3. Contract Renewed
**Event Name:** `rentalContract:renewed`
**Payload:** `organizationId`, `contractId`, `contractNumber`, `newEndDate`, `renewedBy`, `timestamp`.

### 4. Contract Cancelled/Deleted
**Event Name:** `rentalContract:deleted`
**Payload:** `organizationId`, `contractId`, `deletedBy`, `timestamp`.

### 5. Payment Created
**Event Name:** `payment:created`
**Trigger:** Khi link thanh toán SePay được tạo cho hợp đồng.
**Target Room:** `user:{userId}` (Personal notification)
**Payload:**
```json
{
  "paymentId": "payment_uuid",
  "contractId": "contract_uuid",
  "paymentCode": "PAY-123",
  "amount": 5000000,
  "qrCode": "https://qr.sepay.vn/...",
  "expiredAt": "2024-03-20T11:00:00Z",
  "type": "NEW_CONTRACT"
}
```

---

## ⚙️ System Config

### 1. Config Updated
**Event Name:** `config:updated`
**Target:** Broadcast to ALL connected clients.
**Trigger:** Khi admin cập nhật cấu hình hệ thống.
**Payload:**
```json
{
  "action": "updated", // or "reset", "reloaded"
  "updatedBy": "user_uuid",
  "timestamp": "2024-03-20T10:00:00Z"
}
```

## 🔑 Admin API Keys

### 1. Admin Update API Key
**Event Name:** `apiKey:updated`
**Payload:** Includes `isAdminAction: true`.

### 2. Admin Delete API Key
**Event Name:** `apiKey:deleted`
**Payload:** Includes `isAdminAction: true`.

---

## 🟢 Member Online Status

### 1. Member Status Changed
**Event Name:** `organization:memberOnlineStatus`
**Target Room:** `organization:{orgId}`
**Trigger:** Khi thành viên online/offline.
**Payload:**
```json
{
  "organizationId": "org_uuid",
  "userId": "user_uuid",
  "isOnline": true, // or false
  "lastOnline": null, // or ISO timestamp if offline
  "timestamp": "2024-03-20T10:00:00Z"
}
```

---

## 🛡️ Insurance Events (Global Broadcast)

### `insurance:created`
**Khi nào:** Khi admin tạo bảo hiểm mới
**Room:** Global (All clients)

```javascript
socket.on('insurance:created', (data) => {
  // {
  //   "insuranceId": "550e8400-e29b-41d4-a716-446655440000",
  //   "name": "Bảo hiểm hàng hóa cơ bản",
  //   "createdBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  refreshInsuranceList();
});
```

---

### `insurance:updated`
**Khi nào:** Khi admin cập nhật bảo hiểm
**Room:** Global (All clients)

```javascript
socket.on('insurance:updated', (data) => {
  // {
  //   "insuranceId": "550e8400-e29b-41d4-a716-446655440000",
  //   "name": "Bảo hiểm hàng hóa nâng cao",
  //   "updatedFields": ["name", "price"],
  //   "updatedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  updateInsuranceInList(data);
});
```

---

### `insurance:deleted`
**Khi nào:** Khi admin xóa bảo hiểm
**Room:** Global (All clients)

```javascript
socket.on('insurance:deleted', (data) => {
  // {
  //   "insuranceId": "550e8400-e29b-41d4-a716-446655440000",
  //   "name": "Bảo hiểm hàng hóa cơ bản",
  //   "deletedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  removeInsuranceFromList(data.insuranceId);
});
```

---

### `insurance:deletedMany`
**Khi nào:** Khi admin xóa nhiều bảo hiểm
**Room:** Global (All clients)

```javascript
socket.on('insurance:deletedMany', (data) => {
  // {
  //   "insuranceIds": ["id1", "id2", "id3"],
  //   "deletedBy": "admin-uuid",
  //   "timestamp": "2025-12-17T10:00:00.000Z"
  // }
  
  data.insuranceIds.forEach(removeInsuranceFromList);
});
```

---

## 📝 Organization Update Request Events

### `organization_update_request_created` (Room: `admin_room`)
**Khi nào:** Có yêu cầu cập nhật thông tin tổ chức mới
```javascript
socket.on('organization_update_request_created', (data) => {
  // {
  //   "id": "request-uuid",
  //   "organization": { "id": "org-uuid", "name": "Org Name", "tax_code": "..." },
  //   "requester": { "id": "user-uuid", "name": "User Name", "email": "..." },
  //   "status": "PENDING",
  //   "created_at": "..."
  // }
});
```

### `organization_update_request_approved` (Room: `org_{orgId}`)
**Khi nào:** Yêu cầu cập nhật được chấp thuận
```javascript
socket.on('organization_update_request_approved', (data) => {
  // {
  //   "id": "request-uuid",
  //   "status": "APPROVED",
  //   "organization": { ... },
  //   "updated_by": "admin-uuid",
  //   "updated_at": "..."
  // }
});
```

### `organization_update_request_rejected` (Room: `org_{orgId}`)
**Khi nào:** Yêu cầu cập nhật bị từ chối
```javascript
socket.on('organization_update_request_rejected', (data) => {
  // {
  //   "id": "request-uuid",
  //   "status": "REJECTED",
  //   "reject_reason": "Reason...",
  //   "updated_by": "admin-uuid",
  //   "updated_at": "..."
  // }
});
```

---

## 📞 Contact Events (Room: `admin_room`)

### `contact:created`
**Khi nào:** Khi có khách gửi form liên hệ mới
```javascript
socket.on('contact:created', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "code": "TICKET-20250101-001",
  //   "email": "customer@example.com",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
  
  playNotificationSound();
  showToast(`New ticket: ${data.code}`);
  refreshTicketList();
});
```

### `contact:updated`
**Khi nào:** Khi ticket được cập nhật (status, priority, assign)
```javascript
socket.on('contact:updated', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "code": "TICKET-20250101-001",
  //   "updatedFields": ["status", "assigned_staff_id"],
  //   "updatedBy": "admin-uuid",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
});
```

### `contact:messageCreated`
**Khi nào:** Khi có tin nhắn mới (khách hoặc staff)
```javascript
socket.on('contact:messageCreated', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "message": {
  //     "id": "msg-uuid",
  //     "sender_type": "CUSTOMER", // or "STAFF"
  //     "sender_name": "Nguyen Van A",
  //     "content": "Help me please",
  //     "is_internal": false,
  //     "created_at": "2025-01-01T10:00:00.000Z"
  //   },
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
  
  if (currentConversationId === data.conversationId) {
    appendMessageToChat(data.message);
  }
});
```

### `contact:closed`
```javascript
socket.on('contact:closed', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "code": "TICKET-20250101-001",
  //   "closedBy": "admin-uuid",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
});
```

### `contact:reopened`
```javascript
socket.on('contact:reopened', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "code": "TICKET-20250101-001",
  //   "reopenedBy": "admin-uuid",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
});
```

### `contact:deleted`
```javascript
socket.on('contact:deleted', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "deletedBy": "admin-uuid",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
});
```

### `contact:staffAssigned`
**Khi nào:** Khi assign staff vào ticket
```javascript
socket.on('contact:staffAssigned', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "code": "TICKET-20250101-001",
  //   "staff": [
  //     { "staffId": "staff-uuid", "staffName": "Staff A" }
  //   ],
  //   "assignedBy": "admin-uuid",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
});
```

### `contact:staffUnassigned`
**Khi nào:** Khi unassign staff khỏi ticket
```javascript
socket.on('contact:staffUnassigned', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "code": "TICKET-20250101-001",
  //   "staffId": "staff-uuid",
  //   "unassignedBy": "admin-uuid",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
});
```

---

## 🏷️ ContactTag Events (Room: `admin_room`)

### `contactTag:created`
**Khi nào:** Khi tạo tag phân loại contact mới
```javascript
socket.on('contactTag:created', (data) => {
  // {
  //   "tagId": "uuid",
  //   "name": "Hỗ trợ kỹ thuật",
  //   "color": "#3B82F6",
  //   "createdBy": "admin-uuid",
  //   "timestamp": "2026-01-01T10:00:00.000Z"
  // }
  
  refreshTagList();
});
```

### `contactTag:updated`
**Khi nào:** Khi cập nhật tag
```javascript
socket.on('contactTag:updated', (data) => {
  // {
  //   "tagId": "uuid",
  //   "name": "Hỗ trợ kỹ thuật",
  //   "color": "#10B981",
  //   "updatedFields": ["name", "color"],
  //   "updatedBy": "admin-uuid",
  //   "timestamp": "2026-01-01T10:00:00.000Z"
  // }
});
```

### `contactTag:deleted`
**Khi nào:** Khi xóa tag
```javascript
socket.on('contactTag:deleted', (data) => {
  // {
  //   "tagId": "uuid",
  //   "deletedBy": "admin-uuid",
  //   "timestamp": "2026-01-01T10:00:00.000Z"
  // }
});
```

### `contactTag:deletedMany`
**Khi nào:** Khi xóa nhiều tags
```javascript
socket.on('contactTag:deletedMany', (data) => {
  // {
  //   "tagIds": ["uuid-1", "uuid-2"],
  //   "deletedBy": "admin-uuid",
  //   "timestamp": "2026-01-01T10:00:00.000Z"
  // }
});
```


---

## 💸 Refund Request Events (Room: `organization:{orgId}`)

### `refundRequest:accepted`
**Khi nào:** Khi yêu cầu hoàn tiền được chấp thuận
```javascript
socket.on('refundRequest:accepted', (data) => {
  // {
  //   "organizationId": "org-uuid",
  //   "refundRequestId": "uuid",
  //   "finalRefundAmount": 1000000,
  //   "acceptedBy": "admin-uuid",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
});
```

### `refundRequest:rejected`
**Khi nào:** Khi yêu cầu hoàn tiền bị từ chối
```javascript
socket.on('refundRequest:rejected', (data) => {
  // {
  //   "organizationId": "org-uuid",
  //   "refundRequestId": "uuid",
  //   "reason": "Reason...",
  //   "rejectedBy": "admin-uuid",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
});
```

### `refundRequest:statusChanged`
**Khi nào:** Khi trạng thái yêu cầu hoàn tiền thay đổi
```javascript
socket.on('refundRequest:statusChanged', (data) => {
  // {
  //   "organizationId": "org-uuid",
  //   "refundRequestId": "uuid",
  //   "oldStatus": "PENDING",
  //   "newStatus": "APPROVED",
  //   "changedBy": "admin-uuid",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
});
```

### `refundRequest:deleted`
**Khi nào:** Khi yêu cầu hoàn tiền bị xóa (soft delete)
```javascript
socket.on('refundRequest:deleted', (data) => {
  // {
  //   "organizationId": "org-uuid",
  //   "refundRequestId": "uuid",
  //   "deletedBy": "admin-uuid",
  //   "timestamp": "2025-01-01T10:00:00.000Z"
  // }
});
```

---

## 📧 Contact AI Events (Room: `admin_room`)

### Mô tả

Contact module tích hợp AI với hai thành phần:
- **Gemini AI**: Phân loại message (spam vs contact hợp lệ)
- **Coze AI**: Tư vấn tự động cho customer

AI chỉ reply cho **CUSTOMER** messages, không reply cho staff messages.

### Join Room
```javascript
// Admin tự động join admin_room khi authenticated
// Không cần subscribe thủ công
```

### `contact:conversation:created`
**Khi nào:** Khi có ticket mới được tạo (từ form hoặc email)
```javascript
socket.on('contact:conversation:created', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "code": "TICKET-20260110-001",
  //   "customerEmail": "customer@example.com",
  //   "timestamp": "2026-01-10T10:00:00.000Z"
  // }
});
```

### `contact:message:created`
**Khi nào:** Khi có message mới trong conversation (từ customer, staff hoặc AI)
```javascript
socket.on('contact:message:created', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "message": {
  //     "id": "message-uuid",
  //     "sender_type": "CUSTOMER" | "STAFF" | "AI",
  //     "sender_name": "Nguyen Van A" | "Staff Name" | "GEN-HUB AI",
  //     "content": "Nội dung tin nhắn...",
  //     "is_internal": false,
  //     "created_at": "2026-01-10T10:00:00.000Z"
  //   }
  // }
  
  // Xử lý AI response
  if (data.message.sender_type === 'AI') {
    showAiResponse(data.message);
  }
});
```

**Data mẫu khi AI reply:**
```json
{
  "conversationId": "550e8400-e29b-41d4-a716-446655440000",
  "message": {
    "id": "ai-1704877200000",
    "sender_type": "AI",
    "sender_name": "GEN-HUB AI",
    "content": "Xin chào! Cảm ơn bạn đã liên hệ. Tôi có thể giúp bạn tìm hiểu về dịch vụ cho thuê kho...",
    "is_internal": false,
    "created_at": "2026-01-10T10:00:00.000Z"
  }
}
```

### `contact:conversation:updated`
**Khi nào:** Khi ticket được cập nhật (status, priority, AI settings, etc.)
```javascript
socket.on('contact:conversation:updated', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "code": "TICKET-20260110-001",
  //   "updatedFields": ["status", "enable_ai_reply"],
  //   "updatedBy": "admin-uuid",
  //   "timestamp": "2026-01-10T10:00:00.000Z"
  // }
});
```

### `contact:conversation:closed`
**Khi nào:** Khi ticket được đóng
```javascript
socket.on('contact:conversation:closed', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "code": "TICKET-20260110-001",
  //   "closedBy": "admin-uuid",
  //   "timestamp": "2026-01-10T10:00:00.000Z"
  // }
});
```

### `contact:conversation:reopened`
**Khi nào:** Khi ticket được mở lại
```javascript
socket.on('contact:conversation:reopened', (data) => {
  // {
  //   "conversationId": "uuid",
  //   "code": "TICKET-20260110-001",
  //   "reopenedBy": "admin-uuid",
  //   "timestamp": "2026-01-10T10:00:00.000Z"
  // }
});
```

## 📋 Contact List Events (Danh sách liên hệ Blacklist/Whitelist)

### `contactList:created`
Được phát khi một mục mới được thêm vào danh sách.

**Payload:**
```json
{
  "entryId": "uuid",
  "listType": "BLACKLIST", // hoặc "WHITELIST"
  "matchType": "EMAIL", // hoặc "EMAIL_DOMAIN", "IP_V4", "IP_V6", "REGION_COUNTRY", "REGION_CITY"
  "value": "example@domain.com",
  "createdBy": "userId",
  "timestamp": "ISO Date"
}
```

### `contactList:updated`
Được phát khi một mục trong danh sách được cập nhật.

**Payload:**
```json
{
  "entryId": "uuid",
  "listType": "BLACKLIST",
  "matchType": "EMAIL",
  "value": "new@domain.com",
  "updatedFields": ["value", "reason"],
  "updatedBy": "userId",
  "timestamp": "ISO Date"
}
```

### `contactList:deleted`
Được phát khi một mục bị xóa khỏi danh sách.

**Payload:**
```json
{
  "entryId": "uuid", // Có thể null nếu xóa nhanh (quick remove) từ service method
  "listType": "BLACKLIST", // Nếu xóa nhanh
  "matchType": "EMAIL", // Nếu xóa nhanh
  "value": "example@domain.com", // Nếu xóa nhanh
  "deletedBy": "userId",
  "timestamp": "ISO Date"
}
```

### `contactList:deletedMany`
Được phát khi nhiều mục bị xóa cùng lúc.

**Payload:**
```json
{
  "entryIds": ["uuid1", "uuid2"],
  "deletedBy": "userId",
  "timestamp": "ISO Date"
}
```

---

## 📦 Database Backup Events (Room: `admin_room`)

### `backup:created`
Được phát khi backup hoàn thành thành công.

**Payload:**
```json
{
  "id": "uuid",
  "fileName": "backup-2025-01-11T10-30-00.zip",
  "fileSize": 1048576,
  "backupType": "SCHEDULED", // SCHEDULED | MANUAL_API | MANUAL_DISCORD
  "triggeredBy": "SYSTEM", // hoặc userId
  "createdAt": "2025-01-11T10:30:00.000Z",
  "timestamp": "ISO Date"
}
```

### `backup:deleted`
Được phát khi backup bị xóa (do vượt max count).

**Payload:**
```json
{
  "id": "uuid",
  "fileName": "backup-old.zip",
  "timestamp": "ISO Date"
}
```

---

## 📱 Discord Integration

### Discord Backup Notifications

Khi backup hoàn thành hoặc thất bại, hệ thống sẽ gửi notification vào channel Discord được cấu hình trong `DISCORD_BACKUP_CHANNEL_ID`.

**Notification thành công:**
- Màu: Xanh lá (#00ff00)
- Thông tin: File name, size, duration, backup type, triggered by

**Notification thất bại:**
- Màu: Đỏ (#ff0000)
- Thông tin: Backup type, triggered by, error message

### Discord Commands cho Backup

| Command | Mô tả | Yêu cầu Role |
|---------|-------|--------------|
| `/backup <key>` | Trigger backup database | DISCORD_BACKUP_ROLE_IDS |
| `/backups` | Xem danh sách backups | DISCORD_BACKUP_ROLE_IDS |
| `/backup-download <id> <key>` | Lấy URL tải backup | DISCORD_BACKUP_ROLE_IDS |

> [!NOTE]
> Các commands chỉ hiển thị với users có role trong `DISCORD_BACKUP_ROLE_IDS`
