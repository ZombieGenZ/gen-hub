# Kế Hoạch Cải Thiện Chức Năng Nhập/Xuất Kho

> **Dự án**: gen-hub  
> **Ngày tạo**: 2026-03-04  
> **Mục tiêu**: Bổ sung luồng nhập/xuất kho đầy đủ theo yêu cầu (Receiving → Putaway cho Inbound, Picking → Checking → Shipment cho Outbound)

## Trạng Thái Triển Khai (Done vs In-progress)

### Done

- [x] Đã có flow UI theo role cho cả Inbound và Outbound.
- [x] Đã có màn hình cho cả Admin và Customer để thao tác/quan sát luồng.
- [x] Đã có implementation plan làm chuẩn triển khai tiếp.
- [x] Đã kết nối Admin Approval với WM API thật (list, detail, approve/reject, workflow actions).
- [x] Đã thay mock warehouse bằng API thật trong form tạo phiếu Inbound/Outbound của Customer.
- [x] Đã cập nhật status/filter/Kanban cho các trạng thái mới (APPROVED, RECEIVING, PUTAWAY, CHECKING, PACKED).
- [x] Đã chuẩn hóa client cancel handlers qua method cancel riêng (không gọi reject trực tiếp từ UI).
- [x] Đã bổ sung i18n validation messages cho DTO workflow WM.

### In-progress

- [ ] Hoàn tất state machine nghiệp vụ Inbound/Outbound theo luồng đích, đảm bảo transition đúng và chặn sai trạng thái.
- [ ] Hoàn tất toàn bộ API nghiệp vụ theo từng bước xử lý (receiving, putaway, picking, checking, shipment) và đồng bộ permission theo role.
- [ ] Hoàn tất logic tồn kho cuối: reserve khi duyệt xuất, trừ tồn kho thật khi hoàn tất shipment, cập nhật nhất quán quantity/on_hand/allocated/available.
- [ ] Hoàn tất kết nối UI Admin/Customer với API thật cho toàn bộ bước, loại bỏ xử lý tạm/mock còn sót.
- [ ] Hoàn tất validation dữ liệu, thông báo lỗi i18n, logging/audit trail và realtime event cho các mốc nghiệp vụ quan trọng.
- [ ] Hoàn tất migration/seeding liên quan enum, permission, và dữ liệu phụ trợ.
- [ ] Hoàn tất kiểm thử unit/integration/E2E theo role và UAT trước khi xác nhận production-ready.

### Cập Nhật Thực Tế (2026-03-15)

- [x] D3: `InboundApprovalDetail.tsx` đã gọi API thật qua `WarehouseManagerInventoryService`.
- [x] D4: `OutboundApprovalDetail.tsx` đã gọi API thật qua `WarehouseManagerInventoryService`.
- [x] F2: `FILTER_TABS` cho inbound/outbound đã cập nhật đủ trạng thái mới.
- [x] F3: Kanban đã có cột `APPROVED` + mapping status mới + CSS tương ứng.
- [x] F5.1/F5.2: Action bar dynamic theo status đã hoạt động với API thật.
- [x] F6.1: `handleRejectConfirm` đã gọi API thật.
- [x] F6.4: `handleCancelConfirm` đã chuyển qua `cancelInbound/cancelOutbound`.
- [x] F6.5: `handleBulkApprove` đã gọi WM API thật.
- [ ] F6.2: `handleQuarantine` vẫn là TODO (chưa có API backend chính thức).
- [ ] F6.3: `handleSplitOrder` vẫn là TODO (chưa có API backend chính thức).

### Kết Luận Ngắn

UI flow theo role đã có; business flow end-to-end đầy đủ cho inbound/outbound vẫn đang triển khai, chưa hoàn tất 100%.

---

## Mục Lục

