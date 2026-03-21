/* ============================================================
 *  Admin Dashboard Service
 *  Aggregates multiple backend API calls into the shapes
 *  expected by each dashboard widget component.
 * ============================================================ */

import { authStorage } from '../auth/auth-storage.service';
import type {
    HeroKpiData,
    ActionableInboxData,
    RevenueMonthlyItem,
    WarehouseHeatmapData,
    ActivityFeedItem,
    SystemHealthData,
} from './admin-dashboard.types';

const API = process.env.NEXT_PUBLIC_API_URL;

class AdminDashboardService {
    /* ── helpers ────────────────────────────────────────────── */

    private getHeaders(): HeadersInit {
        const token = authStorage.getAccessToken();
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    private async fetchJson<T>(url: string): Promise<T> {
        const response = await fetch(url, { headers: this.getHeaders() });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || `Request failed: ${url}`);
        }
        const json = await response.json();
        return json.data ?? json;
    }

    /* ── 1. Hero KPIs ──────────────────────────────────────── */

    async getHeroKpis(): Promise<HeroKpiData> {
        const [revenueKpis, userStats, resourceOverview, overdueContracts] =
            await Promise.all([
                this.fetchJson<any>(`${API}/admin/revenue-analytics/kpis?preset=THIS_MONTH`),
                this.fetchJson<any>(`${API}/admin/users/stats`),
                this.fetchJson<any>(`${API}/admin/resources/overview`),
                this.fetchJson<any>(`${API}/rental-contracts?status=ACTIVE&limit=100`),
            ]);

        // MRR from net revenue
        const mrrValue = revenueKpis?.netRevenue?.value ?? 0;
        const mrrPrev = revenueKpis?.netRevenue?.previousValue ?? 0;
        const mrrTrend = mrrPrev > 0 ? ((mrrValue - mrrPrev) / mrrPrev) * 100 : 0;

        // Organizations & users
        const totalUsers = userStats?.total ?? 0;
        const onlineUsers = userStats?.online ?? 0;

        // Occupancy from resources disk usage as proxy
        const cpuUsage = resourceOverview?.cpu ?? 0;
        const diskUsage = resourceOverview?.disk ?? 0;

        // Overdue contracts (filter ACTIVE contracts with payment issues if any, for now count ACTIVE as placeholder)
        const overdueItems = (overdueContracts?.items ?? []).filter((c: any) => c.status === 'ACTIVE');
        const overdueTotal = overdueItems.length;
        const totalDebt = overdueItems.reduce(
            (sum: number, c: any) => sum + (c.monthly_rent ?? c.total_amount ?? 0),
            0,
        );

        return {
            mrr: {
                value: mrrValue,
                trend: { value: Math.abs(Number(mrrTrend.toFixed(1))), isPositive: mrrTrend >= 0 },
                label: 'so với tháng trước',
            },
            organizationAndUsers: {
                orgs: totalUsers,
                newUsersThisWeek: onlineUsers,
                trend: { value: 0, isPositive: true },
                label: 'đang online',
            },
            globalOccupancy: {
                rate: Number(diskUsage.toFixed(1)),
                trend: { value: Number(cpuUsage.toFixed(1)), isPositive: true },
                label: 'CPU hiện tại',
                totalSpace: '100%',
                usedSpace: `${diskUsage.toFixed(1)}%`,
            },
            debtAlerts: {
                totalAmount: totalDebt,
                count: overdueTotal,
                trend: { value: 0, isPositive: false },
                label: 'hợp đồng quá hạn',
            },
        };
    }

    /* ── 2. Actionable Inbox ───────────────────────────────── */

    async getActionableInbox(): Promise<ActionableInboxData> {
        const [consultationRequests, orgUpdates, refunds, visits] = await Promise.all([
            this.fetchJson<any>(`${API}/consultation-request?status=PENDING&limit=5`).catch(() => null),
            this.fetchJson<any>(`${API}/organization-update-requests?status=PENDING&limit=5`).catch(() => null),
            this.fetchJson<any>(`${API}/admin/refund-requests?status=PENDING&limit=5`).catch(() => null),
            this.fetchJson<any>(`${API}/warehouse-visit?status=PENDING&limit=5`).catch(() => null),
        ]);

        // Map consultation requests → tickets
        const requestItems = consultationRequests?.items ?? consultationRequests?.data ?? [];
        const tickets = requestItems.map((req: any) => ({
            id: req.id?.substring(0, 8) ?? 'N/A',
            title: req.subject ?? 'Yêu cầu tư vấn',
            org: req.company ?? req.name ?? 'Khách vãng lai',
            priority: 'HIGH',
            time: formatRelativeTime(req.created_at),
            status: req.status ?? 'PENDING',
        }));

        // Map org update requests
        const orgUpdateItems = orgUpdates?.items ?? orgUpdates ?? [];
        const mappedOrgUpdates = (Array.isArray(orgUpdateItems) ? orgUpdateItems : []).map((r: any) => ({
            id: r.id?.substring(0, 8) ?? 'N/A',
            org: r.organization?.name ?? 'Không rõ',
            type: buildOrgUpdateType(r),
            time: formatRelativeTime(r.created_at),
            status: r.status ?? 'PENDING',
        }));

        // Map refund requests
        const refundItems = refunds?.items ?? refunds?.data ?? refunds ?? [];
        const mappedRefunds = (Array.isArray(refundItems) ? refundItems : []).map((r: any) => ({
            id: r.id?.substring(0, 8) ?? 'N/A',
            org: r.organization?.name ?? r.contract?.organization?.name ?? 'Không rõ',
            amount: r.approved_amount ?? r.requested_amount ?? 0,
            reason: r.reason ?? 'Hoàn tiền',
            time: formatRelativeTime(r.created_at),
            status: r.status ?? 'PENDING',
        }));

        // Map visit bookings
        const visitItems = visits?.data ?? visits ?? [];
        const mappedVisits = (Array.isArray(visitItems) ? visitItems : []).map((v: any) => ({
            id: v.id?.substring(0, 8) ?? 'N/A',
            customerName: v.visitor_name ?? 'Khách',
            org: v.organization?.name ?? 'Cá nhân',
            warehouse: v.warehouse_template?.name ?? 'Kho',
            time: formatRelativeTime(v.created_at),
            status: v.status ?? 'PENDING',
            date: v.visit_date
                ? `${v.visit_date} ${v.visit_time_start ?? ''}`
                : 'Chưa xác định',
        }));

        return {
            tickets,
            orgUpdates: mappedOrgUpdates,
            refunds: mappedRefunds,
            visitBookings: mappedVisits,
        };
    }

    /* ── 3. Revenue Chart ──────────────────────────────────── */

    async getRevenueChart(period: string = '6m'): Promise<RevenueMonthlyItem[]> {
        const months = period === '12m' ? 12 : 6;
        const now = new Date();
        const fromDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
        const from = fromDate.toISOString().split('T')[0];
        const to = now.toISOString().split('T')[0];

        const data = await this.fetchJson<any>(
            `${API}/admin/revenue-analytics/charts?preset=CUSTOM&from_date=${from}&to_date=${to}&granularity=MONTH`,
        );

        // Map cashflow time-series → { month, expected, actual }
        const timeSeries = data?.timeSeries ?? data?.cashflow ?? [];
        return timeSeries.map((item: any) => {
            const label = item.label ?? item.month ?? '';
            // Extract month  e.g. "2026-03" → "T3"
            const monthNum = label.includes('-') ? parseInt(label.split('-')[1], 10) : label;
            const totalExpected =
                (item.rentalRevenue ?? 0) + (item.addonRevenue ?? 0) + (item.insuranceRevenue ?? 0);
            const totalActual = item.actual ?? totalExpected * 0.95; // fallback

            return {
                month: `T${monthNum}`,
                expected: Math.round(totalExpected / 1000000),
                actual: Math.round(totalActual / 1000000),
            };
        });
    }

    /* ── 4. Warehouse Heatmap ──────────────────────────────── */

    async getWarehouseHeatmap(): Promise<WarehouseHeatmapData> {
        const data = await this.fetchJson<any>(
            `${API}/admin/revenue-analytics/tables?tab=TOP_WAREHOUSES&limit=10&preset=THIS_MONTH`,
        );

        const items = data?.items ?? [];

        // Sort by totalRevenue desc → top 5 = topRevenue
        const sorted = [...items].sort(
            (a: any, b: any) => (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0),
        );

        const topRevenue = sorted.slice(0, 5).map((w: any) => ({
            id: w.id ?? '',
            name: w.name ?? 'Kho',
            revenue: w.totalRevenue ?? 0,
            occupancy: w.occupancyRate ?? w.occupancy ?? 80,
        }));

        // Most empty = lowest occupancy
        const byOccupancy = [...items].sort(
            (a: any, b: any) => (a.occupancyRate ?? 50) - (b.occupancyRate ?? 50),
        );

        const mostEmpty = byOccupancy.slice(0, 5).map((w: any) => ({
            id: w.id ?? '',
            name: w.name ?? 'Kho',
            revenue: w.totalRevenue ?? 0,
            occupancy: w.occupancyRate ?? w.occupancy ?? 40,
        }));

        return { topRevenue, mostEmpty };
    }

    /* ── 5. Activity Feed ──────────────────────────────────── */

    async getActivityFeed(): Promise<ActivityFeedItem[]> {
        const data = await this.fetchJson<any>(`${API}/admin/system-logs?limit=10`);
        const items = data?.data ?? data?.items ?? [];

        return items.map((log: any, idx: number) => ({
            id: idx + 1,
            type: mapModuleToType(log.module),
            title: formatActivityMessage(log.message ?? log.action),
            time: formatRelativeTime(log.created_at),
            user: log.user?.name ?? log.user?.email ?? 'System',
            avatar: (log.user?.name ?? log.user?.email ?? 'S').charAt(0).toUpperCase(),
        }));
    }

    /* ── 6. System Health ──────────────────────────────────── */

    async getSystemHealth(): Promise<SystemHealthData> {
        const data = await this.fetchJson<any>(`${API}/admin/resources/stats`);

        const rawServices = data?.services ?? [];
        const services = rawServices.map((s: any) => ({
            name: s.service ?? s.name ?? 'Unknown',
            status: mapHealthStatus(s.status),
            latency: s.responseTime != null ? `${s.responseTime}ms` : 'N/A',
            uptime: s.uptime ?? 'N/A',
        }));

        // Build alerts from services that are not healthy
        const alerts = rawServices
            .filter((s: any) => s.status !== 'online' && s.status !== 'healthy')
            .map((s: any, idx: number) => ({
                id: idx + 1,
                level: s.status === 'degraded' || s.status === 'unknown' ? 'WARNING' : 'ERROR',
                message: `${s.service ?? s.name} — ${s.status} (latency: ${s.responseTime ?? '?'}ms)`,
                time: 'Vừa xong',
            }));

        return { services, alerts };
    }
}

