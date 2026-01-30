# Shelf Template Module API Documentation

Module quản lý các tầng (Shelves) thuộc một kệ (Rack). Tầng chứa các ô (Blocks).

## Base URL
`/warehouse-templates/:warehouseTemplateId/rows/:rowId/racks/:rackId/shelves`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`).

## Endpoints

### 1. Tạo Tầng Mới
Tạo một tầng mới trong kệ.

- **URL**: `POST /`
- **Auth**: Required (`shelf-template.create`)
- **Body**: `CreateShelfTemplateDto`
  - `name`: string (Required)
  - `code`: string (Required, Unique within rack)
  - `height`: number (Required)
- **Response**: `201 Created`

### 2. Lấy Danh Sách Tầng
Lấy danh sách các tầng trong kệ.

- **URL**: `GET /`
- **Auth**: Required (`shelf-template.list`)
- **Query Params**:
  - `limit`: number
  - `offset`: number
  - `keywords`: string
- **Response**: `200 OK`

### 3. Lấy Chi Tiết Tầng
Xem chi tiết một tầng.

- **URL**: `GET /:id`
- **Auth**: Required (`shelf-template.read`)
- **Params**:
  - `id`: UUID
- **Response**: `200 OK`

### 4. Cập Nhật Tầng
Cập nhật thông tin tầng.

- **URL**: `PUT /:id`
- **Auth**: Required (`shelf-template.update`)
- **Body**: `UpdateShelfTemplateDto`
- **Response**: `200 OK`

### 5. Xóa Tầng
Xóa mềm một tầng.

- **URL**: `DELETE /:id`
- **Auth**: Required (`shelf-template.delete`)
- **Response**: `200 OK`

### 6. Xóa Nhiều Tầng
Xóa nhiều tầng cùng lúc.

- **URL**: `DELETE /delete/many`
- **Auth**: Required (`shelf-template.delete`)
- **Body**: `DeleteManyDto`
- **Response**: `200 OK`
