"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminDashboardService } from "@/services/admin-dashboard/admin-dashboard.service";
import type { ActionableInboxData } from "@/services/admin-dashboard/admin-dashboard.types";
import { AdminQuickActionDrawer } from "@/components/dashboard/admin/AdminQuickActionDrawer";
import { motion } from "framer-motion";
import { 
    ExclamationCircleIcon,
    BuildingOffice2Icon,
    CurrencyDollarIcon,
    CalendarDaysIcon,
    CheckBadgeIcon
} from "@heroicons/react/24/outline";

export function AdminActionableInbox() {
    const [data, setData] = useState<ActionableInboxData | null>(null);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<{ type: string, data: any } | null>(null);

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

    const EmptyState = ({ message }: { message: string }) => (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 text-center"
        >
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                <CheckBadgeIcon className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Tuyệt vời!</h3>
            <p className="text-xs text-slate-500 max-w-[200px] mx-auto">{message}</p>
        </motion.div>
    );

    if (loading || !data) {
        return (
            <Card className="border-0 shadow-premium">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                        <span className="w-2 h-6 bg-chart-1 rounded-full inline-block"></span>
                        Cần xử lý ngay
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-10 bg-slate-100 rounded-xl w-full" />
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-slate-50 rounded-xl border border-slate-100" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-premium">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                    <span className="w-2 h-6 bg-chart-1 rounded-full inline-block"></span>
                    Cần xử lý ngay
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                    Các yêu cầu đang chờ admin thao tác. Giải quyết để clear inbox!
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="tickets" className="w-full">
                    <div className="px-6">
                        <TabsList className="w-full h-auto p-1 bg-slate-100 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-1">
                            <TabsTrigger value="tickets" className="text-xs font-semibold py-2.5 data-[state=active]:bg-white data-[state=active]:text-chart-2 data-[state=active]:shadow-sm rounded-lg flex items-center gap-2">
                                <ExclamationCircleIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Hỗ trợ (Tickets)</span>
                                {data.tickets.length > 0 && <Badge className="bg-chart-2 text-white border-0 px-1.5 min-w-[20px] h-5 hidden sm:flex items-center justify-center">{data.tickets.length}</Badge>}
                            </TabsTrigger>
                            <TabsTrigger value="orgUpdates" className="text-xs font-semibold py-2.5 data-[state=active]:bg-white data-[state=active]:text-chart-3 data-[state=active]:shadow-sm rounded-lg flex items-center gap-2">
                                <BuildingOffice2Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">Cập nhật Tổ chức</span>
                                {data.orgUpdates.length > 0 && <Badge className="bg-chart-3 text-white border-0 px-1.5 min-w-[20px] h-5 hidden sm:flex items-center justify-center">{data.orgUpdates.length}</Badge>}
                            </TabsTrigger>
                            <TabsTrigger value="refunds" className="text-xs font-semibold py-2.5 data-[state=active]:bg-white data-[state=active]:text-chart-4 data-[state=active]:shadow-sm rounded-lg flex items-center gap-2">
                                <CurrencyDollarIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Hoàn tiền</span>
                                {data.refunds.length > 0 && <Badge className="bg-chart-4 text-white border-0 px-1.5 min-w-[20px] h-5 hidden sm:flex items-center justify-center">{data.refunds.length}</Badge>}
                            </TabsTrigger>
                            <TabsTrigger value="visitBookings" className="text-xs font-semibold py-2.5 data-[state=active]:bg-white data-[state=active]:text-chart-1 data-[state=active]:shadow-sm rounded-lg flex items-center gap-2">
                                <CalendarDaysIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Lịch hẹn kho</span>
                                {data.visitBookings.length > 0 && <Badge className="bg-chart-1 text-white border-0 px-1.5 min-w-[20px] h-5 hidden sm:flex items-center justify-center">{data.visitBookings.length}</Badge>}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-6">
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
                                                className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-chart-2/30 hover:bg-slate-50 transition-all group"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <Badge variant="outline" className={`text-[10px] font-semibold border px-1.5 py-0 rounded ${t.priority === 'URGENT' ? 'border-chart-2/50 text-chart-2 bg-chart-2/5' : 'border-chart-3/50 text-chart-3 bg-chart-3/5'}`}>
                                                            {t.priority}
                                                        </Badge>
                                                        <span className="text-xs font-medium text-slate-500">{t.id} • {t.time}</span>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-900 truncate mb-1">{t.title}</h4>
                                                    <p className="text-xs text-slate-500">Nguồn: {t.org}</p>
                                                </div>
                                                <Button size="sm" onClick={() => openDrawer('TICKET', t)} className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all sm:opacity-0 sm:group-hover:opacity-100 px-4">
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
                                                className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-chart-3/30 hover:bg-slate-50 transition-all group"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="text-xs font-medium text-slate-500">{t.id} • {t.time}</span>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-900 truncate mb-1">{t.type}</h4>
                                                    <p className="text-xs text-slate-500">Tổ chức: {t.org}</p>
                                                </div>
                                                <Button size="sm" onClick={() => openDrawer('ORG_UPDATE', t)} className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all sm:opacity-0 sm:group-hover:opacity-100 px-4">
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
                                                className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-chart-4/30 hover:bg-slate-50 transition-all group"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="text-xs font-medium text-slate-500">{t.id} • {t.time}</span>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-chart-4 truncate mb-1">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.amount)}
                                                    </h4>
                                                    <p className="text-xs text-slate-500">Tổ chức: {t.org} - Lý do: {t.reason}</p>
                                                </div>
                                                <Button size="sm" onClick={() => openDrawer('REFUND', t)} className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all sm:opacity-0 sm:group-hover:opacity-100 px-4">
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
                                                className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-chart-1/30 hover:bg-slate-50 transition-all group"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <Badge variant="outline" className="text-[10px] font-semibold border-chart-1/50 text-chart-1 bg-chart-1/5 px-1.5 py-0 rounded">
                                                            Lịch hẹn thăm kho
                                                        </Badge>
                                                        <span className="text-xs font-medium text-slate-500">{t.time}</span>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-900 truncate mb-1">
                                                        {t.customerName} ({t.org}) hẹn đến {t.warehouse}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 font-medium text-chart-1">Dự kiến: {t.date}</p>
                                                </div>
                                                <Button size="sm" onClick={() => openDrawer('VISIT', t)} className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all sm:opacity-0 sm:group-hover:opacity-100 px-4">
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

            {/* Quick Action Drawer Component */}
            <AdminQuickActionDrawer 
                isOpen={drawerOpen} 
                onClose={() => setDrawerOpen(false)} 
                actionData={selectedAction} 
            />
        </Card>
    );
}
