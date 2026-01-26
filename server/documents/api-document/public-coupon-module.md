# Public Coupon Module Documentation

## Tổng Quan

Module `public-coupon` cung cấp các API công khai và cho user để xem, lưu và kiểm tra coupon. Module này cho phép user:
- Xem danh sách coupon công khai
- Lưu coupon vào tài khoản
- Kiểm tra coupon có thể áp dụng cho đơn hàng
- Validate mã coupon cụ thể

Khác với module `coupon` (dành cho admin), module này tập trung vào trải nghiệm người dùng cuối.

---

## API Endpoints

> [!TIP]
> Tất cả các API đều hỗ trợ header `Accept-Language` để chọn ngôn ngữ phản hồi.
> - **vi** - Tiếng Việt (mặc định)
> - **en** - English

### 1. GET /public/coupons - Lấy danh sách coupon công khai

**Mô tả:** Lấy danh sách các coupon đang hoạt động và công khai. API này không yêu cầu xác thực. Hỗ trợ phân trang và tìm kiếm.

**Xác thực:** Không yêu cầu (Public)

**Headers:**
```http
Accept: application/json
Accept-Language: vi
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | Optional | Số lượng bản ghi mỗi trang (default: 10, min: 1) |
| `offset` | number | Optional | Vị trí bắt đầu (default: 0, min: 0) |
| `keywords` | string | Optional | Từ khóa tìm kiếm (tên, mã coupon) |

**Response (200 OK):**

```json
{
  "code": "coupon.public.list.success",
  "message": "Lấy danh sách coupon công khai thành công",
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Khuyến mãi Tết 2025",
        "description": "Giảm 20% cho đơn hàng đầu tiên",
        "code": "TET2025",
        "discount_type": "PERCENT",
        "discount_value": 20,
        "max_discount_amount": 500000,
        "starts_at": "2025-01-01T00:00:00.000Z",
        "ends_at": "2025-02-28T23:59:59.999Z"
      }
    ],
    "total": 10,
    "limit": 10,
    "offset": 0
  }
}
```

---

### 2. GET /public/coupons/saved - Lấy danh sách coupon đã lưu của user

**Mô tả:** Lấy danh sách các coupon mà user đã lưu vào tài khoản. Chỉ trả về các coupon còn hiệu lực và chưa sử dụng hết.

**Xác thực:** Bearer Token (JWT)

**Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: vi
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | Optional | Số lượng bản ghi mỗi trang (default: 10) |
| `offset` | number | Optional | Vị trí bắt đầu (default: 0) |
| `keywords` | string | Optional | Từ khóa tìm kiếm |

**Response (200 OK):**

```json
{
  "code": "coupon.saved.list.success",
  "message": "Lấy danh sách coupon đã lưu thành công",
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Khuyến mãi Tết 2025",
        "code": "TET2025",
        "discount_type": "PERCENT",
        "discount_value": 20,
        "max_discount_amount": 500000,
        "starts_at": "2025-01-01T00:00:00.000Z",
        "ends_at": "2025-02-28T23:59:59.999Z",
        "saved_at": "2025-01-10T08:00:00.000Z"
      }
    ],
    "total": 5,
    "limit": 10,
    "offset": 0
  }
}
```

**Error Responses:**

<details>
<summary><b>401 Unauthorized</b></summary>

Xem [Error Responses](#error-responses) chung
</details>

---

### 3. POST /public/coupons/applicable - Lấy danh sách coupon có thể áp dụng cho đơn hàng

**Mô tả:** Kiểm tra và trả về danh sách các coupon đã lưu của user có thể áp dụng cho đơn hàng dựa trên các điều kiện như loại sản phẩm, thời gian thuê, giá trị đơn hàng.

**Xác thực:** Bearer Token (JWT)

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept-Language: vi
```

