# 🎬 KỊCH BẢN DEMO CHO 6 ANH EM — GEN-HUB

> **Tổng thời gian dự kiến:** 40–50 phút  
> **Mục tiêu:** Demo rõ 6 domain chính để bảo vệ dự án, mỗi người cầm 1 phần code/luồng nghiệp vụ.

---

## 🚩 6 PHẦN DEMO CHÍNH

| Phần | Người trình bày | Nội dung chính                                     |
| ---- | --------------- | -------------------------------------------------- |
| 1    | **THÁI**        | Admin Platform + Dashboard quản trị                |
| 2    | **BẢO**         | Customer Marketplace + Booking                     |
| 3    | **NAM**         | Organization Onboarding + Warehouse Setup          |
| 4    | **KHOA**        | Inventory Management + Purchase Order + Server/API |
| 5    | **ĐỨC ANH**     | Staff Floor Operations: Inbound/Outbound           |
| 6    | **HƯNG**        | CRUD, hỗ trợ vận hành, test run, tổng kết closing  |

> **HƯNG**: Phụ trách các thao tác CRUD (tạo, sửa, xóa, xem), hỗ trợ vận hành, test run, bug tracker, tổng kết closing và hỗ trợ mọi người khi gặp sự cố demo.

---

## 1. THÁI — Admin Platform & Dashboard

**Thời gian:** 6–7 phút

1. Mở `Admin Dashboard` tại `/dashboard/admin`
2. Trình bày nhanh giá trị platform: quản lý người dùng, tổ chức, kho bãi, doanh thu
3. Show các widget chính:
   - `AdminHeroKPIs`
   - `AdminRevenueChart`
   - `AdminWarehouseHeatmap`
   - `AdminActionableInbox`
4. Vào `/dashboard/admin/organization` để show yêu cầu chờ duyệt
5. Vào `/dashboard/admin/users` để show quản lý user hệ thống

> Không thao tác xóa user/kho trong demo, chỉ show read-only và duyệt.

---


## 2. BẢO — Customer Marketplace & Booking

**Thời gian:** 7–8 phút

1. Mở trang public marketplace `/` hoặc `/kho-bai`
2. Demo tìm kho qua filter tỉnh/thành, diện tích, tiện ích
3. Vào trang chi tiết kho `/kho-bai/[slug]`
4. Đăng nhập nhanh với customer account đã chuẩn bị
5. Tạo booking/đặt kho, chọn thời gian thuê, addons, submit request
6. Vào `/dashboard/customer/bookings` để show trạng thái request

> Tránh demo đăng ký mới, reset password hoặc verify email.

---


## 3. NAM — Organization Onboarding & Warehouse Setup

**Thời gian:** 7–8 phút

1. Với tài khoản Admin, show duyệt tổ chức tại `/dashboard/admin/organization`
2. Duyệt warehouse chờ active trên `/dashboard/admin/warehouses`
3. Đăng nhập Organization Owner
4. Show overview tại `/dashboard/organization`
5. Vào `/dashboard/organization/warehouses` để show kho đã active
6. Vào `/dashboard/organization/roles` để show phân quyền staff

> Dùng kho đã chuẩn bị sẵn, không demo tạo kho mới từ đầu.

---

## 4. KHOA — Inventory Management & Purchase Order

**Thời gian:** 6–7 phút

1. Vào `/dashboard/organization/products` show danh sách sản phẩm
2. Vào `/dashboard/organization/units` show đơn vị tính
3. Tạo `Purchase Order` mới tại `/dashboard/organization/purchase-order`
4. Submit PO và giải thích luồng PENDING → APPROVED → Stock
5. Vào `/dashboard/organization/stock` show tồn kho, alerts, vị trí hàng
6. Show `/dashboard/organization/partners` nếu cần để làm rõ hệ sinh thái vận hành

> Nếu một page filter/pagination bug, chỉ show overview rồi chuyển tiếp.

---

## 5. ĐỨC ANH — Staff Floor Operations

**Thời gian:** 7–8 phút

1. Vào `/dashboard/staff` show quick actions
2. Vào `/dashboard/staff/inbound` để chạy flow nhập kho
3. Demo các bước inbound:
   - Admin/Org duyệt PO → APPROVED
   - Start receiving
   - Xác nhận số lượng
   - Confirm receipt
   - Putaway và hoàn thành
4. Vào `/warehouse-floor` hoặc `warehouse-3d` để show sơ đồ kho/đường đi
5. Vào `/dashboard/staff/outbound` show luồng xuất kho từ picking → checking → shipment

> Nếu barcode scan hoặc 3D view không ổn, nhập thủ công, show sơ đồ tĩnh.

---

## TEST RUN & QUẢN LÝ BUG

- Chạy toàn bộ kịch bản ít nhất **3 lần** trước ngày bảo vệ
- Mỗi lần ghi lại:
  - Thời điểm chạy
  - Ai trình bày
  - Issue/bug phát hiện
  - Phần nào cần skip
- Nếu chức năng chưa hoàn, chỉ nói ngắn và chuyển section khác

---

## PHÂN CÔNG CHUẨN BỊ

| Người   | Vai trò demo                             | Chuẩn bị dữ liệu                            |
| ------- | ---------------------------------------- | ------------------------------------------- |
| Thái    | Admin dashboard + organization approvals | Admin account, organization pending         |
| Bảo     | Customer marketplace & booking           | Customer account, kho demo, booking pending |
| Nam     | Org onboarding + warehouse setup         | Org account, kho active, role staff         |
| Khoa    | Inventory + PO + stock                   | Product data, unit data, PO pending         |
| Đức Anh | Staff inbound/outbound + warehouse floor | Staff account, inbound/outbound tasks       |
| Hưng    | QA/test run + tổng kết                   | Giám sát bug, kịch bản dự phòng             |

---

## LƯU Ý GIỚI HẠN TRONG DEMO

- Tránh thao tác destructive (delete, ban, rollback)
- Tránh demo các luồng chưa test / chưa hoàn thiện
- Tập trung vào luồng nghiệp vụ end-to-end
- Nếu gặp lỗi, nói "đây là issue đã ghi nhận" và tiếp tục

---

## TIP DEMO NHANH

1. Chuẩn bị các tab trình duyệt cho mỗi role
2. Giữ 5 phút/section, không lan sang section khác
3. Luôn có người sẵn sàng **_next speaker_**
4. Nhấn mạnh realtime và kết nối giữa các role
