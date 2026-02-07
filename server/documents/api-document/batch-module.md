# Batch Module API Documentation

## 1. Tổng quan
Module quản lý lô hàng (Batch) cho sản phẩm. Giúp theo dõi hạn sử dụng, ngày sản xuất và giá nhập của từng lô hàng cụ thể.

## 2. Danh sách API

### 2.1. Tạo lô hàng mới
- **Endpoint:** `POST /organizations/:orgId/batches`
- **Mô tả:** Tạo một lô hàng mới cho sản phẩm.
- **Quyền:** `batch.create`
- **Request Body:** `CreateBatchDto`
- **Response:**
  - `201 Created`: Tạo thành công (trả về `CreatedResponse<IBatch>`)
  - `400 Bad Request`: Dữ liệu không hợp lệ
  - `404 Not Found`: Không tìm thấy sản phẩm
  - `409 Conflict`: Mã lô hàng đã tồn tại

### 2.2. Lấy danh sách lô hàng theo sản phẩm
- **Endpoint:** `GET /organizations/:orgId/products/:productId/batches`
- **Mô tả:** Lấy danh sách lô hàng của một sản phẩm cụ thể.
- **Quyền:** `batch.list`
- **Query Parameters:**
  - `limit`: Số lượng bản ghi (default: 20)
  - `offset`: Vị trí bắt đầu (default: 0)
  - `is_active`: Lọc theo trạng thái
- **Response:**
  - `200 OK`: Danh sách lô hàng (trả về `GetResponse<IPaginatedResponse<IBatch>>`)

### 2.3. Lấy chi tiết lô hàng
- **Endpoint:** `GET /organizations/:orgId/batches/:id`
- **Mô tả:** Lấy thông tin chi tiết một lô hàng.
- **Quyền:** `batch.read`
- **Response:**
  - `200 OK`: Thông tin chi tiết (trả về `GetResponse<IBatch>`)
  - `404 Not Found`: Không tìm thấy lô hàng

### 2.4. Cập nhật lô hàng
- **Endpoint:** `PUT /organizations/:orgId/batches/:id`
- **Mô tả:** Cập nhật thông tin lô hàng (NSX, HSD, giá nhập).
- **Quyền:** `batch.update`
- **Request Body:** `UpdateBatchDto`
- **Response:**
  - `200 OK`: Cập nhật thành công (trả về `UpdatedResponse<IBatch>`)
  - `404 Not Found`: Không tìm thấy lô hàng

### 2.5. Xóa nhiều lô hàng
- **Endpoint:** `DELETE /organizations/:orgId/batches/delete/many`
- **Mô tả:** Xóa nhiều lô hàng cùng lúc (Soft Delete).
- **Quyền:** `batch.delete`
- **Request Body:** `DeleteManyDto`
- **Response:**
  - `200 OK`: Xóa thành công (trả về `DeletedResponse<null>`)

### 2.6. Xóa lô hàng
- **Endpoint:** `DELETE /organizations/:orgId/batches/:id`
- **Mô tả:** Xóa một lô hàng (Soft Delete).
- **Quyền:** `batch.delete`
- **Response:**
  - `200 OK`: Xóa thành công (trả về `DeletedResponse<null>`)

## 3. Data Structures

### IBatch
```typescript
interface IBatch {
    id: string;
    product_id: string;
    code: string;
    manufacturing_date?: Date;
    expiry_date?: Date;
    import_price?: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    product?: {
        id: string;
        name: string;
        sku: string;
    };
}
```
