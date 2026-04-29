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
import type { InboundRequest, OutboundRequest } from "@/services/inventory/inventory.types";

const inventoryService = new InventoryService();
const ITEMS_PER_PAGE = 15;

const RECEIPT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Chờ duyệt", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    APPROVED: { label: "Đã duyệt", color: "bg-blue-50 text-blue-700 border-blue-200" },
    RECEIVING: { label: "Đang nhận", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    PROCESSING: { label: "Đang xử lý", color: "bg-purple-50 text-purple-700 border-purple-200" },
    PUTAWAY: { label: "Đang lưu kho", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    COMPLETED: { label: "Hoàn tất", color: "bg-green-50 text-green-700 border-green-200" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-700 border-red-200" },
};

const EXPORT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Chờ duyệt", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    PICKING: { label: "Đang lấy hàng", color: "bg-blue-50 text-blue-700 border-blue-200" },
    CHECKING: { label: "Đang kiểm tra", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    PACKED: { label: "Đã đóng gói", color: "bg-purple-50 text-purple-700 border-purple-200" },
    SHIPPED: { label: "Đã xuất", color: "bg-green-50 text-green-700 border-green-200" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-700 border-red-200" },
};

function formatDate(dateStr?: string | null) {
    if (!dateStr) return "—";
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
        new Date(dateStr),
    );
}

interface InboundOutboundTabProps {
    warehouses: { id: string; name: string }[];
    initialWarehouseId?: string;
}

export function InboundOutboundTab({ warehouses, initialWarehouseId = "" }: InboundOutboundTabProps) {
    const [activeSubTab, setActiveSubTab] = useState<"inbound" | "outbound">("inbound");
    const [warehouseId, setWarehouseId] = useState(initialWarehouseId);
    const [status, setStatus] = useState("");
    const [keywords, setKeywords] = useState("");
    const debouncedKeywords = useDebounce(keywords, 400);
    const [currentPage, setCurrentPage] = useState(1);

    const [inboundItems, setInboundItems] = useState<InboundRequest[]>([]);
    const [outboundItems, setOutboundItems] = useState<OutboundRequest[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    const fetchInbound = useCallback(async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await inventoryService.listInbound(token, {
                warehouse_id: warehouseId || undefined,
                status: status as any || undefined,
                keywords: debouncedKeywords || undefined,
                limit: ITEMS_PER_PAGE,
                offset: (currentPage - 1) * ITEMS_PER_PAGE,
            });
            const data = res?.data as any;
            setInboundItems(data?.items ?? []);
            setTotal(data?.total ?? 0);
        } finally {
            setLoading(false);
        }
    }, [warehouseId, status, debouncedKeywords, currentPage]);

    const fetchOutbound = useCallback(async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await inventoryService.listOutbound(token, {
                warehouse_id: warehouseId || undefined,
                status: status as any || undefined,
                keywords: debouncedKeywords || undefined,
                limit: ITEMS_PER_PAGE,
                offset: (currentPage - 1) * ITEMS_PER_PAGE,
            });
            const data = res?.data as any;
            setOutboundItems(data?.items ?? []);
            setTotal(data?.total ?? 0);
        } finally {
            setLoading(false);
        }
    }, [warehouseId, status, debouncedKeywords, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeSubTab, warehouseId, status, debouncedKeywords]);

    useEffect(() => {
        if (activeSubTab === "inbound") {
            void fetchInbound();
        } else {
            void fetchOutbound();
        }
    }, [activeSubTab, fetchInbound, fetchOutbound]);

    const statusOptions =
        activeSubTab === "inbound"
            ? Object.entries(RECEIPT_STATUS_LABEL)
            : Object.entries(EXPORT_STATUS_LABEL);

    const statusMap = activeSubTab === "inbound" ? RECEIPT_STATUS_LABEL : EXPORT_STATUS_LABEL;

    return (
        <div className="space-y-4">
            {/* Sub-tab */}
            <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit">
                {(["inbound", "outbound"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => { setActiveSubTab(tab); setStatus(""); }}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeSubTab === tab
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {tab === "inbound" ? "Phiếu nhập" : "Phiếu xuất"}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-56">
                            <Input
                                placeholder={activeSubTab === "inbound" ? "Tìm theo mã phiếu PO..." : "Tìm theo mã phiếu xuất..."}
                                className="rounded-xl"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                            />
                        </div>
                        <div className="w-52">
                            <Select value={warehouseId || "ALL"} onValueChange={(v) => setWarehouseId(v === "ALL" ? "" : v)}>
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
                            <Select value={status || "ALL"} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Tất cả trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                                    {statusOptions.map(([val, { label }]) => (
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
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        {activeSubTab === "inbound" ? "Mã PO" : "Mã SO"}
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Trạng thái</th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        {activeSubTab === "inbound" ? "Ngày dự kiến" : "Ngày yêu cầu"}
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i}>
                                            {Array.from({ length: 6 }).map((_, ci) => (
                                                <td key={ci} className="py-4 px-4"><Skeleton className="h-5 w-24" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (activeSubTab === "inbound" ? inboundItems : outboundItems).length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-14 text-center text-muted-foreground">
                                            Không có dữ liệu
                                        </td>
                                    </tr>
                                ) : activeSubTab === "inbound" ? (
                                    inboundItems.map((item) => {
                                        const statusInfo = statusMap[item.status] ?? { label: item.status, color: "" };
                                        return (
                                            <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                                                <td className="py-4 px-4">
                                                    <span className="font-mono text-sm font-medium text-[#0F766E]">{item.code}</span>
                                                </td>
                                                <td className="py-4 px-4 text-sm">{item.warehouse?.name ?? "—"}</td>
                                                <td className="py-4 px-4 text-sm text-muted-foreground">{item.purchase_order_code ?? "—"}</td>
                                                <td className="py-4 px-4">
                                                    <Badge variant="outline" className={`rounded-full text-xs font-normal border ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </Badge>
                                                </td>
                                                <td className="py-4 px-4 text-right text-sm text-muted-foreground">
                                                    {formatDate(item.expected_arrival)}
                                                </td>
                                                <td className="py-4 px-4 text-right text-sm text-muted-foreground">
                                                    {formatDate(item.created_at)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    outboundItems.map((item) => {
                                        const statusInfo = statusMap[item.status] ?? { label: item.status, color: "" };
                                        return (
                                            <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                                                <td className="py-4 px-4">
                                                    <span className="font-mono text-sm font-medium text-[#7C3AED]">{item.code}</span>
                                                </td>
                                                <td className="py-4 px-4 text-sm">{item.warehouse?.name ?? "—"}</td>
                                                <td className="py-4 px-4 text-sm text-muted-foreground">{item.sales_order_code ?? "—"}</td>
                                                <td className="py-4 px-4">
                                                    <Badge variant="outline" className={`rounded-full text-xs font-normal border ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </Badge>
                                                </td>
                                                <td className="py-4 px-4 text-right text-sm text-muted-foreground">
                                                    {formatDate(item.required_date)}
                                                </td>
                                                <td className="py-4 px-4 text-right text-sm text-muted-foreground">
                                                    {formatDate(item.created_at)}
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
        </div>
    );
}