**Request Body Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `warehouse_template_ids` | array | Optional | Danh sách ID warehouse template |
| `row_template_ids` | array | Optional | Danh sách ID row template |
| `addon_ids` | array | Optional | Danh sách ID addon |
| `rental_duration_tier_id` | string (UUID) | Yes | ID của gói thời gian thuê |
| `type` | enum | Yes | Loại giao dịch: `NEW_CONTRACT` hoặc `RENEWAL` |

**Request Body Examples:**

<details>
<summary><b>Ví dụ 1: Kiểm tra cho hợp đồng mới</b></summary>

```json
{
  "warehouse_template_ids": ["550e8400-e29b-41d4-a716-446655440001"],
  "row_template_ids": [
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003"
  ],
  "addon_ids": ["550e8400-e29b-41d4-a716-446655440004"],
  "rental_duration_tier_id": "550e8400-e29b-41d4-a716-446655440005",
  "type": "NEW_CONTRACT"
}
```
</details>

<details>
<summary><b>Ví dụ 2: Kiểm tra cho gia hạn</b></summary>

```json
{
  "warehouse_template_ids": ["550e8400-e29b-41d4-a716-446655440001"],
  "row_template_ids": ["550e8400-e29b-41d4-a716-446655440002"],
  "rental_duration_tier_id": "550e8400-e29b-41d4-a716-446655440005",
  "type": "RENEWAL"
}
```
</details>

**Response (200 OK):**

```json
{
  "code": "coupon.applicable.success",
  "message": "Lấy danh sách coupon có thể áp dụng thành công",
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Khuyến mãi Tết 2025",
      "description": "Giảm 20% cho đơn hàng đầu tiên",
      "code": "TET2025",
      "discount_type": "PERCENT",
      "discount_value": 20,
      "max_discount_amount": 500000,
      "estimated_discount": 200000,
      "is_applicable": true,
      "gift_addons": [],
      "gift_insurances": []
    }
  ]
}
```

**Error Responses:**

<details>
<summary><b>401 Unauthorized</b></summary>

Xem [Error Responses](#error-responses) chung
</details>

<details>
<summary><b>422 Unprocessable Entity - Validation Error</b></summary>

```json
{
  "code": "error.validation",
  "message": "Dữ liệu đầu vào không hợp lệ",
  "success": false,
  "errors": [
    { "field": "rental_duration_tier_id", "message": "ID gói thời gian thuê là bắt buộc" },
    { "field": "type", "message": "Loại giao dịch phải là NEW_CONTRACT hoặc RENEWAL" }
  ]
}
```
</details>

---

### 4. POST /public/coupons/validate - Kiểm tra mã coupon có thể áp dụng cho đơn hàng

**Mô tả:** Kiểm tra một mã coupon cụ thể có thể áp dụng cho đơn hàng hay không. Trả về thông tin chi tiết về coupon và số tiền giảm giá ước tính nếu hợp lệ.

**Xác thực:** Bearer Token (JWT)

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept-Language: vi
```

**Request Body Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Mã coupon cần kiểm tra (max 50 ký tự) |
| `warehouse_template_ids` | array | Optional | Danh sách ID warehouse template |
| `row_template_ids` | array | Optional | Danh sách ID row template |
| `addon_ids` | array | Optional | Danh sách ID addon |
| `rental_duration_tier_id` | string (UUID) | Yes | ID của gói thời gian thuê |
| `type` | enum | Yes | Loại giao dịch: `NEW_CONTRACT` hoặc `RENEWAL` |

**Request Body Example:**

```json
{
  "code": "TET2025",
  "warehouse_template_ids": ["550e8400-e29b-41d4-a716-446655440001"],
  "row_template_ids": ["550e8400-e29b-41d4-a716-446655440002"],
  "addon_ids": ["550e8400-e29b-41d4-a716-446655440003"],
  "rental_duration_tier_id": "550e8400-e29b-41d4-a716-446655440004",
  "type": "NEW_CONTRACT"
}
```

**Response (200 OK) - Coupon hợp lệ:**

```json
{
  "code": "coupon.validate.success",
  "message": "Coupon hợp lệ",
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Khuyến mãi Tết 2025",
    "code": "TET2025",
    "discount_type": "PERCENT",
    "discount_value": 20,
    "max_discount_amount": 500000,
    "estimated_discount": 200000,
    "is_valid": true,
    "gift_addons": [],
    "gift_insurances": []
  }
}
```

**Response (200 OK) - Coupon không hợp lệ:**

```json
{
  "code": "coupon.validate.failed",
  "message": "Coupon đã hết hạn",
  "success": true,
  "data": {
    "is_valid": false,
    "error": "Coupon đã hết hạn",
    "error_code": "coupon.errors.expired"
  }
}
```

**Error Responses:**

<details>
<summary><b>400 Bad Request - Coupon không hợp lệ</b></summary>

```json
// Mã coupon không tồn tại
{
  "code": "coupon.errors.invalid_code",
  "message": "Mã coupon không tồn tại hoặc đã hết hạn",
  "success": false
}

