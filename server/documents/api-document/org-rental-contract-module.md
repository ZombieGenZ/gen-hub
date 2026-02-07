# Organization Rental Contract Module Documentation

## Tổng Quan

Module `org-rental-contract` quản lý hợp đồng thuê kho của tổ chức trong hệ thống GEN-HUB. Cho phép tạo, gia hạn, quản lý và hủy hợp đồng thuê kho với đầy đủ tính năng addon/bảo hiểm/coupon.

---

## API Endpoints

### 1. POST /organizations/:orgId/rental-contracts - Tạo hợp đồng

**Quyền:** `org.rental-contract.create`

**Content-Type:** `multipart/form-data` (hỗ trợ upload chữ ký)

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `templates` | array | Yes | Danh sách kho cần thuê |
| `duration_tier_id` | UUID | Yes | ID gói thời hạn |
| `payment_method` | enum | No | `TRANSFER`, `BALANCE`, etc. |
| `auto_renew` | boolean | No | Tự động gia hạn |
| `addon_ids` | UUID[] | No | Danh sách addon |
| `insurance_ids` | UUID[] | No | Danh sách bảo hiểm |
| `coupon_codes` | string[] | No | Mã giảm giá |
| `signature` | file | No | Chữ ký điện tử |

---

### 2. GET /organizations/:orgId/rental-contracts - Danh sách hợp đồng

**Quyền:** `org.rental-contract.list`

**Query:** `limit`, `offset`, `keywords`, `status`

---

### 3. GET /organizations/:orgId/rental-contracts/:id - Chi tiết hợp đồng

**Quyền:** `org.rental-contract.read`

---

### 4. GET /organizations/:orgId/rental-contracts/:id/full - Chi tiết đầy đủ

Bao gồm: addons, insurances, coupons, logs

---

### 5. PUT /organizations/:orgId/rental-contracts/:id/renew - Gia hạn

**Quyền:** `org.rental-contract.renew`

**Body:**
```json
{
  "duration_tier_id": "uuid",
  "addon_ids": ["addon-1"],
  "coupon_codes": ["RENEW20"]
}
```

---

### 6. POST /organizations/:orgId/rental-contracts/:id/retry-payment - Tạo lại link thanh toán

**Quyền:** `org.rental-contract.update`

---

### 7. GET /organizations/:orgId/rental-contracts/:id/addons - Danh sách addons

### 8. GET /organizations/:orgId/rental-contracts/:id/insurances - Danh sách bảo hiểm

### 9. GET /organizations/:orgId/rental-contracts/:id/logs - Lịch sử thao tác

---

### 10. DELETE /organizations/:orgId/rental-contracts/:id - Hủy hợp đồng

**Quyền:** `org.rental-contract.delete`

**Body:**
```json
{
  "cancel_reason": "Không còn nhu cầu sử dụng"
}
```

---

### 11. DELETE /organizations/:orgId/rental-contracts/delete/many - Hủy nhiều hợp đồng

**Body:**
```json
{
  "items": [
    { "id": "uuid-1", "cancel_reason": "Lý do 1" },
    { "id": "uuid-2", "cancel_reason": "Lý do 2" }
  ]
}
```

---

## Contract Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Chờ thanh toán |
| `ACTIVE` | Đang hoạt động |
| `EXPIRED` | Hết hạn |
| `CANCELLED` | Đã hủy (bởi khách) |
| `TERMINATED` | Đã chấm dứt (bởi admin) |

---

## Files Trong Module

| File | Mô tả |
|------|-------|
| `org-rental-contract.controller.ts` | API endpoints |
| `org-rental-contract.service.ts` | Business logic |
| `dto/index.ts` | All DTOs |
