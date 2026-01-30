# Warehouse Manager Module API Documentation

Module quản lý thông tin các quản lý kho (Warehouse Managers), thường là users được assign role quản lý kho.

## Base URL
`/warehouse-managers`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`) và quyền tương ứng cho các thao tác.

## Endpoints

### 1. Tạo Quản Lý Kho
Tạo mới hoặc chỉ định một user làm quản lý kho.

- **URL**: `POST /warehouse-managers`
- **Auth**: Required (`warehouse-manager.create`)
- **Body**: `CreateWarehouseManagerDto`
  - `user_id`: UUID (Required) - User ID cần assign
  - `role_id`: UUID (Optional) - Role quản lý cụ thể
  - `warehouse_id`: UUID (Optional) - Kho quản lý
- **Response**: `201 Created`

### 2. Lấy Danh Sách Quản Lý
Lấy danh sách các quản lý kho với phân trang.

- **URL**: `GET /warehouse-managers`
- **Auth**: Required (`warehouse-manager.list`)
- **Query Params**:
  - `limit`: number
  - `offset`: number
  - `keywords`: string
- **Response**: `200 OK`

### 3. Lấy Chi Tiết Quản Lý
Lấy thông tin chi tiết của một quản lý kho.

- **URL**: `GET /warehouse-managers/:id`
- **Auth**: Required (`warehouse-manager.read`)
- **Params**:
  - `id`: UUID
- **Response**: `200 OK`

### 4. Cập Nhật Quản Lý
Cập nhật thông tin hoặc quyền hạn của quản lý kho.

- **URL**: `PATCH /warehouse-managers/:id`
- **Auth**: Required (`warehouse-manager.update`)
- **Body**: `UpdateWarehouseManagerDto`
- **Response**: `200 OK`

### 5. Xóa Quản Lý
Gỡ bỏ quyền quản lý kho của user (không xóa user account).

- **URL**: `DELETE /warehouse-managers/:id`
- **Auth**: Required (`warehouse-manager.delete`)
- **Response**: `200 OK`
