# 🎬 KỊCH BẢN DEMO BẢO VỆ DỰ ÁN — GEN-HUB

### Nhóm 72 | Thái · Nam · Bảo · Khoa · Đức Anh · Hưng

> **Tổng thời gian dự kiến:** 40–50 phút  
> **Nguyên tắc:** Mỗi người trình bày section của mình, không nhảy cóc sang section khác. Nếu hội đồng hỏi ngoài phần mình, chỉ trả lời ngắn và chuyển lại cho người phụ trách.

---

## 🗺️ SƠ ĐỒ TỔNG QUAN LUỒNG DEMO

```
[THÁI]               [NAM]                [BẢO]                 [KHOA]               [ĐỨC ANH]           [HƯNG]
Giới thiệu      →   Customer tìm       →  Admin duyệt       →  Org nhập kho      →  Staff xử lý      →  Finance &
& Admin Panel       kho + đặt thuê        + Org setup           Inventory             thực tế              Revenue
(5-7 phút)          (7-8 phút)            (7-8 phút)            (6-7 phút)            (7-8 phút)           (6-7 phút)
```

---

## 🚩 PHÂN CÔNG — "CẮM CỜ"

| Section                                      | Người trình bày | Role hệ thống demo         |
| -------------------------------------------- | --------------- | -------------------------- |
| 1. Giới thiệu & Admin Dashboard              | 🚩 **THÁI**     | Admin                      |
| 2. Customer Journey (Tìm kho → Đặt thuê)     | 🚩 **NAM**      | Customer                   |
| 3. Admin duyệt → Org Setup & Warehouse       | 🚩 **BẢO**      | Admin → Organization Owner |
| 4. Inventory & Stock Management              | 🚩 **KHOA**     | Organization Owner         |
| 5. Staff Operations (Inbound/Outbound Floor) | 🚩 **ĐỨC ANH**  | Staff                      |
| 6. Finance, Revenue & Closing                | 🚩 **HƯNG**     | Organization Owner + Admin |

---

## 📋 CHI TIẾT TỪNG SECTION

---

### 🚩 SECTION 1 — THÁI: Giới thiệu & Admin Dashboard

**Thời gian:** ~5–7 phút  
**Tài khoản cần sẵn:** Admin account (đã đăng nhập sẵn)

#### Bước 1.1 — Giới thiệu dự án (1 phút)

- Trình bày nhanh: GEN-HUB là gì? Giải quyết bài toán gì?
- Nêu 4 actor chính: **Admin / Customer / Organization / Staff**
- Nêu tech stack ngắn gọn: NestJS · Next.js · PostgreSQL · Redis · Prisma

#### Bước 1.2 — Admin Dashboard tổng quan (2–3 phút)

- Truy cập `/dashboard/admin`
- Trỏ vào **AdminHeroKPIs**: Tổng revenue, tổng kho đang hoạt động, tổng users, tổng hợp đồng
- Trỏ vào **AdminRevenueChart**: biểu đồ Doanh thu vs Thực thu
- Trỏ vào **AdminWarehouseHeatmap**: bản đồ nhiệt kho bãi theo tỉnh thành
- Trỏ vào **AdminActionableInbox**: danh sách việc cần xử lý ngay (yêu cầu duyệt tổ chức, kho)

#### Bước 1.3 — Quản lý Users & Organizations (1–2 phút)

- Vào `/dashboard/admin/users` — hiển thị danh sách người dùng hệ thống
- Vào `/dashboard/admin/organization` — hiển thị danh sách tổ chức (có trạng thái pending/active)

> ⚠️ **TRÁNH:** Đừng thao tác delete user hoặc ban account trong lúc demo — dễ lỗi nếu dữ liệu mock chưa clean.

---

### 🚩 SECTION 2 — NAM: Customer Journey

**Thời gian:** ~7–8 phút  
**Tài khoản cần sẵn:** Một customer account mới (chưa có booking), hoặc account có booking sẵn để show

