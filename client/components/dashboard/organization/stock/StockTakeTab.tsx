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
import {
    ClipboardDocumentListIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    BuildingStorefrontIcon,
    CalendarDaysIcon,
    ChevronRightIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    CubeIcon,
} from "@heroicons/react/24/outline";
import type { StockTake, StockTakeStatus } from "@/services/inventory/inventory.types";

const inventoryService = new InventoryService();
const ITEMS_PER_PAGE = 15;

const STATUS_CONFIG: Record<StockTakeStatus, { label: string; color: string; dot: string }> = {
    DRAFT: { label: "Nháp", color: "bg-gray-50 text-gray-600 border-gray-200", dot: "bg-gray-400" },
    IN_PROGRESS: { label: "Đang kiểm", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500 animate-pulse" },
    COMPLETED: { label: "Đã kiểm xong", color: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
    ADJUSTED: { label: "Đã điều chỉnh", color: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-400" },
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

    // Summary counts per status
    const statusCounts = items.reduce<Partial<Record<StockTakeStatus, number>>>((acc, it) => {
        acc[it.status] = (acc[it.status] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-5">
            {/* Header actions */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                        <ClipboardDocumentListIcon className="w-5 h-5 text-[#0F766E]" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold">Phiếu kiểm kê</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Quản lý kiểm đếm và điều chỉnh tồn kho thực tế
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setCreateOpen(true)}
                    size="sm"
                    className="rounded-xl gap-1.5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white shrink-0"
                >
                    <PlusIcon className="w-4 h-4" />
                    Tạo phiếu kiểm kê
                </Button>
            </div>

            {/* Status quick-filter chips */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setStatusFilter("")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        statusFilter === "" ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-muted-foreground/30 hover:border-foreground/50"
                    }`}
                >
                    Tất cả
                    {total > 0 && <span className="font-mono tabular-nums">{total}</span>}
                </button>
                {(Object.entries(STATUS_CONFIG) as [StockTakeStatus, typeof STATUS_CONFIG[StockTakeStatus]][]).map(([key, cfg]) => {
                    const count = statusCounts[key];
                    if (!count) return null;
                    return (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key === statusFilter ? "" : key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                statusFilter === key ? cfg.color + " border-current" : "bg-background text-muted-foreground border-muted-foreground/30 hover:border-foreground/50"
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                            <span className="font-mono tabular-nums">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Tìm theo mã phiếu..."
                        className="rounded-xl pl-9"
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

            {/* Content: loading / empty / card list */}
            {loading ? (
                <div className="grid grid-cols-1 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="border-0 shadow-sm rounded-2xl">
                            <CardContent className="p-4 flex items-center gap-4">
                                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <Card className="border-0 shadow-sm rounded-2xl">
                    <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-[#0F766E]/10 flex items-center justify-center">
                            <ClipboardDocumentListIcon className="w-7 h-7 text-[#0F766E]/50" />
                        </div>
                        <div>
                            <p className="font-semibold text-muted-foreground">Chưa có phiếu kiểm kê nào</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">
                                {keywords || statusFilter || warehouseFilter
                                    ? "Thử thay đổi bộ lọc tìm kiếm"
                                    : "Tạo phiếu kiểm kê đầu tiên để bắt đầu kiểm đếm tồn kho"}
                            </p>
                        </div>
                        {!keywords && !statusFilter && !warehouseFilter && (
                            <Button
                                size="sm"
                                className="rounded-xl gap-1.5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                onClick={() => setCreateOpen(true)}
                            >
                                <PlusIcon className="w-4 h-4" />
                                Tạo phiếu kiểm kê
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => {
                        const statusInfo = STATUS_CONFIG[item.status];
                        const detailCount = item._count?.details ?? 0;
                        const isActive = item.status === "IN_PROGRESS";
                        return (
                            <Card
                                key={item.id}
                                className={`border-0 shadow-sm rounded-2xl hover:shadow-md transition-all cursor-pointer group ${isActive ? "ring-1 ring-blue-200" : ""}`}
                                onClick={() => setSelectedId(item.id)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                            isActive ? "bg-blue-50 group-hover:bg-blue-100" : "bg-muted/50 group-hover:bg-muted"
                                        }`}>
                                            {isActive
                                                ? <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" style={{ animationDuration: "3s" }} />
                                                : item.status === "ADJUSTED"
                                                ? <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                                : <ClipboardDocumentListIcon className="w-5 h-5 text-muted-foreground" />
                                            }
                                        </div>

                                        {/* Main info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-sm font-semibold text-[#0F766E]">
                                                    {item.code}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={`rounded-full text-xs font-normal border inline-flex items-center gap-1 ${statusInfo.color}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                                    {statusInfo.label}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                    <BuildingStorefrontIcon className="w-3 h-3" />
                                                    {item.warehouse?.name ?? "—"}
                                                </span>
                                                {detailCount > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                        <CubeIcon className="w-3 h-3" />
                                                        {detailCount} mặt hàng
                                                    </span>
                                                )}
                                                {item.notes && (
                                                    <span className="text-xs text-muted-foreground truncate max-w-xs italic">
                                                        {item.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Date + chevron */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <CalendarDaysIcon className="w-3 h-3" />
                                                {formatDate(item.created_at)}
                                            </span>
                                            <ChevronRightIcon className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

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
