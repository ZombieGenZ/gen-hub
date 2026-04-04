"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    BanknotesIcon,
    UsersIcon,
    BuildingOfficeIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import { adminDashboardService } from "@/services/admin-dashboard/admin-dashboard.service";
import type { HeroKpiData } from "@/services/admin-dashboard/admin-dashboard.types";
import { motion } from "framer-motion";
import Link from "next/link";

export function AdminHeroKPIs() {
    const [data, setData] = useState<HeroKpiData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminDashboardService
            .getHeroKpis()
            .then(setData)
            .catch((err) => console.error("AdminHeroKPIs fetch error:", err))
            .finally(() => setLoading(false));
    }, []);

    const formatCurrency = (val: number) => {
        if (val >= 1_000_000_000) {
            return (val / 1_000_000_000).toFixed(2) + " Tỷ";
        }
        if (val >= 1_000_000) {
            return (val / 1_000_000).toFixed(0) + " Tr";
        }
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
        },
    };

    const item: any = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
    };

    if (loading || !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="border-0 shadow-premium">
                        <CardContent className="p-4">
                            <div className="animate-pulse space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-200 rounded-2xl" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-3 bg-slate-200 rounded w-2/3" />
                                        <div className="h-6 bg-slate-200 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="h-3 bg-slate-100 rounded w-full" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Tổng Kho */}
            <motion.div variants={item}>
                <Card className="border-0 shadow-premium group hover:-translate-y-1 transition-transform duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 rounded-2xl bg-chart-5/10 text-chart-5">
                                    <BuildingOfficeIcon className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-medium text-slate-500">Tổng Kho</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">
                                {data.totalWarehouses.toLocaleString("vi-VN")}
                            </h3>
                        </div>
                        <div className="pb-1.5 border-b border-slate-100">
                            <span className="text-xs text-slate-400">Kho đang hoạt động trong hệ thống</span>
                        </div>
                        <Link href="/dashboard/admin/warehouses" className="block pt-2 text-xs font-semibold text-chart-5 group-hover:underline">
                            Quản lý Kho →
                        </Link>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Đơn Chờ Duyệt */}
            <motion.div variants={item}>
                <Card className="border-0 shadow-premium group hover:-translate-y-1 transition-transform duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2.5">
                                <div className="relative">
                                    <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-600 relative z-10">
                                        <ClockIcon className="w-5 h-5" />
                                    </div>
                                    {data.pendingApprovals > 0 && (
                                        <div className="absolute inset-0 bg-amber-200 rounded-2xl animate-ping opacity-60" />
                                    )}
                                </div>
                                <p className="text-xs font-medium text-slate-500">Đơn Chờ Duyệt</p>
                            </div>
                            <h3 className="text-2xl font-bold text-amber-600">
                                {data.pendingApprovals.toLocaleString("vi-VN")}
                            </h3>
                        </div>
                        <div className="pb-1.5 border-b border-slate-100">
                            <span className="text-xs text-slate-400">Hợp đồng · Tư vấn · Cập nhật · Lịch hẹn</span>
                        </div>
                        <Link href="/dashboard/admin/approval" className="block pt-2 text-xs font-semibold text-amber-600 group-hover:underline">
                            Xem & Xử lý →
                        </Link>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Khách Hàng */}
            <motion.div variants={item}>
                <Card className="border-0 shadow-premium group hover:-translate-y-1 transition-transform duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 rounded-2xl bg-chart-4/10 text-chart-4">
                                    <UsersIcon className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-medium text-slate-500">Khách Hàng</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">
                                {data.totalCustomers.toLocaleString("vi-VN")}
                            </h3>
                        </div>
                        <div className="pb-1.5 border-b border-slate-100">
                            <span className="text-xs text-slate-400">Tổng tài khoản đã đăng ký</span>
                        </div>
                        <Link href="/dashboard/admin/users" className="block pt-2 text-xs font-semibold text-chart-4 group-hover:underline">
                            Quản lý Người dùng →
                        </Link>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Doanh Thu */}
            <motion.div variants={item}>
                <Card className="border-0 shadow-premium group hover:-translate-y-1 transition-transform duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 rounded-2xl bg-chart-1/10 text-chart-1">
                                    <BanknotesIcon className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-medium text-slate-500">Doanh Thu Tháng Này</p>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">
                                {formatCurrency(data.monthlyRevenue)}
                            </h3>
                        </div>
                        <div className="pb-1.5 border-b border-slate-100">
                            <span className="text-xs text-slate-400">Giao dịch đã thanh toán trong tháng</span>
                        </div>
                        <Link href="/dashboard/admin/revenue" className="block pt-2 text-xs font-semibold text-chart-1 group-hover:underline">
                            Xem Báo cáo Doanh thu →
                        </Link>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
