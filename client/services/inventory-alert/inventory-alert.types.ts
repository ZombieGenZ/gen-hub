export interface AlertConfig {
    id: string;
    organization_id: string;
    warehouse_id: string;
    product_id: string;
    min_quantity: number;
    reorder_point: number;
    lead_time_days: number;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    product?: { id: string; name: string; sku: string };
    warehouse?: { id: string; name: string };
}

export interface InventoryAlert {
    id: string;
    organization_id: string;
    warehouse_id: string;
    product_id: string;
    current_quantity: number;
    avg_daily_outbound: number;
    days_until_stockout: number;
    ai_prediction?: string;
    ai_suggestion?: string;
    is_resolved: boolean;
    resolved_at?: string;
    notified_at?: string;
    notification_sent_count: number;
    created_at: string;
    updated_at?: string;
    product?: { id: string; name: string; sku: string };
    warehouse?: { id: string; name: string };
}

export interface AlertStats {
    unresolved_count: number;
}

export interface CreateAlertConfigPayload {
    warehouse_id: string;
    product_id: string;
    min_quantity?: number;
    reorder_point?: number;
    lead_time_days?: number;
    is_active?: boolean;
}
