# DEMO AUDIT REPORT — GEN-HUB

> **Ngày kiểm tra:** 2026-05-06
> **Đối chiếu với:** DEMO-SCRIPT.md
> **Người kiểm tra:** Claude Code (tự động)

---

## TỔNG QUAN DỰ ÁN

**GEN-HUB** là nền tảng quản lý kho bãi và cho thuê kho thương mại (DATN — Đồ án tốt nghiệp). Hệ thống được xây dựng theo kiến trúc monorepo với 4 ứng dụng chính:

| Ứng dụng | Công nghệ | Port | Vai trò |
|---|---|---|---|
| `server/` | NestJS 11 + PostgreSQL + Redis + Prisma | 4000 | API backend, business logic, WebSocket |
| `client/` | Next.js 16 + React 19 + Tailwind CSS 4 | 3000 | Frontend chính cho tất cả role |
| `admin/admin-panel/` | Next.js 14 | 3900 | Database/system management panel |
| `status/` | Next.js 16 | 3500 | Status dashboard monitoring |

**Quy mô hệ thống:**
- Backend: 97 domain modules, 100+ Prisma models
- Frontend: Next.js App Router, phân nhóm theo `(public)`, `(auth)`, `(protected)`
- 5 role chính: **Admin / Customer / Organization Owner / Staff / Warehouse Manager**
- Tích hợp: SePay (thanh toán), Gmail API, Gemini/Coze/Dify AI, Discord, Socket.io realtime, Three.js 3D, Mapbox GL

**Team:** TANK ZENITH GEN — 6 thành viên (Thái, Bảo, Nam, Khoa, Đức Anh, Hưng)

---

## KẾT QUẢ TỔNG HỢP

| Hạng mục kiểm tra | Kết quả |
|---|---|
| Routes client theo DEMO-SCRIPT (21/21) | ✅ 100% tồn tại |
| Admin dashboard components (4/4) | ✅ Đầy đủ, implement thực |
| Server API cho inbound/outbound | ✅ Đầy đủ step-by-step |
| Server API cho inventory/products/units/partners | ✅ Đầy đủ CRUD |
| Public warehouse listing (marketplace) | ✅ Có, endpoint `/warehouse-templates` |
| Purchase Order module | ✅ Tích hợp trong Inbound Request |
| Warehouse Floor step-by-step | ✅ Counter → Putaway → Picking → QC |
| Warehouse 3D (Three.js) | ✅ Đầy đủ React Three Fiber |
| Cấu hình .env files | ⚠️ Cần xác nhận trước demo |
| Customer self-booking flow | ⚠️ Cần kiểm tra permission |

---

## PHẦN 1 — THÁI: Admin Platform & Dashboard

**Trạng thái: ✅ SẴN SÀNG**

Tất cả 4 widget được implement đầy đủ, không phải placeholder hay stub:

| Component | File | Chức năng |
|---|---|---|
| `AdminHeroKPIs` | `components/dashboard/admin/AdminHeroKPIs.tsx` | 4 KPI cards: Tổng Kho, Đơn chờ duyệt, Khách hàng, Doanh thu tháng — có animation framer-motion, link navigation |
| `AdminRevenueChart` | `components/dashboard/admin/AdminRevenueChart.tsx` | BarChart recharts, toggle 6m/12m, expected vs actual revenue, custom tooltip |
| `AdminWarehouseHeatmap` | `components/dashboard/admin/AdminWarehouseHeatmap.tsx` | Top doanh thu & lấp đầy, danh sách kho trống cần push, nút tạo coupon |
| `AdminActionableInbox` | `components/dashboard/admin/AdminActionableInbox.tsx` | 4 tabs: Hỗ trợ / Cập nhật Tổ chức / Hoàn tiền / Lịch hẹn kho — có badge đếm, AdminQuickActionDrawer |

**Layout trang admin** (`app/(protected)/dashboard/admin/page.tsx`):
- ZONE 1 (full-width): Hero KPIs
- ZONE 2–4 (2 cột): Actionable Inbox + Revenue Chart + Warehouse Heatmap | System Health + Activity Feed

**Routes admin bổ sung có sẵn (không cần demo nhưng đã build):**
`/admin/approval`, `/admin/contracts`, `/admin/coupons`, `/admin/customers`, `/admin/revenue`, `/admin/refund-requests`, `/admin/warehouse-visits`, v.v.

**Server API:**
- `GET /admin/dashboard/overview` — 4 metrics chính
- `GET/PATCH /admin/users` — quản lý user, ban/unban/warn
- `GET /organizations` — list org, hỗ trợ filter
- `PUT /organizations/:id` — update/approve org

---

## PHẦN 2 — BẢO: Customer Marketplace & Booking

**Trạng thái: ✅ Routes đầy đủ | ⚠️ Xác nhận luồng submit booking**

**Marketplace (public, không cần login):**

Server dùng module `warehouse-template` (không phải `warehouse`) cho public listing:
- `GET /warehouse-templates` — decorator `@Public()`, filter: `province_id`, `rental_status` (AVAILABLE/LOCKED/RENTED), `keywords`, phân trang
- `GET /warehouse-templates/:id` — detail kèm amenities, layout, addon, insurance
- `POST /public/quotation/calculate` — tính giá theo loại thuê, thời gian, addons, coupon — `@Public()`

