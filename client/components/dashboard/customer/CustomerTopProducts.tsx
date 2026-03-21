"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { orgAnalyticsService } from "@/services/org-analytics/org-analytics.service";

interface CustomerTopProductsProps {
    orgId: string;
}

export function CustomerTopProducts({ orgId }: CustomerTopProductsProps) {
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orgId) return;
        
        const fetchTopProducts = async () => {
            setLoading(true);
            try {
                const productsRes = await orgAnalyticsService.getTopProducts(orgId, 5);
                setTopProducts(productsRes || []);
            } catch (error) {
                console.error("Failed to fetch top products", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTopProducts();
    }, [orgId]);

    return (
        <Card className="h-full border-0 shadow-premium">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top sản phẩm xuất nhập</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-center gap-2 h-[200px]">
                    {/* Chart Section */}
                    <div className="flex-1 h-full w-full relative min-h-[160px]">
                        {/* Center Label - Moved Top for z-index layering */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
                            <span className="text-xl font-bold text-foreground leading-none block">
                                {loading ? "-" : topProducts.reduce((acc, curr) => acc + (curr.count || 0), 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Tổng số</span>
                        </div>

                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={topProducts}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={85}
                                    paddingAngle={4}
                                    dataKey="count"
                                    nameKey="name"
                                    cornerRadius={4}
                                >
                                    {topProducts.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={`var(--chart-${(index % 5) + 1})`}
                                            strokeWidth={0}
                                            className="hover:opacity-80 transition-opacity cursor-pointer"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-popover/95 backdrop-blur-md shadow-xl border border-border/40 rounded-xl p-3 text-xs z-50">
                                                    <div className="font-semibold mb-1 text-foreground">{data.name}</div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <span className="font-mono font-medium text-foreground text-sm">{data.count}</span>
                                                        <span>{data.unit}</span>
                                                    </div>
                                                    <div className={cn("text-[10px] flex items-center gap-1 mt-1", data.trend === "up" ? "text-chart-1" : "text-chart-2")}>
                                                        {data.trend === "up" ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                                        <span>{data.trend === "up" ? "Tăng" : "Giảm"}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend Section */}
                    <div className="w-full md:w-2/5 flex flex-col justify-center gap-2 pr-2">
                        <div className="space-y-2">
                            {topProducts.slice(0, 4).map((entry, index) => (
                                <div key={`legend-${index}`} className="flex items-center justify-between text-[9.5px] group cursor-pointer hover:bg-muted/50 p-1 rounded-lg -mx-1 transition-colors">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: `var(--chart-${(index % 5) + 1})` }} />
                                        <span className="truncate font-medium text-muted-foreground group-hover:text-foreground transition-colors max-w-[80px]" title={entry.name}>
                                            {entry.name}
                                        </span>
                                    </div>
                                    <span className="font-mono font-semibold text-foreground shrink-0">{entry.count}</span>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" size="sm" className="w-full text-[10px] text-muted-foreground h-6 mt-0.5 hover:bg-muted/50">
                            Xem chi tiết
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
