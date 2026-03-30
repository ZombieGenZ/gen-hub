import { Organization } from "@/types/organization/organization.type";
import { authStorage } from "@/services/auth/auth-storage.service";

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * Trích xuất userId từ JWT token payload
 * @param token JWT access token
 * @returns userId hoặc null nếu không giải mã được
 */
function extractUserIdFromToken(token: string): string | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload.userId ?? payload.sub ?? null;
    } catch {
        return null;
    }
}

/**
 * Utility lấy organization_id của user hiện tại.
 *
 * Gọi GET /organizations?limit=1 (filter tự động theo userId từ backend),
 * lấy org đầu tiên trong danh sách,
 * cache kết quả trong authStorage với TTL.
 */
export const orgHelper = {
    /**
     * Lấy organization_id của user hiện tại
     * @param token Access token (JWT)
     * @returns organization_id (UUID)
     * @throws Error nếu không có token, không fetch được danh sách org, hoặc user chưa thuộc tổ chức nào
     */
    async getOrgId(token: string): Promise<string> {
        // Trả về cache nếu còn hạn từ authStorage
        const cachedId = authStorage.getOrgId();
        if (cachedId) {
            return cachedId;
        }

        try {
            console.log("[orgHelper] Fetching organizations to get orgId...");
            const response = await fetch(`${API}/organizations?member_only=true`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                console.error("[orgHelper] Failed to fetch organizations:", errBody);
                throw new Error(
                    errBody?.message || 'Không thể lấy danh sách tổ chức'
                );
            }

            const json = await response.json();

            // API trả về paginated: { data: { items: [ { id, name, ... }, ... ], total, ... } }
            const items: Organization[] = json?.data?.items ?? [];

            // Lấy userId từ cookie trước, fallback giải mã từ JWT token
            const userID = authStorage.getUserID() ?? extractUserIdFromToken(token);

            // Ưu tiên org mà user là owner
            // Nếu không tìm thấy (có thể do userID null hoặc user là member, không phải owner),
            // fallback lấy org đầu tiên (backend đã filter theo userId)
            const org = (userID ? items.find((o) => o.owner.id === userID) : null) ?? items[0];
            const orgId = org?.id;

            if (!orgId) {
                console.warn("[orgHelper] No organization found for this user");
                throw new Error('Người dùng chưa thuộc tổ chức nào');
            }

            console.log(`[orgHelper] Successfully fetched organization_id: ${orgId} (cache miss)`);

            // Lưu cache vào authStorage
            authStorage.setOrgId(orgId);
            return orgId;
        } catch (error) {
            console.error('[orgHelper] Lỗi khi lấy organization_id:', error);
            throw error;
        }
    },

    /**
     * Xóa cache organization_id
     */
    clearCache(): void {
        authStorage.clearOrgId();
    },
};
