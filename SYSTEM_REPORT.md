# Báo cáo Hệ thống: AI Cảnh báo Tồn kho & Quản lý Logistics Xe ra vào + GPS

> **Dự án:** Gen-Hub — Nền tảng Quản lý Kho thông minh  
> **Ngày:** 23/05/2026  
> **Phạm vi:** 2 tính năng cốt lõi đã triển khai

---

## MỤC LỤC

1. [Tính năng 1: AI Cảnh báo Tồn kho](#1-ai-cảnh-báo-tồn-kho)
   - 1.1 Nghiệp vụ & Mục tiêu
   - 1.2 Luồng hệ thống
   - 1.3 Cấu trúc module & file
   - 1.4 API Endpoints
   - 1.5 Cơ sở dữ liệu
   - 1.6 Frontend Pages

2. [Tính năng 2: Logistics Xe ra vào & GPS Tracking](#2-logistics-xe-ra-vào--gps-tracking)
   - 2.1 Nghiệp vụ & Mục tiêu
   - 2.2 Luồng hệ thống — Vehicle Log thủ công
   - 2.3 Luồng hệ thống — Camera OCR biển số
   - 2.4 Luồng hệ thống — GPS Tracking tự động
   - 2.5 Cấu trúc module & file
   - 2.6 API Endpoints
   - 2.7 Cơ sở dữ liệu
   - 2.8 Frontend Pages & Components

3. [Tích hợp liên module](#3-tích-hợp-liên-module)

---

---

# 1. AI Cảnh báo Tồn kho

## 1.1 Nghiệp vụ & Mục tiêu

**Bài toán:** Nhân viên quản lý kho không thể theo dõi thủ công hàng chục sản phẩm tại nhiều kho để phát hiện kịp thời khi tồn kho sắp cạn, dẫn đến nguy cơ gián đoạn hoạt động.

**Giải pháp:** Hệ thống tự động quét toàn bộ cấu hình cảnh báo mỗi 6 giờ, tính toán ngưỡng dựa trên tốc độ xuất hàng thực tế + thời gian nhập hàng mới, và khi phát hiện nguy cơ sẽ:
- Tạo/cập nhật bản ghi cảnh báo trong DB
- Gọi Gemini AI để tạo lời khuyên hành động bằng tiếng Việt tự nhiên
- Gửi thông báo real-time qua WebSocket đến màn hình dashboard
- Gửi email HTML có bảng thống kê đến tất cả quản lý kho

**Người dùng liên quan:**
- **Admin tổ chức** — cấu hình ngưỡng cảnh báo cho từng sản phẩm/kho
- **Quản lý kho (Staff/Organization role)** — nhận cảnh báo, xác nhận đã xử lý

---

## 1.2 Luồng Hệ thống

### A. Luồng cấu hình (thủ công)

```
Người dùng → Trang /dashboard/organization/stock/alert-config
  └─ Chọn kho (chỉ kho từ hợp đồng thuê ACTIVE)
  └─ Chọn sản phẩm
  └─ Nhập: min_quantity, reorder_point, lead_time_days
  └─ POST /organizations/:orgId/inventory-alert/configs
       └─ InventoryAlertController.upsertConfig()
       └─ InventoryAlertService.upsertConfig()
       └─ InventoryAlertRepository.upsertConfig() → DB upsert
       └─ Redis.delByPattern("inventory-alert:{orgId}:*")  ← cache invalidate
```

### B. Luồng quét tự động (Cron Job)

```
@Cron('0 */6 * * *')  ← mỗi 6 giờ: 0h, 6h, 12h, 18h
  └─ InventoryAlertService.runStockoutScan()
       └─ Lấy tất cả InventoryAlertConfig (is_active=true, is_deleted=false)
       └─ FOR EACH config → evaluateAlertConfig(config)
```

### C. Luồng đánh giá mỗi cấu hình

```
evaluateAlertConfig(config)
  ├─ [Song song] getInventoryStockData()  → currentQty (tổng quantity_available)
  └─ [Song song] getOutboundVelocity()   → velocity (TB đơn vị xuất/ngày, 30 ngày gần nhất)

  ── Tính điều kiện cảnh báo ──
  isLowByMinQty  : currentQty <= min_quantity
  daysUntilStockout : currentQty / velocity  (999 nếu velocity = 0)
  isLowByDays    : daysUntilStockout <= lead_time_days
  isLowByReorder : currentQty <= reorder_point (nếu reorder_point > 0)

  ── Nếu KHÔNG có điều kiện nào vi phạm ──
  → Nếu đang có cảnh báo chưa xử lý → auto-resolve (resolved_by = 'SYSTEM')
  → RETURN (không gửi thông báo)

  ── Nếu CÓ vi phạm ──
  ├─ [Song song] getProductName()
  └─ [Song song] getWarehouseName()

  ── Tính EOQ đơn giản ──
  recommendedOrderQty = velocity × (lead_time_days + 7)

  ── Gọi Gemini AI ──
  generateAiSuggestion()
    ├─ Nếu Gemini enabled: gọi geminiService.generateText(prompt_vi, 'inventory_alert')
    │     Prompt: "Viết 2-3 câu cảnh báo tiếng Việt, nêu mức độ khẩn cấp và hành động"
    └─ Fallback template nếu Gemini tắt hoặc lỗi

  ── Lưu/cập nhật cảnh báo ──
  repo.upsertAlert() → DB: InventoryAlert
    fields: current_quantity, avg_daily_outbound, days_until_stockout,
            ai_prediction, ai_suggestion

  ── Debounce kiểm tra ──
  shouldSendNotification(alert.notified_at)
    → Bỏ qua nếu đã gửi thông báo trong vòng 6 giờ gần nhất

  ── Gửi thông báo ──
  websocket.server.emit("org:{orgId}:inventory-alert", { ... })
  sendAlertEmails() → gửi đến tất cả email quản lý kho

  ── Cập nhật thời gian thông báo ──
  repo.markNotified(alert.id) → notified_at = NOW()
```

### D. Luồng nhận cảnh báo trên frontend

```
Client WebSocket subscribe "org:{orgId}:inventory-alert"
  └─ Dashboard hiển thị toast/badge thông báo
  └─ Fetch GET /organizations/:orgId/inventory-alert/alerts
  └─ Hiển thị danh sách cảnh báo với ai_suggestion từ Gemini

Người dùng xác nhận xử lý:
  └─ PATCH /organizations/:orgId/inventory-alert/alerts/:alertId/resolve
  └─ Cảnh báo được đánh dấu is_resolved = true
```

### E. Mức độ khẩn cấp trong Email

| Điều kiện | Mức độ | Màu |
|-----------|--------|-----|
| `daysUntilStockout <= 0` | 🔴 HẾT HÀNG | Đỏ |
| `daysUntilStockout <= 3` | 🟠 KHẨN CẤP | Cam |
| Còn lại | 🟡 CẢNH BÁO | Vàng |

---

## 1.3 Cấu trúc Module & File

```
server/src/modules/inventory-alert/
├── inventory-alert.module.ts        ← imports: PrismaModule, RedisModule,
│                                       WebsocketModule, EmailModule, AiHubModule
├── inventory-alert.controller.ts    ← @Controller('organizations/:orgId/inventory-alert')
├── inventory-alert.service.ts       ← business logic + @Cron job
├── inventory-alert.repository.ts    ← Prisma queries (stock data, velocity, emails)
└── dto/
    ├── create-alert-config.dto.ts   ← min_quantity, reorder_point, lead_time_days
    └── query-alert.dto.ts           ← warehouse_id filter, is_resolved filter

server/src/modules/ai-hub/services/
└── gemini.service.ts                ← generateText() dùng bởi inventory-alert

server/src/modules/inventory-request/
└── inventory-request.repository.ts  ← listOrgWarehouses() — lọc kho theo hợp đồng ACTIVE
```

### Các service phụ thuộc

| Service | Vai trò |
|---------|---------|
| `PrismaService` | Truy cập DB: InventoryAlertConfig, InventoryAlert |
| `RedisService` | Cache invalidation cho config |
| `WebsocketGateway` | Emit real-time event đến org |
| `EmailService` | Gửi email HTML có bảng thống kê |
| `GeminiService` | Tạo lời khuyên tiếng Việt tự nhiên |
| `InventoryAlertRepository` | Tập trung tất cả Prisma query |

---

## 1.4 API Endpoints

| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| `POST` | `/organizations/:orgId/inventory-alert/configs` | Tạo/cập nhật cấu hình cảnh báo | JWT |
| `GET` | `/organizations/:orgId/inventory-alert/configs` | Danh sách cấu hình | JWT |
| `DELETE` | `/organizations/:orgId/inventory-alert/configs/:configId` | Xóa cấu hình | JWT |
| `GET` | `/organizations/:orgId/inventory-alert/alerts` | Danh sách cảnh báo đang active | JWT |
| `GET` | `/organizations/:orgId/inventory-alert/alerts/stats` | Số lượng cảnh báo chưa xử lý | JWT |
| `PATCH` | `/organizations/:orgId/inventory-alert/alerts/:alertId/resolve` | Đánh dấu đã xử lý | JWT |

---

## 1.5 Cơ sở Dữ liệu

### Bảng `inventory_alert_configs`

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| `id` | UUID | PK |
| `organization_id` | UUID | FK → organizations |
| `warehouse_id` | UUID | FK → warehouse_templates |
| `product_id` | UUID | FK → products |
| `min_quantity` | Decimal | Ngưỡng tối thiểu |
| `reorder_point` | Decimal | Điểm đặt hàng lại |
| `lead_time_days` | Int | Số ngày nhập hàng mới |
| `is_active` | Bool | Kích hoạt/tắt |
| `is_deleted` | Bool | Soft delete |

### Bảng `inventory_alerts`

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| `id` | UUID | PK |
| `organization_id` | UUID | FK |
| `warehouse_id` | UUID | FK |
| `product_id` | UUID | FK |
| `current_quantity` | Decimal | Tồn kho tại thời điểm phát hiện |
| `avg_daily_outbound` | Decimal | Tốc độ xuất TB/ngày |
| `days_until_stockout` | Int | Số ngày dự kiến còn hàng |
| `ai_prediction` | Text | Công thức EOQ |
| `ai_suggestion` | Text | Lời khuyên từ Gemini |
| `is_resolved` | Bool | Đã xử lý chưa |
| `resolved_by` | String | User ID hoặc 'SYSTEM' |
| `notified_at` | DateTime | Lần gửi thông báo gần nhất (debounce) |

---

## 1.6 Frontend Pages & Components

### `/dashboard/organization/stock/alert-config`

**File:** `client/app/(protected)/dashboard/organization/stock/alert-config/page.tsx`

**Chức năng:**
- Lọc danh sách kho: **chỉ hiển thị kho từ hợp đồng thuê ACTIVE** (fix: dùng `listOrgWarehouses()` có filter nested Prisma qua `rental_contract_details`)
- Form cấu hình cảnh báo: chọn kho → chọn sản phẩm → nhập ngưỡng
- Bảng danh sách cấu hình đang hoạt động
- Trạng thái loading khi đang fetch danh sách kho

### `/dashboard/organization/stock` (và các trang stock)

Hiển thị badge/counter số cảnh báo chưa xử lý qua `GET alerts/stats`.

---

---

# 2. Logistics Xe ra vào & GPS Tracking

## 2.1 Nghiệp vụ & Mục tiêu

**Bài toán:** Quản lý xe ra vào kho hiện tại hoàn toàn thủ công (nhập biển số bằng tay). Cần:
1. Nhanh hơn: Chụp ảnh → AI đọc biển số tự động
2. Chủ động hơn: Gửi link GPS cho tài xế → hệ thống tự ghi nhận xe đến kho

**Ba cơ chế ghi nhận xe:**

| Cơ chế | Trigger | Actor |
|--------|---------|-------|
| Thủ công | Nhân viên điền form | Staff/Org |
| Camera OCR | Nhân viên chụp ảnh biển số | Staff/Org |
| GPS tự động | Tài xế mang điện thoại đến kho | Hệ thống |

---

## 2.2 Luồng Hệ thống — Vehicle Log Thủ công

```
Nhân viên → Trang /dashboard/(organization|staff)/vehicle-log
  └─ Điền form: biển số, loại xe, mục đích (INBOUND/OUTBOUND/VISIT), kho
  └─ POST /warehouse-manager/vehicle-log
       └─ VehicleLogController.create()
       └─ VehicleLogService.create()
            └─ Kiểm tra xe có đang trong kho không (findActiveByPlate)
            └─ Prisma insert VehicleLog { entered_at = NOW(), exited_at = null }
  └─ Ghi nhận xe ra: PATCH /warehouse-manager/vehicle-log/:id/exit
       └─ VehicleLogService.recordExit() → exited_at = NOW()
```

---

## 2.3 Luồng Hệ thống — Camera OCR Biển số

```
Nhân viên click icon Camera cạnh ô nhập biển số
  └─ LicensePlateScannerModal mở (state: idle)

  [idle] → click "Mở camera"
  └─ navigator.getUserMedia({ video: { facingMode:'environment', 640×480 } })
  └─ stream video realtime (state: scanning)

  [scanning] → click "Chụp"
  └─ canvas.drawImage(video) → canvas.toBlob('image/jpeg')
  └─ FormData.append('image', blob, 'plate.jpg')
  └─ state: loading

  [loading] → vehicleLogService.ocrPlate(token, formData)
  └─ POST /warehouse-manager/vehicle-log/ocr-plate (multipart/form-data)
       └─ VehicleLogController.ocrPlate()  ← FileInterceptor('image', max 5MB)
       └─ VehicleLogService.ocrPlate(file)
            ├─ ImageUploadService.processAndUpload(buffer, name, '/vehicle-log/plates')
            │    └─ Upload lên ImageKit → trả về URL
            └─ geminiService.recognizeLicensePlate(base64, mimeType)
                 └─ Gọi Gemini Vision (gemini-1.5-flash)
                 └─ inlineData: { data: base64, mimeType }
                 └─ Prompt: "Extract license plate → JSON { plate, confidence }"
                 └─ Parse JSON response (xử lý markdown-wrapped JSON)
                 └─ Key rotation nếu quota lỗi
            └─ Return { license_plate, confidence, image_url }
  └─ state: result

  [result]
  └─ Hiển thị: preview ảnh + biển số nhận diện + confidence bar
     ├─ confidence ≥ 0.8 → xanh
     ├─ confidence ≥ 0.5 → vàng
     └─ confidence < 0.5 → đỏ
  └─ "Xác nhận": onResult(plate, imageUrl) → điền vào form
  └─ "Chụp lại": quay về state scanning

  Khi submit form → CreateVehicleLogPayload bao gồm plate_image_url
  └─ Lưu URL ảnh vào VehicleLog.plate_image_url (kiểm toán)
```

---

## 2.4 Luồng Hệ thống — GPS Tracking Tự động

```
╔══════════════════════════════════════════════════════════════╗
║  BƯỚC 1: Nhân viên tạo phiên GPS                            ║
╚══════════════════════════════════════════════════════════════╝

Staff → POST /warehouse-manager/vehicle-log/gps-session
  └─ CreateGpsSessionDto: { license_plate, warehouse_template_id,
                             receipt_id?, export_id?, driver_phone? }
  └─ GpsController.createSession()
  └─ GpsService.createSession()
       ├─ Tạo token = randomBytes(12).toString('hex')  ← 24 ký tự hex
       ├─ expires_at = NOW() + 24 giờ
       └─ Lưu GpsSession vào DB
  └─ Return { ...session, tracking_url: "https://gen-hub.dev/track/{token}" }

Staff gửi tracking_url cho tài xế qua SMS/Zalo/WhatsApp


╔══════════════════════════════════════════════════════════════╗
║  BƯỚC 2: Tài xế mở link trên điện thoại                     ║
╚══════════════════════════════════════════════════════════════╝

Browser tài xế → /track/{token}  (Next.js dynamic route)
  └─ GET /gps/session/{token}  @Public()  ← không cần đăng nhập
       └─ GpsController.getSessionInfo()
       └─ GpsService.getSessionInfo()
            ├─ Kiểm tra token tồn tại
            ├─ Kiểm tra status ≠ EXPIRED và NOW() < expires_at
            └─ Return { license_plate, status, expires_at,
                         warehouse: { name, address, latitude, longitude } }
  └─ Trang hiển thị: tên kho, địa chỉ, biển số xe, bản đồ Mapbox (nếu kho có tọa độ)
  └─ Yêu cầu quyền truy cập Location trên trình duyệt


╔══════════════════════════════════════════════════════════════╗
║  BƯỚC 3: Tài xế di chuyển — gửi vị trí mỗi 30 giây         ║
╚══════════════════════════════════════════════════════════════╝

Browser → POST /gps/location (mỗi 30s)  @Public()  ← không cần đăng nhập
  └─ PostLocationDto: { token, latitude, longitude, accuracy?, speed? }
  └─ GpsController.postLocation()
  └─ GpsService.postLocation()

  ── Rate Limiting ──
  Redis GET "gps-rate:{token}"
    → Nếu tồn tại: HTTP 429 "Vui lòng chờ 30 giây"
    → Nếu không: tiếp tục

  ── Validation ──
  Kiểm tra session tồn tại, status=ACTIVE, chưa hết hạn
  Nếu hết hạn → expireSession(id) → HTTP 400

  ── Lưu track ──
  repo.addTrack({ session_id, latitude, longitude, accuracy, speed })

  ── Đặt rate limit ──
  Redis SET "gps-rate:{token}" "1" EX 30

  ── Tính khoảng cách Haversine ──
  distance = haversineMeters(lat_driver, lng_driver, lat_warehouse, lng_warehouse)
  R = 6,371,000 m (bán kính Trái Đất)

  ┌─ distance ≤ 100m (ARRIVED) ──────────────────────────────────┐
  │  handleArrived()                                              │
  │    ├─ vehicleLogService.findActiveByPlate(plate, warehouseId) │
  │    │   → Kiểm tra đã có vehicle log chưa                      │
  │    │                                                           │
  │    ├─ Nếu CHƯA có log:                                        │
  │    │   purpose = receipt_id → INBOUND                         │
  │    │            export_id  → OUTBOUND                         │
  │    │            else       → VISIT                            │
  │    │   vehicleLogService.create({                             │
  │    │     notes: "Tự động ghi nhận qua GPS tracking"          │
  │    │   }, session.created_by)                                 │
  │    │   repo.completeSession(session.id)  ← status = COMPLETED │
  │    │                                                           │
  │    └─ Emit WebSocket "warehouse:{id}:vehicle-approaching"     │
  │         { event: 'ARRIVED', license_plate, lat, lng, dist }  │
  └───────────────────────────────────────────────────────────────┘

  ┌─ 100m < distance ≤ 500m (APPROACHING) ───────────────────────┐
  │  Emit WebSocket "warehouse:{id}:vehicle-approaching"          │
  │    { event: 'APPROACHING', license_plate, lat, lng, dist }   │
  └───────────────────────────────────────────────────────────────┘

  ┌─ distance > 500m ────────────────────────────────────────────┐
  │  Không emit WebSocket, chỉ lưu track vào DB                  │
  └───────────────────────────────────────────────────────────────┘


╔══════════════════════════════════════════════════════════════╗
║  BƯỚC 4: Nhân viên theo dõi real-time                        ║
╚══════════════════════════════════════════════════════════════╝

Staff Dashboard → WebSocket subscribe "warehouse:{warehouseId}:vehicle-approaching"
  └─ Khi event APPROACHING: hiển thị toast "Xe {biển số} đang đến, còn {Xm}"
  └─ Khi event ARRIVED:     hiển thị toast "Xe {biển số} đã đến kho!"
                            + vehicle log đã được tự động tạo

Staff có thể xem danh sách phiên GPS:
  GET /warehouse-manager/gps/active-sessions?warehouse_template_id={id}
```

### Sơ đồ trạng thái GpsSession

```
ACTIVE ──→ COMPLETED  (xe đến kho, vehicle log tự động tạo)
       ──→ EXPIRED    (quá 24 giờ hoặc gọi expireSession())
```

### Luồng cập nhật vị trí tài xế (phân tách UI vs API)

```
watchPosition fires (mỗi giây khi di chuyển)
  ├─ setDriverCoords() ──────────────────→ Map marker cập nhật NGAY LẬP TỨC
  ├─ setSpeedKmh() ──────────────────────→ Badge km/h cập nhật NGAY LẬP TỨC
  └─ if (elapsed ≥ 30s): postToServer() → Backend ghi track + emit WebSocket

interval 30s (fallback khi đứng yên):
  └─ postToServer() ─────────────────────→ Backend ghi track + emit WebSocket
```

**Lý do tách biệt:** Server Redis rate-limit 30s/token — nếu không tách, mỗi lần watchPosition gọi API sẽ nhận 429, marker chỉ nhảy mỗi 30 giây thay vì liên tục.

### WebSocket payload `vehicle-approaching` (staff dashboard)

```json
{
  "session_id": "uuid",
  "license_plate": "51A-12345",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "distance_m": 342,
  "speed_kmh": 45,
  "event": "APPROACHING | ARRIVED"
}
```

`speed_kmh` = `Math.round(dto.speed * 3.6)` — backend chuyển đổi từ m/s (Geolocation API) sang km/h.

---

## 2.5 Cấu trúc Module & File

### Backend

```
server/src/modules/warehouse-vehicle-log/
├── warehouse-vehicle-log.module.ts      ← imports: PrismaModule, SharedModule,
│                                           MulterModule, AiHubModule
├── warehouse-vehicle-log.controller.ts  ← @Controller('warehouse-manager/vehicle-log')
├── warehouse-vehicle-log.service.ts     ← CRUD + ocrPlate() + findActiveByPlate()
└── dto/
    ├── create-vehicle-log.dto.ts        ← + plate_image_url?: string (mới thêm)
    └── query-vehicle-log.dto.ts

server/src/modules/gps/
├── gps.module.ts                        ← imports: PrismaModule, WebsocketModule,
│                                           RedisModule, WarehouseVehicleLogModule
├── gps.controller.ts                    ← @Controller() — mixed public/private routes
├── gps.service.ts                       ← createSession, getSessionInfo, postLocation
├── gps.repository.ts                    ← Prisma: GpsSession, GpsTrack
└── dto/
    ├── create-gps-session.dto.ts        ← license_plate, warehouse_template_id, ...
    └── post-location.dto.ts             ← token, latitude, longitude, accuracy, speed

server/src/modules/ai-hub/services/
└── gemini.service.ts                    ← recognizeLicensePlate(base64, mimeType) (mới)

server/src/modules/shared/
└── image-upload/
    └── image-upload.service.ts          ← processAndUpload() → ImageKit (@Global)
```

### Frontend

```
client/services/vehicle-log/
├── vehicle-log.types.ts     ← + plate_image_url trong VehicleLog & CreateVehicleLogPayload
│                               + OcrPlateResult interface (mới)
└── vehicle-log.service.ts   ← + ocrPlate(token, formData): Promise<OcrPlateResult> (mới)

client/components/dashboard/shared/vehicle-log/
└── LicensePlateScannerModal.tsx  ← Component camera OCR
    States: idle → scanning → loading → result → error
    Props: { open, onClose, onResult(plate, imageUrl) }

client/components/dashboard/staff/vehicle-log/
└── GpsLiveMap.tsx                ← Bản đồ real-time cho staff/org
    VehiclePosition: { sessionId, licensePlate, lat, lng, distanceM, geofence, speedKmh }
    Geofence circle: 500m radius quanh kho

client/components/track/
└── DriverTrackingMap.tsx         ← Bản đồ cho tài xế (public page)
    Auto-follow driver khi di chuyển, fitBounds lần đầu, nút re-center

client/app/(protected)/dashboard/
├── organization/vehicle-log/page.tsx  ← camera OCR + GPS Live Map + speed realtime
└── staff/vehicle-log/page.tsx         ← camera OCR + GPS Live Map + speed realtime

client/app/(protected)/track/[token]/
└── page.tsx                           ← Trang tài xế: hiển thị kho, gửi GPS location
```

---

## 2.6 API Endpoints

### Vehicle Log Controller (`/warehouse-manager/vehicle-log`)

| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| `POST` | `/warehouse-manager/vehicle-log` | Ghi nhận xe vào kho | JWT |
| `GET` | `/warehouse-manager/vehicle-log` | Danh sách lịch sử xe | JWT |
| `GET` | `/warehouse-manager/vehicle-log/active` | Xe đang trong kho | JWT |
| `GET` | `/warehouse-manager/vehicle-log/stats` | Thống kê xe hôm nay | JWT |
| `GET` | `/warehouse-manager/vehicle-log/lookup` | Tìm xe theo biển số | JWT |
| `POST` | `/warehouse-manager/vehicle-log/ocr-plate` | OCR biển số từ ảnh camera | JWT |
| `GET` | `/warehouse-manager/vehicle-log/:id` | Chi tiết nhật ký xe | JWT |
| `PATCH` | `/warehouse-manager/vehicle-log/:id/exit` | Ghi nhận xe ra khỏi kho | JWT |
| `DELETE` | `/warehouse-manager/vehicle-log/:id` | Xóa nhật ký xe | JWT |

### GPS Controller

| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| `POST` | `/warehouse-manager/vehicle-log/gps-session` | Tạo phiên GPS tracking | JWT |
| `GET` | `/gps/session/:token` | Lấy thông tin phiên GPS | **Public** |
| `POST` | `/gps/location` | Tài xế gửi vị trí | **Public** |
| `GET` | `/warehouse-manager/gps/active-sessions` | Danh sách phiên GPS active | JWT |

> **Lưu ý bảo mật:** Các route Public được xác thực qua `@Public()` decorator (set metadata `IS_PUBLIC_KEY`), được đọc bởi `JwtAuthGuard.canActivate()` — cho phép bypass JWT global guard mà vẫn kiểm soát được ở code level. Route GPS public xác thực qua `token` trong body/param thay vì JWT.

---

## 2.7 Cơ sở Dữ liệu

### Bảng `vehicle_logs`

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| `id` | UUID | PK |
| `warehouse_template_id` | UUID | FK → warehouse_templates |
| `license_plate` | String | Biển số xe (uppercase, no space) |
| `vehicle_type` | Enum | TRUCK / VAN / MOTORBIKE / OTHER |
| `purpose` | Enum | INBOUND / OUTBOUND / VISIT |
| `linked_receipt_id` | UUID? | FK → receipts (nhập kho) |
| `linked_export_id` | UUID? | FK → exports (xuất kho) |
| `driver_phone` | String? | SĐT tài xế |
| `notes` | String? | Ghi chú |
| `plate_image_url` | String? | URL ảnh biển số (ImageKit) — **mới thêm** |
| `entered_at` | DateTime | Thời điểm vào kho |
| `exited_at` | DateTime? | Thời điểm rời kho (null = đang trong kho) |
| `created_by` | String | User ID hoặc 'system' (GPS auto) |

### Bảng `gps_sessions`

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| `id` | UUID | PK |
| `token` | String | 24-char hex token (unique) |
| `license_plate` | String | Biển số liên kết |
| `warehouse_template_id` | UUID | FK → warehouse_templates |
| `receipt_id` | UUID? | Liên kết phiếu nhập |
| `export_id` | UUID? | Liên kết phiếu xuất |
| `driver_phone` | String? | SĐT tài xế |
| `status` | Enum | ACTIVE / COMPLETED / EXPIRED |
| `expires_at` | DateTime | Hết hạn sau 24 giờ |
| `created_by` | String | User ID nhân viên tạo |

### Bảng `gps_tracks`

| Cột | Kiểu | Mô tả |
|-----|------|--------|
| `id` | UUID | PK |
| `session_id` | UUID | FK → gps_sessions |
| `latitude` | Float | Vĩ độ |
| `longitude` | Float | Kinh độ |
| `accuracy` | Float? | Độ chính xác GPS (mét) |
| `speed` | Float? | Tốc độ (m/s) |
| `recorded_at` | DateTime | Thời điểm ghi vị trí |

---

## 2.8 Frontend Pages & Components

### `/dashboard/organization/vehicle-log` & `/dashboard/staff/vehicle-log`

**Files:**
- `client/app/(protected)/dashboard/organization/vehicle-log/page.tsx`
- `client/app/(protected)/dashboard/staff/vehicle-log/page.tsx`

**Chức năng:**
- Bảng danh sách nhật ký xe ra vào
- Form tạo mới: nhập biển số + **nút camera** → mở `LicensePlateScannerModal`
- Nút "Ghi nhận ra" cho xe đang trong kho
- Tạo phiên GPS và copy link gửi tài xế
- Nút **"GPS Live"** → bản đồ Mapbox real-time hiện tất cả xe đang tracking

**GPS Live Map — luồng dữ liệu:**
1. **Seed khởi đầu**: `GET /warehouse-manager/gps/active-sessions` → vị trí + `speed_kmh` của track gần nhất
2. **Real-time**: WebSocket `warehouse:{id}:vehicle-approaching` → cập nhật marker + hiển thị `speedKmh` trên marker
3. **Toast thông báo**: kèm vận tốc `• 45 km/h` khi xe APPROACHING hoặc ARRIVED

**`GpsLiveMap` marker hiển thị:**
```
🚚 51A-12345      ← biển số (màu: trắng/vàng APPROACHING/xanh ARRIVED)
  342m            ← khoảng cách đến kho
  45 km/h         ← vận tốc (xanh dương, ẩn nếu = 0 hoặc null)
```

**State mới thêm:**
```typescript
const [scannerOpen, setScannerOpen] = useState(false);
const [plateImageUrl, setPlateImageUrl] = useState<string | null>(null);
```

### `LicensePlateScannerModal`

**File:** `client/components/dashboard/shared/vehicle-log/LicensePlateScannerModal.tsx`

| State | Giao diện |
|-------|-----------|
| `idle` | Nút "Mở camera" |
| `scanning` | Stream video + nút "Chụp ảnh" |
| `loading` | Spinner "Đang nhận diện biển số..." |
| `result` | Preview ảnh + biển số + thanh confidence + "Xác nhận" / "Chụp lại" |
| `error` | Thông báo lỗi + nút "Thử lại" |

**Cleanup camera:** `stream.getTracks().forEach(track => track.stop())` trong `useEffect` cleanup và khi đóng modal.

### `/track/[token]`

**File:** `client/app/track/[token]/page.tsx`

- Trang public, tài xế truy cập không cần đăng nhập
- Hiển thị: tên kho, địa chỉ, biển số xe, trạng thái session
- **Bản đồ Mapbox** (`DriverTrackingMap`): marker kho 📦 + marker tài xế 🚚 (cập nhật real-time khi di chuyển), auto `fitBounds` lần đầu, auto-follow + nút re-center
- `navigator.geolocation.watchPosition()` → `setDriverCoords` + `setSpeedKmh` **ngay lập tức**; `postToServer()` chỉ gọi mỗi 30s (client-side rate limit)
- Hiển thị **khoảng cách** đến kho + badge **tốc độ km/h** cạnh nhau

---

---

# 3. Tích hợp Liên Module

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP_GUARD (Global)                      │
│                    JwtAuthGuard + @Public() bypass              │
└─────────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────────────┐
│  InventoryAlertModule │      │  WarehouseVehicleLogModule    │
│  ─────────────────── │      │  + GpsModule                 │
│  @Cron('0 */6 * * *') │      │  ──────────────────────────  │
│  InventoryAlertService│      │  VehicleLogService           │
│        │              │      │  GpsService                  │
│        ├─ GeminiService◄──── │──── GeminiService            │
│        ├─ EmailService│      │     (recognizeLicensePlate)  │
│        ├─ RedisService│      │  ImageUploadService (Global) │
│        └─ Websocket──────────│─────── Websocket ────────────┤
└──────────────────────┘      └──────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    WebsocketGateway                          │
│  org:{id}:inventory-alert          (cảnh báo tồn kho)       │
│  warehouse:{id}:vehicle-approaching (xe đang đến/đã đến)    │
└──────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Prisma)                       │
│  inventory_alert_configs  inventory_alerts                  │
│  vehicle_logs             gps_sessions    gps_tracks        │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Redis                                     │
│  inventory-alert:{orgId}:*  (cache invalidation)            │
│  gps-rate:{token}           (rate limit 30s/request)        │
└──────────────────────────────────────────────────────────────┘
```

### Điểm tích hợp quan trọng

| Từ module | Đến module | Lý do |
|-----------|-----------|-------|
| `GpsService` | `VehicleLogService.create()` | Tự động tạo vehicle log khi xe đến kho |
| `GpsService` | `VehicleLogService.findActiveByPlate()` | Tránh tạo log trùng lặp |
| `VehicleLogService` | `GeminiService.recognizeLicensePlate()` | OCR biển số từ ảnh camera |
| `VehicleLogService` | `ImageUploadService.processAndUpload()` | Upload ảnh biển số lên ImageKit |
| `InventoryAlertService` | `GeminiService.generateText()` | Tạo lời khuyên tồn kho tiếng Việt |
| `InventoryAlertRepository` | `InventoryRequestRepository` | Lọc kho theo hợp đồng ACTIVE |

---

*Báo cáo tự động tạo từ mã nguồn Gen-Hub — phiên bản hệ thống: NestJS 11 / Next.js 16.1.6*
