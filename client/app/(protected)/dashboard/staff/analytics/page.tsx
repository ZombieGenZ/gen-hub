"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { authStorage } from "@/services/auth/auth-storage.service";
import { warehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import {
    WarehouseOpsAnalyticsService,
    type OpsOverview,
    type VehicleTrendPoint,
    type DockStatsResult,
} from "@/services/warehouse-ops-analytics/warehouse-ops-analytics.service";
import { useToast } from "@/contexts/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TruckIcon, CalendarDaysIcon, SignalIcon, ChartBarIcon } from "@heroicons/react/24/outline";

const analyticsService = new WarehouseOpsAnalyticsService();

const DOCK_STATUS_LABELS: Record<string, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    ARRIVED: "Đã đến",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    NO_SHOW: "Không đến",
};

const DOCK_STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    ARRIVED: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-500",
    NO_SHOW: "bg-red-100 text-red-800",
};

interface WarehouseOption {
    id: string;
    name: string;
}

export default function StaffAnalyticsPage() {
    const { showToast } = useToast();

    const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");

    const [overview, setOverview] = useState<OpsOverview | null>(null);
    const [trend, setTrend] = useState<VehicleTrendPoint[]>([]);
    const [dockStats, setDockStats] = useState<DockStatsResult | null>(null);
    const [trendDays, setTrendDays] = useState<"7" | "14" | "30">("7");

    const [loadingOverview, setLoadingOverview] = useState(false);
    const [loadingTrend, setLoadingTrend] = useState(false);
    const [loadingDock, setLoadingDock] = useState(false);

    // Load warehouse list
    useEffect(() => {
        void (async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;
            try {
                const raw = await warehouseTemplateService.getWarehouseTemplates(token, {
                    is_active: true,
                    limit: 100,
                });
                const items = (Array.isArray(raw) ? raw : (raw?.items ?? [])) as WarehouseOption[];
                setWarehouses(items.map((w) => ({ id: w.id, name: w.name })));
                if (items.length > 0) setSelectedId(items[0].id);
            } catch {
                showToast("Không thể tải danh sách kho", "error");
            }
        })();
    }, []);

    const fetchOverview = useCallback(async () => {
        if (!selectedId) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoadingOverview(true);
        try {
            const data = await analyticsService.getOverview(token, selectedId);
            setOverview(data);
        } catch {
            showToast("Lỗi tải tổng quan", "error");
        } finally {
            setLoadingOverview(false);
        }
    }, [selectedId]);

    const fetchTrend = useCallback(async () => {
        if (!selectedId) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoadingTrend(true);
        try {
            const data = await analyticsService.getVehicleTrend(token, selectedId, Number(trendDays));
            setTrend(data);
        } catch {
            showToast("Lỗi tải xu hướng xe", "error");
        } finally {
            setLoadingTrend(false);
        }
    }, [selectedId, trendDays]);

    const fetchDock = useCallback(async () => {
        if (!selectedId) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoadingDock(true);
        try {
            const data = await analyticsService.getDockStats(token, selectedId);
            setDockStats(data);
        } catch {
            showToast("Lỗi tải thống kê dock", "error");
        } finally {
            setLoadingDock(false);
        }
    }, [selectedId]);

    useEffect(() => {
        if (selectedId) {
            void fetchOverview();
            void fetchTrend();
            void fetchDock();
        }
    }, [selectedId]);

    useEffect(() => {
        if (selectedId) void fetchTrend();
    }, [trendDays, selectedId]);

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard Vận hành Kho</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Tổng quan xe, dock và GPS theo ngày</p>
                </div>
                <div className="w-full sm:w-72">
                    <Select value={selectedId} onValueChange={setSelectedId}>
                        <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Chọn kho..." />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouses.map((w) => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard
                    icon={<TruckIcon className="h-5 w-5 text-green-600" />}
                    label="Xe đang trong kho"
                    value={overview?.vehicle.inside ?? "—"}
                    loading={loadingOverview}
                    color="green"
                />
                <KpiCard
                    icon={<TruckIcon className="h-5 w-5 text-blue-600" />}
                    label="Vào hôm nay"
                    value={overview?.vehicle.entered_today ?? "—"}
                    loading={loadingOverview}
                    color="blue"
                />
                <KpiCard
                    icon={<CalendarDaysIcon className="h-5 w-5 text-purple-600" />}
                    label="Lịch dock hôm nay"
                    value={overview?.dock.total_scheduled ?? "—"}
                    sub={overview ? `Hoàn thành ${overview.dock.completion_rate}%` : undefined}
                    loading={loadingOverview}
                    color="purple"
                />
                <KpiCard
                    icon={<SignalIcon className="h-5 w-5 text-orange-600" />}
                    label="GPS đang hoạt động"
                    value={overview?.gps.active_sessions ?? "—"}
                    loading={loadingOverview}
                    color="orange"
                />
            </div>

            {/* Dock status breakdown */}
            {overview && (
                <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Trạng thái lịch dock hôm nay</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {Object.keys(overview.dock.by_status).length === 0 ? (
                            <p className="text-sm text-muted-foreground">Chưa có lịch dock nào hôm nay.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(overview.dock.by_status).map(([status, count]) => (
                                    <span
                                        key={status}
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${DOCK_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}
                                    >
                                        {DOCK_STATUS_LABELS[status] ?? status}: {count}
                                    </span>
                                ))}
                                {overview.dock.no_show_rate > 0 && (
                                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                                        No-show: {overview.dock.no_show_rate}%
                                    </span>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Vehicle Trend Chart */}
            <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ChartBarIcon className="h-4 w-4" /> Xu hướng xe ra vào
                    </CardTitle>
                    <Select value={trendDays} onValueChange={(v) => setTrendDays(v as typeof trendDays)}>
                        <SelectTrigger className="h-8 w-28 rounded-xl text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">7 ngày</SelectItem>
                            <SelectItem value="14">14 ngày</SelectItem>
                            <SelectItem value="30">30 ngày</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    {loadingTrend ? (
                        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Đang tải...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(d: string) => d.slice(5)}
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(v, name) => [v, name === "entered" ? "Xe vào" : "Xe ra"]}
                                    labelFormatter={(l) => `Ngày ${l}`}
                                />
                                <Legend formatter={(v) => (v === "entered" ? "Xe vào" : "Xe ra")} />
                                <Bar dataKey="entered" fill="#0F766E" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="exited" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Dock Stats */}
            <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Thống kê theo dock — hôm nay</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingDock ? (
                        <div className="text-sm text-muted-foreground">Đang tải...</div>
                    ) : !dockStats || dockStats.docks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Không có dữ liệu dock.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {dockStats.docks.map((dock) => (
                                <div
                                    key={dock.dock_number}
                                    className="rounded-xl border bg-muted/40 p-4"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="font-semibold text-sm">Dock #{dock.dock_number}</span>
                                        <span className="text-xs text-muted-foreground">{dock.total} lịch</span>
                                    </div>
                                    <div className="flex gap-3 text-xs">
                                        <span className="text-green-700">✓ {dock.completed} hoàn thành</span>
                                        {dock.no_show > 0 && (
                                            <span className="text-red-600">✗ {dock.no_show} no-show</span>
                                        )}
                                    </div>
                                    {dock.slots.length > 0 && (
                                        <div className="mt-3 space-y-1">
                                            {dock.slots.map((slot, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>{slot.scheduled_time_start}–{slot.scheduled_time_end}</span>
                                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${DOCK_STATUS_COLORS[slot.status] ?? ""}`}>
                                                        {DOCK_STATUS_LABELS[slot.status] ?? slot.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function KpiCard({
    icon,
    label,
    value,
    sub,
    loading,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    sub?: string;
    loading: boolean;
    color: "green" | "blue" | "purple" | "orange";
}) {
    const bg: Record<string, string> = {
        green: "bg-green-50",
        blue: "bg-blue-50",
        purple: "bg-purple-50",
        orange: "bg-orange-50",
    };
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-4">
                <div className={`mb-3 inline-flex rounded-xl p-2 ${bg[color]}`}>{icon}</div>
                {loading ? (
                    <div className="h-7 w-12 animate-pulse rounded bg-muted" />
                ) : (
                    <p className="text-2xl font-bold">{value}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                {sub && <p className="mt-0.5 text-xs font-medium text-muted-foreground">{sub}</p>}
            </CardContent>
        </Card>
    );
}
