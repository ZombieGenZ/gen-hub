# Báo cáo phân tích: AI Cảnh báo tồn kho & Quản lý xe ra vào + GPS

> Ngày: 2026-05-21  
> Phạm vi: Module `inventory-alert`, `warehouse-vehicle-log`, đề xuất GPS tracking

---

## MỤC LỤC

1. [Hệ thống cảnh báo tồn kho (Inventory Alert)](#1-hệ-thống-cảnh-báo-tồn-kho)
2. [Quản lý xe ra vào (Vehicle Log)](#2-quản-lý-xe-ra-vào)
3. [GPS Tracking — Đề xuất chưa triển khai](#3-gps-tracking--đề-xuất-chưa-triển-khai)
4. [Đăng ký xe bên thứ 3](#4-đăng-ký-xe-bên-thứ-3)
5. [Tác động đến workflow chính](#5-tác-động-đến-workflow-chính)
6. [Lộ trình triển khai AI toàn dự án](#6-lộ-trình-triển-khai-ai-toàn-dự-án)

---

## 1. Hệ thống cảnh báo tồn kho

### 1.1 Đã triển khai

**Backend — `server/src/modules/inventory-alert/`**

- Cron job `@Cron('0 */6 * * *')` — quét mỗi 6 giờ (00:00, 06:00, 12:00, 18:00)
- **Thuần toán học, KHÔNG dùng AI** để phát hiện
- 3 điều kiện phát hiện song song:

| Điều kiện | Công thức | Ý nghĩa |
|---|---|---|
| **A — Ngưỡng tuyệt đối** | `currentQty <= min_quantity` | Tồn kho đã thấp hơn mức tối thiểu |
| **B — Dự báo hết hàng** | `currentQty / velocity <= lead_time_days` | Sẽ hết hàng trước khi kịp nhập mới |
| **C — Điểm đặt hàng** | `currentQty <= reorder_point` | Cần đặt hàng để duy trì buffer |

- `buildSuggestion()` — **KHÔNG phải AI thật**, chỉ là 3 template string if/else
- WebSocket emit: `org:{orgId}:inventory-alert` (broadcast toàn org khi trigger)

**Frontend**

- `InventoryAlertBanner` — polling API 1 lần khi mount, hiển thị banner màu đỏ/cam/vàng
- **Gap**: chưa có listener WebSocket `org:{orgId}:inventory-alert` → phải vào lại trang mới thấy alert mới

**Database — đã thêm vào `schema.prisma`**

```prisma
model InventoryAlertConfig {
  // Ngưỡng cảnh báo per product
  product_id      String
  min_quantity    Float
  reorder_point   Float
  lead_time_days  Int
  is_active       Boolean
}

model InventoryAlert {
  // Bản ghi cảnh báo đã kích hoạt
  config_id       String
  current_qty     Float
  suggested_qty   Float
  ai_suggestion   String   // Hiện tại: template string tĩnh
  severity        InventoryAlertSeverity
  status          InventoryAlertStatus
}

enum InventoryAlertSeverity { LOW MEDIUM HIGH CRITICAL }
enum InventoryAlertStatus   { ACTIVE RESOLVED ACKNOWLEDGED }
```

### 1.2 Chưa triển khai — Đề xuất

| Hạng mục | Mô tả | Effort |
|---|---|---|
| **Claude API** | Generate message cảnh báo tự nhiên bằng tiếng Việt, thay template string | Thấp |
| **Email notification** | Gửi email cho manager khi trigger alert | Thấp |
| **WebSocket listener frontend** | Subscribe `org:{id}:inventory-alert` → update banner real-time | Thấp |
| **UI cấu hình ngưỡng** | Trang quản lý `InventoryAlertConfig` (backend API đã có, thiếu UI) | Trung bình |
| **BullMQ queue** | Tránh spike DB khi cron quét nhiều config cùng lúc | Trung bình |

### 1.3 Claude API — Cách tích hợp đúng

**Claude không "học" dữ liệu kho** — mỗi call là độc lập, model weights cố định. Claude chỉ phân tích data bạn gửi trong prompt (In-Context Analysis).

```
[Inventory DB]
      │
      ▼
[Backend tính toán số học]   ← KHÔNG cần AI
  - current_qty
  - avg_daily_outbound
  - days_until_stockout
  - pending_orders
      │
      ▼ (chỉ khi trigger alert)
[Claude API]                 ← AI làm tốt phần này
  - Tạo message cảnh báo bằng tiếng Việt tự nhiên
  - Giải thích xu hướng
  - Gợi ý số lượng cần đặt
  - Đánh giá mức độ khẩn cấp
      │
      ▼
[Notification: WebSocket + Email]
```

**Files cần sửa nếu tích hợp Claude:**
- `server/src/modules/inventory-alert/inventory-alert.service.ts` — thêm `generateAlertMessage()` dùng `@anthropic-ai/sdk`
- `server/.env` — thêm `ANTHROPIC_API_KEY=sk-ant-...`
- `server/package.json` — thêm `@anthropic-ai/sdk`

**Model đề xuất:** `claude-haiku-4-5-20251001` — rẻ nhất (~$0.0001/lần), đủ nhanh cho task này.

**Tối ưu chi phí:**
- Cache kết quả Redis 4-6 giờ — không gọi lại nếu data không đổi
- Chỉ gọi khi trigger, không gọi cho mọi sản phẩm
- `max_tokens: 300` — cảnh báo ngắn gọn

### 1.4 RAG — Kết luận không cần thiết ở giai đoạn này

RAG (Retrieval Augmented Generation) không phù hợp cho inventory alert vì:
- Dữ liệu tồn kho là **số có cấu trúc** — SQL query chính xác hơn vector search
- PostgreSQL + window functions đã làm tốt hơn RAG cho trend analysis số học
- Thêm latency 500-1500ms không đáng với giá trị nhận được

> RAG phù hợp khi có 6-12 tháng lịch sử và cần phát hiện seasonal patterns (VD: Tết năm ngoái SKU này tăng 3x). Hiện tại chưa đủ data.

---

## 2. Quản lý xe ra vào

### 2.1 Đã triển khai

**Backend — `server/src/modules/warehouse-vehicle-log/`**

8 REST endpoints dưới prefix `/warehouse-manager/vehicle-log`:

| Method | Path | Chức năng |
|---|---|---|
| `POST /` | | Ghi nhận xe vào kho |
| `GET /` | | Lịch sử tất cả xe (paginated, nhiều filter) |
| `GET /active` | | Xe đang trong kho (status=INSIDE) |
| `GET /stats` | | Đếm xe INSIDE hôm nay |
| `GET /lookup` | | Tra cứu biển số → active_log + pending receipts/exports |
| `GET /:id` | | Chi tiết một bản ghi |
| `PATCH /:id/exit` | | Ghi nhận xe ra (set exit_time, status=EXITED) |
| `DELETE /:id` | | Soft delete |

> **Lưu ý thứ tự route:** `/active`, `/stats`, `/lookup` phải đứng TRƯỚC `/:id` trong controller — NestJS match từ trên xuống.

**WebSocket events phát ra:**
- `warehouse:{warehouseTemplateId}:vehicle-entered` — khi xe vào
- `warehouse:{warehouseTemplateId}:vehicle-exited` — khi xe ra

**Frontend — `client/app/(protected)/dashboard/staff/vehicle-log/page.tsx`**

- 2 tab: "Đang trong kho" + "Lịch sử"
- Dropdown select kho từ API (đã fix UUID input thô)
- `useWarehouseRealtime` hook — subscribe real-time khi chọn kho cụ thể
- Sidebar "Xe ra vào" (TruckIcon) đã có trong StaffSidebar

**Database — đã thêm vào `schema.prisma`**

```prisma
enum VehicleType    { TRUCK VAN MOTORBIKE CAR OTHER }
enum VehiclePurpose { INBOUND OUTBOUND VISIT DELIVERY OTHER }
enum VehicleLogStatus { INSIDE EXITED }

model VehicleLog {
  id                    String           @id @default(uuid()) @db.Uuid
  warehouse_template_id String           @db.Uuid
  code                  String           @unique   // VHC-{timestamp}-{random}
  license_plate         String                     // normalized: uppercase, no spaces
  vehicle_type          VehicleType      @default(TRUCK)
  driver_name           String?
  driver_phone          String?
  carrier_name          String?
  purpose               VehiclePurpose   @default(INBOUND)
  linked_receipt_id     String?          @db.Uuid  // link tùy chọn tới Receipt
  linked_export_id      String?          @db.Uuid  // link tùy chọn tới Export
  entry_time            DateTime         @default(now())
  exit_time             DateTime?
  status                VehicleLogStatus @default(INSIDE)
  notes                 String?
  // + soft-delete fields: is_deleted, deleted_at, deleted_by, is_active
}
```

### 2.2 Luồng nghiệp vụ chi tiết

**Luồng 1 — Xe vào kho:**
```
Staff bấm "+ Xe vào" → form hiện ra
    │
    ▼ Nhập biển số (debounce 600ms)
GET /lookup?license_plate=51A12345&warehouse_template_id=...
    ├── active_log != null → Cảnh báo cam "Xe đang trong kho từ HH:MM"
    └── pending_receipts/exports → Gợi ý link với phiếu nhập/xuất
    │
    ▼ Staff chọn: loại xe, mục đích, tài xế, đơn vị vận chuyển...
    │
POST /warehouse-manager/vehicle-log
    │
Service.create():
    ├── code = "VHC-{Date.now()}-{random 0-999}"
    ├── license_plate = input.toUpperCase().replace(/\s+/g, '')
    └── Lưu DB → emit WebSocket vehicle-entered
```

**Luồng 2 — Xe ra:**
```
Tab "Đang trong kho" → Staff bấm "Ghi nhận ra"
    │
PATCH /warehouse-manager/vehicle-log/:id/exit
    │
    ├── exit_time = new Date(), status = EXITED
    └── Emit WebSocket vehicle-exited
```

**Luồng 3 — Lookup biển số (3 queries song song):**
```
Promise.all([
  VehicleLog WHERE license_plate=X AND status=INSIDE,         → cảnh báo xe đang trong kho
  Receipt WHERE warehouse_id IN [...] AND status IN [PENDING, APPROVED] LIMIT 5,  → gợi ý phiếu nhập
  Export  WHERE warehouse_id IN [...] AND status IN [PENDING, PICKING]  LIMIT 5,  → gợi ý phiếu xuất
])
```

> Fix đã áp dụng: Lookup trước đây không filter theo kho (trả về toàn hệ thống). Đã sửa để resolve `warehouseTemplateId` → Warehouse IDs → filter Receipt/Export đúng kho.

### 2.3 Chưa triển khai

| Gap | Mô tả | Effort |
|---|---|---|
| Pre-registration xe | Bảng `ScheduledVehicle` — đăng ký xe dự kiến trước khi đến | Trung bình |
| Blacklist biển số | Bảng `VehicleBlacklist` + cảnh báo đỏ khi lookup | Thấp |
| Alert xe ở quá lâu | Cron check xe INSIDE > 4h → email/WS notify | Thấp |
| OCR biển số | Camera + Gemini Vision API → tự động nhận dạng | Rất cao |

---

## 3. GPS Tracking — Đề xuất chưa triển khai

### 3.1 Vấn đề cốt lõi

**Xe bên thứ 3 (GHN, GHTK, nhà cung cấp) không thể bị ép cài app hoặc gắn thiết bị GPS.** Giải pháp khả thi: **browser-based GPS qua link một lần** — không cần app, không cần đăng ký tài khoản.

### 3.2 Luồng hoạt động GPS

```
Giai đoạn 1 — Staff tạo phiếu:
  Tạo Receipt → nhập "Biển số dự kiến" + "SĐT tài xế"
  → Hệ thống tạo GpsSession (token = UUID ngắn, hết hạn 24h)
  → Sinh link: https://app.gen-hub.vn/track/abc-123-xyz
  → Staff gửi link cho tài xế qua Zalo/SMS

Giai đoạn 2 — Tài xế mở link (đang trên đường):
  Click link → browser hỏi "Cho phép truy cập vị trí?"
  → Mỗi 30 giây: POST /gps/location { token, lat, lng }
  → Server lưu GpsTrack → emit WebSocket
  → Bản đồ kho cập nhật real-time

Giai đoạn 3 — Geofence detection:
  Mỗi GPS point nhận được → server check distance(vehicle, warehouse) < 500m
  → Vào geofence: auto-create VehicleLog (hoặc notify staff)
  → Staff xác nhận → VehicleLog chính thức
```

### 3.3 Database cần thêm

```prisma
enum GpsSessionStatus { ACTIVE EXPIRED COMPLETED }

model GpsSession {
  id                    String           @id @default(uuid()) @db.Uuid
  token                 String           @unique   // trong URL public /track/[token]
  license_plate         String
  receipt_id            String?          @db.Uuid
  export_id             String?          @db.Uuid
  warehouse_template_id String           @db.Uuid
  status                GpsSessionStatus @default(ACTIVE)
  expires_at            DateTime
  created_at            DateTime         @default(now())
  tracks                GpsTrack[]
}

model GpsTrack {
  id          String   @id @default(uuid()) @db.Uuid
  session_id  String   @db.Uuid
  latitude    Decimal  @db.Decimal(10, 7)
  longitude   Decimal  @db.Decimal(10, 7)
  accuracy    Float?   // độ chính xác GPS (meters)
  speed       Float?   // km/h
  recorded_at DateTime @default(now())
  session     GpsSession @relation(fields: [session_id], references: [id])
}
```

### 3.4 Module/endpoint cần tạo

| Endpoint | Auth | Chức năng |
|---|---|---|
| `POST /gps/location` | Token-based (public) | Browser tài xế POST vị trí |
| `GET /gps/session/:token` | Public | Trang `/track/[token]` lấy thông tin |
| `POST /warehouse-manager/vehicle-log/create-gps-session` | JWT | Staff tạo session khi lập phiếu |

**Frontend cần tạo:**
- `/track/[token]` — public page, không cần đăng nhập, dùng `navigator.geolocation.watchPosition()`
- Map component trong staff dashboard hiển thị xe đang tiến đến

### 3.5 So sánh 3 cấp độ GPS

| | Manual (đã làm) | GPS Geofence (đề xuất) | GPS Route Tracking |
|---|---|---|---|
| **Effort** | Đã xong | Trung bình | Cao |
| **Phụ thuộc tài xế** | Staff nhập | Click link | Cài app hoặc OBD |
| **Độ chính xác thời gian** | Thủ công | ±30 giây | Real-time |
| **Bên thứ 3** | ✅ Hoạt động | ✅ Chỉ cần click link | ❌ Cần cài app |
| **Lịch sử lộ trình** | Không | Không | Có |
| **Chi phí server** | Thấp | Thấp | Trung bình |

---

## 4. Đăng ký xe bên thứ 3

Ba phương án có thể kết hợp song song:

### Phương án A — Staff đăng ký khi tạo phiếu (khuyến nghị làm trước)

```
Tạo Receipt / Export
  └── Thêm section "Thông tin xe vận chuyển":
        Biển số dự kiến: [51A-12345]
        Tên tài xế:      [Nguyễn Văn A]
        SĐT tài xế:      [0901234567]   ← hệ thống gửi link GPS qua đây
        Đơn vị VC:       [GHN Express]
```

Ưu điểm: không cần bên thứ 3 làm gì, staff kiểm soát hoàn toàn, GPS link tự động gửi.

### Phương án B — Partner tự đăng ký fleet

```
Partner Portal → Tab "Đội xe của tôi"
  └── Đăng ký: [Biển số] [Loại xe] [Tài xế phụ trách] [SĐT]
        ↓
  Hệ thống lưu PartnerVehicle table

Khi xe đến kho:
  Staff nhập biển số → auto-fill:
    ✓ Tên tài xế (từ PartnerVehicle)
    ✓ Đơn vị vận chuyển (từ Partner)
    ✓ Link tới Receipt đang pending
```

Phù hợp: GHN, GHTK, Viettel Post, đối tác cố định.

### Phương án C — Tích lũy tự học (zero-effort)

```
Lần 1: Staff nhập thủ công biển số 51A-12345 → lưu VehicleLog
Lần 2: Staff gõ "51A" → autocomplete từ lịch sử
        → Auto-suggest: tài xế, đơn vị VC, mục đích thường gặp
Sau 3+ lần: xe được gắn badge "Xe thường xuyên"
```

Không cần đăng ký trước — hệ thống tự học từ lịch sử VehicleLog.

| Tiêu chí | A — Staff đăng ký | B — Partner tự đăng ký | C — Tích lũy tự động |
|---|---|---|---|
| **Effort triển khai** | Thấp | Trung bình | Thấp |
| **Phụ thuộc bên thứ 3** | Không | Cần hợp tác | Không |
| **GPS tracking** | ✅ (gửi link qua SĐT) | ✅ (tự động) | ❌ (không có SĐT trước) |
| **Phù hợp với** | Mọi xe | Đối tác thường xuyên | Backup fallback |

---

## 5. Tác động đến workflow chính

### Kết luận: KHÔNG can thiệp workflow hiện có

| Module | Quan hệ với workflow chính | Loại tác động |
|---|---|---|
| `inventory-alert` | Chỉ **đọc** `Inventory` và `InventoryTransaction` | Read-only, an toàn |
| `warehouse-vehicle-log` | Link với `Receipt`/`Export` qua nullable FK | Additive, tùy chọn |
| `GpsSession`/`GpsTrack` | Hoàn toàn standalone | Additive, tùy chọn |

Workflow chính không bị ảnh hưởng: tạo phiếu nhập/xuất, duyệt phiếu, cập nhật tồn kho, thanh toán, hợp đồng — tất cả vẫn chạy bình thường kể cả khi tắt hoàn toàn 3 module mới.

### Điểm cần làm trước khi dùng thực tế

> Schema đã thêm `VehicleLog`, `InventoryAlertConfig`, `InventoryAlert` vào `schema.prisma` nhưng **chưa migrate database**. Cần chạy:
> ```bash
> cd server
> npx prisma migrate dev --name add-vehicle-log-inventory-alert
> ```

---

## 6. Lộ trình triển khai AI toàn dự án

```
Giai đoạn 1 — Quick Wins (effort thấp, giá trị cao ngay)
─────────────────────────────────────────────────────────
✅ Module cảnh báo hết hàng (rule-based, đã làm)
→ Thêm Claude Haiku API cho message tự nhiên
→ Thêm email notification cho manager
→ WebSocket listener frontend (InventoryAlertBanner)

Giai đoạn 2 — Medium (1-3 tháng)
──────────────────────────────────
→ GPS: Browser-based tracking qua link cho bên thứ 3
→ Trang /track/[token] (public, không cần đăng nhập)
→ Staff đăng ký xe khi tạo Receipt (thêm field biển số/SĐT)
→ AI gợi ý câu trả lời trong OrgChat
→ AI phân loại ConsultationRequest

Giai đoạn 3 — High Impact (3-6 tháng)
───────────────────────────────────────
→ Chatbot biết tồn kho real-time (tool use / function calling)
→ Demand forecasting từ InventoryTransaction history
→ Phát hiện xe bất thường (giờ vào, đơn vị lạ)
→ Partner Vehicle Registry (Partner Portal)
→ Revenue forecasting từ active contracts

Giai đoạn 4 — Advanced (6+ tháng)
────────────────────────────────────
→ RAG với pgvector (khi có 6-12 tháng lịch sử)
→ OCR nhận dạng biển số (Gemini Vision + camera)
→ AI pricing optimization theo market + occupancy rate
→ Full contract review (PDF → Claude extract điều khoản)
```

### Kiến trúc AI tổng thể đề xuất

```
┌─────────────────────────────────────────────────┐
│                    AI Layer                      │
│                                                  │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Claude API  │  │  Gemini  │  │ Coze/Dify  │  │
│  │ (analysis,  │  │(vision,  │  │ (chatbot   │  │
│  │  messages)  │  │  OCR)    │  │  flows)    │  │
│  └──────┬──────┘  └────┬─────┘  └─────┬──────┘  │
│         └──────────────┴──────────────┘          │
└────────────────────────┬────────────────────────-┘
                         │
              ┌──────────┴──────────┐
              │   AI Orchestrator   │  (ai-plugin module)
              │   + Redis Cache     │
              └──────────┬──────────┘
                         │
    ┌────────────────────┼──────────────────────┐
    │                    │                       │
    ▼                    ▼                       ▼
Inventory          Vehicle Log             OrgChat
Alert Service      + GPS Service           Service
(cảnh báo)         (anomaly, tracking)     (suggest)
```

---

*File này được tạo tự động từ phân tích kỹ thuật trong quá trình phát triển gen-hub.*