1. [Tổng Quan Kiến Trúc Hiện Tại](#1-tổng-quan-kiến-trúc-hiện-tại)
2. [Phần A: Sửa Files Hiện Có (9 thay đổi)](#phần-a-sửa-files-hiện-có)
3. [Phần B: Thêm Mới (6 hạng mục)](#phần-b-thêm-mới)
4. [Phần C: Swagger API Documentation](#phần-c-swagger-api-documentation)
5. [Phần D: Kết Nối Backend ↔ Frontend](#phần-d-kết-nối-backend--frontend)
6. [Phần E: Module Registration & Safety](#phần-e-module-registration--safety)
7. [Phần F: Frontend UI Workflow Steps & Fix Lỗi](#phần-f-frontend-ui-workflow-steps--fix-lỗi)
8. [Phần G: Backend Validation Bổ Sung](#phần-g-backend-validation-bổ-sung)
9. [Quy Tắc Đặt Tên & Conventions](#quy-tắc-đặt-tên--conventions)
10. [Lưu Ý Quan Trọng (12 điểm)](#lưu-ý-quan-trọng)
11. [Thứ Tự Implement An Toàn](#thứ-tự-implement-an-toàn)
12. [Phần H: Quy Tắc Data Source & Anti-patterns](#phần-h-quy-tắc-data-source--anti-patterns)

---

## 1. Tổng Quan Kiến Trúc Hiện Tại

### 1.1 Luồng hiện tại (RÚT GỌN - chỉ 2 bước)

**Nhập kho**: Org tạo phiếu PENDING → WM approve → COMPLETED (fill inventory ngay)  
**Xuất kho**: Org tạo phiếu PENDING → WM approve → SHIPPED (trừ inventory ngay)

### 1.2 Luồng MỚI cần đạt (ĐẦY ĐỦ - 5 bước)

**Nhập kho**: PENDING → APPROVED → RECEIVING → PROCESSING → PUTAWAY → COMPLETED  
**Xuất kho**: PENDING → PICKING → PACKED → SHIPPED → (CANCELLED)

### 1.3 Files liên quan

**Server-side (Backend - NestJS):**

| Layer            | Relative Path                                                                              | Vai trò                               |
| ---------------- | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| Prisma Schema    | `server/prisma/schema.prisma`                                                              | DB models & enums                     |
| Controller (Org) | `server/src/modules/inventory-request/inventory-request.controller.ts`                     | API cho Org member (6 endpoints)      |
| Controller (WM)  | `server/src/modules/warehouse-manager-inventory/warehouse-manager-inventory.controller.ts` | API cho WM (6 endpoints)              |
| Service (Org)    | `server/src/modules/inventory-request/inventory-request.service.ts`                        | Business logic tạo phiếu              |
| Service (WM)     | `server/src/modules/warehouse-manager-inventory/warehouse-manager-inventory.service.ts`    | Approve/reject + fill/pick algorithms |
| Repository       | `server/src/modules/inventory-request/inventory-request.repository.ts`                     | Data access layer                     |
| DTO Inbound      | `server/src/modules/inventory-request/dto/create-inbound-request.dto.ts`                   | DTO tạo phiếu nhập                    |
| DTO Outbound     | `server/src/modules/inventory-request/dto/create-outbound-request.dto.ts`                  | DTO tạo phiếu xuất                    |
| DTO WM           | `server/src/modules/warehouse-manager-inventory/dto/index.ts`                              | DTOs cho WM approve/reject            |
| Interfaces       | `server/src/modules/inventory-request/interfaces/inventory-request.interface.ts`           | TypeScript interfaces                 |
| Cache Helper     | `server/src/modules/inventory-request/constants/inventory-request-cache.helper.ts`         | Redis cache keys                      |
| i18n VI          | `server/src/i18n/vi/inventory-request.json`                                                | Messages tiếng Việt                   |
| i18n EN          | `server/src/i18n/en/inventory-request.json`                                                | Messages tiếng Anh                    |
| Guard            | `server/src/common/guards/warehouse-manager-permission.guard.ts`                           | Check WM permissions                  |
| Module WM        | `server/src/modules/warehouse-manager-inventory/warehouse-manager-inventory.module.ts`     | NestJS module config                  |
| Module Org       | `server/src/modules/inventory-request/inventory-request.module.ts`                         | NestJS module config                  |

**Client-side (Frontend - Next.js):**

| Layer             | Relative Path                                                                | Vai trò                  |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------ |
| Service Org       | `client/services/inventory/inventory.service.ts`                             | API calls cho Org member |
| Types             | `client/services/inventory/inventory.types.ts`                               | Type definitions         |
| Stock Location    | `client/services/inventory/stock-location.service.ts`                        | API tồn kho theo vị trí  |
| Inbound UI        | `client/app/(protected)/dashboard/customer/inbound/page.tsx`                 | UI tạo/xem phiếu nhập    |
| Outbound UI       | `client/app/(protected)/dashboard/customer/outbound/page.tsx`                | UI tạo/xem phiếu xuất    |
| Inbound Approval  | `client/app/(protected)/dashboard/admin/approval/InboundApprovalDetail.tsx`  | UI duyệt phiếu nhập      |
| Outbound Approval | `client/app/(protected)/dashboard/admin/approval/OutboundApprovalDetail.tsx` | UI duyệt phiếu xuất      |

### 1.4 Phát hiện: Schema ĐÃ CÓ nhưng code CHƯA DÙNG

Các model sau ĐÃ tồn tại trong `schema.prisma` nhưng chưa được code sử dụng:

- `ExportPickList` + `ExportPickListDetail` (Phiếu nhặt hàng) → **DÙNG LUÔN, không tạo mới**
- `Package` + `PackageDetail` (Đóng gói) → **DÙNG LUÔN, không tạo mới**
- `PickListStatus`: PENDING, IN_PROGRESS, COMPLETED, CANCELLED → **Có sẵn**
- `PackageStatus`: CREATING, PACKED, SHIPPED, DELIVERED, CANCELLED → **Có sẵn**
- `Inventory.quantity_allocated` (Giữ chỗ / Reserve) → **Có sẵn, luôn = 0**

---

## Phần A: Sửa Files Hiện Có

### A1. Sửa `ReceiptStatus` enum

**File**: `server/prisma/schema.prisma` (tìm `enum ReceiptStatus`)

```diff
 enum ReceiptStatus {
   PENDING
+  APPROVED
+  RECEIVING
   PROCESSING
+  PUTAWAY
   COMPLETED
   CANCELLED
 }
```

### A2. Sửa `ExportStatus` enum

**File**: `server/prisma/schema.prisma` (tìm `enum ExportStatus`)

```diff
 enum ExportStatus {
   PENDING
   PICKING
+  CHECKING
   PACKED
   SHIPPED
   CANCELLED
 }
```

### A3. Thêm fields vào model `Receipt`

**File**: `server/prisma/schema.prisma` (tìm `model Receipt`, thêm sau `notes`)

```diff
 model Receipt {
   ...
   notes               String?
+  expected_arrival    DateTime?
+  vehicle_info        String?
+  approved_by         String?
+  approved_at         DateTime?
+  checker_id          String?
+  receiving_started_at DateTime?
+  receiving_completed_at DateTime?
+  putaway_started_at  DateTime?
+  putaway_completed_at DateTime?
   is_active           Boolean       @default(true)
   ...
+  putaways  ReceiptPutaway[]
   ...
 }
```

### A4. Thêm fields vào model `Export`

**File**: `server/prisma/schema.prisma` (tìm `model Export`, thêm sau notes)

```diff
 model Export {
   ...
   notes             String?
+  approved_by       String?
+  approved_at       DateTime?
+  picker_id         String?
+  checker_id        String?
+  picking_started_at  DateTime?
+  picking_completed_at DateTime?
+  checking_started_at DateTime?
+  checking_completed_at DateTime?
+  shipped_at        DateTime?
+  tracking_number   String?
   is_active         Boolean       @default(true)
   ...
 }
```

### A5. Sửa `approveInbound()` service

**File**: `server/src/modules/warehouse-manager-inventory/warehouse-manager-inventory.service.ts`
**Method**: `approveInbound()` (khoảng line 152-268)

**Hiện tại**: approve → gọi `fillInventory()` → set `COMPLETED`  
**Sửa thành**: approve → chỉ set `APPROVED` → KHÔNG gọi `fillInventory()`

```diff
 // Trong Prisma transaction:
- status: ReceiptStatus.COMPLETED,
+ status: ReceiptStatus.APPROVED,
+ approved_by: actorId,
+ approved_at: new Date(),
```

**Xóa**: Toàn bộ block gọi `fillInventory()` trong `approveInbound()`.
`fillInventory()` sẽ được gọi ở method mới `confirmPutaway()` thay thế.

### A6. Sửa `approveOutbound()` service

**File**: `server/src/modules/warehouse-manager-inventory/warehouse-manager-inventory.service.ts`
**Method**: `approveOutbound()` (khoảng line 336-431)

**Hiện tại**: approve → gọi `pickInventory()` → trừ inventory thật → set `SHIPPED`
**Sửa thành**: approve → **reserve** (tăng `quantity_allocated`) → tạo `ExportPickList` → set `PICKING`

```diff
- status: ExportStatus.SHIPPED,
+ status: ExportStatus.PICKING,
+ approved_by: actorId,
+ approved_at: new Date(),
```

**Thay logic trừ inventory bằng logic reserve:**

```typescript
// Reserve inventory (KHÔNG trừ quantity/on_hand, chỉ tăng allocated + giảm available)
await tx.inventory.update({
  where: { id: inv.id },
  data: {
    quantity_allocated: { increment: reserveQty },
    quantity_available: { decrement: reserveQty },
    updated_by: actorId,
  },
});
```

**Thêm logic tạo ExportPickList:**

```typescript
// Tạo ExportPickList (model đã có sẵn trong schema)
const pickList = await tx.exportPickList.create({
  data: {
    export_id: exportRecord.id,
    organization_id: exportRecord.organization_id,
    warehouse_id: exportRecord.warehouse_id,
    code: `PL-${exportRecord.code}`,
    status: "PENDING",
    created_by: actorId,
    details: {
      create: pickDetails.map((d) => ({
        export_detail_id: d.export_detail_id,
        product_id: d.product_id,
        batch_id: d.batch_id,
        block_id: d.block_id,
        required_qty: d.required_qty,
        picked_qty: 0,
        created_by: actorId,
      })),
    },
  },
});
```

### A7. Cập nhật DTOs

**File**: `server/src/modules/inventory-request/dto/create-inbound-request.dto.ts`
Thêm 2 fields mới (giống pattern `purchase_order_code`):

```typescript
@ApiPropertyOptional({
    description: 'Ngày dự kiến hàng đến',
    example: '2026-03-15T10:00:00Z',
})
@IsOptional()
@IsDateString({}, { message: i18nValidationMessage('inventory-request.validation.expected_arrival_date') })
expected_arrival?: string;

@ApiPropertyOptional({
    description: 'Thông tin xe vận chuyển',
    example: 'Xe tải 5 tấn - BKS 51A-12345',
})
@IsOptional()
@IsString()
vehicle_info?: string;
```

**File**: `server/src/modules/inventory-request/dto/create-outbound-request.dto.ts`
Thêm:

```typescript
@ApiPropertyOptional({ description: 'Ngày cần lấy hàng', example: '2026-03-15' })
@IsOptional()
@IsDateString()
required_date?: string;

@ApiPropertyOptional({ description: 'Thông tin xe đến nhận' })
@IsOptional()
@IsString()
vehicle_info?: string;
```

### A8. Cập nhật Client Types

**File**: `client/services/inventory/inventory.types.ts`

```diff
-export type ReceiptStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
+export type ReceiptStatus = 'PENDING' | 'APPROVED' | 'RECEIVING' | 'PROCESSING' | 'PUTAWAY' | 'COMPLETED' | 'CANCELLED';

-export type ExportStatus = 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'CANCELLED';
+export type ExportStatus = 'PENDING' | 'PICKING' | 'CHECKING' | 'PACKED' | 'SHIPPED' | 'CANCELLED';
```

Thêm vào `InboundRequest`:

```typescript
expected_arrival?: string | null;
vehicle_info?: string | null;
approved_by?: string | null;
approved_at?: string | null;
checker_id?: string | null;
```

Thêm vào `OutboundRequest`:

```typescript
approved_by?: string | null;
approved_at?: string | null;
picker_id?: string | null;
checker_id?: string | null;
tracking_number?: string | null;
```

### A9. Cập nhật Client UI Status Badges

**File**: `client/app/(protected)/dashboard/customer/inbound/page.tsx`
Tìm `STATUS_CONFIG` và thêm:

```typescript
APPROVED: { label: "Đã duyệt", className: "inbound-status--approved" },
RECEIVING: { label: "Đang kiểm đếm", className: "inbound-status--receiving" },
PUTAWAY: { label: "Đang cất hàng", className: "inbound-status--putaway" },
```

**File**: `client/app/(protected)/dashboard/customer/outbound/page.tsx`
Tìm `STATUS_CONFIG` và thêm:

```typescript
CHECKING: { label: "Đang kiểm tra", className: "outbound-status--checking" },
```

### A10. Cập nhật i18n

**File**: `server/src/i18n/vi/inventory-request.json` — Thêm vào `"success"`:

```json
"approve_receipt": "Duyệt phiếu nhập thành công",
"start_receiving": "Bắt đầu kiểm đếm thành công",
"confirm_receiving": "Xác nhận kiểm đếm thành công",
"confirm_putaway": "Xác nhận cất hàng thành công",
"create_pick_list": "Tạo phiếu nhặt hàng thành công",
"confirm_picking": "Xác nhận nhặt hàng thành công",
"confirm_checking": "Xác nhận kiểm tra xuất thành công",
"complete_shipment": "Hoàn tất xuất kho thành công"
```

Thêm vào `"errors"`:

```json
"invalid_status_transition": "Chuyển trạng thái không hợp lệ",
"receipt_not_approved": "Phiếu chưa được duyệt",
"receiving_not_completed": "Kiểm đếm chưa hoàn tất",
"picking_not_completed": "Nhặt hàng chưa hoàn tất",
"checking_not_passed": "Kiểm tra chưa đạt",
"pick_list_not_found": "Không tìm thấy phiếu nhặt hàng"
```

**File**: `server/src/i18n/en/inventory-request.json` — Thêm tương tự bản English.

---

## Phần B: Thêm Mới

### B1. Thêm model `ReceiptPutaway` vào Prisma Schema

**File**: `server/prisma/schema.prisma` (thêm sau `ReceiptDetail` model)

```prisma
enum PutawayStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model ReceiptPutaway {
  id              String        @id @default(dbgenerated("uuid_generate_v4()")) @map("id") @db.Uuid
  receipt_id      String        @db.Uuid
  organization_id String        @db.Uuid
  warehouse_id    String        @db.Uuid
  code            String
  status          PutawayStatus @default(PENDING)
  worker_id       String?
  started_at      DateTime?
  completed_at    DateTime?
  notes           String?

  is_active  Boolean   @default(true)
  created_at DateTime  @default(now())
  updated_at DateTime? @updatedAt
  is_deleted Boolean?  @default(false)
  deleted_at DateTime?

  created_by String?
  updated_by String?
  deleted_by String?

  receipt Receipt              @relation(fields: [receipt_id], references: [id], onDelete: Cascade)
  details ReceiptPutawayDetail[]

  @@index([receipt_id])
  @@index([organization_id])
  @@index([warehouse_id])
  @@map("receipt_putaways")
}

model ReceiptPutawayDetail {
  id                String  @id @default(dbgenerated("uuid_generate_v4()")) @map("id") @db.Uuid
  putaway_id        String  @db.Uuid
  receipt_detail_id String  @db.Uuid
  product_id        String  @db.Uuid
  batch_id          String? @db.Uuid
  block_id          String  @db.Uuid

  suggested_qty Decimal @db.Decimal(19, 4)
  actual_qty    Decimal @default(0) @db.Decimal(19, 4)

  is_active  Boolean   @default(true)
  created_at DateTime  @default(now())
  updated_at DateTime? @updatedAt
  is_deleted Boolean?  @default(false)
  deleted_at DateTime?

  created_by String?
  updated_by String?
  deleted_by String?

  putaway ReceiptPutaway @relation(fields: [putaway_id], references: [id], onDelete: Cascade)

  @@index([putaway_id])
  @@index([receipt_detail_id])
  @@map("receipt_putaway_details")
}
```

### B2. Thêm DTOs mới vào `dto/index.ts`

**File**: `server/src/modules/warehouse-manager-inventory/dto/index.ts` (thêm vào cuối file)

```typescript
// ────────────────────────────────────────
// DTOs cho Workflow Steps mới
// ────────────────────────────────────────

// ── Receiving (Kiểm đếm) ──

export class StartReceivingDto {
  @ApiPropertyOptional({ description: "ID checker thực hiện" })
  @IsOptional()
  @IsUUID("4")
  checker_id?: string;
}

export class ConfirmReceivingDetailDto {
  @ApiProperty({ description: "ID chi tiết phiếu nhập" })
  @IsUUID("4")
  detail_id: string;

  @ApiProperty({ description: "Số lượng thực tế đã nhận", minimum: 0 })
  @IsNumber()
  @Min(0)
  actual_qty: number;
}

export class ConfirmReceivingDto {
  @ApiProperty({ type: [ConfirmReceivingDetailDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmReceivingDetailDto)
  details: ConfirmReceivingDetailDto[];

  @ApiPropertyOptional({ description: "Ghi chú kiểm đếm" })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Putaway (Cất hàng) ──

export class ConfirmPutawayDetailDto {
  @ApiProperty({ description: "ID chi tiết phiếu cất hàng" })
  @IsUUID("4")
  putaway_detail_id: string;

  @ApiProperty({ description: "Số lượng đã cất thực tế", minimum: 0 })
  @IsNumber()
  @Min(0)
  actual_qty: number;
}

export class ConfirmPutawayDto {
  @ApiPropertyOptional({ type: [ConfirmPutawayDetailDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmPutawayDetailDto)
  details?: ConfirmPutawayDetailDto[];

  @ApiPropertyOptional({ description: "Ghi chú" })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Picking Confirm (Nhặt hàng) ──

export class ConfirmPickingDetailDto {
  @ApiProperty({ description: "ID chi tiết pick list" })
  @IsUUID("4")
  pick_list_detail_id: string;

  @ApiProperty({ description: "Số lượng đã nhặt", minimum: 0 })
  @IsNumber()
  @Min(0)
  picked_qty: number;
}

export class ConfirmPickingDto {
  @ApiProperty({ type: [ConfirmPickingDetailDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmPickingDetailDto)
  details: ConfirmPickingDetailDto[];
}

// ── Checking (Kiểm tra xuất) ──

export class ConfirmCheckingDetailDto {
  @ApiProperty({ description: "ID chi tiết phiếu xuất" })
  @IsUUID("4")
  export_detail_id: string;

  @ApiProperty({ description: "Số lượng đã kiểm", minimum: 0 })
  @IsNumber()
  @Min(0)
  checked_qty: number;

  @ApiPropertyOptional({ description: "Pass/Fail" })
  @IsOptional()
  @IsBoolean()
  passed?: boolean;
}

export class ConfirmCheckingDto {
  @ApiProperty({ type: [ConfirmCheckingDetailDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmCheckingDetailDto)
  details: ConfirmCheckingDetailDto[];
}

// ── Complete Shipment (Hoàn tất xuất) ──

export class CompleteShipmentDto {
  @ApiPropertyOptional({ description: "Ghi chú bàn giao" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Số tracking vận chuyển" })
  @IsOptional()
  @IsString()
  tracking_number?: string;
}
```

### B3. Thêm 7 Endpoints vào Controller

**File**: `server/src/modules/warehouse-manager-inventory/warehouse-manager-inventory.controller.ts`

Thêm import DTOs mới:

```typescript
import {
  // ... existing imports ...
  StartReceivingDto,
  ConfirmReceivingDto,
  ConfirmPutawayDto,
  ConfirmPickingDto,
  ConfirmCheckingDto,
  CompleteShipmentDto,
} from "./dto";
```

**7 endpoints mới** (mỗi endpoint copy CHÍNH XÁC pattern từ `approveInbound`):

| #   | Route                                 | Method Name          | DTO                   | Permission Key                                | Status Transition      |
| --- | ------------------------------------- | -------------------- | --------------------- | --------------------------------------------- | ---------------------- |
| 1   | `POST inbound/:id/start-receiving`    | `startReceiving()`   | `StartReceivingDto`   | `warehouse-manager.inventory.inbound.receive` | APPROVED → RECEIVING   |
| 2   | `POST inbound/:id/confirm-receiving`  | `confirmReceiving()` | `ConfirmReceivingDto` | `warehouse-manager.inventory.inbound.receive` | RECEIVING → PROCESSING |
| 3   | `POST inbound/:id/confirm-putaway`    | `confirmPutaway()`   | `ConfirmPutawayDto`   | `warehouse-manager.inventory.inbound.putaway` | PROCESSING → COMPLETED |
| 4   | `POST outbound/:id/confirm-picking`   | `confirmPicking()`   | `ConfirmPickingDto`   | `warehouse-manager.inventory.outbound.pick`   | PICKING → CHECKING     |
| 5   | `POST outbound/:id/confirm-checking`  | `confirmChecking()`  | `ConfirmCheckingDto`  | `warehouse-manager.inventory.outbound.check`  | CHECKING → PACKED      |
| 6   | `POST outbound/:id/complete-shipment` | `completeShipment()` | `CompleteShipmentDto` | `warehouse-manager.inventory.outbound.ship`   | PACKED → SHIPPED       |
| 7   | `POST inbound/:id/assign-workers`     | `assignWorkers()`    | `AssignWorkersDto`    | `warehouse-manager.inventory.inbound.approve` | Không đổi status       |

**Pattern mẫu cho MỖI endpoint** (ví dụ startReceiving):

```typescript
@Post('inbound/:id/start-receiving')
@RequirePermission('warehouse-manager.inventory.inbound.receive')
@ApiOperation({
    summary: 'Bắt đầu kiểm đếm nhập kho',
    description: `
Bắt đầu quá trình kiểm đếm cho phiếu nhập đã được duyệt (status = APPROVED).

**Quy trình:**
1. Validate phiếu nhập có status APPROVED
2. Chỉ định Checker (nếu có)
3. Cập nhật status → RECEIVING

**Permissions:** \`warehouse-manager.inventory.inbound.receive\`
    `,
})
@ApiParam({ name: 'id', description: 'ID phiếu nhập', type: 'string', format: 'uuid' })
@ApiBody({ type: StartReceivingDto })
@ApiResponse({ status: 200, description: 'Bắt đầu kiểm đếm thành công' })
async startReceiving(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartReceivingDto,
    @Request() req: any,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
) {
    const warehouseIds = req.warehouseIds || [];
    const result = await this.warehouseManagerInventoryService.startReceiving(
        id, warehouseIds, dto, userId, lang,
    );
    return new UpdatedResponse(
        'inventory-request.start_receiving',
        result,
        lang === 'vi' ? 'Bắt đầu kiểm đếm thành công' : 'Receiving started successfully',
    );
}
```

### B4. Thêm 6 Service Methods mới

**File**: `server/src/modules/warehouse-manager-inventory/warehouse-manager-inventory.service.ts`

Mỗi method PHẢI tuân thủ pattern sau (copy từ `approveInbound`):

```typescript
async methodName(recordId: string, warehouseIds: string[], dto: DtoType, actorId: string, lang: string) {
    // 1. Validate - tìm record
    const receipt = await this.prisma.receipt.findFirst({
        where: { id: recordId, warehouse_id: { in: warehouseIds }, is_deleted: false },
        include: { details: true },
    });
    if (!receipt) throw new NotFoundException(/* i18n message */);

    // 2. Check status hợp lệ
    if (receipt.status !== ReceiptStatus.EXPECTED_STATUS) {
        throw new BadRequestException(/* i18n message */);
    }

    // 3. Transaction
    const result = await this.prisma.$transaction(async (tx) => {
        // ... business logic ...
        return updatedRecord;
    });

    // 4. Invalidate Redis cache
    await this.redisService.delByPattern(/* cache pattern */);

    // 5. Emit WebSocket event
    this.websocketGateway.emitToOrganization(receipt.organization_id, 'event:name', {
        receiptId: receipt.id,
        status: 'NEW_STATUS',
    });

    return result;
}
```

**6 methods cần implement:**

| Method               | Input Status | Output Status | Quan trọng                                                                                        |
| -------------------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------- |
| `startReceiving()`   | APPROVED     | RECEIVING     | Set `receiving_started_at`, `checker_id`                                                          |
| `confirmReceiving()` | RECEIVING    | PROCESSING    | Cập nhật `actual_qty` cho từng detail, set `receiving_completed_at`                               |
| `confirmPutaway()`   | PROCESSING   | COMPLETED     | **GỌI `fillInventory()`**, tạo `ReceiptPutaway`, set `putaway_completed_at`                       |
| `confirmPicking()`   | PICKING      | CHECKING      | Cập nhật `picked_qty` cho pick list details, set `picking_completed_at`                           |
| `confirmChecking()`  | CHECKING     | PACKED        | Validate checked_qty, set `checking_completed_at`                                                 |
| `completeShipment()` | PACKED       | SHIPPED       | **TRỪ INVENTORY THẬT** (quantity, on_hand, allocated), tạo InventoryTransaction, set `shipped_at` |

### B5. Thêm WebSocket Events

Trong mỗi service method mới, emit event:

```typescript
// Nhập kho events
this.websocketGateway.emitToOrganization(orgId, 'inbound:receiving-started', { ... });
this.websocketGateway.emitToOrganization(orgId, 'inbound:receiving-confirmed', { ... });
this.websocketGateway.emitToOrganization(orgId, 'inbound:putaway-confirmed', { ... });

// Xuất kho events
this.websocketGateway.emitToOrganization(orgId, 'outbound:picking-confirmed', { ... });
this.websocketGateway.emitToOrganization(orgId, 'outbound:checking-confirmed', { ... });
this.websocketGateway.emitToOrganization(orgId, 'outbound:shipment-completed', { ... });
```

### B6. Seed Permission Keys

```sql
INSERT INTO warehouse_manager_permissions (id, name, key, description) VALUES
  (uuid_generate_v4(), 'Kiểm đếm nhập kho', 'warehouse-manager.inventory.inbound.receive', 'Thực hiện kiểm đếm hàng khi nhập kho'),
  (uuid_generate_v4(), 'Cất hàng nhập kho', 'warehouse-manager.inventory.inbound.putaway', 'Thực hiện cất hàng lên kệ'),
  (uuid_generate_v4(), 'Nhặt hàng xuất kho', 'warehouse-manager.inventory.outbound.pick', 'Thực hiện nhặt hàng theo phiếu'),
  (uuid_generate_v4(), 'Kiểm tra xuất kho', 'warehouse-manager.inventory.outbound.check', 'Kiểm tra hàng trước khi xuất'),
  (uuid_generate_v4(), 'Hoàn tất xuất kho', 'warehouse-manager.inventory.outbound.ship', 'Bàn giao và hoàn tất xuất kho');
```

---

## Phần C: Swagger API Documentation

### Swagger đã setup sẵn - KHÔNG cần cấu hình thêm

- **Swagger endpoint**: `http://localhost:4000/api-docs` (Scalar UI)
- **JSON endpoint**: `http://localhost:4000/api-docs-json`
- Controller tag `'Warehouse Manager - Inventory (Collapsed)'` đã có trong `orderedTags` ở `main.ts:132`
- `@ApiBearerAuth()` đã gắn ở class level → KHÔNG thêm cho từng endpoint
- Endpoints mới TỰ ĐỘNG xuất hiện trên Swagger khi có decorators `@ApiOperation`, `@ApiParam`, `@ApiBody`, `@ApiResponse`

### Checklist Swagger cho mỗi endpoint mới

Mỗi endpoint PHẢI có:

1. `@ApiOperation({ summary, description })` — viết rõ quy trình + permission
2. `@ApiParam({ name: 'id', description: '...', type: 'string', format: 'uuid' })`
3. `@ApiBody({ type: DtoClass })` — link với DTO class
4. `@ApiResponse({ status: 200, description: '...' })` — response description

---

## Phần D: Kết Nối Backend ↔ Frontend

### D1. BUG: Client Admin UI CHƯA gọi API thật

**`InboundApprovalDetail.tsx` line 123-125:**

```typescript
// BUG: Chỉ hiển thị toast, KHÔNG gọi API backend!
const handleApproveProcess = () => {
  showToast("Đã duyệt phiếu — chuyển sang trạng thái Đang xử lý", "success");
};
```

**`OutboundApprovalDetail.tsx` line 116:**

```typescript
// BUG: Cũng KHÔNG gọi API backend!
const handleApproveOutbound = () => {
  showToast("Đã duyệt phiếu xuất — đang điều phối nhặt hàng", "success");
};
```

→ Cần **FIX CẢ HAI FILE** để gọi API thật.

### D2. Tạo file client service cho WM Inventory

**File mới**: `client/services/inventory/warehouse-manager-inventory.service.ts`

Pattern giống `inventory.service.ts` nhưng:

- **Base URL**: `${API}/warehouse-manager/inventory` (KHÔNG phải `/organizations/:orgId/...`)
- **KHÔNG cần** `orgHelper.getOrgId()`

```typescript
import type { ApiResponse } from "@/services/common.types";

const API = process.env.NEXT_PUBLIC_API_URL;

export class WarehouseManagerInventoryService {
  // ─── INBOUND ───

  async approveInbound(
    token: string,
    id: string,
    data?: {
      actual_quantities?: { detail_id: string; actual_qty: number }[];
      notes?: string;
    },
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API}/warehouse-manager/inventory/inbound/${id}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể duyệt phiếu nhập");
    }
    return await response.json();
  }

  async rejectInbound(
    token: string,
    id: string,
    reason: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API}/warehouse-manager/inventory/inbound/${id}/reject`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể từ chối phiếu nhập");
    }
    return await response.json();
  }

  async startReceiving(
    token: string,
    id: string,
    data?: { checker_id?: string },
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API}/warehouse-manager/inventory/inbound/${id}/start-receiving`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể bắt đầu kiểm đếm");
    }
    return await response.json();
  }

  async confirmReceiving(
    token: string,
    id: string,
    data: {
      details: { detail_id: string; actual_qty: number }[];
      notes?: string;
    },
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API}/warehouse-manager/inventory/inbound/${id}/confirm-receiving`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể xác nhận kiểm đếm");
    }
    return await response.json();
  }

  async confirmPutaway(
    token: string,
    id: string,
    data?: {
      details?: { putaway_detail_id: string; actual_qty: number }[];
      notes?: string;
    },
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API}/warehouse-manager/inventory/inbound/${id}/confirm-putaway`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể xác nhận cất hàng");
    }
    return await response.json();
  }

  // ─── OUTBOUND ───

  async approveOutbound(
    token: string,
    id: string,
    data?: {
      picking_strategy?: "FEFO" | "FIFO";
      notes?: string;
    },
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API}/warehouse-manager/inventory/outbound/${id}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể duyệt phiếu xuất");
    }
    return await response.json();
  }

  async rejectOutbound(
    token: string,
    id: string,
    reason: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API}/warehouse-manager/inventory/outbound/${id}/reject`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể từ chối phiếu xuất");
    }
    return await response.json();
  }

  async confirmPicking(
    token: string,
    id: string,
    data: {
      details: { pick_list_detail_id: string; picked_qty: number }[];
    },
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API}/warehouse-manager/inventory/outbound/${id}/confirm-picking`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể xác nhận nhặt hàng");
    }
    return await response.json();
  }

  async confirmChecking(
    token: string,
    id: string,
    data: {
      details: {
        export_detail_id: string;
        checked_qty: number;
        passed?: boolean;
      }[];
    },
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API}/warehouse-manager/inventory/outbound/${id}/confirm-checking`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể xác nhận kiểm tra");
    }
    return await response.json();
  }

  async completeShipment(
    token: string,
    id: string,
    data?: {
      notes?: string;
      tracking_number?: string;
    },
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API}/warehouse-manager/inventory/outbound/${id}/complete-shipment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Không thể hoàn tất xuất kho");
    }
    return await response.json();
  }
}
```

### D3. Sửa `InboundApprovalDetail.tsx` — Kết nối API thật

**Trạng thái**: ĐÃ XONG

Thêm import:

```typescript
import { WarehouseManagerInventoryService } from "@/services/inventory/warehouse-manager-inventory.service";
const wmInventoryService = new WarehouseManagerInventoryService();
```

Sửa `handleApproveProcess`:

```typescript
const handleApproveProcess = async () => {
  try {
    const token = authStorage.getAccessToken();
    if (!token) return;
    const actual_quantities = data?.details?.map((d) => ({
      detail_id: d.id,
      actual_qty: editingQty[d.id] ?? d.expected_qty,
    }));
    await wmInventoryService.approveInbound(token, ticketId, {
      actual_quantities,
    });
    showToast("Đã duyệt phiếu — chuyển sang trạng thái Đang xử lý", "success");
    fetchData();
  } catch (error: any) {
    showToast(error.message || "Không thể duyệt phiếu nhập", "error");
  }
};
```

Sửa `handleRejectConfirm`:

```typescript
const handleRejectConfirm = async (category: string, reason: string) => {
  try {
    const token = authStorage.getAccessToken();
    if (!token) return;
    await wmInventoryService.rejectInbound(token, ticketId, reason);
    showToast(`Đã từ chối phiếu — Lý do: ${reason}`, "success");
    setRejectOpen(false);
    fetchData();
  } catch (error: any) {
    showToast(error.message || "Không thể từ chối phiếu", "error");
  }
};
```

### D4. Sửa `OutboundApprovalDetail.tsx` — Kết nối API thật

**Trạng thái**: ĐÃ XONG

Thêm import giống D3, sửa `handleApproveOutbound`:

```typescript
const handleApproveOutbound = async () => {
  try {
    const token = authStorage.getAccessToken();
    if (!token) return;
    await wmInventoryService.approveOutbound(token, ticketId);
    showToast("Đã duyệt phiếu xuất — đang điều phối nhặt hàng", "success");
    fetchData();
  } catch (error: any) {
    showToast(error.message || "Không thể duyệt phiếu xuất", "error");
  }
};
```

### D5. Thêm payload types vào `inventory.types.ts`

```typescript
// ── Warehouse Manager Inventory Payload Types ──