**Routes client đã xác nhận:**

| Route | Trạng thái |
|---|---|
| `/kho-bai` | ✅ Tồn tại, gọi API warehouse-templates |
| `/kho-bai/[slug]` | ✅ Tồn tại, detail + tính giá |
| `/dashboard/customer/bookings` | ✅ Tồn tại, list booking với detail `/[id]` |

**⚠️ Điểm rủi ro:**
Trên server, `POST /rental-contracts` yêu cầu permission `rental-contract.create` (thường là admin/staff). Cần xác nhận customer account trong demo có permission tự tạo booking không. Nếu chưa rõ, **chuẩn bị sẵn 1 booking ở trạng thái pending** để demo `/dashboard/customer/bookings` thay vì tạo mới live.

---

## PHẦN 3 — NAM: Organization Onboarding & Warehouse Setup

**Trạng thái: ✅ SẴN SÀNG**

| Route | Trạng thái | Ghi chú |
|---|---|---|
| `/dashboard/admin/organization` | ✅ | List + duyệt tổ chức, có `[id]/settings` |
| `/dashboard/admin/warehouses` | ✅ | List + duyệt kho, có `create/` và `[id]/` |
| `/dashboard/organization` | ✅ | Org overview |
| `/dashboard/organization/warehouses` | ✅ | Kho đã active, detail `/[id]` |
| `/dashboard/organization/roles` | ✅ | Phân quyền staff |

**Server API:**
- `GET/PUT /organizations` — list + update/approve
- `GET/PATCH /organizations/:orgId/warehouses` — quản lý kho theo org
- `GET/PATCH /organizations/:id/members` — quản lý thành viên, phân role

---

## PHẦN 4 — KHOA: Inventory Management & Purchase Order

**Trạng thái: ✅ SẴN SÀNG**

> **Lưu ý quan trọng:** "Purchase Order" trong hệ thống được implement là **Inbound Request** trong module `inventory-request`. Không có module PO riêng. UI tại `/dashboard/organization/purchase-order` là danh sách Inbound với field `purchase_order_code` (ví dụ: "PO-2026-001").

**Routes và trạng thái:**

| Route | Trạng thái | Ghi chú |
|---|---|---|
| `/dashboard/organization/products` | ✅ | CRUD + import/export Excel, có `create/` và `[id]/` |
| `/dashboard/organization/units` | ✅ | CRUD đầy đủ |
| `/dashboard/organization/purchase-order` | ✅ | Inbound list, filter theo status, tạo PO mới, import Excel |
| `/dashboard/organization/purchase-order/[id]` | ✅ | Detail, reconciliation table, in phiếu |
| `/dashboard/organization/stock` | ✅ | Tồn kho, alerts, vị trí hàng |
| `/dashboard/organization/partners` | ✅ | CUSTOMER/SUPPLIER filter, detail `/[id]` |

**Status flow PO (Inbound):**
```
PENDING → APPROVED → RECEIVING → PROCESSING → PUTAWAY → COMPLETED
```
Realtime events: `inbound:created`, `inbound:approved`, `inbound:cancelled`, `inbound:receiving-started`, `inbound:receiving-confirmed`, `inbound:putaway-confirmed`

**Server API (đầy đủ):**
- `POST/GET /organizations/:orgId/inventory/inbound` — tạo và list PO
- `PATCH /inbound/:id/approve` — duyệt PO
- `POST /inbound/import` — import batch từ Excel
- `GET /organizations/:orgId/inventory/stock` — tồn kho
- `GET /organizations/:orgId/partners` — đối tác

---

## PHẦN 5 — ĐỨC ANH: Staff Floor Operations

**Trạng thái: ✅ SẴN SÀNG — phần implement mạnh nhất**

### Luồng Inbound (Nhập kho)

```
/dashboard/staff/inbound          → chọn phiếu APPROVED
/warehouse-floor                  → chọn mode "Counter (Kiểm đếm)" → quét barcode
/warehouse-floor/counter          → nhập số lượng thực tế từng sản phẩm
/warehouse-floor/putaway          → xác nhận cất hàng vào vị trí
```

Server endpoints: `start-receiving` → `confirm-receiving` → `confirm-putaway` → `refill-inventory`

### Luồng Outbound (Xuất kho)

```
/dashboard/staff/outbound         → chọn phiếu PENDING
/warehouse-floor/picking          → quét barcode, pick theo location
/warehouse-floor/qc               → QC inspection
→ complete-shipment
```

Server endpoints: `confirm-picking` → `confirm-checking` → `complete-shipment`

**Status flow Outbound:**
```
PENDING → PICKING → CHECKING → PACKED → SHIPPED
```

### Warehouse Floor Main (`/warehouse-floor`)

4 mode hoạt động: Counter (Kiểm đếm) / Putaway (Cất hàng) / Picking (Lấy hàng) / QC (Kiểm tra chất lượng). Có barcode scan input, haptic feedback (`useFloorFeedback`), visual flash overlay.

Sub-routes: `/warehouse-floor/counter`, `/picking`, `/putaway`, `/qc` — tất cả đều có page.tsx thực.

### Warehouse 3D (`/warehouse-3d`)

