/**
 * Interface cho Organization với relations
 */
export interface IOrganizationWithRelations {
    id: string;
    name: string;
    is_active: boolean | null;
    is_deleted: boolean | null;
    owner_id: string;
    created_at: Date;
    updated_at: Date | null;
    deleted_at: Date | null;
    created_by: string;
    updated_by: string | null;
    deleted_by: string | null;
    owner: {
        id: string;
        name: string;
        email: string | null;
    };
    _count?: {
        members: number;
        roles: number;
        api_keys: number;
    };
}

/**
 * Interface cho Organization Member
 */
export interface IOrganizationMember {
    id: string;
    user_id: string;
    organization_id: string;
    is_accepted: boolean | null;
    is_active: boolean | null;
    is_deleted: boolean | null;
    invite_token?: string | null;
    invite_token_expires_at?: Date | null;
    created_at: Date;

    user: {
        id: string;
        name: string;
        email: string | null;
    };
    roles?: {
        id: string;
        organization_role_id: string;
        role: {
            id: string;
            name: string;
        };
    }[];
    permissions?: {
        id: string;
        organization_member_id: string;
        organization_permission_id: string;
        warehouse_id: string | null;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
        is_deleted: boolean;
        deleted_at: Date | null;
        permission: {
            id: string;
            name: string;
            key: string;
        };
        source: 'permission' | 'role';
        roles: { id: string; name: string }[];
    }[];
}

/**
 * Interface cho Organization Role
 */
export interface IOrganizationRole {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean | null;
    is_default: boolean;
    organization_id: string;
    created_at: Date;
    permissions?: {
        id: string;
        organization_permission_id: string;
        permission: {
            id: string;
            name: string;
            key: string;
        };
    }[];
}

/**
 * Interface cho Organization Permission
 */
export interface IOrganizationPermission {
    id: string;
    name: string;
    description: string | null;
    key: string;
    organization_id: string;
    is_active: boolean | null;
}

/**
 * Interface cho API Key
 */
export interface IApiKey {
    id: string;
    name: string;
    description: string | null;
    key_prefix: string;
    key_hash: string;
    is_active: boolean;
    expires_at: Date | null;
    last_used_at: Date | null;
    organization_id: string;
    created_by_user_id: string;
    created_at: Date;
    organization?: {
        id: string;
        name: string;
    };
    roles?: {
        id: string;
        organization_role_id: string;
        role: {
            id: string;
            name: string;
        };
    }[];
    permissions?: {
        id: string;
        organization_permission_id: string;
        permission: {
            id: string;
            name: string;
            key: string;
        };
    }[];
}

/**
 * Interface cho API Key với plain key (chỉ trả về khi mới tạo hoặc reset)
 */
export interface IApiKeyWithPlainKey extends IApiKey {
    plain_key: string;
}

/**
 * Interface cho paginated response
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
