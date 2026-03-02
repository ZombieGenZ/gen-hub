// ────────────────────────────────────────────────────────────────────────────
// Mock data for "Kho đang thuê" (My Rented Warehouses)
// Reflects RentalContractDetail + Inventory + Product data
// ────────────────────────────────────────────────────────────────────────────

/* ── Block status on floor plan ─────────────────────────────────────── */
export type BlockStatus = "empty" | "occupied" | "reserved" | "locked";

export interface FloorBlock {
    id: string;
    /** Column index (0-based) */
    col: number;
    /** Row index (0-based) within the rack row */
    row: number;
    status: BlockStatus;
    product_name?: string;
    batch_code?: string;
    quantity?: number;
    /** 0-100 fill ratio */
    fill_pct: number;
    /** Access frequency (higher = hotter on heatmap) */
    access_freq: number;
}

export interface FloorRack {
    id: string;
    code: string;
    name: string;
    blocks: FloorBlock[];
    cols: number;
    rows: number;
}

export interface FloorRow {
    id: string;
    code: string;
    name: string;
    /** Is this row rented by the current user? (for shared warehouse) */
    is_mine: boolean;
    racks: FloorRack[];
    price_per_month: number;
    total_weight_capacity: number;
    current_weight: number;
}

/* ── Inventory item ─────────────────────────────────────────────────── */
export interface MockInventoryItem {
    id: string;
    product_name: string;
    sku: string;
    batch_code: string;
    quantity_on_hand: number;
    unit: string;
    expiry_date: string | null;
    location: string; // e.g. "Dãy A > Kệ A1 > Ô 3"
    row_code: string;
    rack_code: string;
    block_id: string;
    days_in_storage: number;
    /** Average daily outbound qty (last 30d) */
    avg_daily_out: number;
    weight_kg: number;
    image_url?: string;
}

/* ── Capacity forecast data point ───────────────────────────────────── */
export interface ForecastPoint {
    date: string; // ISO
    actual_pct?: number;
    forecast_pct?: number;
}

/* ── Transaction for heatmap ────────────────────────────────────────── */
export interface InventoryTransaction {
    id: string;
    type: "INBOUND" | "OUTBOUND";
    product_name: string;
    quantity: number;
    created_at: string;
    block_id: string;
}

/* ── Addon / Insurance ──────────────────────────────────────────────── */
export interface MockAddon {
    id: string;
    name: string;
    price: number;
    description: string;
    icon: string;
}
export interface MockInsurance {
    id: string;
    name: string;
    price: number;
    coverage: string;
}

/* ── Payment ────────────────────────────────────────────────────────── */
export type PaymentStatus = "PAID" | "PENDING" | "FAILED" | "REFUNDED";
export interface MockPayment {
    id: string;
    amount: number;
    status: PaymentStatus;
    method: "CASH" | "TRANSFER" | "CARD" | "WALLET";
    transaction_code?: string;
    paid_at?: string;
    created_at: string;
    description: string;
}

/* ── Full rented warehouse ──────────────────────────────────────────── */
export type WarehouseType = "Kho Thường" | "Fulfillment";
export type ContractStatus = "ACTIVE" | "PENDING" | "EXPIRING" | "OVERDUE_LEVEL_1";

export interface MockRentedWarehouse {
    id: string;
    name: string;
    type: WarehouseType;
    address: string;
    province: string;
    area: number; // m²
    image: string;

    // Contract
    contract_id: string;
    contract_code: string;
    contract_status: ContractStatus;
    started_at: string;
    expired_at: string;
    auto_renew: boolean;
    total_price: number;
    final_price: number;
    discount_rate: number;
    notes?: string;

    // Warehouse details
    is_whole_warehouse: boolean;
    ceiling_height: number;
    total_weight_capacity: number;
    current_weight: number;

    // Floor plan
    floor_rows: FloorRow[];

    // Inventory
    inventory: MockInventoryItem[];

    // Capacity forecast
    forecast: ForecastPoint[];
    forecast_full_date?: string; // AI predicted date when 100%

    // Contract extras
    addons: MockAddon[];
    insurances: MockInsurance[];
    payments: MockPayment[];

    // Manager
    manager_name: string;
    manager_phone: string;
    manager_email: string;

    // Signers
    signers: { name: string; role: string; signed: boolean; signedAt?: string }[];
}

