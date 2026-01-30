# Block Template Module API Documentation

Module quản lý các ô (Blocks) thuộc một tầng (Shelf). Ô là đơn vị nhỏ nhất để chứa hàng hóa.

## Base URL
`/warehouse-templates/:warehouseTemplateId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`).

## Endpoints

### 1. Tạo Ô Mới
Tạo một ô mới trong tầng.

- **URL**: `POST /`
- **Auth**: Required (`block-template.create`)
- **Body**: `CreateBlockTemplateDto`
  - `name`: string (Required)
  - `code`: string (Required, Unique within shelf)
  - `max_weight_capacity`: number (Required)
  - `height`: number (Required)
  - `position_x`: number
  - `position_y`: number
- **Response**: `201 Created`

### 2. Lấy Danh Sách Ô
Lấy danh sách các ô trong tầng.

- **URL**: `GET /`
- **Auth**: Required (`block-template.list`)
- **Query Params**:
  - `limit`: number
  - `offset`: number
  - `keywords`: string
- **Response**: `200 OK`

### 3. Lấy Chi Tiết Ô
Xem chi tiết một ô.

- **URL**: `GET /:id`
- **Auth**: Required (`block-template.read`)
- **Params**:
  - `id`: UUID
- **Response**: `200 OK`

### 4. Cập Nhật Ô
Cập nhật thông tin ô.

- **URL**: `PUT /:id`
- **Auth**: Required (`block-template.update`)
- **Body**: `UpdateBlockTemplateDto`
- **Response**: `200 OK`

### 5. Xóa Ô
Xóa mềm một ô.

- **URL**: `DELETE /:id`
- **Auth**: Required (`block-template.delete`)
- **Response**: `200 OK`

### 6. Xóa Nhiều Ô
Xóa nhiều ô cùng lúc.

- **URL**: `DELETE /delete/many`
- **Auth**: Required (`block-template.delete`)
- **Body**: `DeleteManyDto`
- **Response**: `200 OK`