| Feature | Trạng thái |
|---|---|
| React Three Fiber (`@react-three/fiber`) | ✅ |
| Render racks, boxes, tòa nhà 3D | ✅ `EnhancedRack3D`, `EnhancedBox3D`, `WarehouseBuilding` |
| View modes: default / category / heatmap | ✅ |
| Search + highlight box | ✅ |
| Fill rate legend + stats overlay | ✅ |
| Realtime multiplayer cursor | ✅ WebSocket |
| AI voice commands (Ctrl+M) | ✅ |
| FPS monitor + performance mode | ✅ |
| Alerts panel (low stock, expiring) | ✅ |
| Data từ API thực | ✅ `getLayout()`, `getInventoryStock()` |

**⚠️ Lưu ý:** Kho demo phải có layout block/shelf/rack được setup trong DB. Nếu kho chưa có layout, canvas 3D sẽ hiện trống.

---

## CẤU HÌNH & KHỞI ĐỘNG

### Thứ tự start hệ thống

```bash
# 1. Đảm bảo PostgreSQL đang chạy
# 2. Đảm bảo Redis đang chạy

# Terminal A — Backend
cd D:\DATN_TANK\gen-hub\server
npm run dev                    # port 4000

# Terminal B — Frontend
cd D:\DATN_TANK\gen-hub\client
npm run dev                    # port 3000

# (Tùy chọn) Terminal C — Admin panel
cd D:\DATN_TANK\gen-hub\admin\admin-panel
npm run dev                    # port 3900
```

### Biến môi trường cần kiểm tra

| Biến | File | Mức độ | Giá trị cần |
|---|---|---|---|
| `DATABASE_URL` | `server/.env` | 🔴 Bắt buộc | PostgreSQL connection string |
| `REDIS_URL` | `server/.env` | 🔴 Bắt buộc | Redis connection string |
| `JWT_ACCESS_SECRET` | `server/.env` | 🔴 Bắt buộc | Random secret string |
| `JWT_REFRESH_SECRET` | `server/.env` | 🔴 Bắt buộc | Random secret string |
| `NEXT_PUBLIC_API_URL` | `client/.env.local` | 🔴 Bắt buộc | `http://localhost:4000` |
| `CORS_ORIGINS` | `server/.env` | 🟡 Quan trọng | Phải có `http://localhost:3000` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `client/.env.local` | 🟡 Nếu demo map | Mapbox access token |
| ImageKit keys | `server/.env` | 🟢 Optional | Chỉ cần nếu upload ảnh live |
| Coze/Dify/Gemini keys | `client/.env.local` | 🟢 Optional | Chỉ cần nếu demo AI chatbot |

### Lệnh Prisma (chạy một lần trước demo)

```bash
cd D:\DATN_TANK\gen-hub\server
npm run prisma:migrate:deploy   # apply migrations
npm run prisma:seed             # seed data ban đầu (admin account, etc.)
```

---

## RỦI RO VÀ ĐIỂM XỬ LÝ

### 🔴 Rủi ro cao — xử lý trước ngày bảo vệ

**1. Customer self-booking permission**
Server yêu cầu `rental-contract.create` để submit booking. Cần xác nhận customer account có quyền đó không. Nếu không, flow `tạo booking live` sẽ fail tại bước submit.
- *Fix:* Chuẩn bị sẵn 1 booking pending trong DB, BẢO demo từ `/dashboard/customer/bookings` thay vì tạo mới.

**2. Kho demo thiếu layout 3D**
`/warehouse-3d/[warehouseId]` gọi `getLayout()` từ DB. Kho chưa có block/shelf/rack → canvas trống.
- *Fix:* Seed hoặc tạo thủ công layout cho kho demo trong admin panel trước.

**3. Redis không chạy → Realtime fail**
Socket.io phụ thuộc Redis adapter. Redis down → các realtime event (`inbound:approved`, cursor multiplayer, v.v.) sẽ không hoạt động, có thể gây UI treo.
- *Fix:* Đảm bảo Redis up và health-check trước khi demo.

### 🟡 Rủi ro trung bình

**4. Barcode scan thiếu thiết bị**
`/warehouse-floor/counter`, `/picking`, `/putaway` tích hợp barcode scan. Nếu không có máy scan, nhập mã thủ công vẫn hoạt động.
- *Fix:* Test nhập thủ công trước, hoặc chuẩn bị barcode in sẵn để quét bằng điện thoại.

**5. Prisma migration chưa sync**
Nếu schema.prisma đã thay đổi nhưng migration chưa chạy, server sẽ báo lỗi khi query.
- *Fix:* Chạy `npm run prisma:migrate:deploy` và verify không có error.

**6. `NEXT_PUBLIC_API_URL` trỏ production**
Nếu client `.env.local` đang trỏ `https://api.gen-hub.dev`, mọi request sẽ đi lên server production thay vì local.
- *Fix:* Đổi thành `http://localhost:4000` trước khi chạy dev.

### 🟢 Ổn, không cần lo

- Tất cả 21 routes đều có `page.tsx` thực, không có placeholder
- 4 admin widgets implement đầy đủ, gọi API thực
- Inbound/Outbound step-by-step hoàn chỉnh cả client lẫn server
- TypeScript config hợp lệ
- Next.js image config wildcard `**` — không cần thêm domain

