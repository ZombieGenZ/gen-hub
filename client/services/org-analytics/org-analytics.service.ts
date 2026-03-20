import { authStorage } from '../auth/auth-storage.service';
import type {
    OrgOverviewKpi,
    StockFlowData,
    TopProductData,
    StockAlertData,
    ShipmentData,
} from './org-analytics.types';

const API = process.env.NEXT_PUBLIC_API_URL;

class OrgAnalyticsService {
    private getHeaders(): HeadersInit {
        const token = authStorage.getAccessToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    async getOverview(orgId: string): Promise<OrgOverviewKpi> {
        const response = await fetch(`${API}/organizations/${orgId}/analytics/overview`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch Overview KPIs');
        const json = await response.json();
        return json.data;
    }

    async getStockFlow(orgId: string, days: number = 7): Promise<StockFlowData[]> {
        const response = await fetch(`${API}/organizations/${orgId}/analytics/stock-flow?days=${days}`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch Stock Flow Data');
        const json = await response.json();
        return json.data;
    }

    async getTopProducts(orgId: string, limit: number = 5): Promise<TopProductData[]> {
        const response = await fetch(`${API}/organizations/${orgId}/analytics/top-products?limit=${limit}`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch Top Products');
        const json = await response.json();
        return json.data;
    }

    async getStockAlerts(orgId: string): Promise<StockAlertData> {
        const response = await fetch(`${API}/organizations/${orgId}/analytics/stock-alerts`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch Stock Alerts');
        const json = await response.json();
        return json.data;
    }

    async getRecentShipments(orgId: string, limit: number = 5): Promise<ShipmentData[]> {
        const response = await fetch(`${API}/organizations/${orgId}/analytics/recent-shipments?limit=${limit}`, {
            headers: this.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch Recent Shipments');
        const json = await response.json();
        return json.data;
    }
}

export const orgAnalyticsService = new OrgAnalyticsService();
