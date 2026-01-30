# Warehouse Manager Role Module API Documentation

Module quản lý các vai trò (Roles) dành riêng cho quản lý kho, định nghĩa các quyền hạn cụ thể mà một quản lý kho có thể thực hiện.

## Base URL
`/warehouse-manager-roles`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`) và quyền tương ứng.

## Endpoints

### 1. Tạo Vai Trò Mới
Tạo một Role mới cho quản lý kho.

- **URL**: `POST /warehouse-manager-roles`
- **Auth**: Required (`warehouse-manager-role.create`)
- **Body**: `CreateWarehouseManagerRoleDto`
  - `name`: string (Required)
  - `description`: string
  - `permission_ids`: string[] - Danh sách quyền
- **Response**: `201 Created`

### 2. Lấy Danh Sách Vai Trò
Lấy danh sách các vai trò quản lý kho khả dụng.

- **URL**: `GET /warehouse-manager-roles`
- **Auth**: Required (`warehouse-manager-role.list`)
- **Query Params**:
  - `limit`: number
  - `offset`: number
  - `search`: string
- **Response**: `200 OK`

### 3. Lấy Danh Sách Quyền Hạn
Lấy danh sách tất cả các permissions có thể gán cho vai trò quản lý kho.

- **URL**: `GET /warehouse-manager-roles/permissions`
- **Auth**: Required (`warehouse-manager-role.list`)
- **Response**: `200 OK`

### 4. Lấy Chi Tiết Vai Trò
Lấy thông tin chi tiết của một vai trò, bao gồm các quyền đã gán.

- **URL**: `GET /warehouse-manager-roles/:id`
- **Auth**: Required (`warehouse-manager-role.read`)
- **Params**:
  - `id`: UUID
- **Response**: `200 OK`

### 5. Cập Nhật Vai Trò
Cập nhật tên, mô tả hoặc danh sách quyền của vai trò.

- **URL**: `PATCH /warehouse-manager-roles/:id`
- **Auth**: Required (`warehouse-manager-role.update`)
- **Body**: `UpdateWarehouseManagerRoleDto`
- **Response**: `200 OK`

### 6. Xóa Vai Trò
Xóa một vai trò (nếu chưa được gán cho ai).

- **URL**: `DELETE /warehouse-manager-roles/:id`
- **Auth**: Required (`warehouse-manager-role.delete`)
- **Response**: `200 OK`
