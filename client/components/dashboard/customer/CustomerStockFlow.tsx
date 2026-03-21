"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { orgAnalyticsService } from "@/services/org-analytics/org-analytics.service";

interface CustomerStockFlowProps {
    orgId: string;
}

export function CustomerStockFlow({ orgId }: CustomerStockFlowProps) {
    const [chartPeriod, setChartPeriod] = useState("week");
    const [stockFlow, setStockFlow] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orgId) return;
        
        const fetchStockFlow = async () => {
            setLoading(true);
            try {
                const days = chartPeriod === 'day' ? 1 : chartPeriod === 'month' ? 30 : 7;
                const flowRes = await orgAnalyticsService.getStockFlow(orgId, days);
                setStockFlow(flowRes || []);
            } catch (error) {
                console.error("Failed to fetch stock flow", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStockFlow();
    }, [orgId, chartPeriod]);

    return (
        <Card className="h-full border-0 shadow-premium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Phân tích dòng hàng</CardTitle>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">
                        {chartPeriod === "day" ? "24h qua" : chartPeriod === "week" ? "7 ngày qua" : "30 ngày qua"}
                    </span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3 gap-1 shadow-sm hover:bg-muted/50 border-border/50 font-medium">
                                {chartPeriod === "day" ? "Hôm nay" : chartPeriod === "week" ? "Tuần này" : "Tháng này"}
                                <ChevronDownIcon className="w-3 h-3 text-muted-foreground/70" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setChartPeriod("day")}>Hôm nay</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChartPeriod("week")}>Tuần này</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChartPeriod("month")}>Tháng này</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full relative pt-2">
                    {/* Grid Lines (Optional - visual guide) */}
                    <div className="absolute inset-x-0 bottom-6 top-4 flex flex-col justify-between pointer-events-none">
                        {[1, 0.75, 0.5, 0.25, 0].map((tick, i) => (
                            <div key={i} className="w-full h-px bg-border/80 border-dashed" />
                        ))}
                    </div>

                    <div className="h-full flex items-end justify-between gap-2 md:gap-4 relative z-10">
                        {stockFlow.map((item, index) => {
                            const maxVal = 1200;
                            const inHeight = (item.inbound / maxVal) * 100;
                            const outHeight = (item.outbound / maxVal) * 100;

                            return (
                                <div key={index} className="flex flex-col items-center gap-3 flex-1 h-full justify-end group cursor-pointer relative">
                                    {/* Hover Tooltip */}
                                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none bg-popover/95 backdrop-blur-md shadow-xl border border-border/40 rounded-xl p-3 text-[10px] z-20 whitespace-nowrap min-w-[100px]">
                                        {/* Tooltip Arrow */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-4 border-transparent border-t-popover/95 drop-shadow-sm"></div>

                                        <div className="font-semibold mb-2 text-foreground text-center border-b border-border/30 pb-1">{item.day}</div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-3 text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-chart-1 shadow-[0_0_6px_var(--chart-1)]" />
                                                    <span>Nhập</span>
                                                </div>
                                                <span className="text-foreground font-mono font-medium">{loading ? "-" : item.inbound.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-chart-2 shadow-[0_0_6px_var(--chart-2)]" />
                                                    <span>Xuất</span>
                                                </div>
                                                <span className="text-foreground font-mono font-medium">{loading ? "-" : item.outbound.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-1 md:gap-1.5 items-end justify-center w-full h-full">
                                        {/* Inbound Bar */}
                                        <div
                                            className="w-2.5 md:w-5 bg-gradient-to-t from-chart-1/80 to-chart-1/60 rounded-t-lg shadow-sm transition-all duration-300 group-hover:from-chart-1 group-hover:to-chart-1 group-hover:shadow-md hover:scale-y-[1.02] origin-bottom"
                                            style={{ height: `${inHeight}%` }}
                                        />
                                        {/* Outbound Bar - Use Chart 2 (Rose) for Exports */}
                                        <div
                                            className="w-2.5 md:w-5 bg-gradient-to-t from-chart-2/80 to-chart-2/60 rounded-t-lg shadow-sm transition-all duration-300 group-hover:from-chart-2 group-hover:to-chart-2 group-hover:shadow-md hover:scale-y-[1.02] origin-bottom"
                                            style={{ height: `${outHeight}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium group-hover:text-foreground transition-colors">{item.day}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-br from-chart-1 to-chart-1/80 rounded-sm shadow-sm opacity-80" />
                        <span className="text-[10px] text-muted-foreground font-medium">Hàng nhập</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-br from-chart-2 to-chart-2/80 rounded-sm shadow-sm opacity-80" />
                        <span className="text-[10px] text-muted-foreground font-medium">Hàng xuất</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
