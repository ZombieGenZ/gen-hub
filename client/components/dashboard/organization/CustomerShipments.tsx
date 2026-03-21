"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowUpRightIcon, ArrowDownLeftIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { orgAnalyticsService } from "@/services/org-analytics/org-analytics.service";

interface CustomerShipmentsProps {
    orgId: string;
}

export function CustomerShipments({ orgId }: CustomerShipmentsProps) {
    const [shipments, setShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orgId) return;

        const fetchShipments = async () => {
            setLoading(true);
            try {
                const shipmentsRes = await orgAnalyticsService.getRecentShipments(orgId, 5);
                setShipments(shipmentsRes || []);
            } catch (error) {
                console.error("Failed to fetch shipments", error);
            } finally {
                setLoading(false);
            }
        };

        fetchShipments();
    }, [orgId]);

    return (
        <Card className="h-full border-0 shadow-premium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Tiến độ vận đơn</CardTitle>
                <Link href="/warehouse-3d" className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium">
                    Xem chi tiết <ArrowUpRightIcon className="w-2.5 h-2.5" />
                </Link>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-muted-foreground uppercase bg-transparent border-b border-border/50">
                            <tr>
                                <th className="px-3 py-3 font-medium">Mã vận đơn</th>
                                <th className="px-3 py-3 font-medium">Loại</th>
                                <th className="px-3 py-3 font-medium">Đối tác</th>
                                <th className="px-3 py-3 font-medium">Thời gian</th>
                                <th className="px-3 py-3 font-medium text-right">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-muted-foreground">Đang tải...</td>
                                </tr>
                            ) : shipments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-muted-foreground">Không có dữ liệu</td>
                                </tr>
                            ) : shipments.map((ship, i) => (
                                <tr key={i} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center bg-muted/60 group-hover:bg-background shadow-none group-hover:shadow-sm transition-all border border-transparent group-hover:border-border/50",
                                                ship.type === "Nhập" ? "text-chart-1" : "text-chart-2"
                                            )}>
                                                {ship.type === "Nhập"
                                                    ? <ArrowDownLeftIcon className="w-3 h-3" />
                                                    : <ArrowUpRightIcon className="w-3 h-3" />
                                                }
                                            </div>
                                            <span className="font-semibold text-foreground/90 text-xs">{ship.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 text-muted-foreground text-xs">{ship.type}</td>
                                    <td className="px-2 py-1.5 font-medium text-foreground/80 text-xs">{ship.partner}</td>
                                    <td className="px-2 py-1.5 text-muted-foreground/70 text-[10px]">{ship.date}</td>
                                    <td className="px-2 py-1.5 text-right">
                                        <span className={cn(
                                            "text-[9px] px-1.5 py-0.5 rounded-full font-medium border",
                                            ship.status === "Hoàn tất" || ship.status === "Đã đến" ? "bg-chart-1/10 text-chart-1 border-chart-1/20" :
                                                ship.status === "Đang xử lý" ? "bg-chart-4/10 text-chart-4 border-chart-4/20" :
                                                    ship.status === "Delayed" ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-chart-2/10 text-chart-2 border-chart-2/20"
                                        )}>
                                            {ship.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
