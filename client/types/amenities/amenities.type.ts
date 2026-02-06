export interface AmenityRequest {
    name: string;
    description: string;
    is_active: boolean;
    icon?: string;
}

export interface AmenityResponse extends AmenityRequest {
    id: string;
    created_at: string;
    updated_at: string;
}
