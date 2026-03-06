import {
    OrganizationMembersResponse,
    InviteMemberResult,
    GetMembersParams,
} from '@/types/organization/organization_member.type';

const API = process.env.NEXT_PUBLIC_API_URL;

export class OrganizationMemberService {

    /**
     * Lấy danh sách thành viên của tổ chức
     */
    async getMembers(
        token: string,
        orgId: string,
        params: GetMembersParams = {}
    ): Promise<OrganizationMembersResponse> {
        const query = new URLSearchParams();
        if (params.limit) query.append('limit', String(params.limit));
        if (params.offset !== undefined) query.append('offset', String(params.offset));
        if (params.is_accepted !== undefined) query.append('is_accepted', String(params.is_accepted));

        const response = await fetch(`${API}/organizations/${orgId}/members?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách thành viên');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Mời thành viên mới vào tổ chức (bằng email)
     */
    async inviteMembers(
        token: string,
        orgId: string,
        emails: string[]
    ): Promise<InviteMemberResult> {
        const response = await fetch(`${API}/organizations/${orgId}/members/invite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ emails }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gửi lời mời');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Hủy lời mời đã gửi
     */
    async cancelInvite(
        token: string,
        orgId: string,
        memberId: string
    ): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/members/${memberId}/invite`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể hủy lời mời');
        }
    }

    /**
     * Chấp nhận lời mời
     */
    async acceptInvite(token: string, orgId: string): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/members/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể chấp nhận lời mời');
        }
    }

    /**
     * Từ chối lời mời
     */
    async rejectInvite(token: string, orgId: string): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/members/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể từ chối lời mời');
        }
    }

    /**
     * Gán vai trò cho thành viên
     */
    async assignRoles(
        token: string,
        orgId: string,
        memberId: string,
        roleIds: string[]
    ): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/members/${memberId}/roles`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role_ids: roleIds }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gán vai trò');
        }
    }

    /**
     * Gán quyền trực tiếp cho thành viên
     */
    async assignPermissions(
        token: string,
        orgId: string,
        memberId: string,
        permissionIds: string[]
    ): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/members/${memberId}/permissions`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ permission_ids: permissionIds }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gán quyền');
        }
    }

    /**
     * Xóa thành viên khỏi tổ chức
     */
    async removeMember(
        token: string,
        orgId: string,
        memberId: string
    ): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/members/${memberId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa thành viên');
        }
    }

    /**
     * Cập nhật display name của thành viên (admin)
     */
    async updateMemberDisplayName(
        token: string,
        orgId: string,
        memberId: string,
        displayName: string
    ): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/members/${memberId}/display-name`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ display_name: displayName }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật display name');
        }
    }

    /**
     * Chuyển quyền sở hữu tổ chức
     */
    async transferOwnership(
        token: string,
        orgId: string,
        newOwnerId: string
    ): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/transfer-ownership`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ new_owner_id: newOwnerId }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể chuyển quyền sở hữu');
        }
    }

    /**
     * Rời khỏi tổ chức
     */
    async leaveOrganization(token: string, orgId: string): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/leave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể rời khỏi tổ chức');
        }
    }

    /**
     * Kiểm tra token mời có hợp lệ không
     */
    async verifyInviteToken(token: string, inviteToken: string): Promise<{
        valid: boolean;
        organization?: { id: string; name: string };
        invitedEmail?: string;
        expiresAt?: string;
    }> {
        const response = await fetch(`${API}/organizations/invite/verify/${encodeURIComponent(inviteToken)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xác minh token mời');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Chấp nhận lời mời bằng token (từ email)
     */
    async acceptInviteByToken(token: string, inviteToken: string): Promise<void> {
        const response = await fetch(`${API}/organizations/invite/accept/${encodeURIComponent(inviteToken)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể chấp nhận lời mời');
        }
    }

    /**
     * Từ chối lời mời bằng token (từ email)
     */
    async rejectInviteByToken(token: string, inviteToken: string): Promise<void> {
        const response = await fetch(`${API}/organizations/invite/reject/${encodeURIComponent(inviteToken)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể từ chối lời mời');
        }
    }

    /**
     * Cập nhật display name của bản thân trong tổ chức
     */
    async updateMyDisplayName(
        token: string,
        orgId: string,
        displayName: string
    ): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/me/display-name`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ display_name: displayName }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật display name');
        }
    }
}

export const organizationMemberService = new OrganizationMemberService();
