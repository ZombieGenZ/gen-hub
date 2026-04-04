"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminDashboardService } from "@/services/admin-dashboard/admin-dashboard.service";
import type { ActionableInboxData } from "@/services/admin-dashboard/admin-dashboard.types";
import { AdminQuickActionDrawer } from "@/components/dashboard/admin/AdminQuickActionDrawer";
import { motion } from "framer-motion";
import {
    CalendarDaysIcon,
    CheckBadgeIcon,
    CurrencyDollarIcon,
    BuildingOffice2Icon,
    ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

function EmptyState({ message }: { message: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 text-center"
        >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckBadgeIcon className="h-8 w-8 text-success" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Tuyệt vời!</h3>
            <p className="mx-auto max-w-[200px] text-xs text-slate-500">{message}</p>
        </motion.div>
    );
}

export function AdminActionableInbox() {
    const [data, setData] = useState<ActionableInboxData | null>(null);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<{ type: string; data: any } | null>(null);

    useEffect(() => {
        adminDashboardService
            .getActionableInbox()
            .then(setData)
            .catch((err) => console.error("AdminActionableInbox fetch error:", err))
            .finally(() => setLoading(false));
    }, []);

    const openDrawer = (type: string, itemData: any) => {
        setSelectedAction({ type, data: itemData });
        setDrawerOpen(true);
    };

    if (loading || !data) {
        return (
            <Card className="border-0 shadow-premium">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                        <span className="inline-block h-6 w-2 rounded-full bg-chart-1"></span>
                        Cần xử lý ngay
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4 animate-pulse">
                        <div className="h-10 w-full rounded-xl bg-slate-100" />
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 rounded-xl border border-slate-100 bg-slate-50" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-premium">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <span className="inline-block h-6 w-2 rounded-full bg-chart-1"></span>
                    Cần xử lý ngay
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                    Các yêu cầu đang chờ admin thao tác. Giải quyết để clear inbox!
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="tickets" className="w-full">
                    <div className="px-6">
                        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 md:grid-cols-4">
                            <TabsTrigger
                                value="tickets"
                                className="flex items-center gap-2 rounded-lg py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-chart-2 data-[state=active]:shadow-sm"
                            >
                                <ExclamationCircleIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Hỗ trợ (Tickets)</span>
                                {data.tickets.length > 0 && (
                                    <Badge className="hidden h-5 min-w-[20px] items-center justify-center border-0 bg-chart-2 px-1.5 text-white sm:flex">
                                        {data.tickets.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="orgUpdates"
                                className="flex items-center gap-2 rounded-lg py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-chart-3 data-[state=active]:shadow-sm"
                            >
                                <BuildingOffice2Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">Cập nhật Tổ chức</span>
                                {data.orgUpdates.length > 0 && (
                                    <Badge className="hidden h-5 min-w-[20px] items-center justify-center border-0 bg-chart-3 px-1.5 text-white sm:flex">
                                        {data.orgUpdates.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="refunds"
                                className="flex items-center gap-2 rounded-lg py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-chart-4 data-[state=active]:shadow-sm"
                            >
                                <CurrencyDollarIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Hoàn tiền</span>
                                {data.refunds.length > 0 && (
                                    <Badge className="hidden h-5 min-w-[20px] items-center justify-center border-0 bg-chart-4 px-1.5 text-white sm:flex">
                                        {data.refunds.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="visitBookings"
                                className="flex items-center gap-2 rounded-lg py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-chart-1 data-[state=active]:shadow-sm"
                            >
                                <CalendarDaysIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Lịch hẹn kho</span>
                                {data.visitBookings.length > 0 && (
                                    <Badge className="hidden h-5 min-w-[20px] items-center justify-center border-0 bg-chart-1 px-1.5 text-white sm:flex">
                                        {data.visitBookings.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-4">
                        <TabsContent value="tickets" className="mt-0 outline-none">
                            {data.tickets.length === 0 ? (
                                <EmptyState message="Không có ticket (hỗ trợ) nào đang mở." />
                            ) : (
                                <div className="space-y-3">
                                    {data.tickets.map((t, idx) => (
                                        <motion.div
                                            key={t.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 transition-all hover:border-chart-2/30 hover:bg-slate-50 sm:flex-row sm:items-center"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={`rounded border px-1.5 py-0 text-[10px] font-semibold ${
                                                            t.priority === "URGENT"
                                                                ? "border-chart-2/50 bg-chart-2/5 text-chart-2"
                                                                : "border-chart-3/50 bg-chart-3/5 text-chart-3"
                                                        }`}
                                                    >
                                                        {t.priority}
                                                    </Badge>
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {t.id} • {t.time}
                                                    </span>
                                                </div>
                                                <h4 className="mb-1 truncate text-sm font-bold text-slate-900">{t.title}</h4>
                                                <p className="text-xs text-slate-500">Nguồn: {t.org}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => openDrawer("TICKET", t)}
                                                className="border border-slate-200 bg-white px-4 text-slate-700 shadow-sm transition-all hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100"
                                            >
                                                Xử lý nhanh
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="orgUpdates" className="mt-0 outline-none">
                            {data.orgUpdates.length === 0 ? (
                                <EmptyState message="Không có yêu cầu cập nhật thông tin tổ chức nào." />
                            ) : (
                                <div className="space-y-3">
                                    {data.orgUpdates.map((t, idx) => (
                                        <motion.div
                                            key={t.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 transition-all hover:border-chart-3/30 hover:bg-slate-50 sm:flex-row sm:items-center"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {t.id} • {t.time}
                                                    </span>
                                                </div>
                                                <h4 className="mb-1 truncate text-sm font-bold text-slate-900">{t.type}</h4>
                                                <p className="text-xs text-slate-500">Tổ chức: {t.org}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => openDrawer("ORG_UPDATE", t)}
                                                className="border border-slate-200 bg-white px-4 text-slate-700 shadow-sm transition-all hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100"
                                            >
                                                Xử lý nhanh
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="refunds" className="mt-0 outline-none">
                            {data.refunds.length === 0 ? (
                                <EmptyState message="Không có yêu cầu hoàn tiền nào cần đối soát." />
                            ) : (
                                <div className="space-y-3">
                                    {data.refunds.map((t, idx) => (
                                        <motion.div
                                            key={t.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 transition-all hover:border-chart-4/30 hover:bg-slate-50 sm:flex-row sm:items-center"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {t.id} • {t.time}
                                                    </span>
                                                </div>
                                                <h4 className="mb-1 truncate text-sm font-bold text-chart-4">
                                                    {new Intl.NumberFormat("vi-VN", {
                                                        style: "currency",
                                                        currency: "VND",
                                                    }).format(t.amount)}
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    Tổ chức: {t.org} - Lý do: {t.reason}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => openDrawer("REFUND", t)}
                                                className="border border-slate-200 bg-white px-4 text-slate-700 shadow-sm transition-all hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100"
                                            >
                                                Xử lý nhanh
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="visitBookings" className="mt-0 outline-none">
                            {data.visitBookings.length === 0 ? (
                                <EmptyState message="Bạn đã duyệt hết lịch hẹn thăm kho hôm nay." />
                            ) : (
                                <div className="space-y-3">
                                    {data.visitBookings.map((t, idx) => (
                                        <motion.div
                                            key={t.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 transition-all hover:border-chart-1/30 hover:bg-slate-50 sm:flex-row sm:items-center"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="rounded border-chart-1/50 bg-chart-1/5 px-1.5 py-0 text-[10px] font-semibold text-chart-1"
                                                    >
                                                        Lịch hẹn thăm kho
                                                    </Badge>
                                                    <span className="text-xs font-medium text-slate-500">{t.time}</span>
                                                </div>
                                                <h4 className="mb-1 truncate text-sm font-bold text-slate-900">
                                                    {t.customerName} ({t.org}) hẹn đến {t.warehouse}
                                                </h4>
                                                <p className="text-xs font-medium text-chart-1 text-slate-500">
                                                    Dự kiến: {t.date}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => openDrawer("VISIT", t)}
                                                className="border border-slate-200 bg-white px-4 text-slate-700 shadow-sm transition-all hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100"
                                            >
                                                Xử lý nhanh
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>

            <AdminQuickActionDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                actionData={selectedAction}
            />
        </Card>
    );
}
