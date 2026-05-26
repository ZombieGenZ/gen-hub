"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    CalendarDaysIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowTopRightOnSquareIcon,
    BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { orgAnalyticsService } from "@/services/org-analytics/org-analytics.service";
import type { DockOverviewData } from "@/services/org-analytics/org-analytics.types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    ARRIVED: "Đã đến",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    NO_SHOW: "Không đến",
};

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    ARRIVED: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-500",
    NO_SHOW: "bg-red-100 text-red-800",
};

interface Props {
    orgId: string;
}

export function CustomerDockSummary({ orgId }: Props) {
    const [data, setData] = useState<DockOverviewData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orgId) return;
        setLoading(true);
        orgAnalyticsService
            .getDockOverview(orgId)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [orgId]);

    return (
        <Card className="border-0 shadow-premium">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <CalendarDaysIcon className="h-4 w-4 text-blue-500" />
                    Lịch Dock — Tổng quan
                </CardTitle>
                <Link
                    href="/dashboard/organization/analytics"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                    Xem chi tiết
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </Link>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                        ))}
                    </div>
                ) : !data ? (
                    <p className="text-sm text-muted-foreground">Không thể tải dữ liệu lịch dock.</p>
                ) : (
                    <>
                        {/* Mini KPI row */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <MiniKpi
                                icon={<CalendarDaysIcon className="h-4 w-4 text-blue-500" />}
                                label="Tổng lịch"
                                value={data.total}
                                bg="bg-blue-50"
                            />
                            <MiniKpi
                                icon={<CalendarDaysIcon className="h-4 w-4 text-purple-500" />}
                                label="Hôm nay"
                                value={data.today}
                                bg="bg-purple-50"
                            />
                            <MiniKpi
                                icon={<CheckCircleIcon className="h-4 w-4 text-green-600" />}
                                label="Hoàn thành"
                                value={`${data.completion_rate}%`}
                                bg="bg-green-50"
                            />
                            <MiniKpi
                                icon={<XCircleIcon className="h-4 w-4 text-red-500" />}
                                label="No-show"
                                value={`${data.no_show_rate}%`}
                                bg="bg-red-50"
                            />
                        </div>

                        {/* Status badges */}
                        {Object.keys(data.by_status).length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(data.by_status).map(([status, count]) => (
                                    <span
                                        key={status}
                                        className={cn(
                                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                            STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600",
                                        )}
                                    >
                                        {STATUS_LABELS[status] ?? status}: {count}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Top warehouses */}
                        {data.top_warehouses.length > 0 && (
                            <div>
                                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <BuildingOffice2Icon className="h-3.5 w-3.5" />
                                    Kho sử dụng nhiều nhất
                                </p>
                                <div className="space-y-2">
                                    {data.top_warehouses.slice(0, 3).map((w) => {
                                        const pct =
                                            data.total > 0
                                                ? Math.round((w.count / data.total) * 100)
                                                : 0;
                                        return (
                                            <div key={w.id} className="flex items-center gap-2">
                                                <span className="w-28 truncate text-xs text-foreground sm:w-36">
                                                    {w.name}
                                                </span>
                                                <div className="flex-1">
                                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-blue-400"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="w-12 text-right text-xs text-muted-foreground">
                                                    {w.count} lịch
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function MiniKpi({
    icon,
    label,
    value,
    bg,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    bg: string;
}) {
    return (
        <div className={cn("flex flex-col gap-1 rounded-xl p-3", bg)}>
            <div className="flex items-center gap-1.5">
                {icon}
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
    );
}
