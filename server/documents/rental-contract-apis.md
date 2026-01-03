# 📄 Tài liệu API Rental Contract

Tài liệu chi tiết cho 3 API: Tạo hợp đồng (Admin & Org) và Gia hạn hợp đồng.

---

## 1. Admin Create Rental Contract

**Method:** `POST`
**Endpoint:** `/rental-contracts`
**Mô tả:** API dành cho Admin tạo hợp đồng thuê kho mới cho một tổ chức. Hỗ trợ 2 hình thức thanh toán: `TRANSFER` (Tạo đơn hàng chờ thanh toán) hoặc `CASH` (Thanh toán tiền mặt, kích hoạt ngay).

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "multipart/form-data"
}
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `organization_id` | UUID | Yes | ID của tổ chức được thuê | `550e8400...` |
| `duration_tier_id` | UUID | Yes | ID gói thời gian thuê | `550e8400...` |
| `type` | Enum | Yes | Loại thanh toán: `TRANSFER` hoặc `CASH` | `TRANSFER` |
| `payment_method` | Enum | No | Phương thức thanh toán chi tiết | `TRANSFER` |
| `notes` | String | No | Ghi chú hợp đồng | `Hợp đồng Q1` |
| `auto_renew` | Boolean | No | Tự động gia hạn | `false` |
| `scheduled_start_at` | DateTime | No | Ngày bắt đầu thuê dự kiến | `2025-01-10T00:00:00Z` |
| `addon_ids` | UUID[] | No | Danh sách ID dịch vụ đi kèm | `['id1', 'id2']` |
| `insurance_ids` | UUID[] | No | Danh sách ID bảo hiểm | `['id3']` |
| `coupon_codes` | String[] | No | Danh sách mã giảm giá | `['SUMMER2025']` |
| `signature` | File | No | File ảnh chữ ký của người đại diện | `(Binary File)` |
| `templates` | Object[] | Yes | Danh sách kho/khu vực thuê | *(Xem cấu trúc JSON)* |

**Ví dụ cấu trúc Template (lồng trong form-data):**
Trong `multipart/form-data`, mảng object thường được gửi dưới dạng `templates[0][template_id]`, `templates[0][warehouse_name]`, v.v.

**JSON Body Representation (Mô phỏng):**
```json
{
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "duration_tier_id": "550e8400-e29b-41d4-a716-446655440005",
  "type": "TRANSFER",
  "payment_method": "TRANSFER",
  "notes": "Hợp đồng thuê kho A",
  "auto_renew": false,
  "addon_ids": ["550e8400-e29b-41d4-a716-446655440003"],
  "insurance_ids": [],
  "coupon_codes": ["WELCOME10"],
  "templates": [
    {
      "template_id": "550e8400-e29b-41d4-a716-446655440000",
      "warehouse_name": "Kho A1 - Thực phẩm",
      "warehouse_description": "Kho lạnh",
      "contents_description": "Lưu trữ thực phẩm đông lạnh",
      "row_template_ids": [] 
    }
  ]
}
```

---

## 2. Organization Create Rental Contract

**Method:** `POST`
**Endpoint:** `/organizations/{orgId}/rental-contracts`
**Mô tả:** API dành cho thành viên của tổ chức (có quyền) tự tạo hợp đồng thuê kho mới.

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "multipart/form-data"
}
```

**URL Parameters:**
*   `orgId`: ID của tổ chức (UUID)

**Request Body (multipart/form-data):**
(Tương tự Admin nhưng KHÔNG có `organization_id` và `type`. `type` mặc định là quy trình thanh toán online).

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `duration_tier_id` | UUID | Yes | ID gói thời gian thuê | `550e8400...` |
| `payment_method` | Enum | No | `TRANSFER`, `QR`, `CARD`, `ATM` | `TRANSFER` |
| `auto_renew` | Boolean | No | Tự động gia hạn | `true` |
| `notes` | String | No | Ghi chú | `...` |
| `addon_ids` | UUID[] | No | Dịch vụ đi kèm | `...` |
| `insurance_ids` | UUID[] | No | Bảo hiểm | `...` |
| `coupon_codes` | String[] | No | Mã giảm giá | `...` |
| `signature` | File | No | File ảnh chữ ký | `(Binary File)` |
| `templates` | Object[] | Yes | Danh sách kho thuê | *(Xem JSON Admin)* |

**JSON Body Representation (Mô phỏng):**
```json
{
  "duration_tier_id": "550e8400-e29b-41d4-a716-446655440005",
  "payment_method": "QR",
  "auto_renew": true,
  "notes": "Thuê thêm kho B",
  "templates": [
    {
      "template_id": "550e8400-e29b-41d4-a716-446655440002",
      "warehouse_name": "Kho B1",
      "row_template_ids": ["550e8400-e29b-41d4-a716-446655440010"]
    }
  ]
}
```

---

## 3. Renew Rental Contract

**Method:** `PUT`
**Endpoint:** `/organizations/{orgId}/rental-contracts/{id}/renew`
**Mô tả:** API gia hạn hợp đồng thuê kho khi sắp hết hạn hoặc đã hết hạn.

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "multipart/form-data"
}
```

**URL Parameters:**
*   `orgId`: ID của tổ chức (UUID)
*   `id`: ID của hợp đồng cần gia hạn (UUID)

**Request Body (multipart/form-data):**

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `duration_tier_id` | UUID | Yes | ID gói thời gian gia hạn mới (thay thế gói cũ) | `550e8400...` |
| `addon_ids` | UUID[] | No | Cập nhật danh sách addon (nếu thay đổi) | `['id1']` |
| `insurance_ids` | UUID[] | No | Cập nhật danh sách bảo hiểm (nếu thay đổi) | `['id2']` |
| `coupon_codes` | String[] | No | Mã giảm giá cho lần gia hạn này | `['RENEW20']` |
| `signature` | File | No | File ảnh chữ ký xác nhận gia hạn | `(Binary File)` |

**JSON Body Representation (Mô phỏng):**
```json
{
  "duration_tier_id": "550e8400-e29b-41d4-a716-446655440006",
  "addon_ids": ["550e8400-e29b-41d4-a716-446655440003"],
  "insurance_ids": ["550e8400-e29b-41d4-a716-446655440009"],
  "coupon_codes": ["RENEW_VIP"]
}
```
