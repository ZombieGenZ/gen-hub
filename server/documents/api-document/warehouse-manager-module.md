# Warehouse Manager Module API Documentation

Module quản lý thông tin các quản lý kho (Warehouse Managers), thường là users được assign role quản lý kho.

## Base URL
`/warehouse-managers`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`).

## Endpoints

### 1. Phân Công Quản Lý Kho (Assign Manager)
Phân công một user làm quản lý cho một kho mẫu cụ thể với các vai trò nhất định.

- **URL**: `POST /warehouse-managers`
- **Auth**: Required (`warehouse-manager.create`)
- **Body**: `AssignWarehouseManagerDto`

#### Request Body Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | UUID | Yes | ID của user cần phân công |
| `warehouse_template_id` | UUID | Yes | ID của kho mẫu |
| `role_ids` | UUID[] | Yes | Danh sách ID vai trò quản lý (tối thiểu 1) |
| `notes` | String | No | Ghi chú thêm |

#### Example Request
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "warehouse_template_id": "550e8400-e29b-41d4-a716-446655440000",
  "role_ids": ["role-uuid-1", "role-uuid-2"],
  "notes": "Phân công quản lý ca sáng"
}
```

#### Response
- `201 Created`: Phân công thành công
- `409 Conflict`: User đã là quản lý của kho này

---

### 2. Lấy Danh Sách Quản Lý (List Managers)
Lấy danh sách các quản lý kho với phân trang và bộ lọc.

- **URL**: `GET /warehouse-managers`
- **Auth**: Required (`warehouse-manager.list`)
  - `list.all`: Xem danh sách tất cả quản lý
- **Query Params**:
  - `page`: Trang hiện tại (default: 1)
  - `limit`: Số lượng/trang (default: 10)
  - `templateId`: Lọc theo ID kho mẫu
  - `userId`: Lọc theo ID user

#### Example Response
```json
{
  "code": "warehouse_manager.list_success",
  "message": "Lấy danh sách quản lý kho thành công",
  "success": true,
  "data": {
    "items": [
      {
        "id": "manager-uuid",
        "user": { "id": "user-uuid", "full_name": "Nguyen Van A" },
        "warehouse_template": { "id": "warehouse-uuid", "name": "Kho A" },
        "roles": [...]
      }
    ],
    "meta": { "total": 1, "page": 1, "totalPages": 1 }
  }
}
```

---

### 3. Lấy Chi Tiết Quản Lý (Get Detail)
Lấy thông tin chi tiết của một quản lý kho bao gồm các vai trò được gán.

- **URL**: `GET /warehouse-managers/:id`
- **Auth**: Required (`warehouse-manager.read`)
- **Params**:
  - `id`: UUID của phân công quản lý

#### Response
- `200 OK`: Trả về chi tiết thông tin
- `404 Not Found`: Không tìm thấy

---

### 4. Cập Nhật Thông Tin (Update Manager)
Cập nhật thông tin quản lý kho (SĐT, ghi chú, vai trò).

- **URL**: `PATCH /warehouse-managers/:id`
- **Auth**: Required (`warehouse-manager.update`)
- **Body**: `UpdateWarehouseManagerDto`
  - `role_ids`: UUID[] (Updated list of roles)
  - `notes`: string
  - `is_active`: boolean

#### Example Request
```json
{
  "notes": "Cập nhật ghi chú mới",
  "role_ids": ["new-role-uuid-1"]
}
```

#### Response
- `200 OK`: Cập nhật thành công

---

### 5. Xóa/Hủy Phân Công (Remove Manager)
Hủy phân công quản lý kho của user.

- **URL**: `DELETE /warehouse-managers/:id`
- **Auth**: Required (`warehouse-manager.delete`)
- **Response**: `200 OK`
