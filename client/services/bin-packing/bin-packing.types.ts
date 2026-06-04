export type PackingStatus = 'PENDING' | 'COMPUTED' | 'APPLIED' | 'FAILED';

export interface PlacedItem {
    item_id: string;
    product_id: string;
    x: number;
    y: number;
    z: number;
    placed_length: number;
    placed_width: number;
    placed_height: number;
    rotation: number;
}

export interface LayoutJson {
    container: {
        length: number;
        width: number;
        height: number;
    };
    placed: PlacedItem[];
    unpacked: string[];
}

export interface BinPackingResult {
    id: string;
    export_id: string;
    fleet_vehicle_id: string;
    status: PackingStatus;
    total_items: number;
    packed_items: number;
    unpacked_items: number;
    space_utilization: number | string;
    total_weight_kg: number | string;
    layout_json: LayoutJson;
    algorithm_used: string;
    computed_at: string;
    fleet_vehicle?: {
        id: string;
        name: string;
        license_plate: string;
        cargo_length: number | string;
        cargo_width: number | string;
        cargo_height: number | string;
        max_weight_kg: number | string;
    };
    vehicle?: {
        id: string;
        name: string;
        license_plate: string;
    };
}

export interface ComputePackingPayload {
    export_id: string;
    fleet_vehicle_id?: string;
}
