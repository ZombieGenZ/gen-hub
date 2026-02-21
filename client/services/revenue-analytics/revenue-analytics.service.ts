import { authStorage } from '../auth/auth-storage.service';
import type {
    RevenueFilters,
    KpiData,
    ChartData,
    TableData,
} from './revenue-analytics.types';

const API = process.env.NEXT_PUBLIC_API_URL;

class RevenueAnalyticsService {
    private getHeaders(): HeadersInit {
        const token = authStorage.getAccessToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    private buildQuery(params: object): string {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query.append(key, String(value));
            }
        });
        return query.toString();
    }

    async getKpis(filters: RevenueFilters): Promise<KpiData> {
        const query = this.buildQuery(filters);
        const response = await fetch(`${API}/admin/revenue-analytics/kpis?${query}`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) throw new Error('Failed to fetch KPI data');
        const json = await response.json();
        return json.data;
    }

    async getCharts(
        filters: RevenueFilters & { granularity?: string; include_coupon_discount?: boolean },
    ): Promise<ChartData> {
        const query = this.buildQuery(filters);
        const response = await fetch(`${API}/admin/revenue-analytics/charts?${query}`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) throw new Error('Failed to fetch chart data');
        const json = await response.json();
        return json.data;
    }

    async getTables(
        filters: RevenueFilters & { tab: string; limit: number; offset: number },
    ): Promise<TableData> {
        const query = this.buildQuery(filters);
        const response = await fetch(`${API}/admin/revenue-analytics/tables?${query}`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) throw new Error('Failed to fetch table data');
        const json = await response.json();
        return json.data;
    }

    async exportReport(
        filters: RevenueFilters,
        format: 'excel' | 'pdf',
    ): Promise<Blob> {
        const query = this.buildQuery({ ...filters, format });
        const response = await fetch(`${API}/admin/revenue-analytics/export?${query}`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) throw new Error('Failed to export report');
        return response.blob();
    }
}

export const revenueAnalyticsService = new RevenueAnalyticsService();