---

## LỖI TIỀM ẨN CHI TIẾT

> Kết quả phân tích tĩnh toàn bộ source code client + server. Mỗi mục ghi rõ file, vấn đề, tác hại thực tế khi demo, và hướng fix.

---

### CLIENT — LỖI NGHIÊM TRỌNG (🔴)

---

**[C-01] AdminSystemHealth widget import nhưng không có trong WIDGETS array**
- **File:** `app/(protected)/dashboard/admin/page.tsx`
- **Vấn đề:** `AdminSystemHealth` được import (dòng 9) và tham chiếu trong `GROUPS` với id `"system-health"` (dòng 34), nhưng không có entry tương ứng trong mảng `WIDGETS` (dòng 17–28).
- **Tác hại demo:** Sidebar admin dashboard bị trống hoàn toàn — THÁI demo đến zone sidebar sẽ thấy khoảng trắng.
- **Fix:** Thêm vào WIDGETS array:
  ```tsx
  { id: "system-health", title: "Tình trạng Hệ thống", component: <AdminSystemHealth />, visible: true }
  ```

---

**[C-02] `requestAnimationFrame` không được cancel khi component unmount — memory leak**
- **File:** `components/warehouse/WarehouseScene.tsx` (dòng 223, 276)
- **Vấn đề:** Hai `useEffect` chạy animation camera dùng `requestAnimationFrame(animate)` đệ quy nhưng không trả về cleanup function.
- **Tác hại demo:** Khi mở/đóng 3D modal nhanh hoặc navigate ra khỏi trang, animation loop tiếp tục chạy → frame drop, browser tab nặng dần, có thể crash tab sau vài phút demo.
- **Fix:**
  ```tsx
  useEffect(() => {
      let id: number;
      const animate = () => { ...; if (progress < 1) id = requestAnimationFrame(animate); };
      id = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(id);
  }, [...]);
  ```

---

**[C-03] WebGL context loss không được bắt — 3D page trắng hoàn toàn**
- **File:** `components/warehouse/WarehouseScene.tsx` (dòng 378–393)
- **Vấn đề:** `<Canvas>` không đăng ký handler `webglcontextlost`. Khi GPU memory hết hoặc browser throttle tab background, WebGL context bị thu hồi.
- **Tác hại demo:** Sau khi minimize trình duyệt hoặc switch tab một lúc rồi quay lại, trang 3D có thể hiện canvas trắng, không có thông báo, không có nút retry.
- **Fix:**
  ```tsx
  <Canvas onCreated={({ gl }) => {
      gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          toast.error('Mất kết nối GPU, vui lòng tải lại trang');
      });
  }}>
  ```

---

### CLIENT — LỖI CAO (🟠)

---

**[C-04] Protected layout có thể gây redirect loop**
- **File:** `app/(protected)/layout.tsx`
- **Vấn đề:** `useEffect` check auth có `pathname` trong dependency array. Mỗi lần navigate trong `/dashboard/*`, effect chạy lại và gọi `getValidAccessToken()`. Nếu token borderline expire, có thể gọi `router.push('/login')` nhiều lần liên tiếp.
- **Tác hại demo:** Đang demo navigate giữa các trang dashboard, màn hình bị redirect về `/login` đột ngột.
- **Fix:** Bỏ `pathname` khỏi dependency array của effect check auth, chỉ giữ `[router]`.

---

**[C-05] `NEXT_PUBLIC_SOCKET_URL` không được định nghĩa — 9 hook realtime fallback sai**
- **Files bị ảnh hưởng (9 file):**
  - `hooks/useUserRealtime.ts`
  - `hooks/useOrganizationRealtime.ts`
  - `hooks/useApprovalDetailRealtime.ts`
  - `hooks/warehouse-visit/use-warehouse-visit-socket.ts`
  - `hooks/contacts/use-contact-socket.ts`
  - `components/warehouse/WarehouseManagementSheet.tsx`
  - `components/notifications/NotificationList.tsx`
  - `app/(protected)/dashboard/admin/approval/page.tsx`
- **Vấn đề:** Tất cả dùng `process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL`. Biến `NEXT_PUBLIC_SOCKET_URL` không có trong `.env.example` lẫn `.env.local`.
- **Tác hại demo:** Fallback về `NEXT_PUBLIC_API_URL` (HTTP), nhưng Socket.io thường cần namespace riêng. Nếu server cấu hình socket trên path khác, realtime toàn bộ hệ thống sẽ không kết nối được.
- **Fix:** Thêm vào `client/.env.local`:
  ```
  NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
  ```

---

**[C-06] Hardcoded fallback URL localhost trong 3 file**
- **File 1:** `components/warehouse/WarehouseInstancedBins.tsx` (dòng 63)
  ```ts
  const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000");
  ```
- **File 2:** `hooks/useWarehouse3D.ts` (dòng 348)
  ```ts
  const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';  // port sai
  ```
- **File 3:** `hooks/useRealtimePresence.ts` (dòng 104)
  ```ts
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';  // port sai
  ```
