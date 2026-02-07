# Warehouse Manager View Module Documentation

## Tổng Quan

Module `warehouse-manager-view` cung cấp các API cho Warehouse Manager xem thông tin chi tiết về kho, bao gồm cấu trúc vật lý (rows, racks, shelves, blocks) của các kho được tạo từ template mà họ quản lý.

## Danh sách API

### 1. Quản lý Kho (Warehouses)

#### 1.1. Lấy danh sách kho theo Template
- **Endpoint:** `GET /warehouse-managers/templates/:templateId/warehouses`
- **Mô tả:** Lấy danh sách các kho thực tế thuộc về một Warehouse Template.
- **Quyền hạn:** `warehouse.view`
- **Parameters:**
  - `templateId` (path, required): ID của kho mẫu.
  - `page` (query): Trang hiện tại.
  - `limit` (query): Số lượng item mỗi trang.
  - `keywords` (query): Tìm kiếm theo tên hoặc mô tả.
  - `is_active` (query): Lọc theo trạng thái hoạt động.

#### 1.2. Lấy chi tiết Kho
- **Endpoint:** `GET /warehouse-managers/templates/:templateId/warehouses/:warehouseId`
- **Mô tả:** Lấy thông tin chi tiết của một kho cụ thể.
- **Quyền hạn:** `warehouse.view`
- **Parameters:**
  - `templateId` (path, required): ID của kho mẫu.
  - `warehouseId` (path, required): ID của kho thực tế.

### 2. Quản lý Dãy (Rows)

#### 2.1. Lấy danh sách Dãy
- **Endpoint:** `GET /warehouse-managers/templates/:templateId/warehouses/:warehouseId/rows`
- **Mô tả:** Lấy danh sách các dãy trong một kho.
- **Quyền hạn:** `warehouse.view`

#### 2.2. Lấy chi tiết Dãy
- **Endpoint:** `GET /warehouse-managers/templates/:templateId/warehouses/:warehouseId/rows/:rowId`
- **Mô tả:** Lấy thông tin chi tiết của một dãy.

### 3. Quản lý Giá (Racks)

#### 3.1. Lấy danh sách Giá
- **Endpoint:** `GET /warehouse-managers/templates/:templateId/warehouses/:warehouseId/rows/:rowId/racks`
- **Mô tả:** Lấy danh sách các giá trong một dãy.
- **Quyền hạn:** `warehouse.view`

#### 3.2. Lấy chi tiết Giá
- **Endpoint:** `GET /warehouse-managers/templates/:templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId`
- **Mô tả:** Lấy thông tin chi tiết của một giá.

### 4. Quản lý Tầng (Shelves)

#### 4.1. Lấy danh sách Tầng
- **Endpoint:** `GET /warehouse-managers/templates/:templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves`
- **Mô tả:** Lấy danh sách các tầng trong một giá.
- **Quyền hạn:** `warehouse.view`

#### 4.2. Lấy chi tiết Tầng
- **Endpoint:** `GET /warehouse-managers/templates/:templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves/:shelfId`
- **Mô tả:** Lấy thông tin chi tiết của một tầng.

### 5. Quản lý Ô (Blocks)

#### 5.1. Lấy danh sách Ô
- **Endpoint:** `GET /warehouse-managers/templates/:templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks`
- **Mô tả:** Lấy danh sách các ô trong một tầng.
- **Quyền hạn:** `warehouse.view`

#### 5.2. Lấy chi tiết Ô
- **Endpoint:** `GET /warehouse-managers/templates/:templateId/warehouses/:warehouseId/rows/:rowId/racks/:rackId/shelves/:shelfId/blocks/:blockId`
- **Mô tả:** Lấy thông tin chi tiết của một ô.