/* ── Utility functions ─────────────────────────────────────── */

function formatRelativeTime(isoDate: string | undefined): string {
    if (!isoDate) return 'Vừa xong';
    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

function buildOrgUpdateType(request: any): string {
    const changes: string[] = [];
    if (request.tax_code) changes.push('Đổi Mã Số Thuế');
    if (request.representative_name) changes.push('Đổi Người Đại Diện');
    if (request.headquarters_address) changes.push('Đổi Địa chỉ');
    return changes.length > 0 ? changes.join(', ') : 'Cập nhật thông tin';
}

function mapModuleToType(module: string | undefined): string {
    if (!module) return 'SYSTEM';
    const m = module.toLowerCase();
    if (m.includes('org')) return 'ORGANIZATION';
    if (m.includes('user') || m.includes('auth')) return 'ADMIN';
    if (m.includes('contract') || m.includes('rental')) return 'CONTRACT';
    if (m.includes('ticket') || m.includes('support')) return 'TICKET';
    return 'SYSTEM';
}

function mapHealthStatus(status: string | undefined): string {
    if (!status) return 'OK';
    const s = status.toLowerCase();
    if (s === 'healthy' || s === 'ok' || s === 'online') return 'OK';
    if (s === 'degraded' || s === 'warning' || s === 'unknown') return 'WARNING';
    return 'ERROR';
}

function formatActivityMessage(message: string | undefined): string {
    if (!message) return 'Hoạt động hệ thống';

    // Parse HTTP log pattern like "[200] GET /admin/resources/overview - 69ms"
    const httpMatch = message.match(/\] ([A-Z]+) ([^\s]+)/);
    if (httpMatch && httpMatch[2]) {
        const method = httpMatch[1]; // GET, POST, PUT, DELETE, etc.
        const url = httpMatch[2].toLowerCase();

        let action = 'Tra cứu';
        if (method === 'POST') action = 'Tạo mới';
        if (method === 'PUT' || method === 'PATCH') action = 'Cập nhật';
        if (method === 'DELETE') action = 'Xóa';

        if (url.includes('/revenue-analytics/kpis')) return `${action} chỉ số KPI doanh thu`;
        if (url.includes('/revenue-analytics/charts')) return `${action} biểu đồ doanh thu`;
        if (url.includes('/revenue-analytics/tables')) return `${action} thống kê kho bãi`;
        if (url.includes('/admin/users/stats') || url.includes('/users/stats')) return `${action} thống kê người dùng`;
        if (url.includes('/admin/resources/overview')) return `${action} tổng quan tài nguyên hệ thống`;
        if (url.includes('/admin/resources/stats')) return `${action} trạng thái các dịch vụ (System Health)`;
        if (url.includes('/admin/system-logs')) return `${action} lịch sử hoạt động hệ thống`;
        if (url.includes('/admin/refund-requests')) return `${action} danh sách yêu cầu hoàn tiền`;
        if (url.includes('/rental-contracts')) return `${action} danh sách hợp đồng thuê`;
        if (url.includes('/warehouse-visit')) return `${action} lịch hẹn thăm kho`;
        if (url.includes('/organization-update-requests')) return `${action} yêu cầu cập nhật tổ chức`;
        if (url.includes('/organizations')) return `${action} dữ liệu tổ chức`;
        if (url.includes('/auth') || url.includes('/login')) return `Đăng nhập hệ thống`;
        
        // Fallback for unknown URLs
        const cleanUrl = url.split('?')[0];
        return `${action} dữ liệu API (${cleanUrl})`;
    }

    return message;
}

export const adminDashboardService = new AdminDashboardService();
