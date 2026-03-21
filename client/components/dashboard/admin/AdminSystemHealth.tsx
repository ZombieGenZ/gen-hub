"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminDashboardService } from "@/services/admin-dashboard/admin-dashboard.service";
import type { SystemHealthData } from "@/services/admin-dashboard/admin-dashboard.types";
import { 
    CpuChipIcon, 
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    BoltIcon
} from "@heroicons/react/24/outline";

export function AdminSystemHealth() {
    const [data, setData] = useState<SystemHealthData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminDashboardService
            .getSystemHealth()
            .then(setData)
            .catch((err) => console.error("AdminSystemHealth fetch error:", err))
            .finally(() => setLoading(false));
    }, []);

    const StatusIcon = ({ status }: { status: string }) => {
        if (status === 'OK') return <CheckCircleIcon className="w-4 h-4 text-success" />;
        if (status === 'WARNING') return <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chart-3/50 opacity-75"></span>
            <ExclamationTriangleIcon className="relative inline-flex rounded-full w-4 h-4 text-chart-3" />
        </div>;
        return <XCircleIcon className="w-4 h-4 text-chart-2 animate-pulse" />;
    };

    if (loading || !data) {
        return (
            <Card className="border-0 shadow-premium h-full bg-slate-900">
                <CardHeader className="pb-4 border-b border-white/10">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <CpuChipIcon className="w-5 h-5 text-chart-1" />
                        Giám sát Kỹ thuật
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="animate-pulse space-y-3">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-xl">
                                    <div className="h-3 bg-white/10 rounded w-2/3 mb-3" />
                                    <div className="h-4 bg-white/10 rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-premium h-full bg-slate-900 text-slate-100">
            <CardHeader className="pb-4 border-b border-white/10">
                <CardTitle className="text-base font-bold text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CpuChipIcon className="w-5 h-5 text-chart-1" />
                        Giám sát Kỹ thuật
                    </div>
                    {data.alerts.length > 0 && (
                        <span className="flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-chart-2 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-chart-2"></span>
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
                
                {/* Active Alerts */}
                {data.alerts.length > 0 && (
                    <div className="mb-6 space-y-3">
                        {data.alerts.map(alert => (
                            <div key={alert.id} className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg flex items-start gap-3">
                                <ExclamationTriangleIcon className="w-5 h-5 text-chart-3 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-[13px] font-bold text-chart-3 leading-tight">{alert.message}</h4>
                                    <p className="text-[10px] text-chart-3/70 mt-1">{alert.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Services Status Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.services.map((service, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-[11px] font-semibold text-slate-300 truncate pr-2">{service.name}</h4>
                                <StatusIcon status={service.status} />
                            </div>
                            
                            <div className="flex items-end justify-between mt-3">
                                <div>
                                    <p className="text-[10px] text-slate-500 mb-0.5">Uptime</p>
                                    <p className="text-sm font-mono font-semibold text-white">{service.uptime}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 mb-0.5">Latency</p>
                                    <p className="text-xs font-mono font-medium text-chart-1">{service.latency}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* System Load Mini Chart */}
                 <div className="mt-5 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <BoltIcon className="w-4 h-4 text-amber-400" />
                            CPU Tải Hệ Thống
                        </div>
                        <span className="text-sm font-mono font-bold text-white">
                            {data.services.length > 0 ? 'Live' : '0%'}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                         <div className="h-full bg-gradient-to-r from-chart-1 via-chart-4 to-chart-2 rounded-full w-[42%]"></div>
                    </div>
                 </div>

            </CardContent>
        </Card>
    );
}