// Không đủ số kho
{
  "code": "coupon.errors.min_warehouses_not_met",
  "message": "Đơn hàng chưa đạt số lượng kho tối thiểu",
  "success": false
}

// Thời gian thuê chưa đủ
{
  "code": "coupon.errors.min_rental_duration_not_met",
  "message": "Thời gian thuê chưa đạt yêu cầu tối thiểu",
  "success": false
}
```
</details>

<details>
<summary><b>401 Unauthorized</b></summary>

Xem [Error Responses](#error-responses) chung
</details>

<details>
<summary><b>422 Unprocessable Entity - Validation Error</b></summary>

Xem [Error Responses](#error-responses) chung
</details>

---

### 5. POST /public/coupons/:id/save - Lưu coupon vào tài khoản

**Mô tả:** Lưu một coupon công khai vào tài khoản để sử dụng sau. Coupon đã lưu sẽ hiển thị trong danh sách "Coupon đã lưu" và có thể áp dụng khi đặt hàng.

**Xác thực:** Bearer Token (JWT)

**Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: vi
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | ID của coupon |

**Response (200 OK):**

```json
{
  "code": "coupon.save.success",
  "message": "Lưu coupon thành công",
  "success": true,
  "data": null
}
```

**Error Responses:**

<details>
<summary><b>404 Not Found</b></summary>

```json
{
  "code": "coupon.errors.not_found",
  "message": "Không tìm thấy coupon",
  "success": false
}
```
</details>

<details>
<summary><b>409 Conflict - Coupon đã được lưu</b></summary>

```json
{
  "code": "coupon.errors.already_saved",
  "message": "Coupon đã được lưu",
  "success": false
}
```
</details>

<details>
<summary><b>401 Unauthorized</b></summary>

Xem [Error Responses](#error-responses) chung
</details>

---

### 6. DELETE /public/coupons/:id/save - Bỏ lưu coupon khỏi tài khoản

**Mô tả:** Xóa một coupon đã lưu khỏi danh sách coupon của user. Coupon vẫn có thể được lưu lại sau đó nếu còn hiệu lực.

**Xác thực:** Bearer Token (JWT)

**Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: vi
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | ID của coupon |

**Response (200 OK):**

```json
{
  "code": "coupon.unsave.success",
  "message": "Bỏ lưu coupon thành công",
  "success": true,
  "data": null
}
```

**Error Responses:**

<details>
<summary><b>404 Not Found - Coupon chưa được lưu</b></summary>

```json
{
  "code": "coupon.errors.not_saved",
  "message": "Coupon chưa được lưu",
  "success": false
}
```
</details>

<details>
<summary><b>401 Unauthorized</b></summary>

Xem [Error Responses](#error-responses) chung
</details>

---

## Error Responses

### 401 Unauthorized

```json
// Không có token
{
  "code": "error.unauthorized.token_missing",
  "message": "Không có quyền truy cập",
  "success": false
}

// Token hết hạn
{
  "code": "error.unauthorized.token_expired",
  "message": "Token đã hết hạn",
  "success": false
}

