"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EllipsisHorizontalIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Package, AlertCircle, Calendar } from "lucide-react";
import { orgAnalyticsService } from "@/services/org-analytics/org-analytics.service";

const PAGE_SIZE = 3;

interface CustomerStockAlertsProps {
    orgId: string;
}

export function CustomerStockAlerts({ orgId }: CustomerStockAlertsProps) {
    const [stockAlerts, setStockAlerts] = useState<{ lowStock: any[], expired: any[] }>({ lowStock: [], expired: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("low_stock");
    const [lowStockPage, setLowStockPage] = useState(1);
    const [expiredPage, setExpiredPage] = useState(1);

    useEffect(() => {
        if (!orgId) return;

        const fetchStockAlerts = async () => {
            setLoading(true);
            try {
                const alertsRes = await orgAnalyticsService.getStockAlerts(orgId);
                setStockAlerts(alertsRes || { lowStock: [], expired: [] });
            } catch (error) {
                console.error("Failed to fetch stock alerts", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStockAlerts();
    }, [orgId]);

    const lowStockItems = stockAlerts.lowStock.map(item => ({ ...item, icon: Package }));
    const expiredItems = stockAlerts.expired.map(item => ({ ...item, icon: AlertCircle }));

    const lowStockTotalPages = Math.max(1, Math.ceil(lowStockItems.length / PAGE_SIZE));
    const expiredTotalPages = Math.max(1, Math.ceil(expiredItems.length / PAGE_SIZE));

    const pagedLowStock = lowStockItems.slice((lowStockPage - 1) * PAGE_SIZE, lowStockPage * PAGE_SIZE);
    const pagedExpired = expiredItems.slice((expiredPage - 1) * PAGE_SIZE, expiredPage * PAGE_SIZE);

    return (
        <Card className="h-full border-0 shadow-premium flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
                <CardTitle className="text-base font-semibold">Cảnh báo tồn kho</CardTitle>
                <EllipsisHorizontalIcon className="w-4 h-4 text-muted-foreground/70 cursor-pointer hover:text-foreground transition-colors" />
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1 min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
                    <div className="px-3 pt-3 shrink-0">
                        <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-muted/50 rounded-lg">
                            <TabsTrigger
                                value="low_stock"
                                className="text-[10px] font-medium data-[state=active]:bg-background data-[state=active]:text-chart-2 data-[state=active]:shadow-sm transition-all rounded-md py-1"
                            >
                                Sắp hết hàng ({loading ? "-" : lowStockItems.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="expired"
                                className="text-[10px] font-medium data-[state=active]:bg-background data-[state=active]:text-chart-3 data-[state=active]:shadow-sm transition-all rounded-md py-1"
                            >
                                Hết hạn ({loading ? "-" : expiredItems.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-3 flex-1 min-h-0 overflow-hidden">
                        <TabsContent value="low_stock" className="mt-0 space-y-3 h-full">
                            {pagedLowStock.map((item, i) => (
                                <div key={i} className="flex gap-3 items-start group">
                                    <div className="w-8 h-8 rounded-lg bg-chart-2/10 flex items-center justify-center shrink-0 text-chart-2 mt-0.5 group-hover:bg-chart-2/20 transition-colors">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground/90">{item.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                {item.left} / {item.min} {item.unit}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <Progress value={(item.left / item.min) * 100} className="h-1.5 bg-chart-2/10" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>

                        <TabsContent value="expired" className="mt-0 space-y-3 h-full">
                            {pagedExpired.map((item, i) => (
                                <div key={i} className="flex gap-3 items-center group p-1 rounded-lg hover:bg-muted/30 transition-colors -mx-1">
                                    <div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center shrink-0 text-chart-3 group-hover:bg-chart-3/20 transition-colors">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground/90">{item.name}</span>
                                        <span className="text-[10px] font-bold text-chart-3 flex items-center gap-1 bg-chart-3/5 px-2 py-1 rounded-md border border-chart-3/10">
                                            <Calendar className="w-3 h-3" />
                                            {item.expiry}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>
                    </div>

                    {/* Pagination - always fixed at bottom */}
                    <div className="px-3 pb-3 pt-2 border-t border-border/40 shrink-0">
                        {activeTab === "low_stock" ? (
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">
                                    {lowStockPage} / {lowStockTotalPages}
                                </span>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={lowStockPage === 1}
                                        onClick={() => setLowStockPage(p => p - 1)}
                                    >
                                        <ChevronLeftIcon className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={lowStockPage === lowStockTotalPages}
                                        onClick={() => setLowStockPage(p => p + 1)}
                                    >
                                        <ChevronRightIcon className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">
                                    {expiredPage} / {expiredTotalPages}
                                </span>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={expiredPage === 1}
                                        onClick={() => setExpiredPage(p => p - 1)}
                                    >
                                        <ChevronLeftIcon className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={expiredPage === expiredTotalPages}
                                        onClick={() => setExpiredPage(p => p + 1)}
                                    >
                                        <ChevronRightIcon className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}
