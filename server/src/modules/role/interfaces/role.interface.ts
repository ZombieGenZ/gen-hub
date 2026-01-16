/**
 * Interface cho Role trong hệ thống
 */
export interface IRole {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean | null;
    is_default: boolean;
    created_at: Date;
    updated_at: Date;
}

/**
 * Interface cho Role với permissions
 */
export interface IRoleWithPermissions extends IRole {
    permissions: {
        id: string;
        key: string;
        name: string;
        description: string | null;
    }[];
}

/**
 * Kết quả phân trang Role
 */
export interface IRoleListResult {
    data: IRole[];
    total: number;
    limit: number;
    offset: number;
}

/**
 * Interface cho UserRole
 */
export interface IUserRole {
    id: string;
    user_id: string;
    role_id: string;
    is_active: boolean | null;
    created_at: Date;
    updated_at: Date | null;
}

/**
 * Interface cho UserPermission
 */
export interface IUserPermission {
    id: string;
    user_id: string;
    permission_id: string;
    is_active: boolean | null;
    created_at: Date;
    updated_at: Date;
}

/**
 * Interface cho kết quả roles/permissions của user
 */
export interface IUserRolesAndPermissions {
    roles: {
        id: string;
        name: string;
        description: string | null;
        is_active: boolean | null;
    }[];
    permissions: {
        id: string;
        key: string;
        name: string;
        description: string | null;
        source: 'direct' | 'role';
    }[];
}
