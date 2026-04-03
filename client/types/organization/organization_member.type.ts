/**
 * Thành viên tổ chức
 */
export interface OrganizationMember {
    id: string;
    user_id: string;
    organization_id: string;
    display_name: string | null;
    is_accepted: boolean;
    is_owner: boolean;
    created_at: string;
    updated_at: string | null;
    user: {
        id: string;
        email: string;
        name: string;
        phone?: string;
        avatar_url?: string;
    };
    roles: OrganizationMemberRoleRef[];
    permissions: OrganizationMemberPermissionRef[];
}

export interface OrganizationMemberRoleRef {
    id: string;
    name: string;
    description?: string;
}

export interface OrganizationMemberPermissionRef {
    id: string;
    key: string;
    name: string;
}

/**
 * Phản hồi danh sách thành viên
 */
export interface OrganizationMembersResponse {
    items: OrganizationMember[];
    total: number;
}

/**
 * Kết quả mời thành viên
 */
export interface InviteMemberResult {
    success: string[];
    failed: string[];
}

/**
 * Params lấy danh sách thành viên
 */
export interface GetMembersParams {
    limit?: number;
    offset?: number;
    is_accepted?: boolean;
}
