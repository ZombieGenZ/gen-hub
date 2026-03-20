const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Types ───────────────────────────────────────────────

export interface FeatureFlag {
    id: string;
    name: string;
    module: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface FeatureFlagStats {
    total: number;
    active: number;
    inactive: number;
}

export interface FeatureFlagLog {
    id: string;
    action: string;
    old_value: boolean;
    new_value: boolean;
    created_at: string;
}

export interface QueryFeatureFlagParams {
    page?: number;
    limit?: number;
    module?: string;
    isActive?: boolean;
    includeDeleted?: boolean;
    search?: string;
}

// ─── Service ─────────────────────────────────────────────

export class FeatureFlagService {
    /**
     * Lấy danh sách tất cả feature flags
     */
    async getAll(token: string, params?: QueryFeatureFlagParams) {
        const qp = new URLSearchParams();
        if (params) {
            if (params.page !== undefined) qp.append('page', params.page.toString());
            if (params.limit !== undefined) qp.append('limit', params.limit.toString());
            if (params.module) qp.append('module', params.module);
            if (params.isActive !== undefined) qp.append('isActive', params.isActive.toString());
            if (params.includeDeleted !== undefined) qp.append('includeDeleted', params.includeDeleted.toString());
            if (params.search) qp.append('search', params.search);
        }
        const response = await fetch(`${API}/admin/feature-flags?${qp.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch feature flags');
        }
        return (await response.json()).data;
    }

    /**
     * Lấy chi tiết feature flag theo ID
     */
    async getById(token: string, id: string): Promise<FeatureFlag> {
        const response = await fetch(`${API}/admin/feature-flags/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch feature flag');
        }
        return (await response.json()).data;
    }

    /**
     * Bật/tắt một feature flag
     */
    async toggle(token: string, id: string, isActive: boolean): Promise<FeatureFlag> {
        const response = await fetch(`${API}/admin/feature-flags/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_active: isActive }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to toggle feature flag');
        }
        return (await response.json()).data;
    }

    /**
     * Bật/tắt nhiều feature flags cùng lúc
     */
    async bulkToggle(token: string, ids: string[], isActive: boolean): Promise<FeatureFlag[]> {
        const response = await fetch(`${API}/admin/feature-flags/bulk/toggle`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids, is_active: isActive }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to bulk toggle feature flags');
        }
        return (await response.json()).data;
    }

    /**
     * Lấy danh sách các module có feature flag
     */
    async getModules(token: string): Promise<string[]> {
        const response = await fetch(`${API}/admin/feature-flags/modules`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch modules');
        }
        return (await response.json()).data;
    }

    /**
     * Lấy thống kê feature flags
     */
    async getStats(token: string): Promise<FeatureFlagStats> {
        const response = await fetch(`${API}/admin/feature-flags/stats`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch feature flag stats');
        }
        return (await response.json()).data;
    }

    /**
     * Lấy lịch sử thay đổi của một feature flag
     */
    async getLogs(token: string, id: string, params?: { page?: number; limit?: number }) {
        const qp = new URLSearchParams();
        if (params) {
            if (params.page !== undefined) qp.append('page', params.page.toString());
            if (params.limit !== undefined) qp.append('limit', params.limit.toString());
        }
        const response = await fetch(`${API}/admin/feature-flags/${id}/logs?${qp.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch feature flag logs');
        }
        return (await response.json()).data;
    }
}

export const featureFlagService = new FeatureFlagService();
