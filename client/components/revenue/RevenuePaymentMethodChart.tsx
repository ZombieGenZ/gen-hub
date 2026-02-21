"use client";

import { useMemo } from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from "recharts";
import { formatCurrencyCompact, formatCurrencyFull } from "@/lib/format-currency";
import type { PaymentMethodBreakdownItem } from "@/services/revenue-analytics/revenue-analytics.types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
    data: PaymentMethodBreakdownItem[];
}

/* ------------------------------------------------------------------ */
/*  Colours & labels                                                   */
/* ------------------------------------------------------------------ */

const METHOD_CONFIG: Record<string, { color: string; label: string }> = {
    BALANCE: { color: "#3b82f6", label: "Ví số dư" },
    TRANSFER: { color: "#10b981", label: "Chuyển khoản" },
    HYBRID: { color: "#f59e0b", label: "Hỗn hợp" },
};

const FALLBACK_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f97316"];

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

function ChartTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;

    const entry = payload[0].payload as {
        name: string;
        value: number;
        contractCount: number;
        percent: number;
        color: string;
    };

    const fmt = formatCurrencyCompact(entry.value);

    return (
        <div className="bg-popover/95 backdrop-blur-md shadow-xl border border-border/40 rounded-xl p-3 text-xs z-50 min-w-[160px]">
            <div className="flex items-center gap-1.5 font-semibold text-foreground border-b border-border/30 pb-1.5 mb-2">
                <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                />
                {entry.name}
            </div>
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                    <span>Doanh thu</span>
                    <span
                        className="font-mono font-medium text-foreground"
                        title={fmt.exact}
                    >
                        {fmt.display}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                    <span>Hợp đồng</span>
                    <span className="font-mono font-medium text-foreground">
                        {entry.contractCount}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                    <span>Tỷ lệ</span>
                    <span className="font-mono font-medium text-foreground">
                        {entry.percent.toFixed(1)}%
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RevenuePaymentMethodChart({ data }: Props) {
    /* ---------- transform data ---------- */
    const { chartData, totalAmount } = useMemo(() => {
        const total = data.reduce((s, d) => s + d.total_amount, 0);

        const items = data.map((d, i) => {
            const cfg = METHOD_CONFIG[d.payment_method];
            return {
                name: cfg?.label ?? d.payment_method,
                value: d.total_amount,
                contractCount: d.contract_count,
                percent: total > 0 ? (d.total_amount / total) * 100 : 0,
                color: cfg?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
            };
        });

        return { chartData: items, totalAmount: total };
    }, [data]);

    const totalFmt = formatCurrencyCompact(totalAmount);

    /* ---------- empty state ---------- */
    if (chartData.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                    Phương thức thanh toán
                </h3>
                <div className="h-[320px] flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-400 text-sm">Chưa có dữ liệu</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            {/* Header */}
            <h3 className="text-base font-semibold text-slate-800 mb-4">
                Phương thức thanh toán
            </h3>

            {/* Doughnut chart with center label */}
            <div className="relative">
                <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="45%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="name"
                            cornerRadius={4}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    strokeWidth={0}
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center label */}
                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <span
                        className="text-lg font-bold text-slate-800 leading-none block"
                        title={totalFmt.exact}
                    >
                        {totalFmt.display}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        Tổng
                    </span>
                </div>
            </div>
        </div>
    );
}