// ────────────────────────────────────────────────────────────────────────────
// Helper to generate blocks
// ────────────────────────────────────────────────────────────────────────────
function genBlocks(
    rackId: string,
    cols: number,
    rows: number,
    occupied: [number, number, string, string, number, number][], // [col, row, product, batch, qty, freq]
): FloorBlock[] {
    const blocks: FloorBlock[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const occ = occupied.find(([oc, or2]) => oc === c && or2 === r);
            const id = `${rackId}-b${r}${c}`;
            if (occ) {
                blocks.push({
                    id,
                    col: c,
                    row: r,
                    status: "occupied",
                    product_name: occ[2],
                    batch_code: occ[3],
                    quantity: occ[4],
                    fill_pct: Math.min(100, Math.round((occ[4] / 50) * 100)),
                    access_freq: occ[5],
                });
            } else {
                blocks.push({
                    id,
                    col: c,
                    row: r,
                    status: "empty",
                    fill_pct: 0,
                    access_freq: 0,
                });
            }
        }
    }
    return blocks;
}

// ────────────────────────────────────────────────────────────────────────────
// DATA: Warehouse 1 – Whole warehouse (Kho Thường)
// ────────────────────────────────────────────────────────────────────────────
const WH1_ROWS: FloorRow[] = [
    {
        id: "r-a",
        code: "ROW-A",
        name: "Dãy A",
        is_mine: true,
        price_per_month: 16000000,
        total_weight_capacity: 50000,
        current_weight: 36000,
        racks: [
            {
                id: "rk-a1",
                code: "A1",
                name: "Kệ A1",
                cols: 5,
                rows: 3,
                blocks: genBlocks("rk-a1", 5, 3, [
                    [0, 0, "Gạo ST25", "L-2025-001", 40, 18],
                    [1, 0, "Gạo ST25", "L-2025-001", 45, 22],
                    [2, 0, "Bột mì Đại Phong", "L-2025-014", 30, 8],
                    [0, 1, "Đường RE", "L-2025-003", 35, 14],
                    [1, 1, "Đường RE", "L-2025-003", 38, 16],
                    [3, 0, "Nước mắm Phú Quốc", "L-2024-088", 25, 28],
                    [4, 0, "Nước mắm Phú Quốc", "L-2024-088", 20, 30],
                    [2, 1, "Dầu ăn Tường An", "L-2025-009", 42, 10],
                    [3, 1, "Sữa TH True Milk", "L-2025-021", 48, 32],
                    [4, 1, "Sữa TH True Milk", "L-2025-021", 50, 35],
                    [0, 2, "Mì Hảo Hảo", "L-2025-005", 44, 40],
                    [1, 2, "Mì Hảo Hảo", "L-2025-005", 46, 42],
                ]),
            },
            {
                id: "rk-a2",
                code: "A2",
                name: "Kệ A2",
                cols: 5,
                rows: 3,
                blocks: genBlocks("rk-a2", 5, 3, [
                    [0, 0, "Nước ngọt Pepsi", "L-2025-030", 38, 26],
                    [1, 0, "Nước ngọt Coca", "L-2025-031", 40, 24],
                    [2, 0, "Bia Tiger", "L-2025-040", 35, 20],
                    [0, 1, "Bánh Orion", "L-2025-050", 28, 5],
                    [1, 1, "Snack Poca", "L-2025-051", 22, 6],
                ]),
            },
        ],
    },
    {
        id: "r-b",
        code: "ROW-B",
        name: "Dãy B",
        is_mine: true,
        price_per_month: 16000000,
        total_weight_capacity: 50000,
        current_weight: 44500,
        racks: [
            {
                id: "rk-b1",
                code: "B1",
                name: "Kệ B1",
                cols: 5,
                rows: 3,
                blocks: genBlocks("rk-b1", 5, 3, [
                    [0, 0, "Thức ăn chăn nuôi CP", "L-2025-060", 50, 4],
                    [1, 0, "Thức ăn chăn nuôi CP", "L-2025-060", 50, 3],
                    [2, 0, "Thức ăn chăn nuôi CP", "L-2025-061", 48, 3],
                    [3, 0, "Phân bón Đầu Trâu", "L-2025-070", 45, 2],
                    [4, 0, "Phân bón Đầu Trâu", "L-2025-070", 45, 2],
                    [0, 1, "Xi măng Holcim", "L-2025-080", 50, 6],
                    [1, 1, "Xi măng Holcim", "L-2025-080", 50, 5],
                    [2, 1, "Sắt thép Hòa Phát", "L-2025-081", 48, 4],
                    [3, 1, "Sắt thép Hòa Phát", "L-2025-081", 46, 3],
                    [4, 1, "Gạch Đồng Tâm", "L-2025-082", 44, 2],
                    [0, 2, "Sơn Dulux", "L-2025-090", 30, 12],
                    [1, 2, "Sơn Dulux", "L-2025-090", 28, 10],
                    [2, 2, "Keo dán Bostik", "L-2025-091", 25, 3],
                    [3, 2, "Ống nhựa Bình Minh", "L-2025-092", 40, 2],
                    [4, 2, "Ống nhựa Bình Minh", "L-2025-092", 42, 2],
                ]),
            },
        ],
    },
    {
        id: "r-c",
        code: "ROW-C",
        name: "Dãy C",
        is_mine: true,
        price_per_month: 16000000,
        total_weight_capacity: 50000,
        current_weight: 15000,
        racks: [
            {
                id: "rk-c1",
                code: "C1",
                name: "Kệ C1",
                cols: 5,
                rows: 3,
                blocks: genBlocks("rk-c1", 5, 3, [
                    [0, 0, "Thiết bị điện Schneider", "L-2025-100", 15, 8],
                    [1, 0, "Dây điện Cadivi", "L-2025-101", 20, 6],
                    [2, 0, "Bóng đèn Rạng Đông", "L-2025-102", 30, 14],
                ]),
            },
        ],
    },
];

