import { User } from "../user/user.type";

export enum WarehouseManagerStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING = 'PENDING'
}

export interface WarehouseManager {
    id: string;
    user_id: string;
    warehouse_id: string;
    role_id: string;
    status: WarehouseManagerStatus;
    assigned_at: string;
    user?: User;
    role?: WarehouseManagerRole;
    warehouse?: {
        id: string;
        name: string;
    };
}

export interface WarehouseManagerRole {
    id: string;
    name: string;
    description: string;
    organization_id: string;
    permissions: string[];
    is_system_role: boolean;
    created_at: string;
}

export interface AssignWarehouseManagerPayload {
    user_email: string;
    warehouse_id: string;
    role_id: string;
}

export interface CreateWarehouseManagerRolePayload {
    name: string;
    description?: string;
    permissions: string[];
}

export interface WarehouseManagerInventoryRequest {
    id: string;
    type: 'INBOUND' | 'OUTBOUND';
    status: string;
    warehouse_id: string;
    organization_id: string;
    created_at: string;
    items: any[];
}