export interface ApproveInboundPayload {
  actual_quantities?: { detail_id: string; actual_qty: number }[];
  notes?: string;
}

export interface StartReceivingPayload {
  checker_id?: string;
}

export interface ConfirmReceivingPayload {
  details: { detail_id: string; actual_qty: number }[];
  notes?: string;
}

export interface ConfirmPutawayPayload {
  details?: { putaway_detail_id: string; actual_qty: number }[];
  notes?: string;
}

export interface ApproveOutboundPayload {
  picking_strategy?: PickingStrategy;
  notes?: string;
}

export interface ConfirmPickingPayload {
  details: { pick_list_detail_id: string; picked_qty: number }[];
}

export interface ConfirmCheckingPayload {
  details: {
    export_detail_id: string;
    checked_qty: number;
    passed?: boolean;
  }[];
}

export interface CompleteShipmentPayload {
  notes?: string;
  tracking_number?: string;
}
```

---

## Phần F: Frontend UI Workflow Steps & Fix Lỗi

> **Bối cảnh**: Phần D chỉ tạo client service (`warehouse-manager-inventory.service.ts`) và fix 2 handler approve/reject. Tuy nhiên, 6 workflow steps mới CHƯA CÓ UI để admin/thủ kho thao tác, và còn nhiều handler chưa gọi API thật.

### F1. Thêm CSS cho Status Badges mới

**File**: `client/app/(protected)/dashboard/customer/inbound/inbound.css` — Thêm sau `.inbound-status--cancelled`:

```css
/* Workflow status badges (mới) */
.inbound-status--approved {
  background-color: #e0f2fe;
  color: #0369a1;
  border-color: #bae6fd;
}
.inbound-status--receiving {
  background-color: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}
