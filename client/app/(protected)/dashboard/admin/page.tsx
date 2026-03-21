"use client";

import React from "react";
import { AdminHeroKPIs } from "@/components/dashboard/admin/AdminHeroKPIs";
import { AdminActionableInbox } from "@/components/dashboard/admin/AdminActionableInbox";
import { AdminRevenueChart } from "@/components/dashboard/admin/AdminRevenueChart";
import { AdminWarehouseHeatmap } from "@/components/dashboard/admin/AdminWarehouseHeatmap";
import { AdminActivityFeed } from "@/components/dashboard/admin/AdminActivityFeed";
import { AdminSystemHealth } from "@/components/dashboard/admin/AdminSystemHealth";
import {
    DashboardWidgetGrid,
    type DashboardWidget,
    type WidgetGroup,
} from "@/components/dashboard/admin/DashboardWidgetGrid";

// --- Widget Definitions ---
const WIDGETS: DashboardWidget[] = [
    // Group: top (full-width KPIs)
    { id: "hero-kpis", title: "Chỉ số Sinh tồn (KPIs)", component: <AdminHeroKPIs />, visible: true },

    // Group: main-left (2/3 width)
    { id: "actionable-inbox", title: "Cần xử lý ngay", component: <AdminActionableInbox />, visible: true },
    { id: "revenue-chart", title: "Doanh thu vs Thực thu", component: <AdminRevenueChart />, visible: true },
    { id: "warehouse-heatmap", title: "Bản đồ Nhiệt Kho bãi", component: <AdminWarehouseHeatmap />, visible: true },

    // Group: sidebar (1/3 width)
    { id: "activity-feed", title: "Lịch sử Hoạt động", component: <AdminActivityFeed />, visible: true },
];

// --- Layout Groups ---
const GROUPS: WidgetGroup[] = [
    { id: "top", widgetIds: ["hero-kpis"] },
    { id: "main-left", widgetIds: ["actionable-inbox", "revenue-chart", "warehouse-heatmap"] },
    { id: "sidebar", widgetIds: ["system-health", "activity-feed"] },
];

export default function DashboardPage() {
    return (
        <div className="flex-1 overflow-auto bg-slate-50/50">
            <main className="p-4">
                <DashboardWidgetGrid
                    widgets={WIDGETS}
                    groups={GROUPS}
                    renderLayout={(groups) => (
                        <div className="space-y-6">
                            {/* ZONE 1: Full-width KPIs */}
                            <section>{groups["top"]}</section>

                            {/* ZONE 2-4: Two-column layout */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                {/* Main content — 2/3 */}
                                <div className="xl:col-span-2 space-y-6">
                                    {groups["main-left"]}
                                </div>

                                {/* Sidebar — 1/3 */}
                                <div className="space-y-6">
                                    {groups["sidebar"]}
                                </div>
                            </div>
                        </div>
                    )}
                />
            </main>
        </div>
    );
}