- **Tác hại demo:** Nếu `.env.local` không có đủ biến, 3D warehouse và realtime presence kết nối sai port → socket error âm thầm, multiplayer cursor không hiện.
- **Fix:** Đổi fallback về `'http://localhost:4000'` cho nhất quán, hoặc bỏ fallback và để lỗi rõ ràng khi env thiếu.

---

**[C-07] SSR hydration mismatch — các panel component trong warehouse-3d không được dynamic import**
- **File:** `app/(protected)/warehouse-3d/[warehouseId]/page.tsx` (dòng 29–60)
- **Vấn đề:** Chỉ `WarehouseScene` được `dynamic(..., { ssr: false })`. Các component `RackModal`, `ControlPanel`, `SearchPanel`, `AlertsPanel`, `StatsOverlay` (chứa hooks React Query + socket.io) được import tĩnh và render ngay trên server.
- **Tác hại demo:** Next.js báo hydration warning trên console, có thể gây re-render toàn trang lần đầu load, trang 3D bị nhấp nháy hoặc mất state.
- **Fix:** Dynamic import các panel:
  ```tsx
  const ControlPanel = dynamic(() => import('@/components/warehouse/ControlPanel'), { ssr: false });
  const SearchPanel  = dynamic(() => import('@/components/warehouse/SearchPanel'),  { ssr: false });
  const AlertsPanel  = dynamic(() => import('@/components/warehouse/AlertsPanel'),  { ssr: false });
  ```

---

**[C-08] `Promise.all` trong picking page không isolate lỗi — crash nếu một API fail**
- **File:** `app/(protected)/warehouse-floor/picking/page.tsx` (dòng 102–104)
- **Vấn đề:**
  ```ts
  const [detailRes, layout] = await Promise.all([
      wmService.getOutboundById(token, found.id),       // không có .catch()
      warehouseService.getLayout(token, found.warehouse_id).catch(() => null),
  ]);
  const fullExport = detailRes?.data ?? detailRes as unknown as OutboundRequest;
  ```
  Nếu `getOutboundById` fail, `detailRes` là `undefined` → `fullExport.details` crash.
- **Tác hại demo:** ĐỨC ANH quét barcode phiếu xuất, API chậm hoặc lỗi → màn hình trắng, không có thông báo lỗi.
- **Fix:** Bọc toàn bộ trong `try/catch`, kiểm tra `detailRes` trước khi dùng.

---

**[C-09] Race condition: `router.push()` gọi trước khi API confirm xong**
- **Files:** `warehouse-floor/counter/page.tsx` (dòng ~139), `warehouse-floor/picking/page.tsx` (dòng ~179)
- **Vấn đề:** Sau khi gọi API confirm, code gọi `router.push('/warehouse-floor')` ngay mà không kiểm tra response success. Nếu API fail sau khi đã navigate đi, lỗi bị bỏ qua hoàn toàn.
- **Tác hại demo:** Staff bấm "Xác nhận", UI chuyển trang giống như thành công nhưng tồn kho không được cập nhật. Khi KHOA mở stock page sẽ thấy số không thay đổi.
- **Fix:**
  ```ts
  const res = await wmService.confirmReceiving(...);
  if (!res?.success) throw new Error('Xác nhận thất bại');
  router.push('/warehouse-floor');  // chỉ push khi thực sự thành công
  ```

---

**[C-10] Barcode scan bị stuck sau lỗi — `lockError` không tự reset**
- **Files:** `warehouse-floor/counter/page.tsx` (dòng 107–113), `warehouse-floor/picking/page.tsx`
- **Vấn đề:** Khi quét mã không hợp lệ, `setLockError(...)` được gọi nhưng không có cơ chế tự reset sau N giây. User bị kẹt ở trạng thái lỗi cho đến khi reload trang.
- **Tác hại demo:** ĐỨC ANH quét nhầm barcode → màn hình hiện lỗi → không thể làm gì tiếp, phải refresh.
- **Fix:** Thêm auto-clear:
  ```ts
  setLockError(`Không tìm thấy sản phẩm`);
  setTimeout(() => setLockError(null), 3000);
  ```

---

### CLIENT — LỖI TRUNG BÌNH (🟡)

---

**[C-11] useEffect circular dependency trong purchase-order page — vòng lặp fetch tiềm ẩn**
- **File:** `app/(protected)/dashboard/organization/purchase-order/page.tsx` (dòng 105, 109)
- **Vấn đề:** `fetchItems` (useCallback) phụ thuộc `showToast`. `useEffect` phụ thuộc `fetchItems`. Nếu `showToast` không stable reference qua mỗi render, mỗi toast mới kích hoạt một vòng fetch.
- **Tác hại demo:** Danh sách PO tự động fetch lại liên tục, spinner nhấp nháy, dữ liệu có thể bị overwrite khi đang xem.

---

**[C-12] Export Excel không có try/catch — crash nếu `document.body` null**
- **File:** `app/(protected)/dashboard/organization/purchase-order/page.tsx` (dòng 215–222)
- **Vấn đề:** `document.body.appendChild(a)` và `document.body.removeChild(a)` không có try/catch. Nếu DOM chưa sẵn hoặc append fail, `removeChild` throw uncaught error.
- **Tác hại demo:** KHOA bấm export Excel, có thể crash tab nếu DOM state bất thường.

---

