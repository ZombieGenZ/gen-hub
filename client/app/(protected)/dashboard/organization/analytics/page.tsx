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
import { orgHelper } from "@/lib/organization.utils";
import { orgAnalyticsService } from "@/services/org-analytics/org-analytics.service";
import type { DockOverviewData, DockTrendPoint } from "@/services/org-analytics/org-analytics.types";
import { useToast } from "@/contexts/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDaysIcon, CheckCircleIcon, XCircleIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";

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

export default function OrgAnalyticsDockPage() {
    const { showToast } = useToast();

    const [orgId, setOrgId] = useState<string | null>(null);
    const [trendDays, setTrendDays] = useState<"7" | "14" | "30">("7");

    const [dockOverview, setDockOverview] = useState<DockOverviewData | null>(null);
    const [dockTrend, setDockTrend] = useState<DockTrendPoint[]>([]);

    const [loadingOverview, setLoadingOverview] = useState(false);
    const [loadingTrend, setLoadingTrend] = useState(false);
    const [orgLoading, setOrgLoading] = useState(true);

    useEffect(() => {
        void (async () => {
            setOrgLoading(true);
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const id = await orgHelper.getOrgId(token);
                if (id) setOrgId(id);
            } catch {
                showToast("Không thể tải thông tin tổ chức", "error");
            } finally {
                setOrgLoading(false);
            }
        })();
    }, []);

    const fetchOverview = useCallback(async () => {
        if (!orgId) return;
        setLoadingOverview(true);
        try {
            const data = await orgAnalyticsService.getDockOverview(orgId);
            setDockOverview(data);
        } catch {
            showToast("Lỗi tải tổng quan lịch dock", "error");
        } finally {
            setLoadingOverview(false);
        }
    }, [orgId]);

    const fetchTrend = useCallback(async () => {
        if (!orgId) return;
        setLoadingTrend(true);
        try {
            const data = await orgAnalyticsService.getDockTrend(orgId, Number(trendDays));
            setDockTrend(data);
        } catch {
            showToast("Lỗi tải xu hướng lịch dock", "error");
        } finally {
            setLoadingTrend(false);
        }
    }, [orgId, trendDays]);

    useEffect(() => {
        if (orgId) {
            void fetchOverview();
            void fetchTrend();
        }
    }, [orgId]);

    useEffect(() => {
        if (orgId) void fetchTrend();
    }, [trendDays, orgId]);

    if (orgLoading) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Đang tải...
            </div>
        );
    }

    if (!orgId) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Không tìm thấy thông tin tổ chức.
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard Lịch Dock</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Tổng quan lịch đặt cảng bốc dỡ hàng của tổ chức bạn
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard
                    icon={<CalendarDaysIcon className="h-5 w-5 text-blue-600" />}
                    label="Tổng lịch đã đặt"
                    value={dockOverview?.total ?? "—"}
                    loading={loadingOverview}
                    color="blue"
                />
                <KpiCard
                    icon={<CalendarDaysIcon className="h-5 w-5 text-purple-600" />}
                    label="Hôm nay"
                    value={dockOverview?.today ?? "—"}
                    loading={loadingOverview}
                    color="purple"
                />
                <KpiCard
                    icon={<CheckCircleIcon className="h-5 w-5 text-green-600" />}
                    label="Tỷ lệ hoàn thành"
                    value={dockOverview ? `${dockOverview.completion_rate}%` : "—"}
                    loading={loadingOverview}
                    color="green"
                />
                <KpiCard
                    icon={<XCircleIcon className="h-5 w-5 text-red-500" />}
                    label="Tỷ lệ no-show"
                    value={dockOverview ? `${dockOverview.no_show_rate}%` : "—"}
                    loading={loadingOverview}
                    color="red"
                />
            </div>

            {/* Status breakdown */}
            {dockOverview && (
                <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Phân loại trạng thái lịch dock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {Object.keys(dockOverview.by_status).length === 0 ? (
                            <p className="text-sm text-muted-foreground">Chưa có lịch dock nào.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(dockOverview.by_status).map(([status, count]) => (
                                    <span
                                        key={status}
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${DOCK_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}
                                    >
                                        {DOCK_STATUS_LABELS[status] ?? status}: {count}
                                    </span>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Top warehouses used */}
            {dockOverview && dockOverview.top_warehouses.length > 0 && (
                <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BuildingOffice2Icon className="h-4 w-4" />
                            Kho sử dụng nhiều nhất
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {dockOverview.top_warehouses.map((w, idx) => {
                                const pct = dockOverview.total > 0
                                    ? Math.round((w.count / dockOverview.total) * 100)
                                    : 0;
                                return (
                                    <div key={w.id} className="flex items-center gap-3">
                                        <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1">
                                            <div className="mb-1 flex justify-between text-sm">
                                                <span className="font-medium">{w.name}</span>
                                                <span className="text-muted-foreground">{w.count} lịch</span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-blue-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="w-10 text-right text-xs text-muted-foreground">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Trend Chart */}
            <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">Xu hướng lịch dock theo ngày</CardTitle>
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
                        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                            Đang tải...
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={dockTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(d: string) => d.slice(5)}
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(v, name) => [
                                        v,
                                        name === "total"
                                            ? "Tổng lịch"
                                            : name === "completed"
                                            ? "Hoàn thành"
                                            : "No-show",
                                    ]}
                                    labelFormatter={(l) => `Ngày ${l}`}
                                />
                                <Legend
                                    formatter={(v) =>
                                        v === "total"
                                            ? "Tổng lịch"
                                            : v === "completed"
                                            ? "Hoàn thành"
                                            : "No-show"
                                    }
                                />
                                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="no_show" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
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
    loading,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    loading: boolean;
    color: "blue" | "purple" | "green" | "red";
}) {
    const bg: Record<string, string> = {
        blue: "bg-blue-50",
        purple: "bg-purple-50",
        green: "bg-green-50",
        red: "bg-red-50",
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
            </CardContent>
        </Card>
    );
}