#### Bước 2.1 — Trang chủ Public (1 phút)

- Mở trang chủ `/` (homepage)
- Trỏ qua các section: **Hero**, **Featured warehouses**, **Search**, **Testimonials**, **FAQ**
- Nhấn mạnh: đây là mặt tiền marketplace kết nối customer với kho bãi

#### Bước 2.2 — Tìm kiếm kho (1–2 phút)

- Vào `/kho-bai` (danh sách kho)
- Demo **filter**: theo tỉnh/thành, diện tích, loại hàng, tiện ích
- Click vào 1 kho cụ thể → xem trang chi tiết kho (`/kho-bai/[slug]`)
- Trỏ vào: tên kho, địa chỉ, ảnh, tiện ích (amenities), giá thuê, addons

#### Bước 2.3 — Đăng nhập / Đăng ký (1 phút)

- Vào `/login` (nếu chưa đăng nhập)
- Nhanh chóng login bằng tài khoản customer đã chuẩn sẵn
- **KHÔNG** demo luồng đăng ký từ đầu trong lúc demo (mất thời gian verify email)

#### Bước 2.4 — Đặt kho / Booking (2–3 phút)

- Từ trang chi tiết kho → nhấn **"Đặt kho ngay"** / **Booking**
- Điền thông tin: thời gian thuê, diện tích, addons cần thêm
- Xem **bảng tính giá** (rental duration tier, addons)
- Submit booking request → hệ thống gửi yêu cầu về cho Admin duyệt

#### Bước 2.5 — Customer Dashboard (1 phút)

- Vào `/dashboard/customer` (hoặc `/dashboard/customer/bookings`)
- Show danh sách booking: trạng thái **pending/active/completed**
- Trỏ vào notifications: nhận thông báo realtime khi booking được duyệt

> ⚠️ **TRÁNH:** Không demo luồng reset password hay verify email — thường chờ lâu và dễ timeout trong demo.

---

### 🚩 SECTION 3 — BẢO: Admin duyệt + Organization Setup

**Thời gian:** ~7–8 phút  
**Tài khoản cần sẵn:** Admin account + Organization owner account (đã setup sẵn)

#### Bước 3.1 — Admin duyệt Organization (1–2 phút)

- Đăng nhập lại Admin account
- Vào `/dashboard/admin/organization` → tab **Chờ duyệt**
- Click vào một yêu cầu đăng ký tổ chức → xem thông tin: tên công ty, mã số thuế, giấy phép kinh doanh
- Nhấn **Duyệt** → status chuyển sang `ACTIVE`
- Trỏ vào **Notification realtime**: tổ chức nhận được thông báo ngay

#### Bước 3.2 — Admin duyệt Warehouse (1 phút)

- Vào `/dashboard/admin/warehouses` → show kho đang chờ duyệt
- Duyệt kho → kho xuất hiện trên marketplace public

#### Bước 3.3 — Organization Dashboard (1–2 phút)

- Chuyển sang tài khoản Organization Owner
- Vào `/dashboard/organization` → **CustomerDashboardOverview**
- Trỏ vào: **KPIs tồn kho, Stock Flow chart, Top Products, Shipments, Stock Alerts**

#### Bước 3.4 — Tạo & Quản lý Warehouse (2–3 phút)

- Vào `/dashboard/organization/warehouses`
- Show danh sách kho đang quản lý
- Click vào 1 kho → xem chi tiết: thông tin kho, tiện ích, addons, hình ảnh
- **Nếu có sẵn:** show phần setup warehouse layout (rack, shelf, block template)
- Vào `/dashboard/organization/roles` → show phân quyền cho Staff

> ⚠️ **TRÁNH:** Không demo tạo kho mới từ đầu (upload ảnh, chờ duyệt) — có thể gây trễ luồng demo. Dùng kho đã có sẵn.

---

### 🚩 SECTION 4 — KHOA: Inventory & Stock Management

**Thời gian:** ~6–7 phút  
**Tài khoản cần sẵn:** Organization Owner account (đã có kho hoạt động)

