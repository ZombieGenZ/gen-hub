# Kế hoạch: Camera quét biển số xe ra vào kho

## Context
Hiện tại, biển số xe được nhập thủ công vào form vehicle-log. Bổ sung tính năng mở camera, chụp ảnh biển số, gửi lên backend OCR bằng Gemini Vision API, trả về text điền sẵn vào form để người dùng xác nhận. Ảnh chụp được upload lên ImageKit và lưu URL vào bản ghi vehicle-log để kiểm toán. Áp dụng cho cả 2 trang: organization và staff vehicle-log.

## Kiến trúc tổng thể

```
Camera (browser) → chụp frame → canvas.toBlob() →
POST /warehouse-manager/vehicle-log/ocr-plate (multipart) →
  ├─ ImageUploadService.processAndUpload() → ImageKit URL
  └─ GeminiService.recognizeLicensePlate(base64) → { plate, confidence }
← { license_plate, confidence, image_url }
→ điền vào form, user xác nhận → submit CreateVehicleLog (có plate_image_url)
```

---

## Backend

### 1. Prisma Schema
File: `server/prisma/schema.prisma` — thêm vào model `VehicleLog` sau `notes`:
```prisma
plate_image_url String?
```
Chạy: `npx prisma migrate dev --name add_plate_image_url`

### 2. GeminiService — method `recognizeLicensePlate()`
File: `server/src/modules/ai-hub/services/gemini.service.ts`
- Gọi Gemini Vision với `inlineData` (base64 + mimeType)
- Prompt yêu cầu trả về JSON `{ plate, confidence }`
- Reuse key rotation + logging từ `generateText()`

### 3. VehicleLogController — endpoint OCR
File: `server/src/modules/warehouse-vehicle-log/warehouse-vehicle-log.controller.ts`
- `POST ocr-plate` — đặt trước `@Get(':id')`
- `FileInterceptor('image', { limits: { fileSize: 5MB } })`

### 4. VehicleLogService — method `ocrPlate(file)`
File: `server/src/modules/warehouse-vehicle-log/warehouse-vehicle-log.service.ts`
- Upload ảnh → ImageKit URL
- Base64 → Gemini OCR
- Return `{ license_plate, confidence, image_url }`

### 5. WarehouseVehicleLogModule
File: `server/src/modules/warehouse-vehicle-log/warehouse-vehicle-log.module.ts`
- Import `AiHubModule` (exports `GeminiService`)
- Thêm `ImageUploadService` provider

### 6. CreateVehicleLogDto
File: `server/src/modules/warehouse-vehicle-log/dto/create-vehicle-log.dto.ts`
- Thêm `plate_image_url?: string`

---

## Frontend

### 7. Component mới: `LicensePlateScannerModal`
File: `client/components/dashboard/shared/vehicle-log/LicensePlateScannerModal.tsx`
- Camera stream via `getUserMedia` (pattern từ `BarcodeScannerPanel.tsx`)
- States: `idle → scanning → loading → result/error`
- Capture → POST OCR → hiển thị preview + biển số + confidence
- `onResult(plate, imageUrl)` callback

### 8. Cập nhật 2 vehicle-log pages
- `client/app/(protected)/dashboard/organization/vehicle-log/page.tsx`
- `client/app/(protected)/dashboard/staff/vehicle-log/page.tsx`
- Thêm icon 📷 cạnh input biển số → mở scanner modal
- `onResult` → điền `license_plate` + lưu `plate_image_url` trong state

### 9. Client types
File: `client/services/vehicle-log/vehicle-log.types.ts`
- Thêm `plate_image_url?: string` vào `CreateVehicleLogPayload` và `VehicleLog`

---

## Thứ tự thực hiện
1. Prisma schema + migrate
2. GeminiService.recognizeLicensePlate()
3. VehicleLogService.ocrPlate() + Module imports
4. Controller endpoint + DTO
5. LicensePlateScannerModal component
6. Cập nhật 2 pages + client types
