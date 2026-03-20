/**
 * Account module interfaces
 * Định nghĩa các types cho Account module
 */

/**
 * Profile response structure (cached data)
 */
export interface IAccountProfile {
    user: {
        id: string;
        name: string;
        email: string | null;
        email_confirmed: boolean;
        is_verified: boolean | null;
        two_factor_enabled: boolean;
        language: string | null;
        avatar_url: string | null;
        cover_url: string | null;
        avatar_image_id: string | null;
        cover_image_id: string | null;
        created_at: Date;
    };
    roles: Array<{
        id: string;
        name: string;
        description: string | null;
    }>;
    permissions: Array<{
        id: string;
        name: string;
        key: string;
        description: string | null;
        source: 'role' | 'permission';
        roles: Array<{ id: string; name: string }>;
    }>;
    organization_id?: string;
}

/**
 * Profile update result
 */
export interface IProfileUpdateResult {
    message: string;
}

/**
 * Change password result
 */
export interface IChangePasswordResult {
    message: string;
}

/**
 * Download data result
 */
export interface IDownloadDataResult {
    message: string;
    data: IUserExportData;
    filename: string;
}

/**
 * Delete account result
 */
export interface IDeleteAccountResult {
    message: string;
}

/**
 * User data for export
 */
export interface IUserExportData {
    personal_info: {
        id: string;
        name: string;
        email: string;
        email_confirmed: boolean;
        language: string | null;
        is_verified: boolean;
        two_factor_enabled: boolean;
        created_at: Date;
        updated_at: Date;
    };
    account_status: {
        is_banned: boolean;
        banned_start: Date | null;
        banned_end: Date | null;
        is_online: boolean;
        last_online: Date | null;
    };
    system_roles: Array<{
        id: string;
        name: string;
        description: string | null;
        assigned_at: Date;
    }>;
    system_permissions: Array<{
        id: string;
        name: string;
        key: string;
        description: string | null;
        assigned_at: Date;
    }>;
    organizations: {
        owned: Array<{
            id: string;
            name: string;
            created_at: Date;
        }>;
        memberships: Array<{
            organization: { id: string; name: string };
            display_name: string | null;
            is_accepted: boolean;
            joined_at: Date;
        }>;
    };
    notifications: Array<{
        id: string;
        title: string;
        content: string;
        is_read: boolean;
        created_at: Date;
    }>;
    warnings: Array<{
        id: string;
        category: { id: string; name: string } | null;
        reason: string;
        is_permanent: boolean;
        expires_at: Date | null;
        is_active: boolean;
        created_at: Date;
    }>;
    sessions: Array<{
        id: string;
        ip: string | null;
        location: string | null;
        device: string | null;
        os: string | null;
        created_at: Date;
    }>;
    export_info: {
        exported_at: string;
        data_version: string;
    };
}
