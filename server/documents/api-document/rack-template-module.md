# Rack Template Module API Documentation

Module quản lý các kệ (Racks) thuộc một dãy (Row). Kệ chứa các tầng (Shelves).

## Base URL
`/warehouse-templates/:warehouseTemplateId/rows/:rowId/racks`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`).

## Endpoints

### 1. Tạo Kệ Mới
Tạo một kệ mới trong dãy.

- **URL**: `POST /`
- **Auth**: Required (`rack-template.create`)
- **Body**: `CreateRackTemplateDto`
  - `name`: string (Required)
  - `code`: string (Required, Unique within row)
  - `dimensions_width`: number
  - `dimensions_height`: number
  - `position_x`: number
  - `position_y`: number
  - `default_block_max_weight_capacity`: number
- **Response**: `201 Created`

### 2. Lấy Danh Sách Kệ
Lấy danh sách các kệ trong dãy.

- **URL**: `GET /`
- **Auth**: Required (`rack-template.list`)
- **Query Params**:
  - `limit`: number
  - `offset`: number
  - `keywords`: string
- **Response**: `200 OK`

### 3. Lấy Chi Tiết Kệ
Xem chi tiết một kệ.

- **URL**: `GET /:id`
- **Auth**: Required (`rack-template.read`)
- **Params**:
  - `id`: UUID
- **Response**: `200 OK`

### 4. Cập Nhật Kệ
Cập nhật thông tin kệ.

- **URL**: `PUT /:id`
- **Auth**: Required (`rack-template.update`)
- **Body**: `UpdateRackTemplateDto`
- **Response**: `200 OK`

### 5. Xóa Kệ
Xóa mềm một kệ.

- **URL**: `DELETE /:id`
- **Auth**: Required (`rack-template.delete`)
- **Response**: `200 OK`

### 6. Xóa Nhiều Kệ
Xóa nhiều kệ cùng lúc.

- **URL**: `DELETE /delete/many`
- **Auth**: Required (`rack-template.delete`)
- **Body**: `DeleteManyDto`
- **Response**: `200 OK`
