"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopOrganizationsTab } from "./TopOrganizationsTab";
import { TopWarehousesTab } from "./TopWarehousesTab";
import { RecentTransactionsTab } from "./RecentTransactionsTab";
import type { TableData } from "@/services/revenue-analytics/revenue-analytics.types";
import React from "react";
import { TablePagination } from "@/components/ui/table-pagination";

interface RevenueDataGridProps {
    data: TableData | undefined;
    isLoading: boolean;
    activeTab: string;
    onTabChange: (tab: string) => void;
    page: { limit: number; offset: number };
    onPageChange: (page: { limit: number; offset: number }) => void;
}

const TAB_CONFIG = [
    { value: "TOP_ORGANIZATIONS", label: "Theo Tổ chức" },
    { value: "TOP_WAREHOUSES", label: "Theo Kho" },
    { value: "RECENT_TRANSACTIONS", label: "Giao dịch gần nhất" },
];

export const RevenueDataGrid = React.forwardRef<HTMLDivElement, RevenueDataGridProps>(
    function RevenueDataGrid(
        { data, isLoading, activeTab, onTabChange, page, onPageChange },
        ref,
    ) {
        const items = data?.items ?? [];
        const total = data?.total ?? 0;
        const currentPage = Math.floor(page.offset / page.limit) + 1;
        const totalPages = Math.max(1, Math.ceil(total / page.limit));
        const hasMore = page.offset + page.limit < total;

        const handlePageChange = (nextPage: number) => {
            const clampedPage = Math.min(Math.max(nextPage, 1), totalPages);
            onPageChange({ ...page, offset: (clampedPage - 1) * page.limit });
        };

        return (
            <div ref={ref} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Tabs value={activeTab} onValueChange={(v) => {
                    onTabChange(v);
                    onPageChange({ ...page, offset: 0 });
                }}>
                    <div className="flex items-center justify-between px-6 pt-5 pb-2">
                        <h3 className="font-bold text-slate-800">Phân tích chi tiết</h3>
                        <TabsList className="bg-slate-100">
                            {TAB_CONFIG.map((tab) => (
                                <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="px-6 pb-2">
                        {isLoading ? (
                            <div className="py-12 text-center">
                                <div className="inline-block h-6 w-6 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
                                <p className="text-sm text-slate-500 mt-2">Đang tải dữ liệu...</p>
                            </div>
                        ) : (
                            <>
                                <TabsContent value="TOP_ORGANIZATIONS" className="mt-0">
                                    <TopOrganizationsTab items={items} offset={page.offset} />
                                </TabsContent>
                                <TabsContent value="TOP_WAREHOUSES" className="mt-0">
                                    <TopWarehousesTab items={items} offset={page.offset} />
                                </TabsContent>
                                <TabsContent value="RECENT_TRANSACTIONS" className="mt-0">
                                    <RecentTransactionsTab items={items} offset={page.offset} />
                                </TabsContent>
                            </>
                        )}
                    </div>

                    {/* Pagination */}
                    {!isLoading && total > 0 && (
                        <div className="px-6 py-4 border-t border-slate-100">
                            <TablePagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={total}
                                itemsPerPage={page.limit}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    )}
                </Tabs>
            </div>
        );
    },
);
