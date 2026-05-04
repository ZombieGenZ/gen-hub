# Workflow nghiệp vụ cho 6 anh em — GEN-HUB

## Mục tiêu

Vẽ lại full nghiệp vụ end-to-end để 6 anh em hiểu rõ luồng xử lý và phần code từng người cần nắm.

---

## 6 actor chính trong demo

## 6 actor chính trong demo

- **Thái:** 3D Warehouse & Floor (chính)
- **Nam:** Customer marketplace & booking (frontend), hỗ trợ backend khi cần
- **Bảo:** Organization owner setup kho và phân quyền
- **Khoa:** Toàn bộ server/backend (NestJS, Prisma, API, DB)
- **Đức Anh:** Staff xử lý inbound/outbound
- **Hưng:** CRUD & hỗ trợ vận hành

---

3.  **Khoa (Toàn bộ server/backend)**
    - Chịu trách nhiệm toàn bộ server NestJS backend: API, modules, services, Prisma, migrations, seeders
    - Quản lý product catalog và đơn vị hàng hóa
    - Tạo purchase order / inbound request cho kho
    - Theo dõi tồn kho, cảnh báo stock
    - Trả lời mọi câu hỏi về server, database, API
    - Hỗ trợ Nam khi cần test API hoặc backend
      flowchart LR
      C[Customer tìm kho<br/>và đặt booking] --> O[Organization owner<br/>setup kho & roles]
      O --> I[Inventory/PO<br/>do Khoa quản lý]
      I --> S[Staff xử lý<br/>Inbound & Outbound]
      S --> T[3D Warehouse & Floor<br/>(Thái trình bày chính)]
      T --> F[Finance & Revenue<br/>tổng kết]

            subgraph M[Support]
               H[Hưng: QA/Test run,<br/>bug & closing]
            end

            H -. giám sát .-> C
            H -. giám sát .-> O
            H -. giám sát .-> I
            H -. giám sát .-> S
            H -. giám sát .-> T

```

---

## Giải thích full nghiệp vụ

1. **Customer (Nam)**
   - Tìm kho trên marketplace, xem chi tiết kho
   - Tạo booking / rental request
   - Theo dõi trạng thái booking trên dashboard customer

2. **Organization owner (Bảo)**
   - Show dashboard org sau khi được duyệt
   - Quản lý kho, thiết lập thông tin kho, phân quyền nhân sự
   - Chuẩn bị kho cho staff bằng dữ liệu sản phẩm, đơn vị, PO

3. **Inventory / PO (Khoa)**
   - Quản lý product catalog và đơn vị hàng hóa
   - Tạo purchase order / inbound request cho kho
   - Theo dõi tồn kho, cảnh báo stock

4. **Staff (Đức Anh)**
   - Nhận PO inbound, xử lý kiểm đếm và putaway
   - Thực hiện outbound: picking, checking, giao hàng
   - Phối hợp với Thái khi cần show warehouse floor/3D

5. **3D Warehouse & Floor (Thái)**
   - Trình bày trực quan 3D warehouse, sơ đồ kho
   - Mapping các flow inbound/outbound lên 3D
   - Hỗ trợ các bạn khác khi cần show warehouse trực quan

6. **Hưng (CRUD & hỗ trợ vận hành)**
   - Thực hiện các thao tác CRUD (tạo, sửa, xóa, xem) cho users, products, warehouses, contracts, v.v.
   - Hỗ trợ vận hành, test run, bug tracker
   - Tổng kết closing khi cần
   - Hỗ trợ mọi người khi gặp sự cố demo

---

## Mapping nghiệp vụ sang code

- `Customer`: `client/app/(public)` + `client/app/(protected)/dashboard/customer`
- `Admin`: `client/app/(protected)/dashboard/admin` + `client/components/dashboard/admin`
- `Organization`: `client/app/(protected)/dashboard/organization` + `client/components/dashboard/organization`
- `Inventory`: `client/app/(protected)/dashboard/organization/products` + `purchase-order` + `stock`

- `Staff`: `client/app/(protected)/dashboard/staff`
- `3D Warehouse & Floor`: `client/app/(protected)/warehouse-3d` + `client/app/(protected)/warehouse-floor` + `client/components/dashboard/warehouse-template`

---

## Gợi ý luyện tập

- Chạy từ **Customer → Admin → Org → Inventory → Staff** theo đúng trình tự
- Mỗi người học phần code của mình và signal khi hoàn xong để người kế tiếp vào luôn
- Hưng làm checklist bug, ghi issue ngay khi chạy test
```
