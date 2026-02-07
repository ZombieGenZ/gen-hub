# Payment Admin Module Documentation

## Tổng Quan

Module `payment-admin` cung cấp API quản lý thanh toán dành cho Admin. Cho phép xem và lọc tất cả giao dịch thanh toán trong hệ thống.

---

## API Endpoints

### GET /admin/payments - Danh sách thanh toán

**Quyền:** `payment.list.all`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Số lượng tối đa |
| `offset` | number | 0 | Vị trí bắt đầu |
| `keywords` | string | - | Tìm theo mã thanh toán/nội dung |
| `status` | enum | - | `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`, `EXPIRED` |
| `organizationId` | UUID | - | Lọc theo tổ chức |

**Response:**
```json
{
  "code": "payment.list.success",
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

# Database Admin Module Documentation

## Tổng Quan

Module `database-admin` cung cấp giao diện quản lý database trực tiếp dành cho Admin. Cho phép xem schema, quản lý records, và thực thi queries.

---

## API Endpoints

### Table Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/tables` | Danh sách tables |
| GET | `/admin/tables/:tableName/schema` | Schema của table |
| GET | `/admin/tables/:tableName` | Danh sách records |
| GET | `/admin/tables/:tableName/:id` | Chi tiết record |
| POST | `/admin/tables/:tableName` | Tạo record |
| PUT | `/admin/tables/:tableName/:id` | Cập nhật record |
| DELETE | `/admin/tables/:tableName/:id` | Xóa record |

### Bulk Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/tables/:tableName/batch` | Batch create/update/delete |
| DELETE | `/admin/tables/:tableName/bulk` | Bulk delete |

### ER Diagram

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/diagram/schema` | Schema cho ER diagram |
| GET | `/admin/diagram/config` | Lấy cấu hình diagram |
| PUT | `/admin/diagram/config` | Lưu cấu hình diagram |

### Raw Query

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/query/execute` | Thực thi raw SQL |

---

# Database Backup Module Documentation

## Tổng Quan

Module `database-backup` quản lý backup database. Hỗ trợ trigger backup thủ công và tải xuống các bản backup.

---

## API Endpoints

### POST /admin/backups/trigger - Trigger backup

**Quyền:** `backup.admin` hoặc `backup.trigger`

**Body:**
```json
{ "key": "backup-api-key" }
```

---

### GET /admin/backups - Danh sách backups

**Quyền:** `backup.admin` hoặc `backup.list`

---

### POST /admin/backups/:id/download-url - Lấy URL download

**Quyền:** `backup.admin` hoặc `backup.download`

**Body:**
```json
{ "key": "backup-api-key" }
```