#### Bước 4.1 — Quản lý Products & Units (1 phút)

- Vào `/dashboard/organization/products`
- Show danh sách sản phẩm: tên, SKU, đơn vị, mô tả
- Vào `/dashboard/organization/units` → đơn vị tính (kg, cái, thùng...)

#### Bước 4.2 — Tạo Inbound Request / Purchase Order (2–3 phút)

- Vào `/dashboard/organization/purchase-order`
- **Tạo mới Purchase Order:** chọn sản phẩm, nhập số lượng, chọn kho nhận
- Submit → PO có trạng thái **PENDING**
- Giải thích: PO này sẽ được Staff xử lý ở bước tiếp theo

#### Bước 4.3 — Stock Management (1–2 phút)

- Vào `/dashboard/organization/stock`
- Show tồn kho hiện tại: sản phẩm, số lượng, vị trí trong kho
- Trỏ vào: **Stock Alerts** (hàng sắp hết, hàng tồn lâu)

#### Bước 4.4 — Đối tác & Liên kết (1 phút)

- Vào `/dashboard/organization/partners`
- Show danh sách đối tác (supplier/shipper) đã kết nối
- Giải thích: đây là mạng lưới vận hành của tổ chức

> ⚠️ **TRÁNH:** Nếu stock page bị lỗi filter hay pagination, chỉ trỏ qua bức tranh tổng quan rồi tiếp tục. Không dừng lại xử lý bug trực tiếp.

---

### 🚩 SECTION 5 — ĐỨC ANH: Staff Operations (Warehouse Floor)

**Thời gian:** ~7–8 phút  
**Tài khoản cần sẵn:** Staff account (được gán vào kho của Org đã setup ở Section 3)

#### Bước 5.1 — Staff Dashboard Overview (30 giây)

- Vào `/dashboard/staff`
- Show 4 quick actions: Nhập kho, Xuất kho, Sản phẩm, Kho hàng

#### Bước 5.2 — Luồng Nhập Kho (Inbound) — ★ ĐIỂM NHẤN CHÍNH (3–4 phút)

- Vào `/dashboard/staff/inbound`
- Thấy phiếu nhập kho (PO) do Org tạo ở Section 4 → trạng thái **PENDING**

**Chạy full flow inbound step-by-step:**

1. Admin/Org **duyệt phiếu** → trạng thái: `APPROVED`
2. Staff nhấn **"Bắt đầu kiểm đếm"** → trạng thái: `RECEIVING_STARTED`
3. Staff điền số lượng thực nhận so với PO (scan barcode nếu có)
4. Staff xác nhận kiểm đếm → trạng thái: `RECEIVING_CONFIRMED`
5. Staff thực hiện **Putaway** (đưa hàng vào đúng vị trí kệ trong kho)
6. Xác nhận Putaway → trạng thái: `COMPLETED` (hàng vào tồn kho)

> 🔥 **Nhấn mạnh:** Realtime notification — khi Staff cập nhật, Org nhận thông báo ngay không cần refresh.

#### Bước 5.3 — Warehouse Floor (1–2 phút)

- Vào `/warehouse-floor` (hoặc từ staff inbound detail)
- Show **giao diện sơ đồ kho**: rack, shelf, block, vị trí đặt hàng
- Nếu có **3D view** (`/warehouse-3d/[warehouseId]`) → show nhanh để tạo ấn tượng

#### Bước 5.4 — Luồng Xuất Kho (Outbound) (1–2 phút)

- Vào `/dashboard/staff/outbound`
- Show phiếu xuất kho: trạng thái từ `APPROVED` → `PICKING` → `CHECKING` → `SHIPMENT_COMPLETED`
- Giải thích: nhân viên picking lấy hàng đúng vị trí, QC kiểm tra, đóng gói, giao shipper

