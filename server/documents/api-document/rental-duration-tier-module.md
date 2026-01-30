# Rental Duration Tier Module API Documentation

Module cấu hình các mốc thời gian thuê (Duration Tiers), dùng để định nghĩa các gói thuê (ví dụ: 1 tháng, 6 tháng, 1 năm) và các ưu đãi đi kèm.

## Base URL
`/rental-duration-tiers`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`).

## Endpoints

### 1. Tạo Mốc Thời Gian
Tạo mới một mốc thời gian thuê.

- **URL**: `POST /rental-duration-tiers`
- **Auth**: Required (`rental-duration-tier.create`)
- **Body**: `CreateRentalDurationTierDto`
  - `name`: string (Required)
  - `duration_value`: number (Required)
  - `duration_unit`: Enum (MONTH, YEAR)
  - `addon_gifts`: array - Quà tặng addon
  - `insurance_gifts`: array - Quà tặng bảo hiểm
- **Response**: `201 Created`

### 2. Lấy Danh Sách (Quản trị)
Lấy danh sách tất cả mốc thời gian (có phân trang, filter).

- **URL**: `GET /rental-duration-tiers`
- **Auth**: Required (`rental-duration-tier.list`)
- **Query Params**:
  - `limit`: number
  - `offset`: number
  - `is_active`: boolean
- **Response**: `200 OK`

### 3. Lấy Danh Sách Active (Public/Dropdown)
Lấy danh sách các mốc đang hoạt động để hiển thị lên UI hoặc dropdown.

- **URL**: `GET /rental-duration-tiers/active`
- **Auth**: Authenticated User
- **Response**: `200 OK`

### 4. Lấy Chi Tiết
Xem chi tiết một mốc thời gian.

- **URL**: `GET /rental-duration-tiers/:id`
- **Auth**: Required (`rental-duration-tier.read`)
- **Response**: `200 OK`

### 5. Cập Nhật Mốc Thời Gian
Cập nhật thông tin mốc thời gian.

- **URL**: `PUT /rental-duration-tiers/:id`
- **Auth**: Required (`rental-duration-tier.update`)
- **Body**: `UpdateRentalDurationTierDto` (Partial)
- **Response**: `200 OK`

### 6. Xóa Mốc Thời Gian
Xóa mềm một mốc thời gian.

- **URL**: `DELETE /rental-duration-tiers/:id`
- **Auth**: Required (`rental-duration-tier.delete`)
- **Response**: `200 OK`

### 7. Xóa Nhiều Mốc Thời Gian
Xóa nhiều mốc cùng lúc.

- **URL**: `DELETE /rental-duration-tiers/delete/many`
- **Auth**: Required (`rental-duration-tier.delete`)
- **Body**: `DeleteManyDto`
- **Response**: `200 OK`
