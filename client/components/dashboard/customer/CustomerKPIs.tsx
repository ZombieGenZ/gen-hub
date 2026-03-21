"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import { ClockIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { orgAnalyticsService } from "@/services/org-analytics/org-analytics.service";

interface CustomerKPIsProps {
    orgId: string;
}

export function CustomerKPIs({ orgId }: CustomerKPIsProps) {
    const [stats, setStats] = useState({
        totalStock: 0,
        totalStockTrend: { value: "0%", direction: "up", label: "" },
        outboundOrders: 0,
        outboundOrdersTrend: { value: "0%", direction: "up", label: "" },
        inboundShipments: 0,
        inboundShipmentsTrend: { value: "0%", direction: "up", label: "" },
        activeContracts: 0,
        expiringContracts: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orgId) return;
        setLoading(true);

        const fetchKpis = async () => {
            try {
                const overviewRes = await orgAnalyticsService.getOverview(orgId);
                setStats({
                    totalStock: overviewRes.totalStock || 0,
                    totalStockTrend: overviewRes.totalStockTrend || { value: "0%", direction: "up", label: "" },
                    outboundOrders: overviewRes.outboundOrders || 0,
                    outboundOrdersTrend: overviewRes.outboundOrdersTrend || { value: "0%", direction: "up", label: "" },
                    inboundShipments: overviewRes.inboundShipments || 0,
                    inboundShipmentsTrend: overviewRes.inboundShipmentsTrend || { value: "0%", direction: "up", label: "" },
                    activeContracts: overviewRes.activeContracts || 0,
                    expiringContracts: overviewRes.expiringContracts || 0
                });
            } catch (error) {
                console.error("Failed to fetch Customer KPIs", error);
            } finally {
                setLoading(false);
            }
        };

        fetchKpis();
    }, [orgId]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Stock */}
            <Card className="border-0 shadow-premium">
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-chart-5" />
                        <span className="text-sm font-medium text-muted-foreground">Tổng tồn kho</span>
                    </div>
                    <div className="text-3xl font-bold text-foreground">{loading ? "-" : stats.totalStock.toLocaleString()}</div>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className={cn(
                            "px-1.5 py-0.5 text-[10px] gap-1",
                            stats.totalStockTrend.direction === "up" ? "bg-chart-1/10 text-chart-1 hover:bg-chart-1/20" : "bg-chart-2/10 text-chart-2 hover:bg-chart-2/20"
                        )}>
                            {stats.totalStockTrend.direction === "up" ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                            {stats.totalStockTrend.value}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{stats.totalStockTrend.label}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Outbound Orders */}
            <Card className="border-0 shadow-premium">
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-chart-1" />
                        <span className="text-sm font-medium text-muted-foreground">Đơn xuất hàng</span>
                    </div>
                    <div className="text-3xl font-bold text-foreground">{loading ? "-" : stats.outboundOrders.toLocaleString()}</div>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className={cn(
                            "px-1.5 py-0.5 text-[10px] gap-1",
                            stats.outboundOrdersTrend.direction === "up" ? "bg-chart-1/10 text-chart-1 hover:bg-chart-1/20" : "bg-chart-2/10 text-chart-2 hover:bg-chart-2/20"
                        )}>
                            {stats.outboundOrdersTrend.direction === "up" ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                            {stats.outboundOrdersTrend.value}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{stats.outboundOrdersTrend.label}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Inbound Shipments */}
            <Card className="border-0 shadow-premium">
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-chart-4" />
                        <span className="text-sm font-medium text-muted-foreground">Đơn nhập hàng</span>
                    </div>
                    <div className="text-3xl font-bold text-foreground">{loading ? "-" : stats.inboundShipments.toLocaleString()}</div>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className={cn(
                            "px-1.5 py-0.5 text-[10px] gap-1",
                            stats.inboundShipmentsTrend.direction === "up" ? "bg-chart-1/10 text-chart-1 hover:bg-chart-1/20" : "bg-chart-2/10 text-chart-2 hover:bg-chart-2/20"
                        )}>
                            {stats.inboundShipmentsTrend.direction === "up" ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                            {stats.inboundShipmentsTrend.value}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{stats.inboundShipmentsTrend.label}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Active Contracts */}
            <Card className="border-0 shadow-premium">
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-chart-3" />
                        <span className="text-sm font-medium text-muted-foreground">Hợp đồng đang thuê</span>
                    </div>
                    <div className="text-3xl font-bold text-foreground">{loading ? "-" : stats.activeContracts}</div>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="bg-chart-3/10 text-chart-3 hover:bg-chart-3/20 px-1.5 py-0.5 text-[10px] gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {stats.expiringContracts}
                        </Badge>
                        <span className="text-xs text-muted-foreground">sắp hết hạn</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