**[C-13] Không có centralized 401/403 handler — token expire không tự redirect**
- **Vấn đề:** Tất cả ~80 service file tự throw `new Error(message)` khi `!response.ok`, không phân biệt 401 vs 403 vs 500. Không có interceptor tập trung refresh token và retry.
- **Tác hại demo:** Token expire giữa demo → mọi API call trả về lỗi nhưng UI không redirect về login, chỉ hiện toast lỗi chung chung.

---

**[C-14] Socket.io token không được refresh sau khi expire**
- **File:** `hooks/warehouse-visit/use-warehouse-visit-socket.ts` (dòng 40–42)
- **Vấn đề:** Token được truyền vào `io(url, { auth: { token } })` một lần khi khởi tạo. Token không được update khi `useTokenRefresh` hook lấy token mới.
- **Tác hại demo:** Sau 10 phút demo (token refresh cycle), socket auth fail âm thầm → realtime event không nhận được, người xem không thấy update live.

---

**[C-15] `params.warehouseId` dùng type assertion không kiểm tra null**
- **File:** `app/(protected)/warehouse-3d/[warehouseId]/page.tsx` (dòng ~50)
- **Vấn đề:** `const warehouseId = params.warehouseId as string` — nếu route param không tồn tại, giá trị là `undefined` nhưng được cast thành `string`.
- **Tác hại demo:** Navigate đến URL malformed → hook nhận `undefined` → API call fail âm thầm, trang trắng.

---

**[C-16] `WarehouseScene.tsx` lưu `__controls` trực tiếp vào DOM element**
- **File:** `components/warehouse/WarehouseScene.tsx` (dòng 165, 178, 239, 391, 411)
- **Vấn đề:**
  ```ts
  (gl.domElement as any).__controls = controls;
  (canvas as any).__controls = null;
  ```
  Dirty hack lưu OrbitControls vào DOM node. DOM element không bị GC đúng cách, stale reference nếu Canvas re-render.
- **Tác hại demo:** Sau khi switch warehouse hoặc toggle performance mode, controls có thể bị duplicate hoặc không phản hồi input.

---

**[C-17] `checkout/page.tsx` có `console.log` in ra session data nhạy cảm**
- **File:** `app/(protected)/checkout/page.tsx` (dòng 291, 298, 321, 328)
- **Vấn đề:**
  ```ts
  console.log('[Checkout] Submitting order. Current session:', session);
  console.log('[Checkout] orgId from session:', orgId);
  ```
- **Tác hại demo:** Mở DevTools trong lúc demo checkout → giám khảo thấy session data thô trong console.

---

**[C-18] Feature PDF download chưa implement**
- **File:** `app/(protected)/orders/[id]/contract/page.tsx` (dòng 124)
- **Vấn đề:** Comment `// TODO: Generate and download signed contract PDF` — nút tải hợp đồng không có chức năng thực.
- **Tác hại demo:** Nếu ai đó bấm tải hợp đồng, không có gì xảy ra.

---

### SERVER — LỖI NGHIÊM TRỌNG (🔴)

---

**[S-01] Race condition double approve — tạo duplicate warehouse**
- **File:** `server/src/modules/rental-contract/rental-contract.service.ts` (dòng 980–1125)
- **Vấn đề:** `activateContractWarehouses()` không kiểm tra `detail.warehouse_id !== null` trước khi tạo warehouse. Nếu webhook thanh toán gọi 2 lần, hoặc admin bấm approve 2 lần nhanh → function chạy 2 lần → tạo 2 warehouse cho cùng 1 contract detail → vi phạm unique constraint hoặc duplicate data.
- **Tác hại demo:** BẢO demo approve booking → lỗi 500 hoặc dữ liệu kho bị nhân đôi.
- **Fix:**
  ```ts
  if (detail.warehouse_id) continue;  // đã có warehouse, skip
  ```

---

### SERVER — LỖI CAO (🟠)

---

**[S-02] `activateContractWarehouses` nuốt exception — contract ACTIVE nhưng không có warehouse**
- **File:** `rental-contract.service.ts` (dòng 1118–1125)
- **Vấn đề:**
  ```ts
  } catch (error: any) {
      this.systemLogService.error(...);
      // Không re-throw!
  }
  ```
  Nếu transaction tạo warehouse fail, error được log nhưng không throw → caller không biết fail → contract status vẫn là `ACTIVE` nhưng `warehouse_id` vẫn `null`.
- **Tác hại demo:** Customer thấy booking ACTIVE nhưng không có kho nào được assign.

---

**[S-03] `warehouse-template` update không dùng transaction — partial update gây inconsistent data**
- **File:** `warehouse-template.service.ts` (dòng 305–422)
- **Vấn đề:** Chuỗi 5 query riêng biệt (upsertDiscountConfigs → upsertAddonGifts → upsertInsuranceGifts → upsertAmenities → update template). Không có `prisma.$transaction()`.
- **Tác hại demo:** Nếu server restart hoặc DB timeout giữa chừng, kho demo bị trạng thái nửa cũ nửa mới.

---

