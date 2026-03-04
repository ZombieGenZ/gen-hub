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

export interface WarehouseManagerPermission {
    id: string;
    name: string;
    description: string | null;
    key: string;
    category: string;
}

export interface WarehouseManagerRolePermission {
    id: string;
    role_id: string;
    permission_id: string;
    permission: WarehouseManagerPermission;
}

export interface WarehouseManagerRole {
    id: string;
    name: string;
    description: string | null;
    is_default: boolean;
    is_active: boolean;
    permissions: WarehouseManagerRolePermission[];
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
    permission_ids: string[];
}

// export interface UpdateWarehouseManagerRolePayload extends Partial<CreateWarehouseManagerRolePayload> {
// }

export interface WarehouseManagerInventoryRequest {
    id: string;
    type: 'INBOUND' | 'OUTBOUND';
    status: string;
    warehouse_id: string;
    organization_id: string;
    created_at: string;
    items: unknown[];
}