.inbound-status--putaway {
  background-color: #ede9fe;
  color: #6d28d9;
  border-color: #ddd6fe;
}
```

**File**: `client/app/(protected)/dashboard/customer/outbound/outbound.css` — Thêm sau `.outbound-status--cancelled`:

```css
/* Workflow status badge (mới) */
.outbound-status--checking {
  background-color: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}
```

### F2. Cập nhật FILTER_TABS

**Trạng thái**: ĐÃ XONG

**File**: `client/app/(protected)/dashboard/customer/inbound/page.tsx` — Sửa `FILTER_TABS`:

```diff
 const FILTER_TABS: { label: string; value: ReceiptStatus | "ALL" }[] = [
     { label: "Tất cả", value: "ALL" },
     { label: "Chờ xử lý", value: "PENDING" },
+    { label: "Đã duyệt", value: "APPROVED" },
+    { label: "Đang kiểm đếm", value: "RECEIVING" },
     { label: "Đang nhập kho", value: "PROCESSING" },
+    { label: "Đang cất hàng", value: "PUTAWAY" },
 ];
```

**File**: `client/app/(protected)/dashboard/customer/outbound/page.tsx` — Sửa `FILTER_TABS`:

```diff
 const FILTER_TABS: { label: string; value: ExportStatus | "ALL" }[] = [
     { label: "Tất cả", value: "ALL" },
     { label: "Chờ xử lý", value: "PENDING" },
     { label: "Đang lấy hàng", value: "PICKING" },
+    { label: "Đang kiểm tra", value: "CHECKING" },
+    { label: "Đã đóng gói", value: "PACKED" },
 ];
```

### F3. Cập nhật Kanban Columns & Status Mapping

**Trạng thái**: ĐÃ XONG

**File**: `client/app/(protected)/dashboard/admin/approval/page.tsx`

Sửa `KANBAN_COLUMNS` (khoảng line 106-110):

```diff
 const KANBAN_COLUMNS = [
     { key: "PENDING", title: "Chờ duyệt", cssModifier: "pending" },
+    { key: "APPROVED", title: "Đã duyệt", cssModifier: "approved" },
     { key: "PROCESSING", title: "Đang xử lý", cssModifier: "processing" },
     { key: "COMPLETED", title: "Hoàn tất", cssModifier: "completed" },
 ];
```

Sửa `getKanbanColumn()` (khoảng line 113-118):

```typescript
function getKanbanColumn(status: string): string {
  if (status === "PENDING") return "PENDING";
  if (status === "APPROVED") return "APPROVED";
  if (
    [
      "RECEIVING",
      "PROCESSING",
      "PUTAWAY",
      "PICKING",
      "CHECKING",
      "PACKED",
    ].includes(status)
  )
    return "PROCESSING";
  if (["COMPLETED", "SHIPPED"].includes(status)) return "COMPLETED";
  return "PENDING";
}
```

Thêm CSS cho Kanban column mới vào `approval.css`:

```css
.approval-kanban__column--approved .approval-kanban__header {
  border-bottom-color: #0369a1;
}
```

### F4. Replace `MOCK_RENTED_WAREHOUSES` bằng API thật

> **QUAN TRỌNG**: Hiện tại cả `inbound/page.tsx` và `outbound/page.tsx` dùng `MOCK_RENTED_WAREHOUSES` để chọn kho khi tạo phiếu. Khi submit lên backend, `warehouse_id` từ mock data không tồn tại trong DB → **lỗi 404/500**.

**Bước 1**: Kiểm tra xem đã có API lấy danh sách kho thuộc tổ chức chưa:

- Nếu ĐÃ CÓ: Dùng service hiện tại (ví dụ `WarehouseService.list()` hoặc `ContractService.getActiveWarehouses()`)
- Nếu CHƯA CÓ: Tạo client service mới hoặc dùng luôn API sẵn từ inventory-request module

**Bước 2**: Sửa `inbound/page.tsx`:

```diff
-import { MOCK_RENTED_WAREHOUSES } from "@/data/mockMyWarehouses";

 // Trong component InboundListPage:
-const [warehouses] = useState(() =>
-    MOCK_RENTED_WAREHOUSES.map((w) => ({ id: w.id, name: w.name }))
-);
+const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
+
+// Fetch warehouses từ API
+useEffect(() => {
+    const token = authStorage.getAccessToken();
+    if (!token) return;
+    // TODO: Thay bằng service thật
+    // warehouseService.listMyWarehouses(token).then(res => {
+    //     setWarehouses(res.data?.items || []);
+    // });
+}, []);
```

**Bước 3**: Sửa `outbound/page.tsx` tương tự — thay `MOCK_RENTED_WAREHOUSES` bằng state + API call.

> ⚠️ Nếu API warehouse chưa sẵn sàng, có thể GIỮ mock tạm nhưng PHẢI comment rõ `// TODO: Replace with real API` và đảm bảo mock IDs khớp với DB seed.

