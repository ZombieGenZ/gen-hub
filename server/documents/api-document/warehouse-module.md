# Organization Warehouse Module Documentation

## Tổng Quan

Module `warehouse` (Organization Warehouse) cho phép các Organization quản lý kho của mình. Module này bao gồm các chức năng xem danh sách kho, xem chi tiết kho, xem layout kho, cập nhật thông tin kho và xem cấu trúc chi tiết của kho (dãy, kệ, tầng, ô).

---

## API Endpoints

> [!TIP]
> Tất cả các API đều hỗ trợ header `Accept-Language` để chọn ngôn ngữ phản hồi.
> - **vi** - Tiếng Việt (mặc định)
> - **en** - English

### 1. GET /organizations/:orgId/warehouses - Lấy danh sách warehouse

**Mô tả:** Lấy danh sách các kho (warehouse) thuộc về một tổ chức.

**Quyền yêu cầu:** `warehouse.list`

**Response (200 OK):**
```json
{
  "code": "WAREHOUSE_LIST_SUCCESS",
  "message": "Lấy danh sách kho thành công",
  "data": {
    "items": [],
    "total": 10
  }
}
```

---

### 2. GET /organizations/:orgId/warehouses/:id - Lấy chi tiết warehouse

**Mô tả:** Lấy thông tin chi tiết của một kho.

**Quyền yêu cầu:** `warehouse.read`

**Response (200 OK):**
```json
{
  "code": "WAREHOUSE_READ_SUCCESS",
  "message": "Lấy thông tin kho thành công",
  "data": {}
}
```

---

### 3. GET /organizations/:orgId/warehouses/:id/layout - Lấy layout warehouse

**Mô tả:** Lấy cấu trúc layout của kho (để hiển thị visualization).

**Quyền yêu cầu:** `warehouse.layout.view`

**Response (200 OK):**
```json
{
  "code": "WAREHOUSE_LAYOUT_SUCCESS",
  "message": "Lấy layout kho thành công",
  "data": {}
}
```

---

### 4. PUT /organizations/:orgId/warehouses/:id - Cập nhật warehouse

**Mô tả:** Cập nhật thông tin cơ bản của kho (tên, mô tả).

**Quyền yêu cầu:** `warehouse.update`

**Request Body Schema:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Optional | Tên mới của kho |
| `description` | string | Optional | Mô tả mới |

**Response (200 OK):**
```json
{
  "code": "WAREHOUSE_UPDATE_SUCCESS",
  "message": "Cập nhật kho thành công",
  "data": {}
}
```

---

### 5. PATCH /organizations/:orgId/warehouses/:id/shelves/:shelfId - Cập nhật tầng

**Mô tả:** Cập nhật thông tin của một tầng (shelf), ví dụ: gán sản phẩm vào tầng.

**Quyền yêu cầu:** `warehouse.shelf.update`

**Request Body Schema:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `assigned_product_id` | string (UUID) | Optional | ID sản phẩm gán vào tầng (có thể là null để bỏ gán) |

**Response (200 OK):**
```json
{
  "code": "WAREHOUSE_SHELF_UPDATE_SUCCESS",
  "message": "Cập nhật tầng thành công",
  "data": {}
}
```

---

## Chi tiết cấu trúc kho

Các endpoint sau dùng để duyệt qua cấu trúc kho:

- `GET .../warehouses/:id/rows` - Lấy danh sách Dãy (Rows)
- `GET .../warehouses/:id/rows/:rowId` - Lấy chi tiết Dãy
- `GET .../warehouses/:id/racks` - Lấy danh sách Kệ (Racks)
- `GET .../warehouses/:id/racks/:rackId/shelves` - Lấy danh sách Tầng (Shelves)
- `GET .../warehouses/:id/racks/:rackId/shelves/:shelfId/blocks` - Lấy danh sách Ô (Blocks)
