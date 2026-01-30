# Warehouse Template Module API Documentation

Module quản lý các mẫu kho hàng (Warehouse Templates), bao gồm thông tin cơ bản, cấu trúc layout (Rows, Racks, Shelves, Blocks), hình ảnh, và các cấu hình liên quan (giá, tiện ích, cấu hình giảm giá...).

## Base URL
`/warehouse-templates`

## Authentication
Hầu hết các endpoints yêu cầu xác thực JWT (`Bearer Token`).

## Endpoints

### 1. Tạo mới Template Kho Hàng
Tạo một template kho hàng mới với đầy đủ thông tin.

- **URL**: `POST /warehouse-templates`
- **Auth**: Required (`warehouse-template.create`)
- **Body**: `CreateWarehouseTemplateDto`
  - `name`: string (Required)
  - `length`: number (Required) - Chiều dài (m)
  - `width`: number (Required) - Chiều rộng (m)
  - `price_per_month`: number (Required) - Giá thuê/tháng
  - `block_length`: number (Required) - Chiều dài ô chuẩn
  - `block_width`: number (Required) - Chiều rộng ô chuẩn
  - `is_cold_storage`: boolean - Là kho lạnh?
  - `is_shared_warehouse`: boolean - Là kho chia sẻ?
  - `discount_configs`: array - Cấu hình giảm giá
  - `amenity_ids`: array - Danh sách tiện ích
- **Response**: `201 Created`

### 2. Lấy Danh Sách Template
Lấy danh sách template có phân trang và lọc.

- **URL**: `GET /warehouse-templates`
- **Auth**: Optional (Public)
  - Nếu có quyền `warehouse-template.list.all`: xem được cả kho không active/locked.
  - Nếu không: chỉ xem được kho `is_active=true`.
- **Query Params**:
  - `limit`: number
  - `offset`: number
  - `keywords`: string
  - `is_active`: boolean
  - `rental_status`: string
  - `province_id`: string
- **Response**: `200 OK`

### 3. Lấy Chi Tiết Template
Lấy thông tin chi tiết của một template, bao gồm cả layout và cấu hình.

- **URL**: `GET /warehouse-templates/:id`
- **Auth**: Optional (Public)
- **Params**:
  - `id`: UUID
- **Response**: `200 OK`

### 4. Cập Nhật Mốc Template
Cập nhật thông tin cơ bản, cấu hình giảm giá, tiện ích, quà tặng...

- **URL**: `PUT /warehouse-templates/:id`
- **Auth**: Required (`warehouse-template.update`)
- **Params**:
  - `id`: UUID
- **Body**: `UpdateWarehouseTemplateDto` (Partial of Create)
- **Response**: `200 OK`

### 5. Xóa Template
Xóa mềm (Soft delete) một template.

- **URL**: `DELETE /warehouse-templates/:id`
- **Auth**: Required (`warehouse-template.delete`)
- **Params**:
  - `id`: UUID
- **Response**: `200 OK`

### 6. Xóa Nhiều Template
Xóa mềm nhiều template cùng lúc.

- **URL**: `DELETE /warehouse-templates/delete/many`
- **Auth**: Required (`warehouse-template.delete`)
- **Body**: `DeleteManyDto`
  - `ids`: string[]
- **Response**: `200 OK`

### 7. Cập Nhật Layout (Upsert)
Cập nhật toàn bộ cấu trúc kho (Rows -> Racks -> Shelves -> Blocks). Hỗ trợ thêm mới, cập nhật hoặc xóa các phần tử con.

- **URL**: `PUT /warehouse-templates/:id/layout`
- **Auth**: Required (`warehouse-template.design`)
- **Params**:
  - `id`: UUID
- **Body**: `UpsertLayoutDto`
  - `rows`: Array of Row Layout
- **Response**: `200 OK`

### 8. Upload Ảnh
Upload nhiều ảnh cho template.

- **URL**: `POST /warehouse-templates/:id/images`
- **Auth**: Required (`warehouse-template.update`)
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `images`: File[]
- **Response**: `201 Created`

### 9. Lấy Danh Sách Ảnh
Lấy danh sách ảnh của template.

- **URL**: `GET /warehouse-templates/:id/images`
- **Auth**: Optional (Public)
- **Response**: `200 OK`

### 10. Xóa Ảnh
Xóa một ảnh cụ thể.

- **URL**: `DELETE /warehouse-templates/:id/images/:imageId`
- **Auth**: Required (`warehouse-template.update`)
- **Response**: `200 OK`

### 11. Xóa Nhiều Ảnh
Xóa nhiều ảnh cùng lúc.

- **URL**: `DELETE /warehouse-templates/:id/images/delete/many`
- **Auth**: Required (`warehouse-template.update`)
- **Body**: `DeleteManyDto`
- **Response**: `200 OK`

### 12. Sắp Xếp Ảnh
Sắp xếp lại thứ tự hiển thị của ảnh.

- **URL**: `PUT /warehouse-templates/:id/images/reorder`
- **Auth**: Required (`warehouse-template.update`)
- **Body**:
  - `images`: Array of { id: string, order: number }
- **Response**: `200 OK`
