// ────────────────────────────────────────────────────────────────────────────
// Mock data for "Phiếu PO" (Inbound Receipts)
// ────────────────────────────────────────────────────────────────────────────

import type {
    InboundRequest,
    InboundDetail,
} from "@/services/inventory/inventory.types";

// ── Helpers ──

const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;
const orgId = "org-0001";

// ── Mock warehouses ──

const WAREHOUSES = [
    { id: "wh-001", name: "Kho A3 - Bình Dương" },
    { id: "wh-002", name: "Kho Lạnh B1 - TP.HCM" },
    { id: "wh-003", name: "Fulfillment Hub - Hà Nội" },
];

// ── Mock partners (suppliers) ──

const PARTNERS = [
    { id: "partner-001", name: "Công ty TNHH Vật liệu Xanh", code: "NCC-001" },
    { id: "partner-002", name: "Nhà máy Thực phẩm Sài Gòn", code: "NCC-002" },
    { id: "partner-003", name: "Đại lý Phân phối Miền Bắc", code: "NCC-003" },
    { id: "partner-004", name: "Công ty CP Bao bì An Phát", code: "NCC-004" },
];

// ── Mock products ──

const PRODUCTS = [
    { id: "prod-001", name: "Gạo ST25 5kg", sku: "RICE-ST25-5KG", image_url: null },
    { id: "prod-002", name: "Nước mắm Phú Quốc 500ml", sku: "NMAM-PQ-500", image_url: null },
    { id: "prod-003", name: "Mì gói Hảo Hảo (thùng 30)", sku: "MI-HH-30P", image_url: null },
    { id: "prod-004", name: "Dầu ăn Tường An 2L", sku: "DAU-TA-2L", image_url: null },
    { id: "prod-005", name: "Sữa đặc Ông Thọ 380g", sku: "SUA-OT-380", image_url: null },
    { id: "prod-006", name: "Đường Biên Hòa 1kg", sku: "DG-BH-1KG", image_url: null },
    { id: "prod-007", name: "Cà phê G7 hộp 20 gói", sku: "CF-G7-20P", image_url: null },
    { id: "prod-008", name: "Nước giải khát Trà Xanh 0 Độ", sku: "TX-0DO-500", image_url: null },
];

const BATCHES = [
    { id: "batch-001", code: "LOT-2026-01-A", expiry_date: "2026-12-31" },
    { id: "batch-002", code: "LOT-2026-02-B", expiry_date: "2027-06-30" },
    { id: "batch-003", code: "LOT-2026-03-C", expiry_date: "2026-08-15" },
    { id: "batch-004", code: "LOT-2026-01-D", expiry_date: "2027-01-20" },
];

const UNITS = [
    { id: "unit-001", name: "Bao" },
    { id: "unit-002", name: "Chai" },
    { id: "unit-003", name: "Thùng" },
    { id: "unit-004", name: "Can" },
    { id: "unit-005", name: "Lon" },
    { id: "unit-006", name: "Hộp" },
    { id: "unit-007", name: "Kg" },
    { id: "unit-008", name: "Gói" },
];

// ── Generate details ──

function makeDetails(receiptId: string, productIndices: number[], batchIdx: number, unitIdx: number): InboundDetail[] {
    return productIndices.map((pi, i) => ({
        id: `${receiptId}-d${i + 1}`,
        receipt_id: receiptId,
        product_id: PRODUCTS[pi].id,
        batch_id: BATCHES[batchIdx]?.id ?? null,
        expected_qty: (i + 1) * 50,
        actual_qty: (i + 1) * 50 - Math.floor(Math.random() * 5),
        unit_id: UNITS[unitIdx].id,
        conversion_rate: 1,
        product: PRODUCTS[pi],
        batch: BATCHES[batchIdx] ?? null,
        unit: UNITS[unitIdx],
    }));
}

// ── Inbound receipts ──

