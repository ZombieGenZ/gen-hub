"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer 
} from "recharts";
import { adminDashboardService } from "@/services/admin-dashboard/admin-dashboard.service";
import type { RevenueMonthlyItem } from "@/services/admin-dashboard/admin-dashboard.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartBarIcon } from "@heroicons/react/24/outline";

export function AdminRevenueChart() {
    const [period, setPeriod] = useState("6m");
    const [data, setData] = useState<RevenueMonthlyItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        adminDashboardService
            .getRevenueChart(period)
            .then(setData)
            .catch((err) => console.error("AdminRevenueChart fetch error:", err))
            .finally(() => setLoading(false));
    }, [period]);

    const formatYAxis = (tickItem: number) => {
        return `${tickItem} Tr`;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-slate-100 shadow-premium rounded-xl text-sm min-w-[200px]">
                    <p className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-2">{`Tháng ${label.replace('T', '')}`}</p>
                    <div className="space-y-1.5">
                        {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-slate-500">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                    {entry.name}:
                                </span>
                                <span className="font-semibold" style={{ color: entry.color }}>
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(entry.value * 1000000)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="border-0 shadow-premium h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-chart-1" />
                    Doanh thu dự kiến vs Thực thu
                </CardTitle>
                <div className="w-[140px]">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Chọn thời gian" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="6m" className="text-xs">6 tháng qua</SelectItem>
                            <SelectItem value="12m" className="text-xs">12 tháng qua</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="h-[260px] w-full mt-2">
                    {loading ? (
                        <div className="animate-pulse flex items-end gap-4 h-full p-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex-1 flex gap-1 items-end">
                                    <div className="flex-1 bg-slate-100 rounded-t" style={{ height: `${40 + Math.random() * 50}%` }} />
                                    <div className="flex-1 bg-slate-200 rounded-t" style={{ height: `${30 + Math.random() * 50}%` }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                barGap={4}
                                barSize={32}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis 
                                    tickFormatter={formatYAxis} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Legend 
                                    iconType="circle" 
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                                />
                                <Bar 
                                    dataKey="expected" 
                                    name="Doanh thu dự kiến (từ Hợp đồng)" 
                                    fill="var(--chart-3)" 
                                    radius={[4, 4, 0, 0]}
                                    opacity={0.6}
                                />
                                <Bar 
                                    dataKey="actual" 
                                    name="Dòng tiền thực thu (Đã PAID)" 
                                    fill="var(--chart-1)" 
                                    radius={[4, 4, 0, 0]} 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
