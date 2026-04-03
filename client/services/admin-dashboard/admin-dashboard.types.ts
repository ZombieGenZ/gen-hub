// ─── Hero KPIs ────────────────────────────────────────────────

export interface HeroKpiData {
    totalWarehouses: number;
    pendingApprovals: number;
    totalCustomers: number;
    monthlyRevenue: number;
    updatedAt: string;
}

// ─── Actionable Inbox ─────────────────────────────────────────

export interface TicketItem {
    id: string;
    title: string;
    org: string;
    priority: string;
    time: string;
    status: string;
}

export interface OrgUpdateItem {
    id: string;
    org: string;
    type: string;
    time: string;
    status: string;
}

export interface RefundItem {
    id: string;
    org: string;
    amount: number;
    reason: string;
    time: string;
    status: string;
}

export interface VisitBookingItem {
    id: string;
    customerName: string;
    org: string;
    warehouse: string;
    time: string;
    status: string;
    date: string;
}

export interface ActionableInboxData {
    tickets: TicketItem[];
    orgUpdates: OrgUpdateItem[];
    refunds: RefundItem[];
    visitBookings: VisitBookingItem[];
}

// ─── Revenue Chart ────────────────────────────────────────────

export interface RevenueMonthlyItem {
    month: string;
    expected: number;
    actual: number;
}

// ─── Warehouse Heatmap ────────────────────────────────────────

export interface WarehouseHeatmapItem {
    id: string;
    name: string;
    revenue: number;
    occupancy: number;
}

export interface WarehouseHeatmapData {
    topRevenue: WarehouseHeatmapItem[];
    mostEmpty: WarehouseHeatmapItem[];
}

// ─── Activity Feed ────────────────────────────────────────────

export interface ActivityFeedItem {
    id: number | string;
    type: string;
    title: string;
    time: string;
    user: string;
    avatar: string;
}

// ─── System Health ────────────────────────────────────────────

export interface ServiceHealthItem {
    name: string;
    status: string;
    latency: string;
    uptime: string;
}

export interface SystemHealthAlert {
    id: number | string;
    level: string;
    message: string;
    time: string;
}

export interface SystemHealthData {
    services: ServiceHealthItem[];
    alerts: SystemHealthAlert[];
}
