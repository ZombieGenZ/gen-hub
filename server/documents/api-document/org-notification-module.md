# Organization Notification Module Documentation

## Tổng Quan

Module `org-notification` quản lý thông báo nội bộ của tổ chức trong hệ thống GEN-HUB. Cho phép tạo, quản lý và phân phối thông báo cho thành viên tổ chức hoặc cho từng kho hàng cụ thể.

---

## API Endpoints

> [!TIP]
> Hỗ trợ xác thực qua JWT hoặc API Key (header `X-API-Key`).

### 1. POST /organizations/:orgId/notifications - Tạo thông báo

**Quyền:** `organization.notification.create`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Tiêu đề thông báo (max 255 ký tự) |
| `content` | string | Yes | Nội dung thông báo |
| `type` | enum | No | Loại: `INFO`, `SUCCESS`, `WARNING`, `ERROR` |
| `warehouse_id` | UUID | No | ID kho hàng (nếu thông báo cho kho cụ thể) |
| `is_active` | boolean | No | Trạng thái hoạt động (default: true) |

**Examples:**

```json
{
  "title": "Thông báo cập nhật hệ thống",
  "content": "Hệ thống sẽ bảo trì vào ngày 10/02/2026.",
  "type": "INFO",
  "is_active": true
}
```

**Response (201):**
```json
{
  "code": "org-notification.create.success",
  "message": "Tạo thông báo thành công",
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "organization_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Thông báo cập nhật hệ thống",
    "content": "Hệ thống sẽ bảo trì vào ngày 10/02/2026.",
    "type": "INFO",
    "is_active": true,
    "created_at": "2026-02-07T10:00:00.000Z"
  }
}
```

---

### 2. GET /organizations/:orgId/notifications - Danh sách thông báo

**Quyền:** `organization.notification.list`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Số lượng record |
| `offset` | number | 0 | Vị trí bắt đầu |
| `keywords` | string | - | Tìm kiếm trong tiêu đề/nội dung |
| `type` | enum | - | Lọc theo loại thông báo |
| `is_active` | boolean | - | Lọc theo trạng thái |
| `warehouse_id` | UUID | - | Lọc theo kho hàng |

**Response (200):**
```json
{
  "code": "org-notification.list.success",
  "success": true,
  "data": {
    "items": [...],
    "total": 50,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### 3. GET /organizations/:orgId/notifications/:id - Chi tiết thông báo

**Quyền:** `organization.notification.read`

---

### 4. PUT /organizations/:orgId/notifications/:id - Cập nhật thông báo

**Quyền:** `organization.notification.update`

**Request Body:** Partial update - chỉ gửi các trường cần cập nhật.

---

### 5. DELETE /organizations/:orgId/notifications/:id - Xóa thông báo

**Quyền:** `organization.notification.delete`

---

### 6. DELETE /organizations/:orgId/notifications/delete/many - Xóa nhiều thông báo

**Quyền:** `organization.notification.delete`

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

## Notification Types

| Type | Description | Use Case |
|------|-------------|----------|
| `INFO` | Thông tin chung | Cập nhật hệ thống, tin tức |
| `SUCCESS` | Thành công | Hoàn thành đơn hàng, thanh toán |
| `WARNING` | Cảnh báo | Hạn thanh toán, cảnh báo tồn kho |
| `ERROR` | Lỗi | Giao dịch thất bại, lỗi hệ thống |

---

## Files Trong Module

| File | Mô tả |
|------|-------|
| `org-notification.controller.ts` | API endpoints |
| `org-notification.service.ts` | Business logic |
| `org-notification.repository.ts` | Data access layer |
| `dto/*.ts` | Data transfer objects |
| `interfaces/*.ts` | TypeScript interfaces |
