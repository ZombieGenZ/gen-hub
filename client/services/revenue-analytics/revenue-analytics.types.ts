export interface RevenueFilters {
    preset?: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_QUARTER' | 'CUSTOM';
    from_date?: string;
    to_date?: string;
    province_id?: string;
    warehouse_template_id?: string;
}

export interface KpiItem {
    value: number;
    count: number;
    previousValue: number;
}

export interface SparklinePoint {
    day: string;
    total: number;
}

export interface KpiData {
    netRevenue: KpiItem;
    pending: KpiItem;
    overdue: KpiItem;
    refunded: KpiItem;
    sparkline: SparklinePoint[];
}

export interface TimeSeriesPoint {
    period: string;
    type: string;
    total: number;
}

export interface AddonSeriesPoint {
    period: string;
    addon_total: number;
    insurance_total: number;
}

export interface PaymentMethodBreakdownItem {
    payment_method: string;
    contract_count: number;
    total_amount: number;
}

export interface CouponDiscountPoint {
    period: string;
    total_discount: number;
}

export interface ChartData {
    timeSeries: TimeSeriesPoint[];
    addonSeries: AddonSeriesPoint[];
    paymentMethodBreakdown: PaymentMethodBreakdownItem[];
    couponDiscount: CouponDiscountPoint[] | null;
}

export interface TopOrganizationItem {
    id: string;
    name: string;
    tax_code: string | null;
    total_revenue: number;
    outstanding_debt: number;
    contract_count: number;
}

export interface TopWarehouseItem {
    id: string;
    name: string;
    price_per_month: number;
    address_detail: string | null;
    total_revenue: number;
    contract_count: number;
}

export interface TransactionItem {
    id: string;
    payment_code: string;
    amount: number;
    status: string;
    type: string;
    purpose: string;
    description: string;
    paid_at: string | null;
    created_at: string;
    organization: { id: string; name: string } | null;
    rental_contract: { id: string; code: string; name: string | null } | null;
}

export interface TableData<T = any> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    tab: string;
}
