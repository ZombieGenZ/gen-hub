import { orgHelper } from '@/lib/organization.utils';
import type { AlertConfig, InventoryAlert, AlertStats, CreateAlertConfigPayload } from './inventory-alert.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class InventoryAlertService {
    private orgIdCache = new Map<string, string>();

    private async getOrgId(token: string): Promise<string> {
        const cached = this.orgIdCache.get(token);
        if (cached) return cached;
        const id = await orgHelper.getOrgId(token);
        this.orgIdCache.set(token, id);
        return id;
    }

    async upsertConfig(token: string, payload: CreateAlertConfigPayload): Promise<AlertConfig> {
        const orgId = await this.getOrgId(token);
        const res = await fetch(`${API}/organizations/${orgId}/inventory-alert/configs`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<AlertConfig>;
    }

    async listConfigs(token: string, warehouseId?: string): Promise<AlertConfig[]> {
        const orgId = await this.getOrgId(token);
        const params = new URLSearchParams();
        if (warehouseId) params.set('warehouse_id', warehouseId);
        const res = await fetch(`${API}/organizations/${orgId}/inventory-alert/configs?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<AlertConfig[]>;
    }

    async deleteConfig(token: string, configId: string): Promise<void> {
        const orgId = await this.getOrgId(token);
        const res = await fetch(`${API}/organizations/${orgId}/inventory-alert/configs/${configId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
    }

    async listAlerts(token: string, params?: { warehouse_id?: string; is_resolved?: boolean }): Promise<InventoryAlert[]> {
        const orgId = await this.getOrgId(token);
        const query = new URLSearchParams();
        if (params?.warehouse_id) query.set('warehouse_id', params.warehouse_id);
        if (params?.is_resolved !== undefined) query.set('is_resolved', String(params.is_resolved));
        const res = await fetch(`${API}/organizations/${orgId}/inventory-alert/alerts?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<InventoryAlert[]>;
    }

    async getStats(token: string): Promise<AlertStats> {
        const orgId = await this.getOrgId(token);
        const res = await fetch(`${API}/organizations/${orgId}/inventory-alert/alerts/stats`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<AlertStats>;
    }

    async resolveAlert(token: string, alertId: string): Promise<void> {
        const orgId = await this.getOrgId(token);
        const res = await fetch(`${API}/organizations/${orgId}/inventory-alert/alerts/${alertId}/resolve`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
    }
}
