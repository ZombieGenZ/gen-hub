"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRevenueKpis } from "@/hooks/revenue-analytics/use-revenue-kpis";
import { useRevenueCharts } from "@/hooks/revenue-analytics/use-revenue-charts";
import { useRevenueTables } from "@/hooks/revenue-analytics/use-revenue-tables";
import RevenueFilters from "@/components/revenue/RevenueFilters";
import { RevenueKpiCards } from "@/components/revenue/RevenueKpiCards";
import { RevenueStackedBarChart, type Granularity } from "@/components/revenue/RevenueStackedBarChart";
import { RevenuePaymentMethodChart } from "@/components/revenue/RevenuePaymentMethodChart";
import { RevenueDataGrid } from "@/components/revenue/RevenueDataGrid";
import { RevenueExportDialog } from "@/components/revenue/RevenueExportDialog";
import { SkeletonChart } from "@/components/revenue/SkeletonChart";
import type { RevenueFilters as RevenueFiltersType } from "@/services/revenue-analytics/revenue-analytics.types";
import { LocationService } from "@/services/location/location.service";
import { warehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { authStorage } from "@/services/auth/auth-storage.service";

const locationService = new LocationService();

const GRANULARITY_MAP: Record<Granularity, string> = {
    day: "DAY",
    week: "WEEK",
    month: "MONTH",
};

export default function RevenuePage() {
    // State
    const [filters, setFilters] = useState<RevenueFiltersType>({ preset: "THIS_MONTH" });
    const [granularity, setGranularity] = useState<Granularity>("month");
    const [activeTab, setActiveTab] = useState("TOP_ORGANIZATIONS");
    const [tablePage, setTablePage] = useState({ limit: 20, offset: 0 });
    const [showExport, setShowExport] = useState(false);
    const [showCouponDiscount, setShowCouponDiscount] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    // Filter dropdown data
    const provincesQuery = useQuery({
        queryKey: ["provinces-dropdown"],
        queryFn: async () => {
            const res = await locationService.getProvinces();
            return Array.isArray(res) ? res : (res as any).data ?? [];
        },
        staleTime: 5 * 60_000,
    });

    const warehousesQuery = useQuery({
        queryKey: ["warehouses-dropdown"],
        queryFn: async () => {
            const token = authStorage.getAccessToken() ?? "";
            const res = await warehouseTemplateService.getWarehouseTemplates(token, { limit: 200 });
            const items: Array<{ id: string; name: string }> = res?.items ?? res ?? [];
            return items.map((w) => ({ id: w.id, name: w.name }));
        },
        staleTime: 5 * 60_000,
    });

    // Data hooks
    const kpiQuery = useRevenueKpis(filters);
    const chartQuery = useRevenueCharts({
        ...filters,
        granularity: GRANULARITY_MAP[granularity],
        include_coupon_discount: showCouponDiscount,
    });
    const tableQuery = useRevenueTables({
        ...filters,
        tab: activeTab,
        ...tablePage,
    });

    // Handlers
    const handleKpiClick = useCallback((kpiType: string) => {
        if (kpiType === "pending") {
            setActiveTab("TOP_ORGANIZATIONS");
            tableRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, []);

    const handleRefresh = useCallback(() => {
        kpiQuery.refetch();
        chartQuery.refetch();
        tableQuery.refetch();
    }, [kpiQuery, chartQuery, tableQuery]);

    const handleGranularityChange = useCallback((g: Granularity) => {
        setGranularity(g);
    }, []);

    return (
        <div className="flex flex-col flex-1 h-full bg-slate-50/50">
            {/* Zone 1: Sticky Header & Filters */}
            <RevenueFilters
                filters={filters}
                onChange={setFilters}
                onRefresh={handleRefresh}
                onExport={() => setShowExport(true)}
                provinces={provincesQuery.data ?? []}
                warehouses={warehousesQuery.data ?? []}
                isRefreshing={kpiQuery.isFetching}
            />

            <main className="flex-1 p-4 md:p-8 space-y-8">
                {/* Zone 2: KPI Cards */}
                <RevenueKpiCards
                    data={kpiQuery.data}
                    isLoading={kpiQuery.isLoading}
                    onCardClick={handleKpiClick}
                />

                {/* Zone 3: Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        {chartQuery.isLoading ? (
                            <SkeletonChart />
                        ) : chartQuery.data ? (
                            <RevenueStackedBarChart
                                timeSeries={chartQuery.data.timeSeries}
                                addonSeries={chartQuery.data.addonSeries}
                                couponDiscount={chartQuery.data.couponDiscount}
                                granularity={granularity}
                                onGranularityChange={handleGranularityChange}
                            />
                        ) : (
                            <SkeletonChart />
                        )}
                    </div>
                    <div className="lg:col-span-2">
                        {chartQuery.isLoading ? (
                            <SkeletonChart />
                        ) : chartQuery.data ? (
                            <RevenuePaymentMethodChart
                                data={chartQuery.data.paymentMethodBreakdown}
                            />
                        ) : (
                            <SkeletonChart />
                        )}
                    </div>
                </div>

                {/* Zone 4: Data Grid with Tabs */}
                <RevenueDataGrid
                    ref={tableRef}
                    data={tableQuery.data}
                    isLoading={tableQuery.isLoading}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    page={tablePage}
                    onPageChange={setTablePage}
                />
            </main>

            {/* Export Dialog */}
            <RevenueExportDialog
                filters={filters}
                open={showExport}
                onOpenChange={setShowExport}
            />
        </div>
    );
}
