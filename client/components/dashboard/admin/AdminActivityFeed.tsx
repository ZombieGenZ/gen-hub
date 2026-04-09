"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminDashboardService } from "@/services/admin-dashboard/admin-dashboard.service";
import type { ActivityFeedItem } from "@/services/admin-dashboard/admin-dashboard.types";
import {
    ClockIcon,
    BuildingOfficeIcon,
    UserIcon,
    DocumentTextIcon,
    ExclamationCircleIcon,
    GlobeAltIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

export function AdminActivityFeed() {
    const [data, setData] = useState<ActivityFeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminDashboardService
            .getActivityFeed()
            .then(setData)
            .catch((err) => console.error("AdminActivityFeed fetch error:", err))
            .finally(() => setLoading(false));
    }, []);

    const getIconForType = (type: string) => {
        switch (type) {
            case 'ORGANIZATION':
                return <BuildingOfficeIcon className="w-4 h-4 text-chart-4" />;
            case 'ADMIN':
                return <UserIcon className="w-4 h-4 text-chart-1" />;
            case 'CONTRACT':
                return <DocumentTextIcon className="w-4 h-4 text-chart-3" />;
            case 'TICKET':
                return <ExclamationCircleIcon className="w-4 h-4 text-chart-2" />;
            default:
                return <GlobeAltIcon className="w-4 h-4 text-slate-500" />;
        }
    };

    const getBgColorForType = (type: string) => {
        switch (type) {
            case 'ORGANIZATION': return "bg-chart-4/10 border-chart-4/20";
            case 'ADMIN': return "bg-chart-1/10 border-chart-1/20";
            case 'CONTRACT': return "bg-chart-3/10 border-chart-3/20";
            case 'TICKET': return "bg-chart-2/10 border-chart-2/20";
            default: return "bg-slate-100 border-slate-200";
        }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-premium h-full">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-slate-500" />
                        Lịch sử hoạt động
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-5">
                    <div className="animate-pulse space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-200 rounded-full shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-200 rounded w-1/4" />
                                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-premium h-full feature-scroll">
            <CardHeader className="pb-4 sticky top-0 bg-white z-10 border-b border-slate-50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-slate-500" />
                        Lịch sử hoạt động
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-4">
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {data.map((item) => (
                        <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            {/* Marker */}
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${getBgColorForType(item.type)}`}>
                                {getIconForType(item.type)}
                            </div>

                            {/* Card Content */}
                            <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-3.5 rounded-xl border border-slate-100 bg-white shadow-sm group-hover:shadow-md transition-shadow group-hover:border-slate-200">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                            {item.avatar}
                                        </div>
                                        <span className="text-xs font-semibold text-slate-700">{item.user}</span>
                                    </div>
                                    <time className="text-[10px] font-medium text-slate-400">{item.time}</time>
                                </div>
                                <p className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug">
                                    {item.title}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 text-center relative z-10">
                    <Button variant="outline" size="sm" className="bg-white text-xs font-semibold text-slate-500 hover:text-slate-900 rounded-full h-8 px-6 border-slate-200 hover:border-slate-300 transition-colors shadow-sm">
                        Xem thêm hoạt động
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
