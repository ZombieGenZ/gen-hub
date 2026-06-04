export type FleetVehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE';
export type FleetVehicleType = 'MOTORBIKE' | 'VAN' | 'TRUCK_SMALL' | 'TRUCK_MEDIUM' | 'TRUCK_LARGE' | 'CONTAINER';

export interface FleetVehicle {
    id: string;
    warehouse_id: string;
    name: string;
    license_plate: string;
    vehicle_type: FleetVehicleType;
    status: FleetVehicleStatus;
    cargo_length: number | string;
    cargo_width: number | string;
    cargo_height: number | string;
    max_weight_kg: number | string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    warehouse?: { id: string; name: string };
}

export interface FleetVehiclePage {
    items: FleetVehicle[];
    total: number;
    hasMore: boolean;
}

export interface CreateFleetVehiclePayload {
    warehouse_id: string;
    name: string;
    license_plate: string;
    vehicle_type?: FleetVehicleType;
    status?: FleetVehicleStatus;
    cargo_length: number;
    cargo_width: number;
    cargo_height: number;
    max_weight_kg: number;
    notes?: string;
}

export interface UpdateFleetVehiclePayload {
    name?: string;
    license_plate?: string;
    vehicle_type?: FleetVehicleType;
    status?: FleetVehicleStatus;
    cargo_length?: number;
    cargo_width?: number;
    cargo_height?: number;
    max_weight_kg?: number;
    notes?: string;
}

export const FLEET_VEHICLE_TYPE_LABELS: Record<FleetVehicleType, string> = {
    MOTORBIKE: 'Xe máy',
    VAN: 'Xe van',
    TRUCK_SMALL: 'Xe tải nhỏ',
    TRUCK_MEDIUM: 'Xe tải trung',
    TRUCK_LARGE: 'Xe tải lớn',
    CONTAINER: 'Container',
};

export const FLEET_STATUS_LABELS: Record<FleetVehicleStatus, string> = {
    AVAILABLE: 'Sẵn sàng',
    IN_USE: 'Đang sử dụng',
    MAINTENANCE: 'Bảo dưỡng',
    INACTIVE: 'Ngừng hoạt động',
};

export const FLEET_STATUS_COLORS: Record<FleetVehicleStatus, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    IN_USE: 'bg-blue-100 text-blue-800',
    MAINTENANCE: 'bg-yellow-100 text-yellow-800',
    INACTIVE: 'bg-gray-100 text-gray-600',
};
