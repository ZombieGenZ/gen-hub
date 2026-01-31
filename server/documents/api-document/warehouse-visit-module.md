# Warehouse Visit Module API Documentation

Module quản lý lịch hẹn tham quan kho (Warehouse Visit Bookings), cho phép khách hàng đặt lịch xem kho và quản lý quy trình duyệt/hủy/đổi lịch.

## Base URL
`/warehouse-visit`

## Authentication
Yêu cầu xác thực JWT (`Bearer Token`).

## Endpoints

### 1. Tạo Lịch Hẹn (Create Booking)
Khách hàng tạo yêu cầu đặt lịch hẹn tham quan kho.

- **URL**: `POST /warehouse-visit`
- **Auth**: Required (`warehouse-visit.create`)
- **Body**: `CreateWarehouseVisitBookingDto`

#### Request Body Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `warehouse_template_id` | UUID | Yes | ID kho mẫu muốn tham quan |
| `visitor_name` | String | Yes | Tên người liên hệ |
| `visitor_email` | String | Yes | Email liên hệ |
| `visitor_phone` | String | Yes | SĐT liên hệ |
| `visit_date` | Date | Yes | Ngày tham quan (YYYY-MM-DD) |
| `visit_time_start` | Time | Yes | Giờ bắt đầu (HH:mm) |
| `visit_time_end` | Time | Yes | Giờ kết thúc (HH:mm) |
| `purpose` | Enum | No | Mục đích (`RENTAL_INQUIRY`, `INSPECTION`, ...) |
| `number_of_visitors`| Number | No | Số lượng người tham quan |

#### Example Request
```json
{
  "warehouse_template_id": "550e8400-e29b-41d4-a716-446655440000",
  "visitor_name": "Nguyen Van Khach",
  "visit_date": "2024-02-20",
  "visit_time_start": "09:00",
  "visit_time_end": "10:30"
}
```

---

### 2. Lấy Danh Sách Lịch Hẹn (List Bookings)
Lấy danh sách các lịch hẹn với bộ lọc ngày và trạng thái.

- **URL**: `GET /warehouse-visit`
- **Auth**: Required (`warehouse-visit.list`)
  - `list` (User): Xem lịch của chính mình
  - `list.all` (Admin): Xem tất cả lịch
- **Query Params**:
  - `page`, `limit`
  - `status`: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`
  - `date`: YYYY-MM-DD

---

### 3. Lấy Chi Tiết Lịch Hẹn (Get Detail)
Xem thông tin chi tiết và lịch sử thay đổi của buổi hẹn.

- **URL**: `GET /warehouse-visit/:id`
- **Auth**: Required (`warehouse-visit.read`)
- **Params**: `id` (UUID)

---

### 4. Cập Nhật Trạng Thái (Update Status)
Duyệt, từ chối, hoặc hoàn thành lịch hẹn.

- **URL**: `PATCH /warehouse-visit/:id`
- **Auth**: Required (`warehouse-visit.update`)
- **Body**: `UpdateWarehouseVisitBookingDto`
  - `status`: `CONFIRMED` | `CANCELLED` | `COMPLETED`
  - `confirmation_notes`: Ghi chú xác nhận
  - `cancel_reason`: Lý do hủy
  - `visitor_feedback`: Ý kiến khách hàng (khi hoàn thành)

#### Example Request
```json
{
  "status": "CONFIRMED",
  "confirmation_notes": "Đã gọi điện xác nhận khách hàng đến đúng giờ"
}
```

---

### 5. Đổi Lịch (Reschedule)
Thay đổi thời gian của lịch hẹn đã tạo.

- **URL**: `POST /warehouse-visit/:id/reschedule`
- **Auth**: Required (`warehouse-visit.update`)
- **Body**: `RescheduleWarehouseVisitBookingDto`

#### Request Body Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `visit_date` | Date | Yes | Ngày mới (YYYY-MM-DD) |
| `visit_time_start` | Time | Yes | Giờ bắt đầu mới |
| `visit_time_end` | Time | Yes | Giờ kết thúc mới |
| `reason` | String | No | Lý do đổi lịch |

#### Example Request
```json
{
  "visit_date": "2024-02-25",
  "visit_time_start": "14:00",
  "visit_time_end": "15:30",
  "reason": "Khách bận đột xuất công việc"
}
```

---

### 6. Xóa Lịch Hẹn (Delete)
Xóa mềm lịch hẹn khỏi hệ thống.

- **URL**: `DELETE /warehouse-visit/:id`
- **Auth**: Required (`warehouse-visit.delete`)
- **Response**: `200 OK`
