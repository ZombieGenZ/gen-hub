# Warehouse Visit Module API Documentation

Module quản lý lịch hẹn tham quan kho (Warehouse Visit Bookings), cho phép khách hàng đặt lịch xem kho và quản lý quy trình duyệt/hủy lịch.

## Base URL
`/warehouse-visit`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`).

## Endpoints

### 1. Tạo Lịch Hẹn
Khách hàng đặt lịch hẹn tham quan kho.

- **URL**: `POST /warehouse-visit`
- **Auth**: Required (`warehouse-visit.create`)
- **Body**: `CreateWarehouseVisitBookingDto`
  - `warehouse_template_id`: UUID (Required) - Kho muốn xem
  - `visitor_name`: string
  - `visitor_email`: string
  - `visitor_phone`: string
  - `visit_date`: DateString (YYYY-MM-DD)
  - `visit_time_start`: TimeString (HH:mm)
  - `purpose`: Enum (RENTAL_INQUIRY, etc.)
- **Response**: `201 Created`

### 2. Lấy Danh Sách Lịch Hẹn
Lấy danh sách các lịch hẹn.

- **URL**: `GET /warehouse-visit`
- **Auth**: Required (`warehouse-visit.list`)
  - Quyền `list.all`: Xem tất cả
  - Quyền `list`: Xem lịch hẹn của bản thân (nếu là user thường) hoặc được assign
- **Query Params**:
  - `page`: number
  - `limit`: number
  - `status`: Enum (PENDING, CONFIRMED, etc.)
  - `date`: string
- **Response**: `200 OK`

### 3. Lấy Chi Tiết Lịch Hẹn
Xem thông tin chi tiết một lịch hẹn.

- **URL**: `GET /warehouse-visit/:id`
- **Auth**: Required (`warehouse-visit.read`)
- **Params**:
  - `id`: UUID
- **Response**: `200 OK`

### 4. Cập Nhật Lịch Hẹn
Cập nhật trạng thái (duyệt/hủy/hoàn thành) hoặc ghi chú cho lịch hẹn.

- **URL**: `PATCH /warehouse-visit/:id`
- **Auth**: Required (`warehouse-visit.update`)
- **Body**: `UpdateWarehouseVisitBookingDto`
  - `status`: Enum
  - `cancel_reason`: string
  - `internal_notes`: string
- **Response**: `200 OK`

### 5. Đổi Lịch (Reschedule)
Thay đổi thời gian tham quan.

- **URL**: `POST /warehouse-visit/:id/reschedule`
- **Auth**: Required (`warehouse-visit.update`)
- **Body**: `RescheduleWarehouseVisitBookingDto`
  - `visit_date`: DateString
  - `visit_time_start`: TimeString
  - `visit_time_end`: TimeString
  - `reason`: string
- **Response**: `200 OK`

### 6. Xóa Lịch Hẹn
Xóa mềm lịch hẹn.

- **URL**: `DELETE /warehouse-visit/:id`
- **Auth**: Required (`warehouse-visit.delete`)
- **Response**: `200 OK`
