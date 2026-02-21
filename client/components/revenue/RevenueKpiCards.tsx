"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { DollarSign, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { formatCurrencyCompact, calcPercentChange } from "@/lib/format-currency";
import type { KpiData } from "@/services/revenue-analytics/revenue-analytics.types";
import { SkeletonKpiCards } from "./SkeletonKpiCards";

interface Props {
    data: KpiData | undefined;
    isLoading: boolean;
    onCardClick: (type: string) => void;
}

const SPARKLINE_COLORS: Record<string, { stroke: string; fill: string }> = {
    emerald: { stroke: "#10b981", fill: "#10b981" },
    orange: { stroke: "#f97316", fill: "#f97316" },
    danger: { stroke: "#b91c1c", fill: "#b91c1c" },
    default: { stroke: "#6366f1", fill: "#6366f1" },
};

export function RevenueKpiCards({ data, isLoading, onCardClick }: Props) {
    if (isLoading) return <SkeletonKpiCards />;
    if (!data) return null;

    const cards = [
        {
            key: "netRevenue",
            title: "Doanh thu thu\u1EA7n",
            variant: "emerald" as const,
            icon: DollarSign,
            item: data.netRevenue,
            clickType: null,
        },
        {
            key: "pending",
            title: "Ch\u1EDD thanh to\u00E1n",
            variant: "orange" as const,
            icon: Clock,
            item: data.pending,
            clickType: "pending",
        },
        {
            key: "overdue",
            title: "Ti\u1EC1n ph\u1EA1t tr\u1EA3 ch\u1EADm",
            variant: "danger" as const,
            icon: AlertTriangle,
            item: data.overdue,
            clickType: null,
        },
        {
            key: "refunded",
            title: "T\u1ED5ng ti\u1EC1n ho\u00E0n tr\u1EA3",
            variant: "default" as const,
            icon: RefreshCw,
            item: data.refunded,
            clickType: null,
        },
    ];

    const sparklineData = data.sparkline;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {cards.map((card) => {
                const formatted = formatCurrencyCompact(card.item.value);
                const trend = calcPercentChange(card.item.value, card.item.previousValue);
                const colors = SPARKLINE_COLORS[card.variant] ?? SPARKLINE_COLORS.default;

                return (
                    <div key={card.key} className="flex flex-col">
                        <StatCard
                            title={card.title}
                            value={formatted.display}
                            icon={card.icon}
                            variant={card.variant}
                            trend={{
                                value: Math.abs(trend),
                                isPositive: trend >= 0,
                            }}
                            description={
                                card.item.count > 0
                                    ? `${card.item.count} h\u1EE3p \u0111\u1ED3ng`
                                    : undefined
                            }
                            onClick={
                                card.clickType
                                    ? () => onCardClick(card.clickType!)
                                    : undefined
                            }
                            className="flex-1"
                        />

                        {sparklineData && sparklineData.length > 1 && (
                            <div className="h-10 mt-1 px-1" title={formatted.exact}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={sparklineData}
                                        margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
                                    >
                                        <defs>
                                            <linearGradient
                                                id={`gradient-${card.key}`}
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="0%"
                                                    stopColor={colors.fill}
                                                    stopOpacity={0.3}
                                                />
                                                <stop
                                                    offset="100%"
                                                    stopColor={colors.fill}
                                                    stopOpacity={0.05}
                                                />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke={colors.stroke}
                                            strokeWidth={1.5}
                                            fill={`url(#gradient-${card.key})`}
                                            dot={false}
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
