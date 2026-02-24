const API = process.env.NEXT_PUBLIC_API_URL;

// ────────────────────────────────────────────────
// In-memory cache cho organization_id
// TTL: 60 giây — tránh gọi API profile liên tục
// ────────────────────────────────────────────────

interface OrgCache {
    orgId: string;
    expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 giây
let cache: OrgCache | null = null;

/**
 * Utility lấy organization_id của user hiện tại.
 *
 * Gọi GET /account/profile, trích `organization_id` từ UserData,
 * cache kết quả trong bộ nhớ với TTL 60s.
 */
export const orgHelper = {
    /**
     * Lấy organization_id của user hiện tại
     * @param token Access token (JWT)
     * @returns organization_id (UUID)
     * @throws Error nếu không có token, không fetch được profile, hoặc user chưa thuộc tổ chức nào
     */
    async getOrgId(token: string): Promise<string> {
        // Trả về cache nếu còn hạn
        if (cache && Date.now() < cache.expiresAt) {
            return cache.orgId;
        }

        try {
            const response = await fetch(`${API}/account/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Không thể lấy thông tin người dùng');
            }

            const json = await response.json();
            const orgId: string | undefined = json?.data?.organization_id;

            if (!orgId) {
                throw new Error('Người dùng chưa thuộc tổ chức nào');
            }

            // Lưu cache
            cache = { orgId, expiresAt: Date.now() + CACHE_TTL_MS };
            return orgId;
        } catch (error) {
            console.error('Lỗi khi lấy organization_id:', error);
            throw error;
        }
    },

    /**
     * Xóa cache (dùng khi user logout hoặc đổi tổ chức)
     */
    clearCache(): void {
        cache = null;
    },
};
