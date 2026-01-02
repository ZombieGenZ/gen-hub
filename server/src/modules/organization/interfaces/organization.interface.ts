/**
 * Interface cho thông tin Organization với Google Email
 */
export interface IOrganizationWithGoogleEmail {
    id: string;
    name: string;
    google_client_id: string | null;
    google_client_secret: string | null;
    google_refresh_token: string | null;
    email_primary_address: string | null;
    is_using_google_email: boolean;
    owner: {
        id: string;
        name: string;
        email: string | null;
        language: string;
    };
}

/**
 * Interface cho Organization với relations
 */
export interface IOrganizationWithRelations {
    id: string;
    name: string;
    international_name?: string | null;
    is_active: boolean | null;
    is_deleted: boolean | null;
    owner_id: string;

    // Thông tin doanh nghiệp
    tax_code?: string | null;
    headquarters_address?: string | null;
    representative_name?: string | null;
    representative_title?: string | null;
    representative_phone?: string | null;
    representative_email?: string | null;

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
    email_primary_address?: string | null;
    google_client_id?: string | null;
    google_client_secret?: string | null;
    google_refresh_token?: string | null;
    is_using_google_email?: boolean | null;
    api_key_logs_retention_ms?: number | null;
    org_audit_logs_retention_ms?: number | null;
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
    display_name: string | null;
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
    allowed_origins: string[];
    rate_limit_ttl: number;
    rate_limit_max: number;
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

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';
