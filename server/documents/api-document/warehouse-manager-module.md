# Warehouse Manager Module Documentation

## Tổng Quan

Module `warehouse-manager` quản lý việc phân công các user quản lý các kho mẫu (Warehouse Template). Module này cho phép gán quyền quản lý, cập nhật thông tin và thu hồi quyền quản lý của user đối với một kho cụ thể.

---

## API Endpoints

> [!TIP]
> Tất cả các API đều hỗ trợ header `Accept-Language` để chọn ngôn ngữ phản hồi.
> - **vi** - Tiếng Việt (mặc định)
> - **en** - English

### 1. POST /warehouse-managers/assign - Phân công quản lý kho

**Mô tả:** Phân công một user làm quản lý cho một kho mẫu cụ thể với các vai trò nhất định.

**Quyền yêu cầu:** `warehouse-manager.create`

**Request Body Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `warehouse_template_id` | string (UUID) | Yes | ID của kho mẫu |
| `user_id` | string (UUID) | Yes | ID của user được phân công |
| `phone` | string | Optional | Số điện thoại liên hệ |
| `notes` | string | Optional | Ghi chú |
| `role_ids` | string[] (UUID) | Optional | Danh sách ID vai trò được gán |

**Response (201 Created):**

```json
{
  "code": "warehouse_manager.assign_success",
  "message": "Phân công quản lý thành công",
  "success": true,
  "data": {
    "id": "b2f76b83-ce55-49bc-955c-4ddf49bc955c",
    "warehouse_template_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "phone": "0901234567",
    "notes": "Quản lý kho chính",
    "status": "ACTIVE"
  }
}
```

---

### 2. GET /warehouse-managers - Lấy danh sách quản lý kho

**Mô tả:** Lấy danh sách các quản lý kho có phân trang. Có thể lọc theo kho mẫu hoặc userId.

**Quyền yêu cầu:** `warehouse-manager.list` hoặc `warehouse-manager.list.all`

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `templateId` | string (UUID) | Lọc theo ID kho mẫu |
| `userId` | string (UUID) | Lọc theo ID user |
| `page` | number | Trang hiện tại (mặc định: 1) |
| `limit` | number | Số lượng record mỗi trang (mặc định: 10) |

**Response (200 OK):**

```json
{
  "code": "warehouse_manager.list_success",
  "message": "Lấy danh sách quản lý kho thành công",
  "success": true,
  "data": {
    "items": [
      {
        "id": "b2f76b83-ce55-49bc-955c-4ddf49bc955c",
        "user": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "full_name": "Nguyễn Văn A"
        },
        "warehouse_template": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "Kho Tổng K1"
        },
        "roles": []
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 3. GET /warehouse-managers/:id - Lấy chi tiết quản lý kho

**Mô tả:** Lấy thông tin chi tiết của một quản lý kho bao gồm các vai trò được gán.

**Quyền yêu cầu:** `warehouse-manager.read` hoặc `warehouse-manager.read.all`

**Response (200 OK):**

```json
{
  "code": "warehouse_manager.get_success",
  "message": "Lấy thông tin quản lý kho thành công",
  "success": true,
  "data": {
    "id": "b2f76b83-ce55-49bc-955c-4ddf49bc955c",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "warehouse_template_id": "550e8400-e29b-41d4-a716-446655440000",
    "phone": "0901234567",
    "notes": "Quản lý kho chính",
    "roles": []
  }
}
```

---

### 4. PATCH /warehouse-managers/:id - Cập nhật thông tin quản lý kho

**Mô tả:** Cập nhật thông tin quản lý kho (SĐT, ghi chú, vai trò).

**Quyền yêu cầu:** `warehouse-manager.update` hoặc `warehouse-manager.update.all`

**Request Body Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Optional | Số điện thoại liên hệ |
| `notes` | string | Optional | Ghi chú |
| `role_ids` | string[] (UUID) | Optional | Danh sách ID vai trò mới (thay thế danh sách cũ) |

**Response (200 OK):**

```json
{
  "code": "warehouse_manager.update_success",
  "message": "Cập nhật thông tin quản lý kho thành công",
  "success": true,
  "data": {}
}
```

---

### 5. DELETE /warehouse-managers/:id - Xóa phân công quản lý kho

**Mô tả:** Xóa phân công quản lý khỏi kho (Soft delete).

**Quyền yêu cầu:** `warehouse-manager.delete` hoặc `warehouse-manager.delete.all`

**Response (200 OK):**

```json
{
  "code": "warehouse_manager.delete_success",
  "message": "Xóa quản lý kho thành công",
  "success": true,
  "data": null
}
```