### F5. Thêm UI Workflow Steps cho Admin Approval

**Trạng thái**: ĐÃ XONG PHẦN CHÍNH (các bước chính đã gọi API thật theo status)

> **Nguyên tắc**: Hiện `InboundApprovalDetail` và `OutboundApprovalDetail` chỉ hiện 1 bộ action (Duyệt/Từ chối). Sau workflow mới, **action bar phải thay đổi theo status hiện tại** của phiếu.

#### F5.1 Sửa `InboundApprovalDetail.tsx` — Action theo Status

Thêm import:

```typescript
import { WarehouseManagerInventoryService } from "@/services/inventory/warehouse-manager-inventory.service";
const wmInventoryService = new WarehouseManagerInventoryService();
```

Sửa Action Bar render theo `data.status`:

```typescript
{/* ── Action Bar (DYNAMIC theo status) ── */}
<div className="approval-actions">
    {data.status === "PENDING" && (
        <>
            <Button
                variant="outline"
                className="gap-2 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setRejectOpen(true)}
            >
                Từ chối
            </Button>
            <Button
                className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                onClick={handleApproveProcess}
            >
                <CheckCircleIcon className="w-4 h-4" />
                Duyệt phiếu nhập
            </Button>
        </>
    )}
    {data.status === "APPROVED" && (
        <Button
            className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
            onClick={handleStartReceiving}
        >
            Bắt đầu kiểm đếm
        </Button>
    )}
    {data.status === "RECEIVING" && (
        <Button
            className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
            onClick={handleConfirmReceiving}
        >
            Xác nhận kiểm đếm
        </Button>
    )}
    {data.status === "PROCESSING" && (
        <>
            <Button
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() => setPutawayOpen(true)}
            >
                <MapPinIcon className="w-4 h-4" />
                Xem vị trí cất hàng
            </Button>
            <Button
                className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                onClick={handleConfirmPutaway}
            >
                Xác nhận cất hàng
            </Button>
        </>
    )}
</div>
```

Thêm handler functions:

```typescript
const handleStartReceiving = async () => {
  try {
    const token = authStorage.getAccessToken();
    if (!token) return;
    await wmInventoryService.startReceiving(token, ticketId);
    showToast("Đã bắt đầu kiểm đếm", "success");
    fetchData();
  } catch (error: any) {
    showToast(error.message || "Không thể bắt đầu kiểm đếm", "error");
  }
};

const handleConfirmReceiving = async () => {
  try {
    const token = authStorage.getAccessToken();
    if (!token) return;
    const details =
      data?.details?.map((d) => ({
        detail_id: d.id,
        actual_qty: editingQty[d.id] ?? d.expected_qty,
      })) || [];
    await wmInventoryService.confirmReceiving(token, ticketId, { details });
    showToast("Xác nhận kiểm đếm thành công", "success");
    fetchData();
  } catch (error: any) {
    showToast(error.message || "Không thể xác nhận kiểm đếm", "error");
  }
};

const handleConfirmPutaway = async () => {
  try {
    const token = authStorage.getAccessToken();
    if (!token) return;
    await wmInventoryService.confirmPutaway(token, ticketId);
    showToast("Xác nhận cất hàng thành công — Phiếu hoàn tất", "success");
    fetchData();
  } catch (error: any) {
    showToast(error.message || "Không thể xác nhận cất hàng", "error");
  }
};
```

#### F5.2 Sửa `OutboundApprovalDetail.tsx` — Action theo Status

Thêm import giống F5.1, sửa Action Bar:

```typescript
{/* ── Action Bar (DYNAMIC theo status) ── */}
<div className="approval-actions">
    {data.status === "PENDING" && (
        <>
            <Button
                variant="outline"
                className="gap-2 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setRejectOpen(true)}
            >
                Từ chối
            </Button>
            {hasInsufficientStock && (
                <Button variant="outline" className="gap-2 rounded-xl" onClick={handleSplitOrder}>
                    <ScissorsIcon className="w-4 h-4" /> Tách phiếu
                </Button>
            )}
            <Button
                className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                onClick={handleApproveOutbound}
                disabled={!!hasInsufficientStock}
            >
                <CheckCircleIcon className="w-4 h-4" /> Duyệt lệnh xuất
            </Button>
        </>
    )}
    {data.status === "PICKING" && (
        <Button
            className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
            onClick={handleConfirmPicking}
        >
            Xác nhận nhặt hàng
        </Button>
    )}
    {data.status === "CHECKING" && (
        <Button
            className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
            onClick={handleConfirmChecking}
        >
            Xác nhận kiểm tra
        </Button>
    )}
    {data.status === "PACKED" && (
        <Button
            className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
            onClick={handleCompleteShipment}
        >
            Hoàn tất xuất kho
        </Button>
    )}
</div>
```

Thêm handler functions:

```typescript
const handleConfirmPicking = async () => {
  try {
    const token = authStorage.getAccessToken();
    if (!token) return;
    // TODO: Lấy pick list details và picked_qty từ UI form
    const details =
      data?.details?.map((d) => ({
        pick_list_detail_id: d.id, // Map đúng với ExportPickListDetail.id
        picked_qty: d.quantity,
      })) || [];
    await wmInventoryService.confirmPicking(token, ticketId, { details });
    showToast("Xác nhận nhặt hàng thành công", "success");
    fetchData();
  } catch (error: any) {
    showToast(error.message || "Không thể xác nhận nhặt hàng", "error");
  }
};

const handleConfirmChecking = async () => {
  try {
    const token = authStorage.getAccessToken();
    if (!token) return;
    const details =
      data?.details?.map((d) => ({
        export_detail_id: d.id,
        checked_qty: d.quantity,
        passed: true,
      })) || [];
    await wmInventoryService.confirmChecking(token, ticketId, { details });
    showToast("Xác nhận kiểm tra thành công", "success");
    fetchData();
  } catch (error: any) {
    showToast(error.message || "Không thể xác nhận kiểm tra", "error");
  }
};

const handleCompleteShipment = async () => {
  try {
    const token = authStorage.getAccessToken();
    if (!token) return;
    await wmInventoryService.completeShipment(token, ticketId);
    showToast("Hoàn tất xuất kho thành công", "success");
    fetchData();
  } catch (error: any) {
    showToast(error.message || "Không thể hoàn tất xuất kho", "error");
  }
};
```

### F6. Fix Handlers CHƯA gọi API thật

**Trạng thái**: ĐANG TRIỂN KHAI (đã xong phần lớn, còn `quarantine` và `split order`)

Ngoài `handleApproveProcess` và `handleApproveOutbound` (đã fix ở D3/D4), còn các handler sau cũng chưa gọi API:

#### F6.1 `handleRejectConfirm` trong `InboundApprovalDetail.tsx` (line 134-137)

Đã fix trong **Phần D3** (`handleRejectConfirm`) → OK.

#### F6.2 `handleQuarantine` trong `InboundApprovalDetail.tsx` (line 127-132)

```typescript
// Hiện tại chỉ show toast, chưa có logic
// → Tạm giữ vì quarantine là feature OPTIONAL, có thể implement sau
// → Đảm bảo comment rõ: // TODO: Implement quarantine API
```

#### F6.3 `handleSplitOrder` trong `OutboundApprovalDetail.tsx` (line 123-128)

```typescript
// Tách phiếu là feature phức tạp, có thể implement sau
// → Đảm bảo comment rõ: // TODO: Implement split order API
```

#### F6.4 `handleCancelConfirm` trong cả `inbound/page.tsx` và `outbound/page.tsx`

```typescript
// Cả hai đều chưa gọi API cancel thật
// → Cần tạo API cancel hoặc dùng API có sẵn
// → Pattern: inventoryService.cancelInbound(token, id) / cancelOutbound(token, id)
```

#### F6.5 `handleBulkApprove` trong `admin/approval/page.tsx` (line 245-251)

```typescript
// Chỉ show toast, chưa gọi API batch approve
// → Cần loop call wmInventoryService.approveInbound/approveOutbound cho từng phiếu đã chọn
// → Hoặc tạo API batch approve riêng nếu cần
const handleBulkApprove = async () => {
  const token = authStorage.getAccessToken();
  if (!token) return;
  const promises = Array.from(selectedIds).map(async (id) => {
    const ticket = allTickets.find((t) => t.id === id);
    if (!ticket) return;
    if (ticket.type === "inbound") {
      await wmInventoryService.approveInbound(token, id);
    } else {
      await wmInventoryService.approveOutbound(token, id);
    }
  });
  try {
    await Promise.all(promises);
    showToast(`Đã duyệt hàng loạt ${selectedIds.size} phiếu`, "success");
    setSelectedIds(new Set());
    fetchData();
  } catch (error: any) {
    showToast(error.message || "Duyệt hàng loạt thất bại", "error");
  }
};
```

### F7. Thêm Status Timeline vào Detail pages

> Cả `InboundApprovalDetail` và `OutboundApprovalDetail` nên hiển thị **timeline tiến trình** ở header, giống như cách inbound/outbound detail page (`[id]/page.tsx`) đã có timeline CSS sẵn.

**Inbound Timeline** (thêm vào header section, sau `data.code`):

```typescript
const INBOUND_STEPS = [
    { key: "PENDING", label: "Chờ duyệt" },
    { key: "APPROVED", label: "Đã duyệt" },
    { key: "RECEIVING", label: "Kiểm đếm" },
    { key: "PROCESSING", label: "Xử lý" },
    { key: "PUTAWAY", label: "Cất hàng" },
    { key: "COMPLETED", label: "Hoàn tất" },
];

// Render trong header:
<div className="inbound-timeline">
    {INBOUND_STEPS.map((step, idx) => {
        const currentIdx = INBOUND_STEPS.findIndex(s => s.key === data.status);
        const stepState = idx < currentIdx ? "completed" : idx === currentIdx ? "active" : "pending";
        return (
            <React.Fragment key={step.key}>
                <div className="inbound-timeline__step">
                    <div className={`inbound-timeline__dot inbound-timeline__dot--${stepState}`}>
                        {idx + 1}
                    </div>
                    <span className={`inbound-timeline__label inbound-timeline__label--${stepState}`}>
                        {step.label}
                    </span>
                </div>
                {idx < INBOUND_STEPS.length - 1 && (
                    <div className={`inbound-timeline__connector inbound-timeline__connector--${
                        idx < currentIdx ? "completed" : "pending"
                    }`} />
                )}
            </React.Fragment>
        );
    })}
</div>
```

**Outbound Timeline** — tương tự, dùng steps:

```typescript
const OUTBOUND_STEPS = [
  { key: "PENDING", label: "Chờ duyệt" },
  { key: "PICKING", label: "Nhặt hàng" },
  { key: "CHECKING", label: "Kiểm tra" },
  { key: "PACKED", label: "Đóng gói" },
  { key: "SHIPPED", label: "Đã xuất" },
];
```

> CSS timeline đã có sẵn trong `inbound.css` và `outbound.css` (classes `inbound-timeline__*`, `outbound-timeline__*`) → **DÙNG LUÔN, KHÔNG tạo mới CSS**.

---

## Phần G: Backend Validation Bổ Sung