export const MOCK_INBOUND_REQUESTS: InboundRequest[] = [
    {
        id: id("inb", 1),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[0].id,
        partner_id: PARTNERS[0].id,
        code: "NK-2026-0001",
        purchase_order_code: "PO-2026-0101",
        status: "COMPLETED",
        notes: "Nhập đợt 1 tháng 1/2026",
        is_active: true,
        created_at: "2026-01-05T08:30:00Z",
        updated_at: "2026-01-06T14:20:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[0],
        partner: PARTNERS[0],
        details: makeDetails(id("inb", 1), [0, 1, 2], 0, 0),
        _count: { details: 3 },
    },
    {
        id: id("inb", 2),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[1].id,
        partner_id: PARTNERS[1].id,
        code: "NK-2026-0002",
        purchase_order_code: "PO-2026-0102",
        status: "COMPLETED",
        notes: "Hàng lạnh đợt 1",
        is_active: true,
        created_at: "2026-01-10T09:15:00Z",
        updated_at: "2026-01-11T16:45:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[1],
        partner: PARTNERS[1],
        details: makeDetails(id("inb", 2), [3, 4], 1, 3),
        _count: { details: 2 },
    },
    {
        id: id("inb", 3),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[0].id,
        partner_id: PARTNERS[2].id,
        code: "NK-2026-0003",
        purchase_order_code: "PO-2026-0201",
        status: "COMPLETED",
        notes: null,
        is_active: true,
        created_at: "2026-02-01T07:00:00Z",
        updated_at: "2026-02-02T10:30:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[0],
        partner: PARTNERS[2],
        details: makeDetails(id("inb", 3), [5, 6, 7], 2, 2),
        _count: { details: 3 },
    },
    {
        id: id("inb", 4),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[2].id,
        partner_id: PARTNERS[3].id,
        code: "NK-2026-0004",
        purchase_order_code: null,
        status: "PROCESSING",
        notes: "Đang kiểm đếm, dự kiến xong trong ngày",
        is_active: true,
        created_at: "2026-02-20T10:00:00Z",
        updated_at: "2026-02-20T10:00:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[2],
        partner: PARTNERS[3],
        details: makeDetails(id("inb", 4), [0, 3, 6], 3, 0),
        _count: { details: 3 },
    },
    {
        id: id("inb", 5),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[0].id,
        partner_id: PARTNERS[0].id,
        code: "NK-2026-0005",
        purchase_order_code: "PO-2026-0301",
        status: "PROCESSING",
        notes: "Nhập bổ sung gạo và mì",
        is_active: true,
        created_at: "2026-02-25T13:30:00Z",
        updated_at: "2026-02-25T14:15:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[0],
        partner: PARTNERS[0],
        details: makeDetails(id("inb", 5), [0, 2], 0, 0),
        _count: { details: 2 },
    },
    {
        id: id("inb", 6),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[1].id,
        partner_id: PARTNERS[1].id,
        code: "NK-2026-0006",
        purchase_order_code: "PO-2026-0302",
        status: "PENDING",
        notes: "Chờ xe vận chuyển đến kho",
        is_active: true,
        created_at: "2026-02-28T08:00:00Z",
        updated_at: "2026-02-28T08:00:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[1],
        partner: PARTNERS[1],
        details: makeDetails(id("inb", 6), [4, 5, 7], 1, 2),
        _count: { details: 3 },
    },
    {
        id: id("inb", 7),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[2].id,
        partner_id: PARTNERS[2].id,
        code: "NK-2026-0007",
        purchase_order_code: null,
        status: "PENDING",
        notes: null,
        is_active: true,
        created_at: "2026-03-01T09:00:00Z",
        updated_at: "2026-03-01T09:00:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[2],
        partner: PARTNERS[2],
        details: makeDetails(id("inb", 7), [1, 2, 4, 6], 2, 5),
        _count: { details: 4 },
    },
    {
        id: id("inb", 8),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[0].id,
        partner_id: PARTNERS[3].id,
        code: "NK-2026-0008",
        purchase_order_code: "PO-2026-0303",
        status: "PENDING",
        notes: "Đợi xác nhận từ nhà cung cấp",
        is_active: true,
        created_at: "2026-03-01T15:30:00Z",
        updated_at: "2026-03-01T15:30:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[0],
        partner: PARTNERS[3],
        details: makeDetails(id("inb", 8), [0, 5], 3, 0),
        _count: { details: 2 },
    },
    {
        id: id("inb", 9),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[0].id,
        partner_id: PARTNERS[0].id,
        code: "NK-2026-0009",
        purchase_order_code: "PO-2025-1201",
        status: "CANCELLED",
        notes: "Hủy do nhà cung cấp hết hàng",
        is_active: false,
        created_at: "2025-12-15T10:00:00Z",
        updated_at: "2025-12-16T09:00:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[0],
        partner: PARTNERS[0],
        details: [],
        _count: { details: 0 },
    },
    {
        id: id("inb", 10),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[1].id,
        partner_id: null,
        code: "NK-2026-0010",
        purchase_order_code: null,
        status: "COMPLETED",
        notes: "Nhập nội bộ - chuyển kho",
        is_active: true,
        created_at: "2026-01-20T11:00:00Z",
        updated_at: "2026-01-21T08:30:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[1],
        partner: null,
        details: makeDetails(id("inb", 10), [7], 0, 2),
        _count: { details: 1 },
    },
    {
        id: id("inb", 11),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[2].id,
        partner_id: PARTNERS[1].id,
        code: "NK-2026-0011",
        purchase_order_code: "PO-2026-0201-B",
        status: "COMPLETED",
        notes: null,
        is_active: true,
        created_at: "2026-02-10T14:00:00Z",
        updated_at: "2026-02-11T17:00:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[2],
        partner: PARTNERS[1],
        details: makeDetails(id("inb", 11), [3, 6, 7], 1, 3),
        _count: { details: 3 },
    },
    {
        id: id("inb", 12),
        organization_id: orgId,
        warehouse_id: WAREHOUSES[0].id,
        partner_id: PARTNERS[2].id,
        code: "NK-2026-0012",
        purchase_order_code: "PO-2026-0215",
        status: "COMPLETED",
        notes: "Đợt bổ sung T2/2026",
        is_active: true,
        created_at: "2026-02-15T08:45:00Z",
        updated_at: "2026-02-16T15:00:00Z",
        created_by: "user-001",
        warehouse: WAREHOUSES[0],
        partner: PARTNERS[2],
        details: makeDetails(id("inb", 12), [1, 4, 5], 2, 1),
        _count: { details: 3 },
    },
];

// ── Mock warehouses for create form ──
export const MOCK_INBOUND_WAREHOUSES = WAREHOUSES;

// ── Mock partners for create form ──
export const MOCK_INBOUND_PARTNERS = PARTNERS;

// ── Mock products for create form ──
export const MOCK_INBOUND_PRODUCTS = PRODUCTS.map((p) => ({
    ...p,
    barcode: `899${p.sku.replace(/[^A-Z0-9]/g, "").slice(0, 8)}`,
    base_unit_id: UNITS[0].id,
    base_unit: UNITS[0],
    units: [
        {
            unit_id: UNITS[2].id,
            unit: UNITS[2],
            conversion_rate: 12,
            is_active: true,
            barcode: `899${p.sku.replace(/[^A-Z0-9]/g, "").slice(0, 6)}T`,
        },
    ],
}));

