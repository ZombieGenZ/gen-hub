"use client";

import React from "react";
import { DashboardHeader } from "@/components/layouts/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import {
    Users,
    Warehouse,
    FileText,
    TrendingUp,
    Activity,
    Package,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
// ... (rest of file)

export default function DashboardPage() {
    return (
        <div className="flex-1 overflow-auto bg-slate-50/50">
            <DashboardHeader />

            <main className="p-4 md:p-8 space-y-8">
                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Chào mừng trở lại, Admin! 👋</h1>
                        <p className="text-slate-500 mt-1">Dưới đây là tóm tắt hoạt động của hệ thống ngày hôm nay.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                            Xuất báo cáo
                        </button>
                        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-all shadow-md shadow-primary/20">
                            + Tạo mới
                        </button>
                    </div>
                </div>

                {/* Stat Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <StatCard
                        title="Tổng số Kho"
                        value="24"
                        icon={Warehouse}
                        trend={{ value: 2, isPositive: true }}
                        variant="emerald"
                    />
                    <StatCard
                        title="Đơn thuê chờ duyệt"
                        value="18"
                        icon={FileText}
                        trend={{ value: 5, isPositive: true }}
                        variant="blue"
                    />
                    <StatCard
                        title="Khách hàng"
                        value="156"
                        icon={Users}
                        trend={{ value: 12, isPositive: true }}
                        variant="emerald" // Using emerald/green again or mix
                    />
                    <StatCard
                        title="Doanh thu tháng"
                        value="2.4 tỷ"
                        icon={TrendingUp}
                        trend={{ value: 8, isPositive: true }}
                        variant="amber"
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Activity Feed / Placeholder for Charts */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-primary" />
                                    Biểu đồ hoạt động
                                </h2>
                                <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none">
                                    <option>7 ngày qua</option>
                                    <option>30 ngày qua</option>
                                </select>
                            </div>
                            <div className="h-[300px] w-full bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-300">
                                <p className="text-slate-400 text-sm italic">Biểu đồ sẽ hiển thị ở đây (Cần cài đặt Recharts)</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-primary" />
                                    Kho gần đây
                                </h2>
                                <Link href="/dashboard/admin/warehouses" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                                    Xem tất cả <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-primary font-bold">
                                                W{i}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">Warehouse Complex {i}</p>
                                                <p className="text-xs text-slate-500">Lô B2, KCN Visip, Bình Dương</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-slate-900">85% Capacity</p>
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                <div className="bg-primary h-full" style={{ width: '85%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar/Recent Activity */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-6">Thông báo mới nhất</h2>
                            <div className="space-y-6">
                                {[
                                    { title: "Hợp đồng mới được ký", time: "2 giờ trước", type: "success" },
                                    { title: "Kho A đã đầy công suất", time: "5 giờ trước", type: "warning" },
                                    { title: "Yêu cầu thuê mới từ TechCo", time: "1 ngày trước", type: "info" }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="relative">
                                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${item.type === 'success' ? 'bg-emerald-500' :
                                                item.type === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
                                                }`}></div>
                                            {idx !== 2 && <div className="absolute top-4 left-[4.5px] w-[1px] h-10 bg-slate-100"></div>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{item.title}</p>
                                            <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full mt-8 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all border border-transparent hover:border-slate-200">
                                Xem tất cả hoạt động
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
