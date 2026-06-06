export type DeadlineRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'MISSED';

export interface RouteStop {
    sequence: number;
    export_id: string;
    export_code: string;
    partner_name: string;
    delivery_address: string;
    estimated_arrival: string;       // ISO 8601
    estimated_departure: string;     // ISO 8601
    travel_time_minutes: number;
    distance_km: number;
    required_date?: string;          // ISO 8601
    deadline_risk: DeadlineRisk;
    deadline_buffer_minutes?: number;
    delivery_sequence_rank: number;  // 0=first delivery, 1=last
}

export interface DeadlineWarning {
    export_id: string;
    export_code: string;
    required_date: string;
    estimated_arrival: string;
    deadline_risk: string;
    message: string;
}

export interface RoutePlanResult {
    fleet_vehicle_id: string;
    vehicle_name: string;
    vehicle_license_plate: string;
    warehouse_name: string;
    loading_time_minutes: number;
    departure_time: string;
    departure_after_loading: string;
    route: RouteStop[];
    total_route_time_minutes: number;
    deadline_warnings: DeadlineWarning[];
    delivery_sequence: string[];
    algorithm_used: string;
    ai_available: boolean;
}

export const DEADLINE_RISK_LABELS: Record<DeadlineRisk, string> = {
    LOW: 'Đúng giờ',
    MEDIUM: 'Sát giờ',
    HIGH: 'Nguy hiểm',
    MISSED: 'Trễ hạn',
};

export const DEADLINE_RISK_COLORS: Record<DeadlineRisk, string> = {
    LOW: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MISSED: 'bg-red-100 text-red-700',
};

export const DEADLINE_RISK_DOT: Record<DeadlineRisk, string> = {
    LOW: 'bg-green-500',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-orange-500',
    MISSED: 'bg-red-500',
};