**[S-04] Race condition allocation tồn kho khi 2 outbound approve cùng lúc**
- **File:** `inventory-request.service.ts` (dòng 1963–2007)
- **Vấn đề:** Fetch quantity_available → tính toán → update trong transaction, nhưng không có row-level lock. Hai request approve cùng lúc cùng thấy `available = 100`, cùng allocate 60 → thực tế allocated 120 vượt stock 100.
- **Tác hại demo:** Nếu test run đồng thời 2 outbound, số tồn kho bị âm khi KHOA demo stock page.

---

**[S-05] Non-null assertion `!` không có guard — crash server nếu findById trả null**
- **File:** `warehouse-template.service.ts` (dòng 401, 407, 1148–1150)
- **Vấn đề:**
  ```ts
  return updatedTemplate!;  // có thể null
  this.systemLogService.info(..., `Updated: ${updatedTemplate!.name}`);  // crash nếu null
  return this.repository.findById(id) as unknown as IWarehouseTemplateWithRelations;
  ```
- **Tác hại demo:** Tình huống edge case (vừa xóa template) → server throw unhandled exception, endpoint trả 500.

---

**[S-06] `admin-dashboard.service.ts` không có try/catch quanh `Promise.all` — server crash khi DB lỗi**
- **File:** `admin-dashboard.service.ts` (dòng 56–107)
- **Vấn đề:** 7 query Prisma chạy đồng thời trong `Promise.all` không được bọc try/catch. Nếu 1 query timeout → toàn bộ endpoint crash → 500.
- **Tác hại demo:** THÁI mở admin dashboard, DB chậm một chút → widget không load, trang hiện lỗi trắng thay vì skeleton.

---

### SERVER — LỖI TRUNG BÌNH (🟡)

---

**[S-07] `console.error` debug log còn trong production code**
- **File:** `inventory-request.service.ts` (dòng 578)
- **Vấn đề:**
  ```ts
  } catch (error: any) {
      console.error('[Lazy Backfill Error]', error.message);  // debug log
  }
  ```
- **Fix:** Đổi thành `this.systemLogService.error(...)`.

---

**[S-08] Race condition trong `upsertLayout` — fetch rồi update không atomic**
- **File:** `warehouse-template.service.ts` (dòng 876–1059)
- **Vấn đề:** Fetch toàn bộ rows/racks/shelves/blocks → xử lý diff → bulk upsert. Khoảng thời gian giữa fetch và upsert, user khác có thể thêm/xóa entity → overwrite thay đổi của người kia.
- **Tác hại demo:** Nếu 2 người dùng admin cùng chỉnh layout kho → data bị ghi đè âm thầm.

---

**[S-09] `(tx as any).bin` bypass type-check — schema change không được phát hiện**
- **File:** `inventory-request.service.ts` (dòng 543)
- **Vấn đề:**
  ```ts
  await (tx as any).bin.create({ data: { uid, warehouse_id, ... } });
  ```
  Cast `any` để tránh TypeScript check. Nếu `bin` model đổi tên hoặc field thay đổi, lỗi chỉ xuất hiện ở runtime.

---

### TỔNG HỢP THEO MỨC ĐỘ

| ID | Mức | File | Vấn đề | Ảnh hưởng demo |
|---|---|---|---|---|
| C-01 | 🔴 | `dashboard/admin/page.tsx` | Widget system-health thiếu trong WIDGETS | Sidebar admin trống |
| C-02 | 🔴 | `WarehouseScene.tsx` | RAF không cancel → memory leak | Tab nặng, crash sau vài phút |
| C-03 | 🔴 | `WarehouseScene.tsx` | WebGL context loss không bắt | Canvas trắng sau minimize |
| S-01 | 🔴 | `rental-contract.service.ts` | Race condition double approve | Duplicate warehouse hoặc 500 |
| C-04 | 🟠 | `(protected)/layout.tsx` | Redirect loop tiềm ẩn | Đột ngột bị về trang login |
| C-05 | 🟠 | 9 hook files | `NEXT_PUBLIC_SOCKET_URL` undefined | Realtime không kết nối |
| C-06 | 🟠 | 3 component files | Hardcoded localhost URL | Socket sai port, 3D mất realtime |
| C-07 | 🟠 | `warehouse-3d/page.tsx` | Panel components không `ssr: false` | Hydration warning, nhấp nháy |
| C-08 | 🟠 | `picking/page.tsx` | `Promise.all` không isolate lỗi | Màn hình trắng khi API chậm |
| C-09 | 🟠 | `counter`, `picking/page.tsx` | Navigation race condition | Confirm xong nhưng stock không cập nhật |
| C-10 | 🟠 | `counter`, `picking/page.tsx` | Barcode stuck sau lỗi | Phải reload để tiếp tục |
| S-02 | 🟠 | `rental-contract.service.ts` | Exception bị nuốt trong activate | Contract active nhưng không có kho |
| S-03 | 🟠 | `warehouse-template.service.ts` | Update không có transaction | Partial update gây inconsistent |
| S-04 | 🟠 | `inventory-request.service.ts` | Race condition outbound allocation | Tồn kho bị âm |
| S-05 | 🟠 | `warehouse-template.service.ts` | Non-null assertion không guard | Server crash 500 |
| S-06 | 🟠 | `admin-dashboard.service.ts` | Không có try/catch quanh Promise.all | Dashboard admin load fail |
| C-11 | 🟡 | `purchase-order/page.tsx` | Circular useEffect dependency | Fetch vòng lặp, spinner nhấp nháy |
| C-12 | 🟡 | `purchase-order/page.tsx` | Export Excel không có try/catch | Crash tab khi export |
| C-13 | 🟡 | Tất cả service files | Không có centralized 401 handler | Token expire không redirect login |
| C-14 | 🟡 | `use-warehouse-visit-socket.ts` | Socket token không refresh | Realtime mất sau 10 phút |
| C-15 | 🟡 | `warehouse-3d/page.tsx` | `params.warehouseId` cast không guard | Trang trắng với URL lỗi |
| C-16 | 🟡 | `WarehouseScene.tsx` | `__controls` lưu vào DOM | Controls bị stale sau switch kho |
| C-17 | 🟡 | `checkout/page.tsx` | `console.log` session data | Lộ data nhạy cảm trong DevTools |
| C-18 | 🟡 | `orders/contract/page.tsx` | PDF download chưa implement | Nút bấm không phản hồi |
| S-07 | 🟡 | `inventory-request.service.ts` | `console.error` debug trong production | Log nhiễu |
| S-08 | 🟡 | `warehouse-template.service.ts` | Layout upsert không atomic | Ghi đè layout của người khác |
| S-09 | 🟡 | `inventory-request.service.ts` | `(tx as any).bin` bypass type | Schema change không phát hiện sớm |