### G1. Validate `warehouse_id` thuộc Organization

**File**: `server/src/modules/inventory-request/inventory-request.service.ts`

Trong method `createInbound()` và `createOutbound()`, ĐẢM BẢO có check:

```typescript
// Kiểm tra warehouse_id thuộc org hiện tại
const warehouse = await this.prisma.warehouse.findFirst({
  where: {
    id: dto.warehouse_id,
    is_deleted: false,
    // Phải có contract active với org
    contracts: {
      some: {
        organization_id: orgId,
        status: "ACTIVE",
        is_deleted: false,
      },
    },
  },
});
if (!warehouse) {
  throw new NotFoundException("inventory-request.errors.warehouse_not_found");
}
```

### G2. Validate `product_id` thuộc Organization

Trong method `createInbound()` và `createOutbound()`, validate mỗi `product_id`:

```typescript
for (const detail of dto.details) {
  const product = await this.prisma.product.findFirst({
    where: {
      id: detail.product_id,
      organization_id: orgId,
      is_active: true,
      is_deleted: false,
    },
  });
  if (!product) {
    throw new NotFoundException(`inventory-request.errors.product_not_found`);
  }
}
```

### G3. Outbound: Validate tồn kho đủ

Trong `createOutbound()`, khi tạo phiếu xuất nên kiểm tra tồn kho:

```typescript
// Kiểm tra số lượng khả dụng
const inventory = await this.prisma.inventory.findFirst({
  where: {
    product_id: detail.product_id,
    warehouse_id: dto.warehouse_id,
    organization_id: orgId,
    is_deleted: false,
  },
});
const available = inventory ? Number(inventory.quantity_available) : 0;
if (detail.quantity > available) {
  throw new BadRequestException(`inventory-request.errors.insufficient_stock`);
}
```

### G4. Thêm i18n cho validation messages mới

**File**: `server/src/i18n/vi/inventory-request.json` — Thêm vào `"errors"`:

```json
"warehouse_not_found": "Kho không tồn tại hoặc không thuộc tổ chức của bạn",
"product_not_found": "Sản phẩm không tồn tại hoặc đã bị vô hiệu hóa",
"insufficient_stock": "Tồn kho không đủ để tạo phiếu xuất"
```

**File**: `server/src/i18n/en/inventory-request.json` — Thêm tương tự bản English.

### G5. Kiểm Tra Ràng Buộc Đầu Vào (Input Validation) — TOÀN BỘ DTOs

> **Nguyên tắc chung:**
>
> - Số lượng (qty) PHẢI có `@Min(0)` hoặc `@Min(0.0001)` — **KHÔNG cho phép số âm**
> - Chuỗi bắt buộc PHẢI có `@IsNotEmpty()` — **KHÔNG cho phép chuỗi rỗng**
> - Mảng bắt buộc PHẢI có `@ArrayMinSize(1)` — **KHÔNG cho phép mảng rỗng**
> - UUID PHẢI có `@IsUUID('4')` — đúng format UUID v4
> - Tất cả validators PHẢI có `message: i18nValidationMessage(...)` — để trả lỗi đa ngôn ngữ

#### G5.1 DTOs hiện tại — ĐÃ ĐẦY ĐỦ ✅

| DTO                        | Field          | Validation hiện tại                      | Đánh giá                          |
| -------------------------- | -------------- | ---------------------------------------- | --------------------------------- |
| `InboundDetailDto`         | `expected_qty` | `@IsNumber()` + `@Min(0.0001)` + i18n    | ✅ OK — không cho âm, không cho 0 |
| `InboundDetailDto`         | `import_price` | `@IsNumber()` + `@Min(0)` + i18n         | ✅ OK — cho phép 0, không cho âm  |
| `InboundDetailDto`         | `product_id`   | `@IsNotEmpty()` + `@IsUUID('4')` + i18n  | ✅ OK                             |
| `InboundDetailDto`         | `unit_id`      | `@IsNotEmpty()` + `@IsUUID('4')` + i18n  | ✅ OK                             |
| `CreateInboundRequestDto`  | `details`      | `@IsArray()` + `@ArrayMinSize(1)` + i18n | ✅ OK — không cho rỗng            |
| `CreateInboundRequestDto`  | `warehouse_id` | `@IsNotEmpty()` + `@IsUUID('4')` + i18n  | ✅ OK                             |
| `OutboundDetailDto`        | `quantity`     | `@IsNumber()` + `@Min(0.0001)` + i18n    | ✅ OK                             |
| `OutboundDetailDto`        | `product_id`   | `@IsNotEmpty()` + `@IsUUID('4')` + i18n  | ✅ OK                             |
| `CreateOutboundRequestDto` | `details`      | `@IsArray()` + `@ArrayMinSize(1)` + i18n | ✅ OK                             |
| `ActualQuantityDetailDto`  | `actual_qty`   | `@IsNumber()` + `@Min(0)`                | ✅ OK                             |
| `RejectInboundDto`         | `reason`       | `@IsString()` + i18n                     | ✅ OK                             |
| `RejectOutboundDto`        | `reason`       | `@IsString()` + i18n                     | ✅ OK                             |

#### G5.2 DTOs MỚI (Phần B2) — CẦN BỔ SUNG ❌

| DTO                         | Field                 | Hiện tại                | Cần bổ sung                                           |
| --------------------------- | --------------------- | ----------------------- | ----------------------------------------------------- |
| `ConfirmReceivingDetailDto` | `actual_qty`          | `@IsNumber()` `@Min(0)` | ❌ **Thiếu i18n message**                             |
| `ConfirmReceivingDetailDto` | `detail_id`           | `@IsUUID('4')`          | ❌ **Thiếu i18n message**                             |
| `ConfirmReceivingDto`       | `details`             | `@IsArray()`            | ❌ **Thiếu `@ArrayMinSize(1)`** — cho phép mảng rỗng! |
| `ConfirmPutawayDetailDto`   | `actual_qty`          | `@IsNumber()` `@Min(0)` | ❌ **Thiếu i18n message**                             |
| `ConfirmPutawayDetailDto`   | `putaway_detail_id`   | `@IsUUID('4')`          | ❌ **Thiếu i18n message**                             |
| `ConfirmPickingDetailDto`   | `picked_qty`          | `@IsNumber()` `@Min(0)` | ❌ **Thiếu i18n message**                             |
| `ConfirmPickingDetailDto`   | `pick_list_detail_id` | `@IsUUID('4')`          | ❌ **Thiếu i18n message**                             |
| `ConfirmPickingDto`         | `details`             | `@IsArray()`            | ❌ **Thiếu `@ArrayMinSize(1)`**                       |
| `ConfirmCheckingDetailDto`  | `checked_qty`         | `@IsNumber()` `@Min(0)` | ❌ **Thiếu i18n message**                             |
| `ConfirmCheckingDetailDto`  | `export_detail_id`    | `@IsUUID('4')`          | ❌ **Thiếu i18n message**                             |
| `ConfirmCheckingDto`        | `details`             | `@IsArray()`            | ❌ **Thiếu `@ArrayMinSize(1)`**                       |
| `CompleteShipmentDto`       | `tracking_number`     | `@IsString()`           | ⚠️ Nên thêm `@MaxLength(100)`                         |
| `CompleteShipmentDto`       | `notes`               | `@IsString()`           | ⚠️ Nên thêm `@MaxLength(1000)`                        |
| `RejectInboundDto`          | `reason`              | `@IsString()` + i18n    | ❌ **Thiếu `@IsNotEmpty()`** — cho phép chuỗi rỗng    |
| `RejectOutboundDto`         | `reason`              | `@IsString()` + i18n    | ❌ **Thiếu `@IsNotEmpty()`** — cho phép chuỗi rỗng    |

#### G5.3 Code sửa cho DTOs MỚI (copy-paste ready)

Sửa `ConfirmReceivingDetailDto`:

```diff
 export class ConfirmReceivingDetailDto {
   @ApiProperty({ description: "ID chi tiết phiếu nhập" })
-  @IsUUID("4")
+  @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.detail_id_required') })
+  @IsUUID("4", { message: i18nValidationMessage('inventory-request.validation.detail_id_uuid') })
   detail_id: string;

   @ApiProperty({ description: "Số lượng thực tế đã nhận", minimum: 0 })
-  @IsNumber()
-  @Min(0)
+  @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
+  @Min(0, { message: i18nValidationMessage('inventory-request.validation.quantity_min_zero') })
   actual_qty: number;
 }
```

Sửa `ConfirmReceivingDto`:

```diff
 export class ConfirmReceivingDto {
   @ApiProperty({ type: [ConfirmReceivingDetailDto] })
-  @IsArray()
+  @IsArray({ message: i18nValidationMessage('inventory-request.validation.details_array') })
+  @ArrayMinSize(1, { message: i18nValidationMessage('inventory-request.validation.details_min') })
   @ValidateNested({ each: true })
   @Type(() => ConfirmReceivingDetailDto)
   details: ConfirmReceivingDetailDto[];
 }
```

Sửa `ConfirmPickingDetailDto`:

```diff
 export class ConfirmPickingDetailDto {
   @ApiProperty({ description: "ID chi tiết pick list" })
-  @IsUUID("4")
+  @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.detail_id_required') })
+  @IsUUID("4", { message: i18nValidationMessage('inventory-request.validation.detail_id_uuid') })
   pick_list_detail_id: string;

   @ApiProperty({ description: "Số lượng đã nhặt", minimum: 0 })
-  @IsNumber()
-  @Min(0)
+  @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
+  @Min(0, { message: i18nValidationMessage('inventory-request.validation.quantity_min_zero') })
   picked_qty: number;
 }
```

Sửa `ConfirmPickingDto`:

```diff
 export class ConfirmPickingDto {
   @ApiProperty({ type: [ConfirmPickingDetailDto] })
-  @IsArray()
+  @IsArray({ message: i18nValidationMessage('inventory-request.validation.details_array') })
+  @ArrayMinSize(1, { message: i18nValidationMessage('inventory-request.validation.details_min') })
   @ValidateNested({ each: true })
   @Type(() => ConfirmPickingDetailDto)
   details: ConfirmPickingDetailDto[];
 }
```

Sửa `ConfirmCheckingDetailDto`:

```diff
 export class ConfirmCheckingDetailDto {
   @ApiProperty({ description: "ID chi tiết phiếu xuất" })
-  @IsUUID("4")
+  @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.detail_id_required') })
+  @IsUUID("4", { message: i18nValidationMessage('inventory-request.validation.detail_id_uuid') })
   export_detail_id: string;

   @ApiProperty({ description: "Số lượng đã kiểm", minimum: 0 })
-  @IsNumber()
-  @Min(0)
+  @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
+  @Min(0, { message: i18nValidationMessage('inventory-request.validation.quantity_min_zero') })
   checked_qty: number;
 }
```

Sửa `ConfirmCheckingDto`:

```diff
 export class ConfirmCheckingDto {
   @ApiProperty({ type: [ConfirmCheckingDetailDto] })
-  @IsArray()
+  @IsArray({ message: i18nValidationMessage('inventory-request.validation.details_array') })
+  @ArrayMinSize(1, { message: i18nValidationMessage('inventory-request.validation.details_min') })
   @ValidateNested({ each: true })
   @Type(() => ConfirmCheckingDetailDto)
   details: ConfirmCheckingDetailDto[];
 }
```

