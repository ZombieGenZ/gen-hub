const API = process.env.NEXT_PUBLIC_API_URL;

// ────────────────────────────────────────────────
// In-memory cache cho organization_id
// TTL: 60 giây — tránh gọi API liên tục
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
 * Gọi GET /organizations?limit=1 (filter tự động theo userId từ backend),
 * lấy org đầu tiên trong danh sách,
 * cache kết quả trong bộ nhớ với TTL 60s.
 */
export const orgHelper = {
    /**
     * Lấy organization_id của user hiện tại
     * @param token Access token (JWT)
     * @returns organization_id (UUID)
     * @throws Error nếu không có token, không fetch được danh sách org, hoặc user chưa thuộc tổ chức nào
     */
    async getOrgId(token: string): Promise<string> {
        // Trả về cache nếu còn hạn
        if (cache && Date.now() < cache.expiresAt) {
            return cache.orgId;
        }

        try {
            const response = await fetch(`${API}/organizations?limit=1`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(
                    errBody?.message || 'Không thể lấy danh sách tổ chức'
                );
            }

            const json = await response.json();

            // API trả về paginated: { data: { items: [ { id, name, ... }, ... ], total, ... } }
            const items: Array<{ id: string }> = json?.data?.items ?? [];
            const orgId = items[0]?.id;

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