const WH1_INVENTORY: MockInventoryItem[] = [
    { id: "inv-001", product_name: "Gạo ST25", sku: "GAO-ST25", batch_code: "L-2025-001", quantity_on_hand: 85, unit: "Bao (25kg)", expiry_date: "2026-06-15", location: "Dãy A > Kệ A1 > Ô 1-2", row_code: "ROW-A", rack_code: "A1", block_id: "rk-a1-b00", days_in_storage: 45, avg_daily_out: 3.2, weight_kg: 2125, image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=80" },
    { id: "inv-002", product_name: "Bột mì Đại Phong", sku: "BM-DP-001", batch_code: "L-2025-014", quantity_on_hand: 30, unit: "Bao (25kg)", expiry_date: "2026-03-20", location: "Dãy A > Kệ A1 > Ô 3", row_code: "ROW-A", rack_code: "A1", block_id: "rk-a1-b02", days_in_storage: 60, avg_daily_out: 0.8, weight_kg: 750, image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=80" },
    { id: "inv-003", product_name: "Đường RE", sku: "DRE-50", batch_code: "L-2025-003", quantity_on_hand: 73, unit: "Bao (50kg)", expiry_date: null, location: "Dãy A > Kệ A1 > Ô 4-5", row_code: "ROW-A", rack_code: "A1", block_id: "rk-a1-b10", days_in_storage: 38, avg_daily_out: 1.5, weight_kg: 3650, image_url: "https://images.unsplash.com/photo-1550411294-098c282b2548?w=80" },
    { id: "inv-004", product_name: "Nước mắm Phú Quốc", sku: "NM-PQ-500", batch_code: "L-2024-088", quantity_on_hand: 45, unit: "Thùng (12 chai)", expiry_date: "2026-01-10", location: "Dãy A > Kệ A1 > Ô 8-9", row_code: "ROW-A", rack_code: "A1", block_id: "rk-a1-b30", days_in_storage: 120, avg_daily_out: 4.8, weight_kg: 540, image_url: "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=80" },
    { id: "inv-005", product_name: "Sữa TH True Milk", sku: "TH-TM-1L", batch_code: "L-2025-021", quantity_on_hand: 98, unit: "Thùng (12 hộp)", expiry_date: "2025-09-30", location: "Dãy A > Kệ A1 > Ô 13-14", row_code: "ROW-A", rack_code: "A1", block_id: "rk-a1-b31", days_in_storage: 22, avg_daily_out: 6.5, weight_kg: 1176, image_url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=80" },
    { id: "inv-006", product_name: "Mì Hảo Hảo", sku: "MI-HH-75G", batch_code: "L-2025-005", quantity_on_hand: 90, unit: "Thùng (30 gói)", expiry_date: "2026-09-01", location: "Dãy A > Kệ A1 > Ô 11-12", row_code: "ROW-A", rack_code: "A1", block_id: "rk-a1-b20", days_in_storage: 15, avg_daily_out: 8.2, weight_kg: 2025, image_url: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=80" },
    { id: "inv-007", product_name: "Nước ngọt Pepsi", sku: "PEP-330", batch_code: "L-2025-030", quantity_on_hand: 38, unit: "Thùng (24 lon)", expiry_date: "2026-04-15", location: "Dãy A > Kệ A2 > Ô 1", row_code: "ROW-A", rack_code: "A2", block_id: "rk-a2-b00", days_in_storage: 30, avg_daily_out: 2.8, weight_kg: 304, image_url: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=80" },
    { id: "inv-008", product_name: "Thức ăn chăn nuôi CP", sku: "TACN-CP-25", batch_code: "L-2025-060", quantity_on_hand: 148, unit: "Bao (25kg)", expiry_date: "2026-12-31", location: "Dãy B > Kệ B1 > Ô 1-3", row_code: "ROW-B", rack_code: "B1", block_id: "rk-b1-b00", days_in_storage: 90, avg_daily_out: 0.5, weight_kg: 3700, image_url: "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=80" },
    { id: "inv-009", product_name: "Xi măng Holcim", sku: "XM-HOL-50", batch_code: "L-2025-080", quantity_on_hand: 100, unit: "Bao (50kg)", expiry_date: null, location: "Dãy B > Kệ B1 > Ô 6-7", row_code: "ROW-B", rack_code: "B1", block_id: "rk-b1-b10", days_in_storage: 55, avg_daily_out: 1.2, weight_kg: 5000, image_url: "https://images.unsplash.com/photo-1590937286685-7033fb0d4282?w=80" },
    { id: "inv-010", product_name: "Sơn Dulux", sku: "SON-DLX-5L", batch_code: "L-2025-090", quantity_on_hand: 58, unit: "Thùng (4 lon)", expiry_date: "2027-06-01", location: "Dãy B > Kệ B1 > Ô 11-12", row_code: "ROW-B", rack_code: "B1", block_id: "rk-b1-b20", days_in_storage: 25, avg_daily_out: 1.8, weight_kg: 1160, image_url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=80" },
    { id: "inv-011", product_name: "Thiết bị điện Schneider", sku: "TB-SCH-01", batch_code: "L-2025-100", quantity_on_hand: 15, unit: "Thùng", expiry_date: null, location: "Dãy C > Kệ C1 > Ô 1", row_code: "ROW-C", rack_code: "C1", block_id: "rk-c1-b00", days_in_storage: 40, avg_daily_out: 0.3, weight_kg: 300, image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=80" },
    { id: "inv-012", product_name: "Bóng đèn Rạng Đông", sku: "BD-RD-LED", batch_code: "L-2025-102", quantity_on_hand: 30, unit: "Thùng (50 bóng)", expiry_date: null, location: "Dãy C > Kệ C1 > Ô 3", row_code: "ROW-C", rack_code: "C1", block_id: "rk-c1-b20", days_in_storage: 35, avg_daily_out: 2.0, weight_kg: 150, image_url: "https://images.unsplash.com/photo-1532704093766-22068c32baa2?w=80" },
];

const WH1_FORECAST: ForecastPoint[] = [
    { date: "2026-01-01", actual_pct: 52 },
    { date: "2026-01-15", actual_pct: 55 },
    { date: "2026-02-01", actual_pct: 58 },
    { date: "2026-02-15", actual_pct: 61 },
    { date: "2026-03-01", actual_pct: 63 },
    { date: "2026-03-15", forecast_pct: 67 },
    { date: "2026-04-01", forecast_pct: 71 },
    { date: "2026-04-15", forecast_pct: 75 },
    { date: "2026-05-01", forecast_pct: 80 },
    { date: "2026-05-15", forecast_pct: 85 },
    { date: "2026-06-01", forecast_pct: 90 },
    { date: "2026-06-15", forecast_pct: 95 },
];

// ── DATA: Warehouse 2 – Shared warehouse (Kho Mát) ────────────────────────

const WH2_ROWS: FloorRow[] = [
    {
        id: "r2-a",
        code: "ROW-A",
        name: "Dãy A (Bạn thuê)",
        is_mine: true,
        price_per_month: 18000000,
        total_weight_capacity: 30000,
        current_weight: 16500,
        racks: [
            {
                id: "rk2-a1",
                code: "A1",
                name: "Kệ A1",
                cols: 4,
                rows: 3,
                blocks: genBlocks("rk2-a1", 4, 3, [
                    [0, 0, "Trứng gà Omega-3", "L-2025-200", 40, 38],
                    [1, 0, "Trứng gà Omega-3", "L-2025-200", 42, 36],
                    [2, 0, "Sữa chua Vinamilk", "L-2025-201", 50, 44],
                    [3, 0, "Sữa chua Vinamilk", "L-2025-201", 48, 42],
                    [0, 1, "Phô mai Bò Cười", "L-2025-210", 25, 18],
                    [1, 1, "Bơ Anchor", "L-2025-211", 30, 12],
                    [2, 1, "Xúc xích Vissan", "L-2025-212", 35, 28],
                    [3, 1, "Thịt nguội Ponnie", "L-2025-213", 20, 22],
                    [0, 2, "Rau sạch VinEco", "L-2025-220", 15, 50],
                    [1, 2, "Trái cây nhập khẩu", "L-2025-221", 18, 46],
                ]),
            },
        ],
    },
    {
        id: "r2-b",
        code: "ROW-B",
        name: "Dãy B (Người khác)",
        is_mine: false,
        price_per_month: 18000000,
        total_weight_capacity: 30000,
        current_weight: 22000,
        racks: [
            {
                id: "rk2-b1",
                code: "B1",
                name: "Kệ B1",
                cols: 4,
                rows: 3,
                blocks: genBlocks("rk2-b1", 4, 3, [
                    [0, 0, "???", "???", 40, 10],
                    [1, 0, "???", "???", 35, 8],
                    [2, 0, "???", "???", 42, 12],
                    [3, 0, "???", "???", 38, 9],
                    [0, 1, "???", "???", 30, 7],
                    [1, 1, "???", "???", 28, 6],
                ]),
            },
        ],
    },
    {
        id: "r2-c",
        code: "ROW-C",
        name: "Dãy C (Người khác)",
        is_mine: false,
        price_per_month: 18000000,
        total_weight_capacity: 30000,
        current_weight: 10000,
        racks: [
            {
                id: "rk2-c1",
                code: "C1",
                name: "Kệ C1",
                cols: 4,
                rows: 3,
                blocks: genBlocks("rk2-c1", 4, 3, [
                    [0, 0, "???", "???", 20, 5],
                    [1, 0, "???", "???", 22, 4],
                ]),
            },
        ],
    },
];

const WH2_INVENTORY: MockInventoryItem[] = [
    { id: "inv-201", product_name: "Trứng gà Omega-3", sku: "TRUNG-OMG3", batch_code: "L-2025-200", quantity_on_hand: 82, unit: "Khay (30 quả)", expiry_date: "2026-03-20", location: "Dãy A > Kệ A1 > Ô 1-2", row_code: "ROW-A", rack_code: "A1", block_id: "rk2-a1-b00", days_in_storage: 8, avg_daily_out: 12.5, weight_kg: 2460, image_url: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=80" },
    { id: "inv-202", product_name: "Sữa chua Vinamilk", sku: "SC-VNM-4P", batch_code: "L-2025-201", quantity_on_hand: 98, unit: "Thùng (48 hộp)", expiry_date: "2026-03-25", location: "Dãy A > Kệ A1 > Ô 3-4", row_code: "ROW-A", rack_code: "A1", block_id: "rk2-a1-b20", days_in_storage: 5, avg_daily_out: 15.0, weight_kg: 4704, image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=80" },
    { id: "inv-203", product_name: "Phô mai Bò Cười", sku: "PM-BC-8P", batch_code: "L-2025-210", quantity_on_hand: 25, unit: "Thùng", expiry_date: "2026-05-01", location: "Dãy A > Kệ A1 > Ô 5", row_code: "ROW-A", rack_code: "A1", block_id: "rk2-a1-b01", days_in_storage: 14, avg_daily_out: 1.2, weight_kg: 200, image_url: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=80" },
    { id: "inv-204", product_name: "Xúc xích Vissan", sku: "XS-VS-500G", batch_code: "L-2025-212", quantity_on_hand: 35, unit: "Thùng (20 gói)", expiry_date: "2026-04-10", location: "Dãy A > Kệ A1 > Ô 7", row_code: "ROW-A", rack_code: "A1", block_id: "rk2-a1-b21", days_in_storage: 10, avg_daily_out: 3.5, weight_kg: 350, image_url: "https://images.unsplash.com/photo-1612871689353-51e47e8c51b8?w=80" },
    { id: "inv-205", product_name: "Rau sạch VinEco", sku: "RAU-VE-1KG", batch_code: "L-2025-220", quantity_on_hand: 15, unit: "Thùng", expiry_date: "2026-03-08", location: "Dãy A > Kệ A1 > Ô 9", row_code: "ROW-A", rack_code: "A1", block_id: "rk2-a1-b02", days_in_storage: 3, avg_daily_out: 5.0, weight_kg: 75, image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=80" },
    { id: "inv-206", product_name: "Trái cây nhập khẩu", sku: "TC-NK-MIX", batch_code: "L-2025-221", quantity_on_hand: 18, unit: "Thùng", expiry_date: "2026-03-12", location: "Dãy A > Kệ A1 > Ô 10", row_code: "ROW-A", rack_code: "A1", block_id: "rk2-a1-b12", days_in_storage: 4, avg_daily_out: 4.0, weight_kg: 180, image_url: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=80" },
];

const WH2_FORECAST: ForecastPoint[] = [
    { date: "2026-01-01", actual_pct: 40 },
    { date: "2026-01-15", actual_pct: 44 },
    { date: "2026-02-01", actual_pct: 48 },
    { date: "2026-02-15", actual_pct: 52 },
    { date: "2026-03-01", actual_pct: 55 },
    { date: "2026-03-15", forecast_pct: 60 },
    { date: "2026-04-01", forecast_pct: 66 },
    { date: "2026-04-15", forecast_pct: 72 },
    { date: "2026-05-01", forecast_pct: 79 },
    { date: "2026-05-15", forecast_pct: 86 },
    { date: "2026-06-01", forecast_pct: 93 },
    { date: "2026-06-15", forecast_pct: 100 },
];

// ── DATA: Warehouse 3 – Fulfillment, expiring ─────────────────────────────

const WH3_ROWS: FloorRow[] = [
    {
        id: "r3-a",
        code: "ROW-A",
        name: "Dãy A",
        is_mine: true,
        price_per_month: 28000000,
        total_weight_capacity: 40000,
        current_weight: 35600,
        racks: [
            {
                id: "rk3-a1",
                code: "A1",
                name: "Kệ A1",
                cols: 6,
                rows: 4,
                blocks: genBlocks("rk3-a1", 6, 4, [
                    [0, 0, "Áo thun Uniqlo", "L-2025-300", 50, 55],
                    [1, 0, "Áo thun Uniqlo", "L-2025-300", 48, 52],
                    [2, 0, "Quần jeans Levi's", "L-2025-301", 35, 30],
                    [3, 0, "Giày Nike Air", "L-2025-302", 20, 60],
                    [4, 0, "Giày Nike Air", "L-2025-302", 22, 58],
                    [5, 0, "Balo Adidas", "L-2025-303", 18, 25],
                    [0, 1, "Mỹ phẩm Innisfree", "L-2025-310", 40, 48],
                    [1, 1, "Son MAC", "L-2025-311", 30, 62],
                    [2, 1, "Nước hoa Dior", "L-2025-312", 10, 70],
                    [3, 1, "Kem chống nắng", "L-2025-313", 45, 40],
                    [4, 1, "Sữa rửa mặt CeraVe", "L-2025-314", 38, 35],
                    [5, 1, "Mặt nạ Mediheal", "L-2025-315", 50, 42],
                    [0, 2, "Laptop Dell XPS", "L-2025-320", 5, 15],
                    [1, 2, "Tai nghe Sony WH", "L-2025-321", 12, 20],
                    [2, 2, "Sạc Anker", "L-2025-322", 25, 32],
                    [3, 2, "Cáp USB-C", "L-2025-323", 40, 28],
                    [0, 3, "Sách - Đắc Nhân Tâm", "L-2025-330", 30, 18],
                    [1, 3, "Sách - Atomic Habits", "L-2025-331", 25, 16],
                ]),
            },
        ],
    },
    {
        id: "r3-b",
        code: "ROW-B",
        name: "Dãy B",
        is_mine: true,
        price_per_month: 27000000,
        total_weight_capacity: 40000,
        current_weight: 20000,
        racks: [
            {
                id: "rk3-b1",
                code: "B1",
                name: "Kệ B1",
                cols: 6,
                rows: 4,
                blocks: genBlocks("rk3-b1", 6, 4, [
                    [0, 0, "Nồi chiên không dầu", "L-2025-340", 15, 22],
                    [1, 0, "Máy xay Philips", "L-2025-341", 12, 18],
                    [2, 0, "Bộ dao WMF", "L-2025-342", 8, 10],
                    [3, 0, "Chảo chống dính", "L-2025-343", 20, 14],
                    [0, 1, "Đồ chơi Lego", "L-2025-350", 25, 35],
                    [1, 1, "Đồ chơi trẻ em", "L-2025-351", 30, 32],
                ]),
            },
        ],
    },
];

const WH3_INVENTORY: MockInventoryItem[] = [
    { id: "inv-301", product_name: "Áo thun Uniqlo", sku: "AT-UNI-M", batch_code: "L-2025-300", quantity_on_hand: 98, unit: "Cái", expiry_date: null, location: "Dãy A > Kệ A1 > Ô 1-2", row_code: "ROW-A", rack_code: "A1", block_id: "rk3-a1-b00", days_in_storage: 18, avg_daily_out: 8.5, weight_kg: 29, image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80" },
    { id: "inv-302", product_name: "Giày Nike Air", sku: "GN-AIR-42", batch_code: "L-2025-302", quantity_on_hand: 42, unit: "Đôi", expiry_date: null, location: "Dãy A > Kệ A1 > Ô 4-5", row_code: "ROW-A", rack_code: "A1", block_id: "rk3-a1-b30", days_in_storage: 12, avg_daily_out: 5.2, weight_kg: 42, image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80" },
    { id: "inv-303", product_name: "Son MAC", sku: "SON-MAC-RD", batch_code: "L-2025-311", quantity_on_hand: 30, unit: "Cây", expiry_date: "2027-12-01", location: "Dãy A > Kệ A1 > Ô 8", row_code: "ROW-A", rack_code: "A1", block_id: "rk3-a1-b11", days_in_storage: 20, avg_daily_out: 4.0, weight_kg: 1, image_url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=80" },
    { id: "inv-304", product_name: "Nước hoa Dior", sku: "NH-DIOR-50", batch_code: "L-2025-312", quantity_on_hand: 10, unit: "Chai", expiry_date: "2028-06-01", location: "Dãy A > Kệ A1 > Ô 9", row_code: "ROW-A", rack_code: "A1", block_id: "rk3-a1-b21", days_in_storage: 25, avg_daily_out: 0.8, weight_kg: 5, image_url: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=80" },
    { id: "inv-305", product_name: "Mỹ phẩm Innisfree", sku: "MP-INF-SET", batch_code: "L-2025-310", quantity_on_hand: 40, unit: "Hộp", expiry_date: "2027-03-15", location: "Dãy A > Kệ A1 > Ô 7", row_code: "ROW-A", rack_code: "A1", block_id: "rk3-a1-b01", days_in_storage: 15, avg_daily_out: 3.2, weight_kg: 40, image_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=80" },
    { id: "inv-306", product_name: "Đồ chơi Lego", sku: "DC-LEGO-01", batch_code: "L-2025-350", quantity_on_hand: 25, unit: "Hộp", expiry_date: null, location: "Dãy B > Kệ B1 > Ô 5", row_code: "ROW-B", rack_code: "B1", block_id: "rk3-b1-b01", days_in_storage: 60, avg_daily_out: 0.4, weight_kg: 50, image_url: "https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=80" },
];

const WH3_FORECAST: ForecastPoint[] = [
    { date: "2026-01-01", actual_pct: 60 },
    { date: "2026-01-15", actual_pct: 63 },
    { date: "2026-02-01", actual_pct: 66 },
    { date: "2026-02-15", actual_pct: 67 },
    { date: "2026-03-01", actual_pct: 69 },
    { date: "2026-03-15", forecast_pct: 71 },
    { date: "2026-04-01", forecast_pct: 73 },
    { date: "2026-04-15", forecast_pct: 76 },
    { date: "2026-05-01", forecast_pct: 78 },
];

// ── COMMON ADDONS / INSURANCES ──

const ADDONS_1: MockAddon[] = [
    { id: "ad-1", name: "Dọn dẹp & vệ sinh kho", price: 2000000, description: "Dọn vệ sinh 2 lần / tháng", icon: "🧹" },
    { id: "ad-2", name: "Bảo vệ 24/7", price: 5000000, description: "Ca bảo vệ 3 ca liên tục", icon: "🛡️" },
    { id: "ad-3", name: "Xe nâng hàng", price: 3000000, description: "Sử dụng xe nâng không giới hạn", icon: "🏗️" },
];

const INSURANCES_1: MockInsurance[] = [
    { id: "ins-1", name: "Bảo hiểm cháy nổ", price: 1500000, coverage: "Bồi thường tối đa 2 tỷ VND" },
    { id: "ins-2", name: "Bảo hiểm hàng hóa", price: 2500000, coverage: "Bồi thường 100% giá trị hàng hóa bị hỏng" },
];

// ── COMMON PAYMENTS ──

const PAYMENTS_1: MockPayment[] = [
    { id: "pay-1", amount: 48000000, status: "PAID", method: "TRANSFER", transaction_code: "TXN-20250901-001", paid_at: "2025-09-01T10:30:00Z", created_at: "2025-08-28T08:00:00Z", description: "Thanh toán tháng 9/2025" },
    { id: "pay-2", amount: 48000000, status: "PAID", method: "TRANSFER", transaction_code: "TXN-20251001-002", paid_at: "2025-10-01T09:00:00Z", created_at: "2025-09-25T08:00:00Z", description: "Thanh toán tháng 10/2025" },
    { id: "pay-3", amount: 48000000, status: "PAID", method: "WALLET", transaction_code: "TXN-20251101-003", paid_at: "2025-11-02T11:00:00Z", created_at: "2025-10-28T08:00:00Z", description: "Thanh toán tháng 11/2025" },
    { id: "pay-4", amount: 48000000, status: "PAID", method: "TRANSFER", transaction_code: "TXN-20251201-004", paid_at: "2025-12-01T08:45:00Z", created_at: "2025-11-25T08:00:00Z", description: "Thanh toán tháng 12/2025" },
    { id: "pay-5", amount: 48000000, status: "PAID", method: "TRANSFER", transaction_code: "TXN-20260101-005", paid_at: "2026-01-02T10:00:00Z", created_at: "2025-12-28T08:00:00Z", description: "Thanh toán tháng 1/2026" },
    { id: "pay-6", amount: 48000000, status: "PAID", method: "WALLET", transaction_code: "TXN-20260201-006", paid_at: "2026-02-01T09:30:00Z", created_at: "2026-01-26T08:00:00Z", description: "Thanh toán tháng 2/2026" },
    { id: "pay-7", amount: 48000000, status: "PENDING", method: "TRANSFER", created_at: "2026-02-25T08:00:00Z", description: "Thanh toán tháng 3/2026" },
];

// ────────────────────────────────────────────────────────────────────────────
// EXPORT: All rented warehouses
// ────────────────────────────────────────────────────────────────────────────

export const MOCK_RENTED_WAREHOUSES: MockRentedWarehouse[] = [
    {
        id: "43f8d88c-bbf0-4d1f-88f9-767a2ecfedd7",
        name: "Kho A3 - Bình Dương",
        type: "Kho Thường",
        address: "KCN Sóng Thần 2, Dĩ An, Bình Dương",
        province: "Bình Dương",
        area: 2000,
        image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&auto=format&fit=crop",
        contract_id: "c-001",
        contract_code: "HD-2024-0041",
        contract_status: "ACTIVE",
        started_at: "2024-09-01",
        expired_at: "2026-08-31",
        auto_renew: true,
        total_price: 576000000,
        final_price: 547200000,
        discount_rate: 5,
        notes: "Hợp đồng thuê nguyên kho, thanh toán hàng tháng.",
        is_whole_warehouse: true,
        ceiling_height: 12,
        total_weight_capacity: 150000,
        current_weight: 95500,
        floor_rows: WH1_ROWS,
        inventory: WH1_INVENTORY,
        forecast: WH1_FORECAST,
        forecast_full_date: "2026-07-10",
        addons: ADDONS_1,
        insurances: INSURANCES_1,
        payments: PAYMENTS_1,
        manager_name: "Nguyễn Văn Thành",
        manager_phone: "0901 234 567",
        manager_email: "thanh.nv@genhub.vn",
        signers: [
            { name: "Trần Văn Minh", role: "Giám đốc", signed: true, signedAt: "2024-08-25" },
            { name: "Nguyễn Thị Hồng", role: "Quản lý kho", signed: true, signedAt: "2024-08-26" },
        ],
    },
    {
        id: "f98fa518-2679-43f3-8c1f-cef243dc1d90",
        name: "Fulfillment Hub - Hà Nội",
        type: "Fulfillment",
        address: "KCN Nội Bài, Sóc Sơn, Hà Nội",
        province: "Hà Nội",
        area: 1200,
        image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop",
        contract_id: "c-003",
        contract_code: "HD-2025-0012",
        contract_status: "EXPIRING",
        started_at: "2025-01-01",
        expired_at: "2026-03-31",
        auto_renew: false,
        total_price: 660000000,
        final_price: 627000000,
        discount_rate: 5,
        notes: "Kho fulfillment, đang sử dụng gần hết công suất.",
        is_whole_warehouse: true,
        ceiling_height: 10,
        total_weight_capacity: 80000,
        current_weight: 55600,
        floor_rows: WH3_ROWS,
        inventory: WH3_INVENTORY,
        forecast: WH3_FORECAST,
        addons: [
            { id: "ad-6", name: "Đóng gói & dán nhãn", price: 8000000, description: "Dịch vụ pick-pack tự động", icon: "📦" },
            { id: "ad-7", name: "Xe nâng hàng", price: 3000000, description: "Sử dụng xe nâng không giới hạn", icon: "🏗️" },
        ],
        insurances: INSURANCES_1,
        payments: [
            { id: "pay-c1", amount: 55000000, status: "PAID", method: "TRANSFER", transaction_code: "TXN-C-202501", paid_at: "2026-01-03T10:00:00Z", created_at: "2025-12-28T08:00:00Z", description: "Thanh toán tháng 1/2026" },
            { id: "pay-c2", amount: 55000000, status: "PAID", method: "WALLET", transaction_code: "TXN-C-202502", paid_at: "2026-02-02T09:30:00Z", created_at: "2026-01-26T08:00:00Z", description: "Thanh toán tháng 2/2026" },
            { id: "pay-c3", amount: 55000000, status: "PENDING", method: "TRANSFER", created_at: "2026-02-25T08:00:00Z", description: "Thanh toán tháng 3/2026" },
        ],
        manager_name: "Lê Minh Quân",
        manager_phone: "0987 654 321",
        manager_email: "quan.lm@genhub.vn",
        signers: [
            { name: "Trần Văn Minh", role: "Giám đốc", signed: true, signedAt: "2024-12-20" },
            { name: "Lê Minh Quân", role: "Quản lý kho", signed: true, signedAt: "2024-12-22" },
        ],
    },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Occupancy percentage of a warehouse */
export function getOccupancyPct(wh: MockRentedWarehouse): number {
    if (wh.total_weight_capacity === 0) return 0;
    return Math.round((wh.current_weight / wh.total_weight_capacity) * 100);
}

/** Days until date. Negative = overdue. */
export function daysUntil(dateStr: string): number {
    const now = new Date();
    const target = new Date(dateStr);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Format VND */
export function formatCurrency(val: number): string {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
}

/** Format date dd/MM/yyyy */
export function formatDate(str: string): string {
    try {
        const d = new Date(str);
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
        return str;
    }
}

/** Format date with time */
export function formatDateTime(str: string): string {
    try {
        const d = new Date(str);
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
        return str;
    }
}

/** Occupancy color class */
export function occupancyColor(pct: number): string {
    if (pct >= 90) return "text-red-600";
    if (pct >= 70) return "text-yellow-600";
    return "text-green-600";
}

/** Progress bar color */
export function occupancyBarColor(pct: number): string {
    if (pct >= 90) return "[&>div]:bg-red-500";
    if (pct >= 70) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-green-500";
}
