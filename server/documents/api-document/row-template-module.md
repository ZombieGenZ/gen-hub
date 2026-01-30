# Row Template Module API Documentation

Module quản lý các dãy (Rows) trong một template kho hàng. Dãy là cấp độ lớn nhất trong cấu trúc layout của kho.

## Base URL
`/warehouse-templates/:warehouseTemplateId/rows`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`).

## Endpoints

### 1. Tạo Dãy Mới
Tạo một dãy mới trong template.

- **URL**: `POST /`
- **Auth**: Required (`row-template.create`)
- **Body**: `CreateRowTemplateDto`
  - `name`: string (Required)
  - `code`: string (Required, Unique within template)
  - `price_per_month`: number (Required)
  - `position_x`: number
  - `position_y`: number
  - `discount_configs`: array
- **Response**: `201 Created`

### 2. Lấy Danh Sách Dãy
Lấy danh sách các dãy trong template.

- **URL**: `GET /`
- **Auth**: Required (`row-template.list`)
- **Query Params**:
  - `limit`: number
  - `offset`: number
  - `keywords`: string
  - `is_active`: boolean
- **Response**: `200 OK`

### 3. Lấy Chi Tiết Dãy
Xem chi tiết một dãy, bao gồm cấu hình giảm giá và quà tặng.

- **URL**: `GET /:id`
- **Auth**: Required (`row-template.read`)
- **Params**:
  - `id`: UUID
- **Response**: `200 OK`

### 4. Cập Nhật Dãy
Cập nhật thông tin dãy.

- **URL**: `PUT /:id`
- **Auth**: Required (`row-template.update`)
- **Body**: `UpdateRowTemplateDto`
- **Response**: `200 OK`

### 5. Xóa Dãy
Xóa mềm một dãy.

- **URL**: `DELETE /:id`
- **Auth**: Required (`row-template.delete`)
- **Response**: `200 OK`

### 6. Xóa Nhiều Dãy
Xóa nhiều dãy cùng lúc.

- **URL**: `DELETE /delete/many`
- **Auth**: Required (`row-template.delete`)
- **Body**: `DeleteManyDto`
- **Response**: `200 OK`
