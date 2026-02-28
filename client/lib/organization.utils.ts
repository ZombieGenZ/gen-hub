import { Organization } from "@/types/organization/organization.type";
import { authStorage } from "@/services/auth/auth-storage.service";

const API = process.env.NEXT_PUBLIC_API_URL;

// ────────────────────────────────────────────────
// In-memory cache cho organization_id
// TTL: 60 giây — tránh gọi API liên tục
// Cache phân biệt theo token để tránh nhầm lẫn giữa các user
// ────────────────────────────────────────────────

interface OrgCache {
    orgId: string;
    expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 giây
// Dùng Map với key là token để tránh cache nhầm giữa các user/role
const cacheMap = new Map<string, OrgCache>();

/**
 * Utility lấy organization_id của user hiện tại.
 *
 * Gọi GET /organizations?limit=1 (filter tự động theo userId từ backend),
 * lấy org đầu tiên trong danh sách,
 * cache kết quả trong bộ nhớ với TTL 60s (per token).
 */
export const orgHelper = {
    /**
     * Lấy organization_id của user hiện tại
     * @param token Access token (JWT)
     * @returns organization_id (UUID)
     * @throws Error nếu không có token, không fetch được danh sách org, hoặc user chưa thuộc tổ chức nào
     */
    async getOrgId(token: string): Promise<string> {
        // Trả về cache nếu còn hạn (per token)
        const cached = cacheMap.get(token);
        const userID = authStorage.getUserID();
        if (cached && Date.now() < cached.expiresAt) {
            return cached.orgId;
        }

        try {
            const response = await fetch(`${API}/organizations`, {
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
            const items: Organization[] = json?.data?.items ?? [];
            const orgId = items.find((o) => o.owner.id == userID)?.id;

            if (!orgId) {
                throw new Error('Người dùng chưa thuộc tổ chức nào');
            }

            console.log(`Lấy organization_id: ${orgId} (cache miss)`);

            // Lưu cache theo token
            cacheMap.set(token, { orgId, expiresAt: Date.now() + CACHE_TTL_MS });
            return orgId;
        } catch (error) {
            console.error('Lỗi khi lấy organization_id:', error);
            throw error;
        }
    },

    /**
     * Xóa cache của một token cụ thể (dùng khi user logout)
     * Nếu không truyền token, xóa toàn bộ cache
     */
    clearCache(token?: string): void {
        if (token) {
            cacheMap.delete(token);
        } else {
            cacheMap.clear();
        }
    },
};