// Token không hợp lệ
{
  "code": "error.unauthorized.token_invalid",
  "message": "Token không hợp lệ",
  "success": false
}

// Token không đúng định dạng
{
  "code": "error.unauthorized.token_malformed",
  "message": "Token không đúng định dạng",
  "success": false
}
```

### 422 Unprocessable Entity - Validation Error

```json
{
  "code": "error.validation",
  "message": "Dữ liệu đầu vào không hợp lệ",
  "success": false,
  "errors": [
    { "field": "rental_duration_tier_id", "message": "ID gói thời gian thuê là bắt buộc" },
    { "field": "type", "message": "Loại giao dịch phải là NEW_CONTRACT hoặc RENEWAL" }
  ]
}
```

---

## Validation Rules

### CheckApplicableCouponDto & ValidateCouponDto

- `rental_duration_tier_id`: Bắt buộc, phải là UUID v4 hợp lệ
- `type`: Bắt buộc, chỉ cho phép `NEW_CONTRACT` hoặc `RENEWAL`
- `warehouse_template_ids`: Optional, nếu có phải là array of UUIDs
- `row_template_ids`: Optional, nếu có phải là array of UUIDs
- `addon_ids`: Optional, nếu có phải là array of UUIDs
- `code` (chỉ cho ValidateCouponDto): Bắt buộc, max 50 ký tự

---

## Business Logic

### Coupon Applicability Check

Khi kiểm tra coupon có thể áp dụng, hệ thống sẽ kiểm tra:

1. **Coupon tồn tại và còn hiệu lực**
   - Coupon phải tồn tại
   - `is_active = true`
   - Nếu không phải permanent: `starts_at <= now <= ends_at`
   - `current_usage < max_usage` (nếu `max_usage > 0`)

2. **User có quyền sử dụng**
   - Nếu `coupon_type = PRIVATE`: User phải nằm trong `target_user_ids`
   - Nếu `coupon_type = PUBLIC`: Bất kỳ user nào cũng có thể dùng

3. **Điều kiện áp dụng cho đơn hàng**
   - Nếu `require_min_warehouses = true`: Số warehouse trong đơn hàng >= `min_warehouses`
   - Nếu `require_min_rows = true`: Số row trong đơn hàng >= `min_rows`
   - Nếu `require_min_order_amount = true`: Tổng giá trị đơn hàng >= `min_order_amount`
   - Nếu `require_min_rental_duration = true`: Thời gian thuê >= `min_rental_duration_value` + `min_rental_duration_unit`

4. **Loại giao dịch**
   - Nếu `type = NEW_CONTRACT`: `apply_for_first_rental` phải = true
   - Nếu `type = RENEWAL`: `apply_for_renewal` phải = true

5. **Target matching**
   - Nếu `apply_for_all_warehouses = false`: Đơn hàng phải chứa ít nhất 1 warehouse trong `target_warehouse_ids`
   - Tương tự cho rows, addons, insurances

---

## Files Trong Module

| File | Mô tả |
|------|-------|
| [public-coupon.module.ts](../../src/modules/public-coupon/public-coupon.module.ts) | NestJS module definition |
| [public-coupon.controller.ts](../../src/modules/public-coupon/public-coupon.controller.ts) | REST API endpoints |
| [public-coupon.service.ts](../../src/modules/public-coupon/public-coupon.service.ts) | Business logic |
| [dto/check-applicable-coupon.dto.ts](../../src/modules/public-coupon/dto/check-applicable-coupon.dto.ts) | DTO kiểm tra coupon áp dụng |
| [dto/validate-coupon.dto.ts](../../src/modules/public-coupon/dto/validate-coupon.dto.ts) | DTO validate coupon code |
| [dto/query-public-coupon.dto.ts](../../src/modules/public-coupon/dto/query-public-coupon.dto.ts) | Query DTO |
| [interfaces/public-coupon.interface.ts](../../src/modules/public-coupon/interfaces/public-coupon.interface.ts) | TypeScript interfaces |
