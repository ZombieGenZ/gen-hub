"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useDebounce } from "@/hooks/use-debounce";
import { StockTakeCreateModal } from "./StockTakeCreateModal";
import { StockTakeDetailModal } from "./StockTakeDetailModal";
import type { StockTake, StockTakeStatus } from "@/services/inventory/inventory.types";

const inventoryService = new InventoryService();
const ITEMS_PER_PAGE = 15;

const STATUS_CONFIG: Record<StockTakeStatus, { label: string; color: string }> = {
    DRAFT: { label: "Nháp", color: "bg-gray-50 text-gray-700 border-gray-200" },
    IN_PROGRESS: { label: "Đang kiểm", color: "bg-blue-50 text-blue-700 border-blue-200" },
    COMPLETED: { label: "Đã kiểm xong", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    ADJUSTED: { label: "Đã điều chỉnh", color: "bg-green-50 text-green-700 border-green-200" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-700 border-red-200" },
};

function formatDate(dateStr?: string | null) {
    if (!dateStr) return "—";
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
        new Date(dateStr),
    );
}

interface StockTakeTabProps {
    warehouses: { id: string; name: string }[];
}

export function StockTakeTab({ warehouses }: StockTakeTabProps) {
    const [items, setItems] = useState<StockTake[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [keywords, setKeywords] = useState("");
    const debouncedKeywords = useDebounce(keywords, 400);
    const [statusFilter, setStatusFilter] = useState<StockTakeStatus | "">("");
    const [warehouseFilter, setWarehouseFilter] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    const fetchList = useCallback(async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await inventoryService.listStockTakes(token, {
                keywords: debouncedKeywords || undefined,
                status: statusFilter || undefined,
                warehouse_id: warehouseFilter || undefined,
                limit: ITEMS_PER_PAGE,
                offset: (currentPage - 1) * ITEMS_PER_PAGE,
            });
            const data = res?.data as any;
            setItems(data?.items ?? []);
            setTotal(data?.total ?? 0);
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, statusFilter, warehouseFilter, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedKeywords, statusFilter, warehouseFilter]);

    useEffect(() => {
        void fetchList();
    }, [fetchList]);

    return (
        <div className="space-y-4">
            {/* Header actions */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Danh sách phiếu kiểm kê
                </h3>
                <Button onClick={() => setCreateOpen(true)} size="sm" className="rounded-xl">
                    + Tạo phiếu kiểm kê
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-56">
                            <Input
                                placeholder="Tìm theo mã phiếu..."
                                className="rounded-xl"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                            />
                        </div>
                        <div className="w-52">
                            <Select
                                value={warehouseFilter || "ALL"}
                                onValueChange={(v) => setWarehouseFilter(v === "ALL" ? "" : v)}
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Tất cả kho" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả kho</SelectItem>
                                    {warehouses.map((wh) => (
                                        <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-44">
                            <Select
                                value={statusFilter || "ALL"}
                                onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v as StockTakeStatus)}
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Tất cả trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                                    {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
                                        <SelectItem key={val} value={val}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-0 shadow-premium overflow-hidden rounded-3xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30 border-b">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Mã phiếu</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Kho</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Ghi chú</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Trạng thái</th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Ngày tạo</th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i}>
                                            {Array.from({ length: 6 }).map((_, ci) => (
                                                <td key={ci} className="py-4 px-4">
                                                    <Skeleton className="h-5 w-24" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-14 text-center text-muted-foreground">
                                            Chưa có phiếu kiểm kê nào
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => {
                                        const statusInfo = STATUS_CONFIG[item.status];
                                        return (
                                            <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                                                <td className="py-4 px-4">
                                                    <span className="font-mono text-sm font-medium text-[#0F766E]">
                                                        {item.code}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-sm">{item.warehouse?.name ?? "—"}</td>
                                                <td className="py-4 px-4 text-sm text-muted-foreground max-w-xs truncate">
                                                    {item.notes ?? "—"}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Badge
                                                        variant="outline"
                                                        className={`rounded-full text-xs font-normal border ${statusInfo.color}`}
                                                    >
                                                        {statusInfo.label}
                                                    </Badge>
                                                </td>
                                                <td className="py-4 px-4 text-right text-sm text-muted-foreground">
                                                    {formatDate(item.created_at)}
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-lg text-xs"
                                                        onClick={() => setSelectedId(item.id)}
                                                    >
                                                        Xem chi tiết
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {totalPages > 1 && (
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={total}
                    onPageChange={setCurrentPage}
                />
            )}

            <StockTakeCreateModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                warehouses={warehouses}
                onCreated={fetchList}
            />

            <StockTakeDetailModal
                stockTakeId={selectedId}
                open={selectedId != null}
                onClose={() => setSelectedId(null)}
                onUpdated={fetchList}
            />
        </div>
    );
}