Sửa `ConfirmPutawayDetailDto`:

```diff
 export class ConfirmPutawayDetailDto {
   @ApiProperty({ description: "ID chi tiết phiếu cất hàng" })
-  @IsUUID("4")
+  @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.detail_id_required') })
+  @IsUUID("4", { message: i18nValidationMessage('inventory-request.validation.detail_id_uuid') })
   putaway_detail_id: string;

   @ApiProperty({ description: "Số lượng đã cất thực tế", minimum: 0 })
-  @IsNumber()
-  @Min(0)
+  @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
+  @Min(0, { message: i18nValidationMessage('inventory-request.validation.quantity_min_zero') })
   actual_qty: number;
 }
```

Sửa `CompleteShipmentDto`:

```diff
 export class CompleteShipmentDto {
   @ApiPropertyOptional({ description: "Ghi chú bàn giao" })
   @IsOptional()
-  @IsString()
+  @IsString({ message: i18nValidationMessage('inventory-request.validation.notes_string') })
+  @MaxLength(1000, { message: i18nValidationMessage('inventory-request.validation.notes_max_length') })
   notes?: string;

   @ApiPropertyOptional({ description: "Số tracking vận chuyển" })
   @IsOptional()
-  @IsString()
+  @IsString({ message: i18nValidationMessage('inventory-request.validation.tracking_number_string') })
+  @MaxLength(100, { message: i18nValidationMessage('inventory-request.validation.tracking_number_max_length') })
   tracking_number?: string;
 }
```

Sửa `RejectInboundDto` và `RejectOutboundDto` (file hiện tại):

```diff
 export class RejectInboundDto {
   @ApiProperty({ description: 'Lý do từ chối' })
+  @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.reject_reason_required') })
   @IsString({ message: i18nValidationMessage('inventory-request.validation.reject_reason_string') })
+  @MaxLength(500, { message: i18nValidationMessage('inventory-request.validation.reject_reason_max_length') })
   reason: string;
 }

 export class RejectOutboundDto {
   @ApiProperty({ description: 'Lý do từ chối' })
+  @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.reject_reason_required') })
   @IsString({ message: i18nValidationMessage('inventory-request.validation.reject_reason_string') })
+  @MaxLength(500, { message: i18nValidationMessage('inventory-request.validation.reject_reason_max_length') })
   reason: string;
 }
```

#### G5.4 Import bổ sung cho `dto/index.ts`

```diff
 import {
     IsOptional,
     IsString,
     IsInt,
     Min,
     IsEnum,
     IsArray,
     ArrayMinSize,
     ValidateNested,
     IsUUID,
     IsNumber,
+    IsNotEmpty,
+    IsBoolean,
+    MaxLength,
 } from 'class-validator';
```

#### G5.5 i18n messages mới cho validation

**File**: `server/src/i18n/vi/inventory-request.json` — Thêm vào `"validation"`:

```json
"detail_id_required": "ID chi tiết là bắt buộc",
"detail_id_uuid": "ID chi tiết phải là UUID hợp lệ",
"quantity_min_zero": "Số lượng không được nhỏ hơn 0",
"reject_reason_required": "Lý do từ chối là bắt buộc",
"reject_reason_max_length": "Lý do từ chối không được quá 500 ký tự",
"notes_max_length": "Ghi chú không được quá 1000 ký tự",
"tracking_number_string": "Số tracking phải là chuỗi",
"tracking_number_max_length": "Số tracking không được quá 100 ký tự"
```

**File**: `server/src/i18n/en/inventory-request.json` — Thêm tương ứng:

```json
"detail_id_required": "Detail ID is required",
"detail_id_uuid": "Detail ID must be a valid UUID",
"quantity_min_zero": "Quantity must not be less than 0",
"reject_reason_required": "Rejection reason is required",
"reject_reason_max_length": "Rejection reason must not exceed 500 characters",
"notes_max_length": "Notes must not exceed 1000 characters",
"tracking_number_string": "Tracking number must be a string",
"tracking_number_max_length": "Tracking number must not exceed 100 characters"
```

#### G5.6 Frontend validation (Client-side)

Ngoài backend, frontend cũng cần validate TRƯỚC khi gửi API:

| Vị trí                                        | Validation cần thêm                                                |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `inbound/page.tsx` — dialog tạo phiếu         | ❌ Kiểm tra `expected_qty > 0` trước submit (hiện chỉ check empty) |
| `inbound/page.tsx` — dialog tạo phiếu         | ❌ Kiểm tra `import_price >= 0` nếu có nhập                        |
| `outbound/page.tsx` — dialog tạo phiếu        | ❌ Kiểm tra `quantity > 0` trước submit                            |
| `InboundApprovalDetail.tsx` — form kiểm đếm   | ❌ Kiểm tra `actual_qty >= 0` trước gọi confirmReceiving           |
| `OutboundApprovalDetail.tsx` — form nhặt hàng | ❌ Kiểm tra `picked_qty >= 0` trước gọi confirmPicking             |
| Tất cả các form                               | ⚠️ Disable nút submit khi đang loading (tránh double submit)       |

Pattern frontend validation:

```typescript
// Trước khi gửi API
const handleSubmit = async () => {
  // Validate không có số âm
  const hasNegative = details.some(
    (d) =>
      d.expected_qty < 0 ||
      (d.import_price !== undefined && d.import_price < 0),
  );
  if (hasNegative) {
    showToast("Số lượng và giá không được nhập số âm", "error");
    return;
  }

  // Validate không có qty = 0
  const hasZeroQty = details.some((d) => d.expected_qty <= 0);
  if (hasZeroQty) {
    showToast("Số lượng phải lớn hơn 0", "error");
    return;
  }

  // Validate có ít nhất 1 sản phẩm
  if (details.length === 0) {
    showToast("Vui lòng thêm ít nhất 1 sản phẩm", "error");
    return;
  }

  setSubmitting(true);
  try {
    // ... gọi API
  } finally {
    setSubmitting(false);
  }
};
```

---

## Phần E: Module Registration & Safety

### KHÔNG cần sửa `app.module.ts`

Cả hai module đã đăng ký tại `server/src/app.module.ts` line 90-91, 194-196.

### KHÔNG cần sửa `main.ts`

Swagger tag đã có trong `orderedTags`.

### Checklist KHÔNG break modules khác

| Kiểm tra               | Kết quả                                |
| ---------------------- | -------------------------------------- |
| `app.module.ts`        | ✅ Không sửa                           |
| `main.ts` Swagger tags | ✅ Không sửa                           |
| Guards                 | ✅ Dùng có sẵn, không tạo mới          |
| Decorators             | ✅ Dùng có sẵn, không tạo mới          |
| Response classes       | ✅ Dùng có sẵn, không sửa              |
| Prisma schema          | ✅ Chỉ THÊM, không sửa/xóa cũ          |
| i18n                   | ✅ Chỉ THÊM keys, không sửa/xóa        |
| WebSocket gateway      | ✅ Dùng `emitToOrganization()` generic |
| Routes                 | ✅ URL mới không trùng route cũ        |

### Modules KHÔNG BỊ ẢNH HƯỞNG

- `warehouse-manager` — quản lý WM users
- `warehouse-manager-role` — CRUD roles/permissions
- `warehouse-manager-view` — view warehouse data
- `inventory-request` — Org member tạo phiếu
- `organization`, `warehouse`, `product`, `batch`, `unit` — modules khác

---

## Quy Tắc Đặt Tên & Conventions

### Server-side

| Loại             | Pattern                     | Ví dụ                                                             |
| ---------------- | --------------------------- | ----------------------------------------------------------------- |
| Controller class | `PascalCase` + `Controller` | `WarehouseManagerInventoryController`                             |
| Service class    | `PascalCase` + `Service`    | `WarehouseManagerInventoryService`                                |
| DTO class        | `PascalCase` + `Dto`        | `ConfirmReceivingDto`                                             |
| Method name      | `camelCase`                 | `startReceiving()`, `confirmPutaway()`                            |
| API route        | kebab-case                  | `/inbound/:id/start-receiving`                                    |
| Permission key   | dot-separated               | `warehouse-manager.inventory.inbound.receive`                     |
| WebSocket event  | `module:action-verb`        | `inbound:receiving-confirmed`                                     |
| Redis cache key  | colon-separated             | `inventory:inbound:putaway:receiptId`                             |
| i18n key         | dot-separated               | `inventory-request.errors.receiving_not_completed`                |
| Response class   | `UpdatedResponse`           | `new UpdatedResponse('code', data, message)`                      |
| Prisma enum      | UPPER_SNAKE_CASE            | `RECEIVING`, `PUTAWAY`, `CHECKING`                                |
| DB table         | snake_case plural           | `receipt_putaways`                                                |
| DB column        | snake_case                  | `checker_id`, `approved_at`                                       |
| Guard decorator  | `@RequirePermission(...)`   | **KHÔNG dùng** `@RequireWMPermission` hay `@RequireOrgPermission` |

### Client-side

| Loại          | Pattern                  | Ví dụ                                    |
| ------------- | ------------------------ | ---------------------------------------- |
| Service class | `PascalCase` + `Service` | `WarehouseManagerInventoryService`       |
| Type          | `PascalCase`             | `InboundRequest`, `ReceiptStatus`        |
| Payload type  | `PascalCase` + `Payload` | `ConfirmReceivingPayload`                |
| File name     | kebab-case `.ts`/`.tsx`  | `warehouse-manager-inventory.service.ts` |
| Status config | `STATUS_CONFIG` constant | `Record<Status, { label, className }>`   |

### Import Patterns (Backend)

```typescript
// Guards
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { WarehouseManagerPermissionGuard } from "../../common/guards/warehouse-manager-permission.guard";

// Decorators
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

// Response
import {
  GetResponse,
  UpdatedResponse,
} from "../../common/responses/success.response";

// Prisma
import {
  ReceiptStatus,
  ExportStatus,
  TransactionType,
  Prisma,
} from "@prisma/client";

// i18n
import { I18nLang } from "nestjs-i18n";
```

---

## Lưu Ý Quan Trọng

### 1. KHÔNG tạo module mới

Tất cả thay đổi backend thêm vào `warehouse-manager-inventory` module hiện có. KHÔNG tạo module mới cho Worker/Checker.

### 2. Worker/Checker là ROLES, không phải MODULES

Phân biệt qua `WarehouseManagerRole` + `WarehouseManagerPermission`. Cách thêm:

1. Seed permission keys mới vào bảng `WarehouseManagerPermission`
2. Tạo roles mới ("Thủ kho", "Nhân viên kiểm đếm")
3. Gán permissions phù hợp cho mỗi role

### 3. KHÔNG nhầm decorators

- `@RequirePermission(...)` → dùng với `WarehouseManagerPermissionGuard` (controller WM)
- `@RequireOrgPermission(...)` → dùng với `OrgPermissionGuard` (controller Org)
- Controller `warehouse-manager-inventory` dùng `@RequirePermission(...)` chứ KHÔNG dùng `@RequireWMPermission(...)`

### 4. ExportPickList ĐÃ CÓ trong schema

KHÔNG tạo model mới. Dùng model sẵn: `ExportPickList`, `ExportPickListDetail`, `PickListStatus`.

