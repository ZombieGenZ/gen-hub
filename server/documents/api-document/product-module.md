# Product Module API Documentation

## 1. Tổng quan
Module quản lý sản phẩm trong hệ thống. Hỗ trợ quản lý thông tin sản phẩm, đơn vị tính, đơn vị quy đổi và các thuộc tính liên quan đến kích thước, trọng lượng.

## 2. Danh sách API

### 2.1. Tạo sản phẩm mới
- **Endpoint:** `POST /organizations/:orgId/products`
- **Mô tả:** Tạo một sản phẩm mới kèm đơn vị tính quy đổi (nếu có).
- **Quyền:** `product.create`
- **Request Body:** `CreateProductDto`
- **Response:**
  - `201 Created`: Tạo thành công (trả về `CreatedResponse<IProduct>`)
  - `400 Bad Request`: Dữ liệu không hợp lệ
  - `404 Not Found`: Không tìm thấy tổ chức hoặc đơn vị tính gốc
  - `409 Conflict`: Mã SKU đã tồn tại

### 2.2. Lấy danh sách sản phẩm
- **Endpoint:** `GET /organizations/:orgId/products`
- **Mô tả:** Lấy danh sách sản phẩm có phân trang và lọc.
- **Quyền:** `product.list`
- **Query Parameters:**
  - `limit`: Số lượng bản ghi (default: 20)
  - `offset`: Vị trí bắt đầu (default: 0)
  - `keywords`: Tìm kiếm theo tên, SKU, barcode
  - `is_active`: Lọc theo trạng thái
- **Response:**
  - `200 OK`: Danh sách sản phẩm (trả về `GetResponse<IPaginatedResponse<IProduct>>`)

### 2.3. Lấy chi tiết sản phẩm
- **Endpoint:** `GET /organizations/:orgId/products/:id`
- **Mô tả:** Lấy thông tin chi tiết một sản phẩm, bao gồm danh sách đơn vị quy đổi.
- **Quyền:** `product.read`
- **Response:**
  - `200 OK`: Thông tin chi tiết (trả về `GetResponse<IProduct>`)
  - `404 Not Found`: Không tìm thấy sản phẩm

### 2.4. Cập nhật sản phẩm
- **Endpoint:** `PUT /organizations/:orgId/products/:id`
- **Mô tả:** Cập nhật thông tin sản phẩm. Nếu cập nhật `units`, danh sách cũ sẽ bị thay thế hoàn toàn.
- **Quyền:** `product.update`
- **Request Body:** `UpdateProductDto`
- **Response:**
  - `200 OK`: Cập nhật thành công (trả về `UpdatedResponse<IProduct>`)
  - `404 Not Found`: Không tìm thấy sản phẩm hoặc đơn vị tính
  - `409 Conflict`: Mã SKU trùng lặp

### 2.5. Xóa nhiều sản phẩm
- **Endpoint:** `DELETE /organizations/:orgId/products/delete/many`
- **Mô tả:** Xóa nhiều sản phẩm cùng lúc (Soft Delete).
- **Quyền:** `product.delete`
- **Request Body:** `DeleteManyDto`
- **Response:**
  - `200 OK`: Xóa thành công (trả về `DeletedResponse<null>`)

### 2.6. Xóa sản phẩm
- **Endpoint:** `DELETE /organizations/:orgId/products/:id`
- **Mô tả:** Xóa một sản phẩm (Soft Delete).
- **Quyền:** `product.delete`
- **Response:**
  - `200 OK`: Xóa thành công (trả về `DeletedResponse<null>`)

## 3. Data Structures

### IProduct
```typescript
interface IProduct {
    id: string;
    organization_id: string;
    name: string;
    sku: string;
    description?: string;
    image_url?: string;
    barcode?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    max_weight_capacity?: number;
    cost_price?: number;
    base_unit_id: string;
    base_unit: {
        id: string;
        name: string;
    };
    units?: Array<{
        id: string;
        product_id: string;
        unit_id: string;
        conversion_rate: number;
        barcode?: string;
        unit: {
            id: string;
            name: string;
        };
    }>;
    is_active: boolean;
    created_at: Date;
    updated_at?: Date;
}
```
