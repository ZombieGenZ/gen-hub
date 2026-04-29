"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ChevronDownIcon,
    ChevronRightIcon,
    BuildingStorefrontIcon,
    TruckIcon,
    UserIcon,
    CubeIcon,
} from "@heroicons/react/24/outline";
import { TablePagination } from "@/components/ui/table-pagination";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useDebounce } from "@/hooks/use-debounce";
import type { InboundRequest, OutboundRequest, InboundDetail, OutboundDetail } from "@/services/inventory/inventory.types";

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

function formatQty(n: number) {
    return new Intl.NumberFormat("vi-VN").format(n);
}

/** Sub-table hiển thị danh sách sản phẩm khi expand */
function ProductExpandRow({
    isInbound,
    details,
    loading,
}: {
    isInbound: boolean;
    details: (InboundDetail | OutboundDetail)[] | undefined;
    loading: boolean;
}) {
    if (loading) {
        return (
            <tr>
                <td colSpan={7} className="px-4 py-3 bg-muted/20 border-b">
                    <div className="flex gap-3">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-28" />)}
                    </div>
                </td>
            </tr>
        );
    }
    if (!details || details.length === 0) {
        return (
            <tr>
                <td colSpan={7} className="px-4 py-3 bg-muted/20 border-b text-sm text-muted-foreground text-center italic">
                    Không có danh sách sản phẩm
                </td>
            </tr>
        );
    }
    return (
        <tr>
            <td colSpan={7} className="px-0 py-0 bg-muted/10 border-b">
                <div className="px-12 py-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                        <CubeIcon className="w-3.5 h-3.5" />
                        Danh sách sản phẩm ({details.length})
                    </p>
                    <div className="rounded-xl overflow-hidden border border-muted/60">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                                <tr>
                                    <th className="text-left py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Sản phẩm</th>
                                    <th className="text-left py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">SKU</th>
                                    {isInbound ? (
                                        <>
                                            <th className="text-right py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">SL dự kiến</th>
                                            <th className="text-right py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">SL thực nhận</th>
                                        </>
                                    ) : (
                                        <th className="text-right py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">SL yêu cầu</th>
                                    )}
                                    <th className="text-left py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Đơn vị</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-muted/40">
                                {details.map((d) => {
                                    const inD = d as InboundDetail;
                                    const outD = d as OutboundDetail;
                                    return (
                                        <tr key={d.id} className="bg-background/60 hover:bg-muted/20 transition-colors">
                                            <td className="py-2 px-3 font-medium">{d.product?.name ?? "—"}</td>
                                            <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{d.product?.sku ?? "—"}</td>
                                            {isInbound ? (
                                                <>
                                                    <td className="py-2 px-3 text-right text-muted-foreground">{formatQty(inD.expected_qty)}</td>
                                                    <td className="py-2 px-3 text-right font-semibold text-[#0F766E]">{formatQty(inD.actual_qty)}</td>
                                                </>
                                            ) : (
                                                <td className="py-2 px-3 text-right font-semibold">{formatQty(outD.quantity)}</td>
                                            )}
                                            <td className="py-2 px-3 text-muted-foreground text-xs">{d.unit?.name ?? "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </td>
        </tr>
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

    // Expand state: id -> { open, loading, details }
    const [expandedRows, setExpandedRows] = useState<Record<string, { open: boolean; loading: boolean; details?: any[] }>>({});

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
        setExpandedRows({});
    }, [activeSubTab, warehouseId, status, debouncedKeywords]);

    useEffect(() => {
        if (activeSubTab === "inbound") {
            void fetchInbound();
        } else {
            void fetchOutbound();
        }
    }, [activeSubTab, fetchInbound, fetchOutbound]);

    const toggleExpand = async (id: string) => {
        const current = expandedRows[id];
        if (current?.open) {
            setExpandedRows((prev) => ({ ...prev, [id]: { ...prev[id], open: false } }));
            return;
        }
        if (current?.details) {
            setExpandedRows((prev) => ({ ...prev, [id]: { ...prev[id], open: true } }));
            return;
        }
        setExpandedRows((prev) => ({ ...prev, [id]: { open: true, loading: true } }));
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            if (activeSubTab === "inbound") {
                const res = await inventoryService.getInboundById(token, id);
                const detail = (res?.data ?? res) as InboundRequest;
                setExpandedRows((prev) => ({ ...prev, [id]: { open: true, loading: false, details: detail?.details ?? [] } }));
            } else {
                const res = await inventoryService.getOutboundById(token, id);
                const detail = (res?.data ?? res) as OutboundRequest;
                setExpandedRows((prev) => ({ ...prev, [id]: { open: true, loading: false, details: detail?.details ?? [] } }));
            }
        } catch {
            setExpandedRows((prev) => ({ ...prev, [id]: { open: true, loading: false, details: [] } }));
        }
    };

    const statusOptions = activeSubTab === "inbound"
        ? Object.entries(RECEIPT_STATUS_LABEL)
        : Object.entries(EXPORT_STATUS_LABEL);
    const statusMap = activeSubTab === "inbound" ? RECEIPT_STATUS_LABEL : EXPORT_STATUS_LABEL;
    const currentItems = activeSubTab === "inbound" ? inboundItems : outboundItems;

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
                        {tab === "inbound" ? (
                            <span className="flex items-center gap-1.5">
                                <BuildingStorefrontIcon className="w-4 h-4" />Phiếu nhập
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <TruckIcon className="w-4 h-4" />Phiếu xuất
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <p className="text-xs text-muted-foreground -mt-1">
                {activeSubTab === "inbound"
                    ? "Hàng nhập từ nhà cung cấp/đối tác vào kho. Nhấn vào một hàng để xem danh sách sản phẩm."
                    : "Hàng xuất từ kho đến khách hàng/đối tác. Nhấn vào một hàng để xem danh sách sản phẩm."}
            </p>

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
                                    <th className="w-8 py-3 px-3" />
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">Mã phiếu</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">Kho</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">
                                        {activeSubTab === "inbound" ? "Nhập từ" : "Xuất cho"}
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">
                                        {activeSubTab === "inbound" ? "Mã PO" : "Mã SO"}
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">Trạng thái</th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">
                                        {activeSubTab === "inbound" ? "Ngày dự kiến" : "Ngày yêu cầu"}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="border-b">
                                            <td className="py-4 px-3" />
                                            {Array.from({ length: 6 }).map((_, ci) => (
                                                <td key={ci} className="py-4 px-4"><Skeleton className="h-5 w-24" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : currentItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-14 text-center text-muted-foreground">
                                            Không có dữ liệu
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((item) => {
                                        const isExpanded = expandedRows[item.id]?.open === true;
                                        const expandState = expandedRows[item.id];
                                        const statusInfo = statusMap[item.status] ?? { label: item.status, color: "" };
                                        const inItem = item as InboundRequest;
                                        const outItem = item as OutboundRequest;
                                        const partnerName = inItem.partner?.name ?? outItem.partner?.name;
                                        const detailCount = (item as any)._count?.details;

                                        return (
                                            <React.Fragment key={item.id}>
                                                <tr
                                                    className={`border-b transition-colors cursor-pointer hover:bg-muted/40 ${isExpanded ? "bg-muted/20" : ""}`}
                                                    onClick={() => toggleExpand(item.id)}
                                                >
                                                    <td className="py-3.5 px-3 text-center w-8">
                                                        {isExpanded
                                                            ? <ChevronDownIcon className="w-4 h-4 text-muted-foreground mx-auto" />
                                                            : <ChevronRightIcon className="w-4 h-4 text-muted-foreground mx-auto" />}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className={`font-mono text-sm font-semibold ${activeSubTab === "inbound" ? "text-[#0F766E]" : "text-[#7C3AED]"}`}>
                                                                {item.code}
                                                            </span>
                                                            {detailCount != null && (
                                                                <span className="text-[10px] text-muted-foreground">{detailCount} sản phẩm</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-sm whitespace-nowrap">{item.warehouse?.name ?? "—"}</td>
                                                    <td className="py-3.5 px-4">
                                                        {partnerName ? (
                                                            <span className="inline-flex items-center gap-1.5 text-sm">
                                                                <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                                <span className="font-medium whitespace-nowrap">{partnerName}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-sm text-muted-foreground">
                                                        {inItem.purchase_order_code ?? outItem.sales_order_code ?? "—"}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <Badge variant="outline" className={`rounded-full text-xs font-normal border ${statusInfo.color}`}>
                                                            {statusInfo.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right text-sm text-muted-foreground whitespace-nowrap">
                                                        {activeSubTab === "inbound"
                                                            ? formatDate(inItem.expected_arrival)
                                                            : formatDate(outItem.required_date)}
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <ProductExpandRow
                                                        isInbound={activeSubTab === "inbound"}
                                                        details={expandState?.details}
                                                        loading={expandState?.loading === true}
                                                    />
                                                )}
                                            </React.Fragment>
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
