# Phân chia 6 phần code cho 6 người — GEN-HUB

## Mục tiêu

Chia 6 domain source code lớn thành 6 phần cho 6 người, để mỗi người chịu trách nhiệm rõ ràng khi chạy demo và trả lời câu hỏi.

---

## 1. BẢO — Customer Marketplace & Booking (Frontend)

### Domain chính

- Public landing page + search kho
- Trang chi tiết kho
- Booking / rental request
- Customer dashboard

### File/route chính

- `client/app/(public)/kho-bai/page.tsx`
- `client/app/(public)/kho-bai/[slug]/page.tsx`
- `client/app/(auth)/login/*`
- `client/app/(protected)/dashboard/customer/*`
- `client/services/*` (booking, inventory types)

### Demo responsibility

- Giải thích luồng customer đi từ marketplace đến booking
- Show dữ liệu kho, filter, đặt thuê, trạng thái booking
- Hỗ trợ Khoa khi cần test API hoặc backend

---

## 2. THÁI — 3D Warehouse & Floor (CHÍNH)

### Domain chính

- Warehouse 3D view, warehouse floor
- Sơ đồ kho, vị trí hàng hóa, trực quan hóa inbound/outbound
- Tích hợp các flow staff/organization với 3D

### File/route chính

- `client/app/(protected)/warehouse-3d/*` (chính)
- `client/app/(protected)/warehouse-floor/*`
- `client/components/dashboard/warehouse-template/*`

### Demo responsibility

- Trình bày trực quan 3D warehouse, sơ đồ kho
- Giải thích cách các flow inbound/outbound mapping lên 3D
- Hỗ trợ các bạn khác khi cần show warehouse trực quan

---

## 3. NAM — Organization Onboarding & Warehouse Setup

### Domain chính

- Organization dashboard
- Warehouse quản lý và cấu hình
- Roles/permissions cho staff

### File/route chính

- `client/app/(protected)/dashboard/organization/page.tsx`
- `client/components/dashboard/organization/*`
- `client/app/(protected)/dashboard/organization/warehouses/*`
- `client/app/(protected)/dashboard/organization/roles/*`

### Demo responsibility

- Show Org owner view sau khi admin duyệt
- Giải thích thiết lập kho, thông tin kho và phân quyền staff

---

## 4. KHOA — Toàn bộ Server (Backend chính)

### Domain chính

- Toàn bộ server NestJS backend: API, modules, services, Prisma, migrations, seeders
- Product catalog, units
- Purchase order / inbound request
- Stock management, alerts

### File/route chính

- `server/src/*` (toàn bộ backend)
- `server/prisma/*`
- `client/app/(protected)/dashboard/organization/products/*`
- `client/app/(protected)/dashboard/organization/units/*`
- `client/app/(protected)/dashboard/organization/purchase-order/*`
- `client/app/(protected)/dashboard/organization/stock/*`
- `client/app/(protected)/dashboard/organization/partners/*`

### Demo responsibility

- Chịu trách nhiệm toàn bộ backend: API, logic, database
- Trả lời mọi câu hỏi về server, database, API
- Hỗ trợ Nam khi cần test API hoặc backend

---

## 5. ĐỨC ANH — Staff Operations

### Domain chính

- Staff dashboard
- Inbound/outbound workflow
- Kết nối với warehouse floor/3D (phối hợp với Thái)

### File/route chính

- `client/app/(protected)/dashboard/staff/page.tsx`
- `client/app/(protected)/dashboard/staff/inbound/*`
- `client/app/(protected)/dashboard/staff/outbound/*`

### Demo responsibility

- Show staff xử lý inbound, outbound
- Phối hợp với Thái khi cần show warehouse floor/3D

---

## 6. HƯNG — CRUD & Hỗ trợ vận hành

### Domain chính

- Các chức năng CRUD (tạo, sửa, xóa, xem) cho các entity chính: users, products, warehouses, contracts, v.v.
- Hỗ trợ vận hành, test run, bug tracker, tổng kết closing

### File/route chính

- `client/app/(protected)/dashboard/admin/users/*`
- `client/app/(protected)/dashboard/organization/products/*`
- `client/app/(protected)/dashboard/organization/warehouses/*`
- `client/app/(protected)/dashboard/organization/contracts/*`
- `client/app/(protected)/dashboard/organization/payment/*`
- Các file CRUD liên quan khác

### Demo responsibility

- Trình bày các thao tác CRUD: tạo, sửa, xóa, xem
- Hỗ trợ mọi người khi gặp sự cố demo
- Tổng kết closing khi cần

### Lưu ý

- Hưng vừa làm CRUD vừa hỗ trợ QA/support, không chỉ test mà còn thao tác thực tế
