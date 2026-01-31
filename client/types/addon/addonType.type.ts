import type { AddonResponse } from "./addon.type";

export interface AddonTypeRequest {
    name: string;
    description: string;
    is_active: boolean;
}

export interface AddonType {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    deleted_at: string | null;
    created_by: string;
    updated_by: string | null;
    deleted_by: string | null;
    addons: AddonResponse[];
}