# Public Quotation Module API Documentation

Module cung cấp tính năng tính toán báo giá công khai cho khách hàng (không yêu cầu đăng nhập), hỗ trợ tính giá thuê kho theo diện tích (shared) hoặc nguyên kho (whole).

## Base URL
`/public-quotation`

## Authentication
Không yêu cầu xác thực (`Public`).

## Endpoints

### 1. Tính Báo Giá (Calculate Quotation)
Tính toán chi phí thuê kho dựa trên các thông số đầu vào như loại thuê, thời gian thuê, diện tích/số lượng, và các dịch vụ đi kèm.

- **URL**: `POST /public-quotation/calculate`
- **Auth**: Public
- **Body**: `CalculateQuotationDto`

#### Request Body Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `warehouse_template_id` | UUID | Yes | ID của kho mẫu cần thuê |
| `rental_type` | Enum | Yes | Loại thuê: `whole` (nguyên kho) hoặc `row` (theo dãy/shared) |
| `duration_months` | Number | Yes | Số tháng cần thuê |
| `start_date` | Date | Yes | Ngày bắt đầu thuê (YYYY-MM-DD) |
| `row_ids` | UUID[] | No | Danh sách ID dãy kho (bắt buộc nếu rental_type = `row`) |
| `selected_amenities` | UUID[] | No | Danh sách ID tiện ích bổ sung |
| `insurance_id` | UUID | No | ID gói bảo hiểm |
| `coupon_code` | String | No | Mã giảm giá |

#### Example Request
**Trường hợp 1: Thuê nguyên kho (Whole Rent)**
```json
{
  "warehouse_template_id": "550e8400-e29b-41d4-a716-446655440000",
  "rental_type": "whole",
  "duration_months": 12,
  "start_date": "2024-02-01",
  "selected_amenities": ["uuid-amenity-1", "uuid-amenity-2"],
  "insurance_id": "uuid-insurance-1",
  "coupon_code": "WELCOME2024"
}
```

**Trường hợp 2: Thuê theo dãy (Shared/Row Rent)**
```json
{
  "warehouse_template_id": "550e8400-e29b-41d4-a716-446655440001",
  "rental_type": "row",
  "duration_months": 6,
  "start_date": "2024-03-01",
  "row_ids": ["uuid-row-1", "uuid-row-2"],
  "selected_amenities": ["uuid-amenity-3"]
}
```

#### Response Parameters
- `code`: Mã phản hồi (e.g., `quotation.calculate_success`)
- `message`: Thông báo chi tiết
- `data`:
  - `warehouse_name`: Tên kho
  - `rental_type`: Loại thuê
  - `base_price_per_month`: Giá gốc hàng tháng
  - `duration_discount_percent`: % giảm giá theo thời hạn
  - `subtotal`: Tổng tiền trước thuế/phí
  - `service_fee`: Phí dịch vụ
  - `coupon_discount`: Số tiền giảm giá
  - `grand_total`: Tổng tiền thanh toán
  - `deposit_amount`: Tiền cọc yêu cầu
  - `is_warehouse_available`: Trạng thái trống của kho

#### Example Response
```json
{
  "code": "quotation.calculate_success",
  "message": "Tính báo giá thành công",
  "success": true,
  "data": {
    "warehouse_template_id": "550e8400-e29b-41d4-a716-446655440000",
    "warehouse_name": "Kho Quận 7 - A1",
    "rental_type": "whole",
    "duration_months": 12,
    "base_price_per_month": 50000000,
    "duration_discount_percent": 10,
    "subtotal": 540000000,
    "service_fee": 5000000,
    "coupon_discount": 1000000,
    "grand_total": 600000000,
    "deposit_amount": 50000000,
    "is_warehouse_available": true,
    "start_date": "2024-02-01",
    "end_date": "2025-01-31"
  }
}
```
