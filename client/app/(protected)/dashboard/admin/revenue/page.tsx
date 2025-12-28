"use client";

import { DashboardHeader } from "@/components/layouts/DashboardHeader";
import { Button } from "@/components/ui/button";
import {
    Download,
    Calendar,
    DollarSign,
    TrendingUp,
    CreditCard,
    Wallet
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";

export default function RevenuePage() {
    return (
        <div className="flex flex-col flex-1 h-full bg-slate-50/50">
            <DashboardHeader>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2 text-slate-600 border-slate-200">
                        <Calendar className="w-4 h-4" />
                        Tháng này
                    </Button>
                </div>
            </DashboardHeader>

            <main className="flex-1 p-4 md:p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Báo cáo doanh thu</h1>
                        <p className="text-sm text-slate-500 mt-1">Tổng hợp doanh thu và hiệu suất kinh doanh</p>
                    </div>
                    <Button variant="outline" className="gap-2 border-slate-200 text-slate-700 hover:bg-white hover:text-primary hover:border-primary/20">
                        <Download className="w-4 h-4" />
                        Xuất báo cáo
                    </Button>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <StatCard
                        title="Tổng doanh thu"
                        value="2.4 Tỷ"
                        icon={DollarSign}
                        trend={{ value: 12.5, isPositive: true }}
                        variant="emerald"
                        description="So với tháng trước"
                    />
                    <StatCard
                        title="Lợi nhuận ròng"
                        value="850 Tr"
                        icon={Wallet}
                        trend={{ value: 8.2, isPositive: true }}
                        variant="blue"
                        description="Tỷ suất 35%"
                    />
                    <StatCard
                        title="Chi phí vận hành"
                        value="1.2 Tỷ"
                        icon={CreditCard}
                        trend={{ value: 2.1, isPositive: false }}
                        variant="brand"
                        description="Chi phí bảo trì tăng"
                    />
                    <StatCard
                        title="Tăng trưởng"
                        value="+18.2%"
                        icon={TrendingUp}
                        trend={{ value: 4.5, isPositive: true }}
                        variant="brand"
                        description="Đạt mục tiêu tháng"
                    />
                </div>

                {/* Charts Area Placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-800">Biểu đồ doanh thu</h3>
                            <select className="text-sm border-none bg-slate-50 rounded-lg px-2 py-1 text-slate-600 focus:ring-0">
                                <option>6 tháng qua</option>
                                <option>Năm nay</option>
                            </select>
                        </div>

                        {/* CSS Bar Chart Placeholder */}
                        <div className="h-64 flex items-end justify-between gap-2 px-2">
                            {[40, 65, 45, 80, 55, 90, 75, 60, 85, 95, 80, 70].map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div
                                        className="w-full bg-brand/10 group-hover:bg-brand/80 transition-all rounded-t-sm relative"
                                        style={{ height: `${h}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            {h}0 Tr
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">T{i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6">Nguồn doanh thu</h3>
                        <div className="space-y-6">
                            {[
                                { label: "Cho thuê kho", val: 65, color: "bg-success" },
                                { label: "Dịch vụ vận chuyển", val: 20, color: "bg-info" },
                                { label: "Quản lý & Bốc xếp", val: 10, color: "bg-brand" },
                                { label: "Khác", val: 5, color: "bg-border-strong" }
                            ].map((item, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-600 font-medium">{item.label}</span>
                                        <span className="text-slate-900 font-bold">{item.val}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