---

### ƯU TIÊN XỬ LÝ TRƯỚC NGÀY BẢO VỆ

**Phải fix (ảnh hưởng trực tiếp demo):**
1. **[C-01]** Thêm system-health widget vào admin page — 5 phút
2. **[C-05]** Thêm `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000` vào `.env.local` — 1 phút
3. **[C-06]** Sửa fallback port `3001` → `4000` trong 2 file — 5 phút
4. **[C-09]** Fix navigation race trong counter và picking — 15 phút
5. **[C-10]** Thêm `setTimeout(() => setLockError(null), 3000)` — 5 phút
6. **[S-01]** Thêm guard `if (detail.warehouse_id) continue` — 5 phút
7. **[S-02]** Re-throw error trong `activateContractWarehouses` — 5 phút

**Nên fix nếu có thời gian:**
8. **[C-02]** Cancel RAF trong cleanup — 15 phút
9. **[C-04]** Bỏ `pathname` khỏi dependency auth check — 5 phút
10. **[C-08]** Thêm error handling cho Promise.all picking — 15 phút
11. **[C-17]** Xóa `console.log` trong checkout — 5 phút
12. **[S-06]** Thêm try/catch quanh `Promise.all` admin dashboard — 10 phút

**Có thể để sau bảo vệ:**
- C-03, C-07, C-11 → C-16, S-03 → S-09

---

## CHECKLIST CHẠY THỬ (TEST RUN)

Chạy tối thiểu 3 lần trước ngày bảo vệ, ghi lại issue mỗi lần.

```
SETUP
  □ PostgreSQL + Redis đang chạy
  □ server/.env có DATABASE_URL, REDIS_URL, JWT secrets
  □ client/.env.local có NEXT_PUBLIC_API_URL=http://localhost:4000
  □ npm run prisma:migrate:deploy không có error
  □ server khởi động không crash (port 4000)
  □ client khởi động không crash (port 3000)

PHẦN 1 — Admin (THÁI)
  □ Login admin account thành công
  □ /dashboard/admin load đủ 4 widget với data thực (không 0 tất cả)
  □ /dashboard/admin/organization hiện danh sách org pending
  □ /dashboard/admin/users hiện danh sách user

PHẦN 2 — Customer (BẢO)
  □ /kho-bai hiện danh sách kho, filter province hoạt động
  □ /kho-bai/[slug] load detail, tính giá được
  □ Login customer account thành công
  □ /dashboard/customer/bookings hiện ít nhất 1 booking

PHẦN 3 — Organization (NAM)
  □ Login org-owner account thành công
  □ /dashboard/organization hiện overview đúng org
  □ /dashboard/organization/warehouses hiện kho active
  □ /dashboard/organization/roles hiện phân quyền

PHẦN 4 — Inventory (KHOA)
  □ /dashboard/organization/products hiện danh sách sản phẩm
  □ /dashboard/organization/units hiện đơn vị tính
  □ /dashboard/organization/purchase-order hiện list PO, có thể tạo mới
  □ /dashboard/organization/stock hiện tồn kho và vị trí
  □ /dashboard/organization/partners hiện đối tác

PHẦN 5 — Staff (ĐỨC ANH)
  □ Login staff account thành công
  □ /dashboard/staff/inbound hiện phiếu có status APPROVED
  □ /warehouse-floor load mode selection
  □ /warehouse-floor/counter nhập qty thủ công được
  □ /warehouse-floor/putaway xác nhận được
  □ /dashboard/staff/outbound hiện phiếu outbound
  □ /warehouse-floor/picking hoạt động
  □ /warehouse-3d hiện danh sách kho
  □ /warehouse-3d/[id] hiện 3D canvas với data (không trống)
```

---

## GHI CHÚ TEST RUN

| Lần | Ngày | Người theo dõi | Issues | Phần skip |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
