"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminDashboardService } from "@/services/admin-dashboard/admin-dashboard.service";
import type { WarehouseHeatmapData } from "@/services/admin-dashboard/admin-dashboard.types";
import { TrophyIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/outline";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function AdminWarehouseHeatmap() {
    const [data, setData] = useState<WarehouseHeatmapData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminDashboardService
            .getWarehouseHeatmap()
            .then(setData)
            .catch((err) => console.error("AdminWarehouseHeatmap fetch error:", err))
            .finally(() => setLoading(false));
    }, []);

    const formatCurrency = (val: number) => {
        return (val / 1000000).toFixed(0) + " Tr";
    };

    if (loading || !data) {
        return (
            <Card className="border-0 shadow-premium h-full">
                <CardHeader className="pb-4 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-900">Bản đồ Nhiệt Kho bãi</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="animate-pulse space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between">
                                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                                    <div className="h-3 bg-slate-200 rounded w-12" />
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-premium h-full">
            <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                    <span>Bản đồ Nhiệt Kho bãi</span>
                    <Link href="/dashboard/admin/warehouses" className="text-xs font-semibold text-chart-1 hover:underline">
                        Quản lý toàn bộ kho →
                    </Link>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    
                    {/* Top Revenue Warehouses */}
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <TrophyIcon className="w-5 h-5 text-amber-500" />
                            <h3 className="text-sm font-bold text-slate-900">Top Doanh Thu & Lấp Đầy</h3>
                        </div>
                        <div className="space-y-4">
                            {data.topRevenue.map((warehouse, idx) => (
                                <div key={warehouse.id} className="group">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-400 w-4">{idx + 1}.</span>
                                            <Link href={`/dashboard/admin/warehouses/${warehouse.id}`} className="text-sm font-semibold text-slate-800 group-hover:text-chart-1 transition-colors truncate max-w-[150px] sm:max-w-xs">
                                                {warehouse.name}
                                            </Link>
                                        </div>
                                        <span className="text-xs font-bold text-slate-900">{formatCurrency(warehouse.revenue)}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <Progress value={warehouse.occupancy} className="h-1.5 [&>div]:bg-chart-1 bg-slate-100" />
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-500 w-8 text-right">{warehouse.occupancy}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Most Empty Warehouses */}
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ArrowTrendingDownIcon className="w-5 h-5 text-chart-3" />
                            <h3 className="text-sm font-bold text-slate-900">Trống Nhiều Nhất (Cần push)</h3>
                        </div>
                        <div className="space-y-4">
                            {data.mostEmpty.map((warehouse, idx) => (
                                <div key={warehouse.id} className="group">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-400 w-4">{idx + 1}.</span>
                                            <Link href={`/dashboard/admin/warehouses/${warehouse.id}`} className="text-sm font-semibold text-slate-800 group-hover:text-chart-3 transition-colors truncate max-w-[150px] sm:max-w-xs">
                                                {warehouse.name}
                                            </Link>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500">{formatCurrency(warehouse.revenue)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <Progress value={warehouse.occupancy} className="h-1.5 [&>div]:bg-chart-3 bg-slate-100" />
                                        </div>
                                        <span className="text-[10px] font-semibold text-chart-3 w-8 text-right">{warehouse.occupancy}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 pt-4 border-t border-slate-100">
                             <Button variant="outline" className="w-full text-xs h-8 border-chart-3 border-dashed hover:bg-chart-3/5 text-chart-3 font-semibold">
                                + Tạo mã Coupon khuyến mãi
                             </Button>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
