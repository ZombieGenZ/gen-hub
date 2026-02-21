"use client";

import { useMemo, useState } from "react";
import {
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrencyCompact, formatCurrencyFull } from "@/lib/format-currency";
import type {
    TimeSeriesPoint,
    AddonSeriesPoint,
    CouponDiscountPoint,
} from "@/services/revenue-analytics/revenue-analytics.types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Granularity = "day" | "week" | "month";

interface Props {
    timeSeries: TimeSeriesPoint[];
    addonSeries: AddonSeriesPoint[];
    couponDiscount: CouponDiscountPoint[] | null;
    granularity: Granularity;
    onGranularityChange: (g: Granularity) => void;
}

/* ------------------------------------------------------------------ */
/*  Colours                                                            */
/* ------------------------------------------------------------------ */

const COLORS = {
    NEW_CONTRACT: "#10b981",
    RENEWAL: "#3b82f6",
    ADDON: "#8b5cf6",
    COUPON: "#ef4444",
    AVG_LINE: "#64748b",
} as const;

const LABELS: Record<string, string> = {
    NEW_CONTRACT: "Hợp đồng mới",
    RENEWAL: "Gia hạn",
    ADDON: "Addon & Bảo hiểm",
    COUPON: "Giảm giá coupon",
};

/* ------------------------------------------------------------------ */
/*  Granularity selector                                               */
/* ------------------------------------------------------------------ */

const GRANULARITY_OPTIONS: { key: Granularity; label: string }[] = [
    { key: "day", label: "Ngày" },
    { key: "week", label: "Tuần" },
    { key: "month", label: "Tháng" },
];

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;

    return (
        <div className="bg-popover/95 backdrop-blur-md shadow-xl border border-border/40 rounded-xl p-3 text-xs z-50 min-w-[180px]">
            <div className="font-semibold text-foreground border-b border-border/30 pb-1.5 mb-2">
                {label}
            </div>
            <div className="space-y-1.5">
                {payload
                    .filter((entry: any) => entry.value !== 0)
                    .map((entry: any, i: number) => {
                        const fmt = formatCurrencyCompact(Math.abs(entry.value));
                        return (
                            <div
                                key={i}
                                className="flex items-center justify-between gap-4 text-muted-foreground"
                            >
                                <div className="flex items-center gap-1.5">
                                    <div
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span>{LABELS[entry.dataKey] ?? entry.dataKey}</span>
                                </div>
                                <span
                                    className="font-mono font-medium text-foreground"
                                    title={fmt.exact}
                                >
                                    {entry.value < 0 ? `-${fmt.display}` : fmt.display}
                                </span>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RevenueStackedBarChart({
    timeSeries,
    addonSeries,
    couponDiscount,
    granularity,
    onGranularityChange,
}: Props) {
    /* ---------- merge data into flat rows keyed by period ---------- */
    const { chartData, avgRevenue, hasCoupon } = useMemo(() => {
        const map = new Map<
            string,
            {
                period: string;
                NEW_CONTRACT: number;
                RENEWAL: number;
                ADDON: number;
                COUPON: number;
            }
        >();

        const getRow = (period: string) => {
            if (!map.has(period)) {
                map.set(period, {
                    period,
                    NEW_CONTRACT: 0,
                    RENEWAL: 0,
                    ADDON: 0,
                    COUPON: 0,
                });
            }
            return map.get(period)!;
        };

        // time series (new contract / renewal / account deposit mapped to NEW_CONTRACT bucket)
        for (const pt of timeSeries) {
            const row = getRow(pt.period);
            if (pt.type === "RENEWAL") {
                row.RENEWAL += pt.total;
            } else {
                // NEW_CONTRACT, ACCOUNT_DEPOSIT, etc.
                row.NEW_CONTRACT += pt.total;
            }
        }

        // addon + insurance merged into single "ADDON" bucket
        for (const pt of addonSeries) {
            const row = getRow(pt.period);
            row.ADDON += pt.addon_total + pt.insurance_total;
        }

        // coupon discount rendered as negative
        let hasCouponData = false;
        if (couponDiscount) {
            for (const pt of couponDiscount) {
                if (pt.total_discount > 0) {
                    hasCouponData = true;
                    const row = getRow(pt.period);
                    row.COUPON = -pt.total_discount;
                }
            }
        }

        const rows = Array.from(map.values()).sort((a, b) =>
            a.period.localeCompare(b.period),
        );

        // average of positive revenue
        let avg = 0;
        if (rows.length > 0) {
            const total = rows.reduce(
                (s, r) => s + r.NEW_CONTRACT + r.RENEWAL + r.ADDON,
                0,
            );
            avg = total / rows.length;
        }

        return { chartData: rows, avgRevenue: avg, hasCoupon: hasCouponData };
    }, [timeSeries, addonSeries, couponDiscount]);

    /* ---------- Y-axis tick formatter ---------- */
    const formatYTick = (v: number) => {
        const fmt = formatCurrencyCompact(Math.abs(v));
        return v < 0 ? `-${fmt.display}` : fmt.display;
    };

    /* ---------- empty state ---------- */
    if (chartData.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-slate-800">
                        Doanh thu theo thời gian
                    </h3>
                </div>
                <div className="h-[320px] flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-400 text-sm">Chưa có dữ liệu</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-800">
                    Doanh thu theo thời gian
                </h3>

                {/* Granularity selector */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                    {GRANULARITY_OPTIONS.map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => onGranularityChange(opt.key)}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                granularity === opt.key
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700",
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={320}>
                <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                        tickFormatter={formatYTick}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                    />
                    <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    />

                    {/* Average revenue reference line */}
                    <ReferenceLine
                        y={avgRevenue}
                        stroke={COLORS.AVG_LINE}
                        strokeDasharray="6 4"
                        strokeWidth={1.5}
                        label={{
                            value: `TB: ${formatCurrencyCompact(avgRevenue).display}`,
                            position: "insideTopRight",
                            fill: COLORS.AVG_LINE,
                            fontSize: 10,
                        }}
                    />

                    {/* Stacked positive bars */}
                    <Bar
                        dataKey="NEW_CONTRACT"
                        stackId="revenue"
                        fill={COLORS.NEW_CONTRACT}
                        radius={[0, 0, 0, 0]}
                        maxBarSize={40}
                    />
                    <Bar
                        dataKey="RENEWAL"
                        stackId="revenue"
                        fill={COLORS.RENEWAL}
                        radius={[0, 0, 0, 0]}
                        maxBarSize={40}
                    />
                    <Bar
                        dataKey="ADDON"
                        stackId="revenue"
                        fill={COLORS.ADDON}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    />

                    {/* Negative bar for coupon discount */}
                    {hasCoupon && (
                        <Bar
                            dataKey="COUPON"
                            stackId="discount"
                            fill={COLORS.COUPON}
                            radius={[0, 0, 4, 4]}
                            maxBarSize={40}
                        />
                    )}

                    <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                        formatter={(value: string) => LABELS[value] ?? value}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