> ⚠️ **TRÁNH:** Nếu barcode scan không hoạt động trên máy demo (camera issues), bỏ qua phần đó và nhập thủ công.  
> ⚠️ **TRÁNH:** Nếu Warehouse Floor 3D bị lag hoặc không load, bỏ qua và tiếp tục — đừng chờ quá 10 giây.

---

### 🚩 SECTION 6 — HƯNG: Finance, Revenue & Closing

**Thời gian:** ~6–7 phút  
**Tài khoản cần sẵn:** Organization Owner account + Admin account

#### Bước 6.1 — Hợp đồng & Thanh toán (Org side) (2 phút)

- Vào `/dashboard/organization/contracts`
- Show danh sách hợp đồng thuê kho: hợp đồng active từ booking ở Section 2
- Click vào 1 hợp đồng: xem kỳ thanh toán, số tiền, trạng thái
- Vào `/dashboard/organization/payment`
- Show lịch sử thanh toán: transaction history, trạng thái paid/pending

#### Bước 6.2 — Org Balance & Coupon (1 phút)

- Trỏ vào số dư Organization balance
- Vào `/dashboard/admin/coupons` (Admin) → show hệ thống coupon platform
- Giải thích: platform tặng voucher cho khách hàng thuê kho, tổ chức nhận ưu đãi

#### Bước 6.3 — Refund Requests (1 phút)

- Vào `/dashboard/organization/refund-requests`
- Show quy trình: Org tạo yêu cầu hoàn tiền → Admin xét duyệt
- Trỏ vào `/dashboard/admin/refund-requests` (Admin side): phê duyệt/từ chối

#### Bước 6.4 — Revenue Analytics (Admin) (1–2 phút)

- Đăng nhập Admin, vào `/dashboard/admin/revenue`
- Show biểu đồ doanh thu theo kỳ (ngày/tuần/tháng)
- Nhấn mạnh: Admin có cái nhìn toàn cục về toàn bộ nền tảng

#### Bước 6.5 — Closing (30 giây)

- Tóm tắt nhanh: đã demo đủ 4 actor, end-to-end từ tìm kho → thuê → vận hành → thanh toán
- Nhấn mạnh giá trị: **một hệ sinh thái khép kín** cho thuê kho, fulfillment và vận hành

## 🚨 PHƯƠNG ÁN DỰ PHÒNG (Contingency Plan)

| Tình huống                           | Xử lý                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Server không khởi động được          | Dùng video recording đã quay sẵn của flow đó                                                                      |
| Trang bị lỗi 500/404                 | Skip ngay, chuyển sang bước tiếp theo, giải thích ngắn "tính năng này đã implement, đang trong giai đoạn ổn định" |
| Realtime notification không hiển thị | Refresh tay và tiếp tục — không dừng lại debug                                                                    |
| 3D Warehouse bị lag/trắng màn hình   | Bỏ qua, show ảnh screenshot đã chụp sẵn thay thế                                                                  |
| Barcode scan không hoạt động         | Nhập số lượng thủ công                                                                                            |
| Hội đồng hỏi tính năng chưa làm      | Trả lời thẳng: "Tính năng này nằm trong roadmap, chúng em đã thiết kế nhưng chưa hoàn thiện trong sprint này"     |

## 📌 LƯU Ý CHUNG CHO CẢ NHÓM

1. **Không improvise** — chạy đúng kịch bản đã luyện, không tự thêm tính năng chưa test
2. **Thời gian là vàng** — mỗi section có đồng hồ bấm giờ, người tiếp theo sẵn sàng ngay
3. **Không xin lỗi về bug** — nói ngắn gọn "đây là known issue đang được xử lý" rồi tiếp tục
4. **Bàn giao màn hình mượt** — người trình bày tiếp theo đã ngồi sẵn cạnh máy
5. **Realtime là highlight** — khi notification hiện lên tự nhiên, đó là điểm ấn tượng nhất — chỉ rõ cho hội đồng thấy
6. **Thứ tự demo phản ánh business logic** — luôn giải thích "tại sao phải làm bước này trước"
