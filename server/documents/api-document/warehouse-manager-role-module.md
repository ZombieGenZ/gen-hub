# Warehouse Manager Role Module API Documentation

Module quản lý các vai trò (Roles) dành riêng cho quản lý kho, định nghĩa các quyền hạn cụ thể mà một quản lý kho có thể thực hiện (Ví dụ: Trưởng kho, Quản lý nhập hàng, Quản lý xuất hàng).

## Base URL
`/warehouse-manager-roles`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`) và quyền tương ứng.

## Endpoints

### 1. Tạo Vai Trò Mới (Create Role)
Tạo mới một vai trò quản lý kho với danh sách các quyền hạn cụ thể.

- **URL**: `POST /warehouse-manager-roles`
- **Auth**: Required (`warehouse-manager-role.create`)
- **Body**: `CreateWarehouseManagerRoleDto`

#### Request Body Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Yes | Tên vai trò (Unique) |
| `description` | String | No | Mô tả chi tiết vai trò |
| `permission_ids` | UUID[] | Yes | Danh sách ID quyền hạn gán cho vai trò |

#### Example Request
```json
{
  "name": "Quản Lý Nhập Kho",
  "description": "Chỉ có quyền nhập hàng và xem danh sách hàng hóa",
  "permission_ids": ["perm-uuid-1", "perm-uuid-2"]
}
```

#### Response
- `201 Created`: Tạo thành công
- `409 Conflict`: Tên vai trò đã tồn tại

---

### 2. Lấy Danh Sách Vai Trò (List Roles)
Lấy danh sách các vai trò quản lý kho với phân trang và tìm kiếm.

- **URL**: `GET /warehouse-manager-roles`
- **Auth**: Required (`warehouse-manager-role.list`)
- **Query Params**:
  - `page`: default 1
  - `limit`: default 10
  - `search`: Tìm kiếm theo tên hoặc mô tả

#### Example Response
```json
{
  "code": "warehouse_manager_role.list_success",
  "success": true,
  "data": {
    "items": [
      {
        "id": "role-uuid",
        "name": "Trưởng Kho",
        "permissions": [{ "code": "warehouse.create" }, ...]
      }
    ],
    "meta": { "total": 5, "page": 1, "totalPages": 1 }
  }
}
```

---

### 3. Lấy Danh Sách Quyền Hạn (List Permissions)
Lấy danh sách tất cả các permissions có trong hệ thống dành cho module kho.

- **URL**: `GET /warehouse-manager-roles/permissions`
- **Auth**: Required (`warehouse-manager-role.list`)
- **Response**: List of available permissions

---

### 4. Lấy Chi Tiết Vai Trò (Get Detail)
Lấy thông tin chi tiết của một vai trò và danh sách quyền hạn đã gán.

- **URL**: `GET /warehouse-manager-roles/:id`
- **Auth**: Required (`warehouse-manager-role.read`)
- **Params**:
  - `id`: UUID

---

### 5. Cập Nhật Vai Trò (Update Role)
Cập nhật tên, mô tả hoặc danh sách quyền của vai trò.

- **URL**: `PATCH /warehouse-manager-roles/:id`
- **Auth**: Required (`warehouse-manager-role.update`)
- **Body**: `UpdateWarehouseManagerRoleDto`

#### Example Request
```json
{
  "name": "Quản Lý Kho A (Updated)",
  "permission_ids": ["new-perm-uuid-1"]
}
```

---

### 6. Xóa Vai Trò (Delete Role)
Xóa vai trò khỏi hệ thống.
*Lưu ý: Không thể xóa vai trò đang được gán cho user.*

- **URL**: `DELETE /warehouse-manager-roles/:id`
- **Auth**: Required (`warehouse-manager-role.delete`)
- **Response**: 
  - `200 OK`: Xóa thành công
  - `409 Conflict`: Vai trò đang được sử dụng
