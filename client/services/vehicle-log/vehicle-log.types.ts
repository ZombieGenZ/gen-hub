export type VehicleType = 'TRUCK' | 'VAN' | 'MOTORBIKE' | 'CAR' | 'OTHER';
export type VehiclePurpose = 'INBOUND' | 'OUTBOUND' | 'VISIT' | 'DELIVERY' | 'OTHER';
export type VehicleLogStatus = 'INSIDE' | 'EXITED';

export interface VehicleLog {
    id: string;
    warehouse_template_id: string;
    code: string;
    license_plate: string;
    vehicle_type: VehicleType;
    driver_name?: string;
    driver_phone?: string;
    carrier_name?: string;
    purpose: VehiclePurpose;
    linked_receipt_id?: string;
    linked_export_id?: string;
    entry_time: string;
    exit_time?: string;
    status: VehicleLogStatus;
    notes?: string;
    plate_image_url?: string;
    created_at: string;
    warehouse_template?: { id: string; name: string };
}

export interface VehicleLogPage {
    items: VehicleLog[];
    total: number;
    hasMore: boolean;
}

export interface CreateVehicleLogPayload {
    warehouse_template_id: string;
    license_plate: string;
    vehicle_type?: VehicleType;
    driver_name?: string;
    driver_phone?: string;
    carrier_name?: string;
    purpose?: VehiclePurpose;
    linked_receipt_id?: string;
    linked_export_id?: string;
    entry_time?: string;
    notes?: string;
    plate_image_url?: string;
}

export interface OcrPlateResult {
    license_plate: string;
    confidence: number;
    image_url: string;
}

export interface VehicleLookupResult {
    active_log: VehicleLog | null;
    pending_receipts: unknown[];
    pending_exports: unknown[];
}

export interface VehicleStats {
    inside_count: number;
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
    TRUCK: 'Xe tải',
    VAN: 'Xe van',
    MOTORBIKE: 'Xe máy',
    CAR: 'Ô tô',
    OTHER: 'Khác',
};

export const VEHICLE_PURPOSE_LABELS: Record<VehiclePurpose, string> = {
    INBOUND: 'Nhập hàng',
    OUTBOUND: 'Xuất hàng',
    VISIT: 'Tham quan',
    DELIVERY: 'Giao hàng',
    OTHER: 'Khác',
};
