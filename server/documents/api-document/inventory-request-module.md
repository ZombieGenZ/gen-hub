# Inventory Request Module Documentation

## Tổng Quan

Module `inventory-request` quản lý các yêu cầu nhập kho (Inbound) và xuất kho (Outbound) trong phạm vi Tổ Chức (Organization).
Quy trình hoạt động dựa trên mô hình:
1. **Request**: Nhân viên tạo yêu cầu (Pending)
2. **Review**: Quản lý kho duyệt yêu cầu (Processing/Approved/Rejected)
3. **Execution**: Thực hiện nhập/xuất thực tế (Completed)

---

## Permission

| Action | Permission Key | Mô tả |
|--------|----------------|-------|
| Tạo phiếu nhập | `org.inventory.inbound.create` | Quyền tạo yêu cầu nhập kho |
| Xem phiếu nhập | `org.inventory.inbound.list` | Quyền xem danh sách và chi tiết phiếu nhập |
| Tạo phiếu xuất | `org.inventory.outbound.create` | Quyền tạo yêu cầu xuất kho |
| Xem phiếu xuất | `org.inventory.outbound.list` | Quyền xem danh sách và chi tiết phiếu xuất |

---

## API Endpoints

> [!TIP]
> Tất cả các API đều yêu cầu header `Authorization: Bearer <token>` và `x-api-key`.
> Hỗ trợ `Accept-Language: vi` (default) hoặc `en`.

### 1. Inbound Requests (Nhập Kho)

#### 1.1 Tạo yêu cầu nhập kho

**POST** `/organizations/:orgId/inventory/inbound`

**Mô tả:** Tạo phiếu nhập kho mới. Có thể nhập hàng mới (tạo batch mới) hoặc nhập bổ sung vào batch đã có.

**Body Examples:**

<details>
<summary><b>Nhập hàng tạo lô mới</b></summary>

```json
{
  "warehouse_id": "550e8400-e29b-41d4-a716-446655440003",
  "partner_id": "550e8400-e29b-41d4-a716-446655440004",
  "purchase_order_code": "PO-2026-001",
  "notes": "Nhập hàng đầu tháng 2",
  "details": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440000",
      "unit_id": "550e8400-e29b-41d4-a716-446655440002",
      "expected_qty": 100,
      "batch_code": "LOT-202602-01",
      "manufacturing_date": "2026-01-15T00:00:00Z",
      "expiry_date": "2027-01-15T00:00:00Z",
      "import_price": 50000
    }
  ]
}
```
</details>

<details>
<summary><b>Nhập hàng vào lô có sẵn</b></summary>

```json
{
  "warehouse_id": "550e8400-e29b-41d4-a716-446655440003",
  "details": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440000",
      "unit_id": "550e8400-e29b-41d4-a716-446655440002",
      "expected_qty": 50,
      "batch_id": "550e8400-e29b-41d4-a716-446655440001",
      "import_price": 50000
    }
  ]
}
```
</details>

**Response (201 Created):**

```json
{
  "code": "inventory-request.create_inbound",
  "message": "Tạo yêu cầu nhập kho thành công",
  "success": true,
  "data": {
    "id": "uuid",
    "code": "PN-202602-0001",
    "status": "PENDING",
    "warehouse": {
      "id": "uuid",
      "name": "Kho A"
    },
    "created_at": "2026-02-08T10:00:00Z"
  }
}
```

#### 1.2 Danh sách yêu cầu nhập kho

**GET** `/organizations/:orgId/inventory/inbound`

**Filter Query Parameters:**
- `warehouse_id`: ID kho
- `status`: `PENDING`, `PROCESSING`, `COMPLETED`, `CANCELLED`
- `keywords`: Tìm theo mã phiếu, mã đơn mua
- `limit`: Default 10
- `offset`: Default 0

**Response (200 OK):**

```json
{
  "code": "inventory-request.list_inbound",
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "PN-202602-0001",
        "status": "PENDING",
        "total_products": 5,
        "created_at": "2026-02-08T10:00:00Z"
      }
    ],
    "total": 50,
    "limit": 10,
    "offset": 0
  }
}
```

#### 1.3 Chi tiết yêu cầu nhập kho

**GET** `/organizations/:orgId/inventory/inbound/:id`

---

### 2. Outbound Requests (Xuất Kho)

#### 2.1 Tạo yêu cầu xuất kho

**POST** `/organizations/:orgId/inventory/outbound`

**Mô tả:** Tạo phiếu xuất kho. Hỗ trợ các chiến lược picking tự động (FEFO, FIFO) hoặc chỉ định lô cụ thể.

**Body Examples:**

<details>
<summary><b>Xuất kho theo FEFO (First Expired First Out)</b></summary>

```json
{
  "warehouse_id": "uuid",
  "picking_strategy": "FEFO",
  "sales_order_code": "SO-2026-01",
  "details": [
    {
      "product_id": "uuid",
      "unit_id": "uuid",
      "quantity": 20
    }
  ]
}
```
</details>

<details>
<summary><b>Xuất kho chỉ định lô (Manual)</b></summary>

```json
{
  "warehouse_id": "uuid",
  "details": [
    {
      "product_id": "uuid",
      "unit_id": "uuid",
      "quantity": 10,
      "required_batch_id": "batch-uuid"
    }
  ]
}
```
</details>

**Response (201 Created):**

```json
{
  "code": "inventory-request.create_outbound",
  "message": "Tạo yêu cầu xuất kho thành công",
  "success": true,
  "data": {
    "id": "uuid",
    "code": "PX-202602-0001",
    "status": "PENDING"
  }
}
```

#### 2.2 Danh sách yêu cầu xuất kho

**GET** `/organizations/:orgId/inventory/outbound`

**Filter Query Parameters:**
- `warehouse_id`: ID kho
- `status`: `PENDING`, `PICKING`, `PACKED`, `SHIPPED`, `CANCELLED`
- `keywords`: Tìm theo mã phiếu, mã đơn bán

#### 2.3 Chi tiết yêu cầu xuất kho

**GET** `/organizations/:orgId/inventory/outbound/:id`