### 5. `quantity_allocated` ĐÃ CÓ trong Inventory

```
quantity           // Tổng số lượng
quantity_on_hand   // Số lượng thực tế
quantity_allocated // Giữ chỗ (hiện = 0) ← DÙNG CÁI NÀY
quantity_available // Khả dụng = on_hand - allocated
```

Reserve: `allocated += qty`, `available -= qty`  
Confirm pick: `quantity -= qty`, `on_hand -= qty`, `allocated -= qty`

### 6. Giữ backward compatibility

Thêm flag `skip_workflow` vào `ApproveInboundDto` và `ApproveOutboundDto`:

- `skip_workflow = true` → behavior cũ (approve → COMPLETED/SHIPPED)
- `skip_workflow = false` (default) → luồng mới

### 7. Migration database an toàn

- Thêm enum values: PostgreSQL `ALTER TYPE ... ADD VALUE` → OK
- Thêm columns optional: Nullable → data cũ không ảnh hưởng
- Thêm tables: Hoàn toàn an toàn

```bash
# 1. Sửa schema.prisma
# 2. Tạo migration
npx prisma migrate dev --name add_inbound_outbound_workflow_steps
# 3. Generate client
npx prisma generate
```

### 8. Không sửa logic `fillInventory()` và `pickInventory()`

- `fillInventory()` → giữ nguyên, chỉ đổi nơi gọi (từ `approveInbound` sang `confirmPutaway`)
- `pickInventory()` → tách thành `reserveInventory()` (khi approve) và `confirmPickInventory()` (khi complete shipment)

### 9. `warehouse-manager-inventory.module.ts` có thể cần thêm import

Nếu cần dùng `InventoryRequestCacheKeys` trong services mới:

```typescript
imports: [
    SharedModule,
    RedisModule,
    WebsocketModule,
    OrganizationModule,
    InventoryRequestModule, // Thêm nếu cần cache helper
],
```

### 10. Tổng quan files thay đổi

```
SỬA:
  server/prisma/schema.prisma                              (enums + fields + 2 models)
  server/src/modules/warehouse-manager-inventory/
    ├── warehouse-manager-inventory.controller.ts           (7 endpoints + swagger)
    ├── warehouse-manager-inventory.service.ts              (6 methods mới + sửa 2)
    ├── warehouse-manager-inventory.module.ts               (có thể thêm import)
    └── dto/index.ts                                        (8 DTOs mới)
  server/src/modules/inventory-request/
    ├── inventory-request.service.ts                         (thêm validation warehouse/product)
    ├── dto/create-inbound-request.dto.ts                   (2 fields)
    ├── dto/create-outbound-request.dto.ts                  (2 fields)
    └── interfaces/inventory-request.interface.ts           (thêm fields)
  server/src/i18n/vi/inventory-request.json                 (messages + validation)
  server/src/i18n/en/inventory-request.json                 (messages + validation)
  client/services/inventory/inventory.types.ts              (types)
  client/app/(protected)/dashboard/admin/approval/
    ├── page.tsx                                             (Kanban columns + status mapping + bulk approve)
    ├── approval.css                                         (Kanban column style mới)
    ├── InboundApprovalDetail.tsx                            (gọi API thật + dynamic actions theo status + timeline)
    └── OutboundApprovalDetail.tsx                           (gọi API thật + dynamic actions theo status + timeline)
  client/app/(protected)/dashboard/customer/
    ├── inbound/page.tsx                                     (status badges + filter tabs + replace mock warehouse)
    ├── inbound/inbound.css                                  (3 status badge mới)
    ├── outbound/page.tsx                                    (status badges + filter tabs + replace mock warehouse)
    └── outbound/outbound.css                                (1 status badge mới)

THÊM MỚI:
  client/services/inventory/warehouse-manager-inventory.service.ts

KHÔNG SỬA:
  server/src/app.module.ts
  server/src/main.ts
  server/src/common/guards/*
  server/src/common/decorators/*
  server/src/common/responses/*
  server/src/modules/warehouse-manager/*
  server/src/modules/warehouse-manager-role/*
  server/src/modules/warehouse-manager-view/*
  server/src/modules/organization/*
  Tất cả modules khác
```

### 11. Replace `MOCK_RENTED_WAREHOUSES`

Xem **Phần F4** — Cả `inbound/page.tsx` và `outbound/page.tsx` đang dùng mock data cứng để chọn kho. Nếu mock IDs không khớp với DB → phiếu không tạo được.

### 12. Handlers chưa gọi API thật

Xem **Phần F6** — Ngoài approve/reject, còn `handleCancelConfirm`, `handleBulkApprove`, `handleQuarantine`, `handleSplitOrder` cũng chỉ show toast mà chưa gọi backend.

---

## Thứ Tự Implement An Toàn

```
── BACKEND ──
Bước 1:  Schema migration (Prisma)                 → Không break gì
Bước 2:  Thêm DTOs mới                             → Không break gì
Bước 3:  Thêm i18n messages (kể cả validation)     → Không break gì
Bước 4:  Seed permission keys                      → Không break gì
Bước 5:  Thêm backend validation (Phần G)          → Không break gì (thắt chặt logic)
Bước 6:  Thêm service methods MỚI                  → Không break gì (methods mới)
Bước 7:  Thêm controller endpoints MỚI             → Không break gì (routes mới)
Bước 8:  Sửa approveInbound() + approveOutbound()  → ⚠️ BREAK client cũ nếu không có skip_workflow

── FRONTEND ──
Bước 9:  Tạo client service MỚI (D2)               → Không break gì (file mới)
Bước 10: Cập nhật client types (A8, D5)             → Khớp với BE mới
Bước 11: Thêm CSS status badges (F1)                → Không break gì
Bước 12: Cập nhật STATUS_CONFIG + FILTER_TABS (A9, F2) → UI hiển thị status mới
Bước 13: Cập nhật Kanban columns + mapping (F3)     → Admin approval cập nhật
Bước 14: Replace MOCK_RENTED_WAREHOUSES (F4)        → ⚠️ Cần API warehouse sẵn sàng
Bước 15: Sửa InboundApprovalDetail (D3 + F5.1)      → Gọi API thật + dynamic actions
Bước 16: Sửa OutboundApprovalDetail (D4 + F5.2)     → Gọi API thật + dynamic actions
Bước 17: Thêm Timeline (F7)                         → UI tiến trình cho admin
Bước 18: Fix bulk approve + cancel handlers (F6)    → Gọi API thật
```

---

## Phần H: Quy Tắc Data Source & Anti-patterns

### H1. Quy Tắc Bắt Buộc — KHÔNG Dùng Mock Data Cho Submit

> [!CAUTION]
> Mock data CHỈ dùng cho **hiển thị UI tạm thời**. Mọi action gửi lên server (create, update, delete) **PHẢI** dùng ID thật từ API.

```typescript
// ❌ TUYỆT ĐỐI KHÔNG — Mock ID gửi lên server sẽ fail validate
const [warehouses] = useState(
  MOCK_RENTED_WAREHOUSES.map((w) => ({ id: w.id, name: w.name })),
);
// → Server trả: "Kho không thuộc quyền sở hữu của tổ chức"

// ✅ ĐÚNG — Lấy ID thật từ API
useEffect(() => {
  const realWarehouses = await fetch(`/organizations/${orgId}/warehouses`);
  setWarehouses(realWarehouses);
}, []);
```

### H2. Bảng Data Source — Phải Thống Nhất

| Component               | Hiện tại                         | Cần chuyển sang                                               |
| ----------------------- | -------------------------------- | ------------------------------------------------------------- |
| Dropdown Kho (Inbound)  | 🔴 Mock `MOCK_RENTED_WAREHOUSES` | 🟢 `GET /organizations/:orgId/warehouses`                     |
| Dropdown Kho (Outbound) | 🔴 Mock `MOCK_RENTED_WAREHOUSES` | 🟢 `GET /organizations/:orgId/warehouses`                     |
| Trang Kho đang thuê     | 🔴 Mock `MOCK_RENTED_WAREHOUSES` | 🟢 `GET /organizations/:orgId/rental-contracts?status=ACTIVE` |
| Dropdown Nhà cung cấp   | ✅ `partnerService.list()`       | Giữ nguyên                                                    |
| Dropdown Hàng hóa       | ✅ `productService.list()`       | Giữ nguyên                                                    |
| Dropdown Đơn vị tính    | ✅ Lấy từ product                | Giữ nguyên                                                    |

### H3. Anti-patterns — Đã Gặp & Cách Tránh

| #   | Anti-pattern                            | Hậu quả thực tế                            | Quy tắc                                        |
| --- | --------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| 1   | Dùng mock ID gửi lên API thật           | 404 "Kho không thuộc tổ chức"              | **Luôn fetch real IDs từ API**                 |
| 2   | Client gửi field server không nhận      | 422 "property should not exist"            | **So sánh DTO client vs server trước khi gửi** |
| 3   | Sửa nhiều file cùng lúc                 | Không biết lỗi từ thay đổi nào             | **Sửa 1 file → test → tiếp**                   |
| 4   | Xóa import mock mà không thay bằng API  | Dropdown rỗng                              | **Luôn có data source thay thế trước khi xóa** |
| 5   | Sửa code người khác trực tiếp           | Conflict khi merge                         | **Tạo wrapper/adapter riêng**                  |
| 6   | Không kiểm tra server deployed vs local | Code chạy local nhưng fail trên production | **Check Swagger docs API deployed**            |

### H4. Server Deployed ≠ Server Local

> [!WARNING]
> Code server local có thể khác version với `api.gen-hub.dev`. Luôn kiểm tra trước khi code client:

```
── Trước khi code client, kiểm tra ──

1. Server deployed version (Swagger): https://api.gen-hub.dev/api
2. So sánh DTO fields: local schema vs deployed schema
3. Test endpoint bằng Postman/curl trước khi code client
4. Nếu DTO khác → code client phải tương thích cả 2 version
```

### H5. Warehouse Ownership — Backend Validation Chain

Server validate warehouse qua chuỗi quan hệ DB (KHÔNG thể bypass):

```
Warehouse
  → Row (is_rented = true)
    → RentalContractDetail
      → RentalContract (organization_id = orgId, is_deleted = false)
```

→ Muốn tạo phiếu nhập/xuất: **Organization PHẢI có RentalContract ACTIVE + Warehouse + Row**.

### H6. Checklist Trước Khi Code Với AI

```
── PHÂN TÍCH (trước khi sửa) ──
□ Data này lấy từ đâu? Mock / API / DB trực tiếp?
□ Field nào là ID? ID này từ mock hay từ API thật?
□ Server deployed chấp nhận request này không? (check Swagger)
□ Đã commit code hiện tại chưa? (để có thể revert)

── IMPLEMENT (trong khi sửa) ──
□ Mỗi thay đổi sửa tối đa 1-2 file liên quan
□ Test ngay sau mỗi thay đổi
□ Nếu cần sửa code người khác → tạo wrapper riêng
□ Không xóa data source cũ trước khi data source mới hoạt động

── KIỂM TRA (sau khi sửa) ──
□ Mở DevTools → Network → kiểm tra Request Payload
□ Response có đúng expected không?
□ Mock data có bị ảnh hưởng không?
□ Các trang khác dùng cùng service có bị ảnh hưởng không?
```
