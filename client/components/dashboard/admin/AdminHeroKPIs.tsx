"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BanknotesIcon,
    UsersIcon,
    BuildingOfficeIcon,
    ExclamationTriangleIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon
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
        if (val >= 1000000000) {
            return (val / 1000000000).toFixed(2) + " Tỷ";
        }
        if (val >= 1000000) {
            return (val / 1000000).toFixed(0) + " Tr";
        }
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item: any = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    if (loading || !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="border-0 shadow-premium">
                        <CardContent className="p-6">
                            <div className="animate-pulse space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* MRR Card */}
            <motion.div variants={item}>
                <Card className="border-0 shadow-premium group hover:-translate-y-1 transition-transform duration-300">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-chart-1/10 text-chart-1">
                                    <BanknotesIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">MRR Hệ thống</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(data.mrr.value)}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-4 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className={`px-1.5 py-0.5 text-[11px] gap-1 border-0 ${data.mrr.trend.isPositive ? 'bg-chart-1/10 text-chart-1 hover:bg-chart-1/20' : 'bg-chart-2/10 text-chart-2 hover:bg-chart-2/20'}`}>
                                    {data.mrr.trend.isPositive ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                    {data.mrr.trend.value}%
                                </Badge>
                                <span className="text-xs text-slate-500">{data.mrr.label}</span>
                            </div>
                        </div>
                        <Link href="/dashboard/admin/revenue" className="block pt-3 text-xs font-semibold text-chart-1 group-hover:underline">
                            Xem báo cáo doanh thu →
                        </Link>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Organizations & Users Card */}
            <motion.div variants={item}>
                <Card className="border-0 shadow-premium group hover:-translate-y-1 transition-transform duration-300">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-chart-4/10 text-chart-4">
                                    <UsersIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Khách hàng / User</p>
                                    <div className="flex items-baseline gap-1">
                                        <h3 className="text-2xl font-bold text-slate-900">{data.organizationAndUsers.orgs}</h3>
                                        <span className="text-sm text-slate-500 font-medium">/ +{data.organizationAndUsers.newUsersThisWeek} {data.organizationAndUsers.label}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-4 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="px-1.5 py-0.5 text-[11px] gap-1 bg-chart-1/10 text-chart-1 hover:bg-chart-1/20 border-0">
                                    <ArrowTrendingUpIcon className="w-3 h-3" />
                                    {data.organizationAndUsers.trend.value}%
                                </Badge>
                                <span className="text-xs text-slate-500">{data.organizationAndUsers.label}</span>
                            </div>
                        </div>
                        <Link href="/dashboard/admin/organization" className="block pt-3 text-xs font-semibold text-chart-4 group-hover:underline">
                            Quản lý Tổ chức →
                        </Link>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Global Occupancy Card */}
            <motion.div variants={item}>
                <Card className="border-0 shadow-premium group hover:-translate-y-1 transition-transform duration-300">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-chart-5/10 text-chart-5">
                                    <BuildingOfficeIcon className="w-6 h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-500 truncate">Lấp đầy Hệ thống</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{data.globalOccupancy.rate}%</h3>
                                </div>
                            </div>
                        </div>
                        
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 mt-4 overflow-hidden">
                            <div className="bg-chart-5 h-1.5 rounded-full" style={{ width: `${data.globalOccupancy.rate}%` }}></div>
                        </div>

                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-[11px] text-slate-500">{data.globalOccupancy.usedSpace} / {data.globalOccupancy.totalSpace}</span>
                            <Badge variant="secondary" className="px-1 py-0 text-[9px] gap-0.5 bg-chart-1/10 text-chart-1 hover:bg-chart-1/20 border-0">
                                <ArrowTrendingUpIcon className="w-2.5 h-2.5" />
                                {data.globalOccupancy.trend.value}%
                            </Badge>
                        </div>
                        <Link href="/dashboard/admin/warehouses" className="block pt-3 text-xs font-semibold text-chart-5 group-hover:underline">
                            Chi tiết Kho bãi →
                        </Link>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Debt Alerts Card - Critical */}
            <motion.div variants={item}>
                <Card className="border border-chart-2/20 shadow-premium group hover:-translate-y-1 transition-transform duration-300 bg-gradient-to-br from-white to-chart-2/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="p-3 rounded-2xl bg-chart-2/10 text-chart-2 relative z-10">
                                        <ExclamationTriangleIcon className="w-6 h-6" />
                                    </div>
                                    {data.debtAlerts.count > 0 && (
                                        <div className="absolute inset-0 bg-chart-2/20 rounded-2xl animate-ping opacity-75"></div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Cảnh báo Công nợ</p>
                                    <div className="flex items-baseline gap-1">
                                        <h3 className="text-2xl font-bold text-chart-2">{formatCurrency(data.debtAlerts.totalAmount)}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pb-2 border-b border-chart-2/10">
                            <span className="text-xs font-semibold text-chart-2 flex items-center gap-1">
                                {data.debtAlerts.count} Hợp đồng quá hạn
                            </span>
                        </div>
                        <Link href="/dashboard/admin/contracts?status=OVERDUE" className="block pt-3 text-xs font-semibold text-chart-2 group-hover:underline flex items-center justify-between">
                            <span>Xử lý ngay</span>
                            <span className="w-5 h-5 rounded-full bg-chart-2/10 flex items-center justify-center group-hover:bg-chart-2 group-hover:text-white transition-colors">
                                →
                            </span>
                        </Link>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
