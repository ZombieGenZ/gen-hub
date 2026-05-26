export interface OrgOverviewKpi {
    totalStock: number;
    totalStockTrend: { value: string; direction: 'up' | 'down'; label: string };
    outboundOrders: number;
    outboundOrdersTrend: { value: string; direction: 'up' | 'down'; label: string };
    inboundShipments: number;
    inboundShipmentsTrend: { value: string; direction: 'up' | 'down'; label: string };
    activeContracts: number;
    expiringContracts: number;
    efficiency: number;
}

export interface StockFlowData {
    day: string;
    fullDate: string;
    inbound: number;
    outbound: number;
}

export interface TopProductData {
    id: string;
    name: string;
    count: number;
    unit: string;
    trend: 'up' | 'down';
    data: number[];
}

export interface StockAlertData {
    lowStock: { name: string; left: number; min: number; unit: string }[];
    expired: { name: string; left: number; unit: string; expiry: string }[];
}

export interface ShipmentData {
    id: string;
    type: 'Nhập' | 'Xuất';
    partner: string;
    date: string;
    status: string;
    timestamp: number;
}

export interface DockOverviewData {
    total: number;
    today: number;
    by_status: Record<string, number>;
    completion_rate: number;
    no_show_rate: number;
    top_warehouses: { id: string; name: string; count: number }[];
}

export interface DockTrendPoint {
    date: string;
    total: number;
    completed: number;
    no_show: number;
}
