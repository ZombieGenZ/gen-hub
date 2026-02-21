"use client";

import { DollarSign, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { formatCurrencyCompact, calcPercentChange } from "@/lib/format-currency";
import type { KpiData } from "@/services/revenue-analytics/revenue-analytics.types";
import { SkeletonKpiCards } from "./SkeletonKpiCards";
import { cn } from "@/lib/utils";

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
                    <div
                        key={card.key}
                        onClick={card.clickType ? () => onCardClick(card.clickType!) : undefined}
                        className={cn(
                            "bg-card text-card-foreground border border-border rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all",
                            card.clickType && "cursor-pointer hover:bg-muted"
                        )}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="text-muted-foreground text-sm font-medium">{card.title}</h3>
                            <card.icon className="w-5 h-5 text-muted-foreground opacity-80" />
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="flex flex-col gap-1.5">
                                <div className="text-2xl xl:text-3xl font-bold tracking-tight">{formatted.display}</div>
                                <div className={cn("text-sm font-semibold flex items-center gap-1", trend >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                    <span>{trend > 0 ? "+" : ""}{trend}%</span>
                                    {card.item.count > 0 && <span className="text-muted-foreground font-normal">({card.item.count})</span>}
                                </div>
                            </div>

                            {sparklineData && sparklineData.length > 1 && (
                                <div className="w-[90px] h-[45px] mb-1" title={formatted.exact}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={sparklineData}
                                            margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
                                        >
                                            <Area
                                                type="monotone"
                                                dataKey="total"
                                                stroke={colors.stroke}
                                                strokeWidth={2}
                                                fill="transparent"
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
