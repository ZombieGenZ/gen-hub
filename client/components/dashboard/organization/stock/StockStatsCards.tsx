"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StockStats } from "@/services/inventory/inventory.types";

interface StockStatsCardsProps {
    stats: StockStats | null;
    loading: boolean;
}

function StatCard({
    label,
    value,
    subLabel,
    color,
    loading,
}: {
    label: string;
    value: number | string;
    subLabel?: string;
    color: "blue" | "red" | "purple";
    loading: boolean;
}) {
    const colorClasses = {
        blue: {
            bg: "bg-blue-50 dark:bg-blue-950/30",
            text: "text-blue-600 dark:text-blue-400",
            dot: "bg-blue-500",
        },
        red: {
            bg: "bg-red-50 dark:bg-red-950/30",
            text: "text-red-600 dark:text-red-400",
            dot: "bg-red-500",
        },
        purple: {
            bg: "bg-purple-50 dark:bg-purple-950/30",
            text: "text-purple-600 dark:text-purple-400",
            dot: "bg-purple-500",
        },
    };

    const cls = colorClasses[color];

    return (
        <Card className={`border-0 shadow-sm rounded-2xl ${cls.bg}`}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {label}
                        </p>
                        {loading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <p className={`text-3xl font-bold ${cls.text}`}>
                                {typeof value === "number"
                                    ? new Intl.NumberFormat("vi-VN").format(value)
                                    : value}
                            </p>
                        )}
                        {subLabel && (
                            <p className="text-xs text-muted-foreground">{subLabel}</p>
                        )}
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full mt-1 ${cls.dot}`} />
                </div>
            </CardContent>
        </Card>
    );
}

export function StockStatsCards({ stats, loading }: StockStatsCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
                label="Tổng SKU tồn kho"
                value={stats?.total_sku_count ?? 0}
                color="blue"
                loading={loading}
            />
            <StatCard
                label="Sắp hết hàng"
                value={stats?.low_stock_count ?? 0}
                subLabel={stats && stats.low_stock_count > 0 ? "⚠ Cần bổ sung" : undefined}
                color="red"
                loading={loading}
            />
            <StatCard
                label="Phiếu nhập/xuất tháng này"
                value={
                    stats
                        ? stats.month_inbound_count + stats.month_outbound_count
                        : 0
                }
                subLabel={
                    stats
                        ? `${stats.month_inbound_count} nhập · ${stats.month_outbound_count} xuất`
                        : undefined
                }
                color="purple"
                loading={loading}
            />
        </div>
    );
}
