"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ReTooltip,
    ReferenceLine,
    Legend,
} from "recharts";
import {
    BrainCircuit,
    AlertTriangle,
    TriangleAlert,
    CalendarClock,
    Lightbulb,
    ArrowRight,
} from "lucide-react";
import {
    type MockRentedWarehouse,
    getOccupancyPct,
    daysUntil,
    formatDate,
} from "@/data/mockMyWarehouses";
import { cn } from "@/lib/utils";

// ── Capacity Forecast Chart ──

function CapacityForecastChart({ warehouse }: { warehouse: MockRentedWarehouse }) {
    const data = warehouse.forecast.map((f) => ({
        date: f.date.slice(5), // "MM-DD"
        actual: f.actual_pct ?? null,
        forecast: f.forecast_pct ?? null,
    }));

    return (
        <Card className="border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-brand" />
                        Dự báo công suất (AI)
                    </CardTitle>
                    {warehouse.forecast_full_date && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-red-200 text-red-600 bg-red-50 dark:bg-red-950/50">
                            <AlertTriangle className="w-3 h-3" />
                            Dự kiến đầy: {formatDate(warehouse.forecast_full_date)}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v: number) => `${v}%`}
                        />
                        <ReTooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any, name: any) => [
                                `${value ?? 0}%`,
                                name === "actual" ? "Thực tế" : "Dự báo",
                            ]}
                        />
                        <Legend
                            verticalAlign="top"
                            formatter={(value: string) => (value === "actual" ? "Thực tế" : "Dự báo AI")}
                            wrapperStyle={{ fontSize: 11 }}
                        />
                        <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="6 3" label={{ value: "90%", position: "right", fontSize: 10 }} />
                        <Area
                            type="monotone"
                            dataKey="actual"
                            stroke="var(--color-brand, #2563eb)"
                            fill="var(--color-brand, #2563eb)"
                            fillOpacity={0.15}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                        />
                        <Area
                            type="monotone"
                            dataKey="forecast"
                            stroke="#f59e0b"
                            fill="#f59e0b"
                            fillOpacity={0.08}
                            strokeWidth={2}
                            strokeDasharray="6 3"
                            dot={{ r: 2, strokeDasharray: "0" }}
                            connectNulls
                        />
                    </AreaChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-muted-foreground text-center mt-2 italic">
                    * Dự báo dựa trên xu hướng 30 ngày gần nhất. Kết quả chỉ mang tính tham khảo.
                </p>
            </CardContent>
        </Card>
    );
}

// ── Contract Alert Banner ──

function ContractAlertBanner({ warehouse }: { warehouse: MockRentedWarehouse }) {
    const days = daysUntil(warehouse.expired_at);

    if (days > 60 || warehouse.auto_renew) return null;

    const isExpired = days <= 0;

    return (
        <div
            className={cn(
                "rounded-lg p-4 flex items-center gap-3 border",
                isExpired
                    ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
                    : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900"
            )}
        >
            <div className={cn("rounded-full p-2 shrink-0", isExpired ? "bg-red-100 dark:bg-red-900" : "bg-yellow-100 dark:bg-yellow-900")}>
                <TriangleAlert className={cn("w-5 h-5", isExpired ? "text-red-600" : "text-yellow-600")} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", isExpired ? "text-red-800 dark:text-red-300" : "text-yellow-800 dark:text-yellow-300")}>
                    {isExpired
                        ? `Hợp đồng đã hết hạn ${Math.abs(days)} ngày trước!`
                        : `Hợp đồng sắp hết hạn trong ${days} ngày`}
                </p>
                <p className={cn("text-xs mt-0.5", isExpired ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400")}>
                    {isExpired
                        ? "Vui lòng gia hạn ngay để tránh gián đoạn dịch vụ."
                        : `Hạn kết thúc: ${formatDate(warehouse.expired_at)}. Tự động gia hạn đang TẮT.`}
                </p>
            </div>
            <Button
                size="sm"
                variant={isExpired ? "destructive" : "default"}
                className="shrink-0 gap-1 text-xs"
            >
                <CalendarClock className="w-3.5 h-3.5" />
                Gia hạn ngay
            </Button>
        </div>
    );
}

// ── Optimize Storage Suggestion ──

function OptimizeStorageCard({ warehouse }: { warehouse: MockRentedWarehouse }) {
    const occupancy = getOccupancyPct(warehouse);
    // Show suggestions when occupancy is high or there are dead-stock items
    const deadStockCount = warehouse.inventory.filter((item) => item.days_in_storage > 60 && item.avg_daily_out < 1).length;
    const expiringCount = warehouse.inventory.filter((item) => {
        if (!item.expiry_date) return false;
        return daysUntil(item.expiry_date) <= 60 && daysUntil(item.expiry_date) > 0;
    }).length;

    if (occupancy < 50 && deadStockCount === 0 && expiringCount === 0) return null;

    const tips: { text: string; priority: "high" | "medium" | "low" }[] = [];

    if (occupancy >= 90) tips.push({ text: `Kho đầy ${occupancy}%: Xem xét điều chuyển hàng sang kho phụ.`, priority: "high" });
    else if (occupancy >= 70) tips.push({ text: `Kho đang ${occupancy}%: Tối ưu sắp xếp để tăng sức chứa.`, priority: "medium" });

    if (deadStockCount > 0) tips.push({ text: `${deadStockCount} mặt hàng tồn đọng >60 ngày: Xem xét chương trình thanh lý.`, priority: "high" });
    if (expiringCount > 0) tips.push({ text: `${expiringCount} mặt hàng sắp hết hạn: Ưu tiên xuất trước (FEFO).`, priority: "medium" });

    if (tips.length === 0) return null;

    return (
        <Card className="border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-500" />
                    Gợi ý tối ưu kho
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {tips.map((tip, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex items-start gap-2 p-2.5 rounded-lg text-xs",
                            tip.priority === "high" && "bg-red-50 dark:bg-red-950/30",
                            tip.priority === "medium" && "bg-yellow-50 dark:bg-yellow-950/30",
                            tip.priority === "low" && "bg-green-50 dark:bg-green-950/30"
                        )}
                    >
                        <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0",
                            tip.priority === "high" && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                            tip.priority === "medium" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                            tip.priority === "low" && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        )}>
                            {tip.priority === "high" ? "CAO" : tip.priority === "medium" ? "TB" : "THẤP"}
                        </span>
                        <p className="text-muted-foreground">{tip.text}</p>
                    </div>
                ))}
                <Button variant="outline" size="sm" className="w-full text-xs gap-1 mt-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Xem thêm gợi ý
                    <ArrowRight className="w-3.5 h-3.5" />
                </Button>
            </CardContent>
        </Card>
    );
}

// ── Exported composite ──

export { CapacityForecastChart, ContractAlertBanner, OptimizeStorageCard };
