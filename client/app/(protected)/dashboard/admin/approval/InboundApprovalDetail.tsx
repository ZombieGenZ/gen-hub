"use client";

import React, { useState, useCallback, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { InboundRequest } from "@/services/inventory/inventory.types";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    CheckCircleIcon,
    MapPinIcon,
    PrinterIcon,
    ExclamationTriangleIcon,
    ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

import RejectReasonDialog from "./RejectReasonDialog";

const inventoryService = new InventoryService();

// ────────────────────────────────────────────────
// Putaway suggestion helper (simulated algorithm)
// ────────────────────────────────────────────────
function generatePutawaySuggestions(
    details: InboundRequest["details"]
): { product: string; sku: string; qty: number; location: string }[] {
    if (!details) return [];
    const blocks = ["A1", "A2", "B1", "B2", "C1", "C2", "D1"];
    return details.map((d, idx) => ({
        product: d.product?.name || "—",
        sku: d.product?.sku || "—",
        qty: d.expected_qty,
        location: blocks[idx % blocks.length],
    }));
}

function formatDate(dateStr: string) {
    try {
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(dateStr));
    } catch {
        return "—";
    }
}

// ════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════
interface InboundApprovalDetailProps {
    ticketId: string;
}

export default function InboundApprovalDetail({
    ticketId,
}: InboundApprovalDetailProps) {
    const { showToast } = useToast();

    const [data, setData] = useState<InboundRequest | null>(null);
    const [loading, setLoading] = useState(true);

    // Editing
    const [editingQty, setEditingQty] = useState<Record<string, number>>({});
    const [mismatchReasons, setMismatchReasons] = useState<Record<string, string>>({});

    // Dialogs
    const [rejectOpen, setRejectOpen] = useState(false);
    const [putawayOpen, setPutawayOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setLoading(true);
            const res = await inventoryService.getInboundById(token, ticketId);
            const item = (res as any)?.data || res;
            setData(item);

            if (item?.details) {
                const qtyMap: Record<string, number> = {};
                item.details.forEach((d: any) => {
                    qtyMap[d.id] = d.actual_qty ?? 0;
                });
                setEditingQty(qtyMap);
            }
        } catch {
            showToast("Không thể tải chi tiết phiếu nhập", "error");
        } finally {
            setLoading(false);
        }
    }, [ticketId, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getRowClass = (detailId: string, expectedQty: number) => {
        const actual = editingQty[detailId] ?? 0;
        if (actual === 0) return "";
        if (actual === expectedQty) return "approval-reconciliation__row--match";
        if (actual > 0 && actual < expectedQty)
            return "approval-reconciliation__row--shortage";
        return "approval-reconciliation__row--critical";
    };

    const handleApproveProcess = () => {
        showToast("Đã duyệt phiếu — chuyển sang trạng thái Đang xử lý", "success");
    };

    const handleQuarantine = (detailId: string, productName: string) => {
        showToast(
            `Đã chuyển "${productName}" vào kho biệt trữ (Quarantine)`,
            "success"
        );
    };

    const handleRejectConfirm = (category: string, reason: string) => {
        showToast(`Đã từ chối phiếu — Lý do: ${reason}`, "success");
        setRejectOpen(false);
    };

    // ── Loading state ──
    if (loading) {
        return (
            <div className="space-y-4 p-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="approval-empty">
                <div className="approval-empty__icon">
                    <ExclamationTriangleIcon className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">Không tìm thấy phiếu nhập</p>
            </div>
        );
    }

    const putawaySuggestions = generatePutawaySuggestions(data.details);

    return (
        <div className="flex flex-col h-full">
            {/* ── Header ── */}
            <div className="p-6 border-b">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-[20px] font-bold leading-[130%]">
                                {data.code}
                            </h2>
                            <Badge
                                variant="outline"
                                className="rounded-full px-3 py-0.5 text-xs font-normal approval-type--inbound"
                            >
                                Nhập kho
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {data.warehouse?.name || "—"} • {data.partner?.name || "—"} •{" "}
                            {formatDate(data.created_at)}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                        <PrinterIcon className="w-4 h-4" />
                        In phiếu
                    </Button>
                </div>
                {data.purchase_order_code && (
                    <p className="text-xs text-muted-foreground mt-2">
                        Mã PO: <strong>{data.purchase_order_code}</strong>
                    </p>
                )}
                {data.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Ghi chú: {data.notes}
                    </p>
                )}
            </div>

            {/* ── Reconciliation Table ── */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[16px] font-semibold leading-[150%]">
                        Bảng đối chiếu hàng hóa
                    </h3>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-xl"
                        onClick={() => setPutawayOpen(true)}
                    >
                        <MapPinIcon className="w-4 h-4" />
                        Gợi ý vị trí cất hàng
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/30 border-b">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                    Sản phẩm
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                    SKU
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                    Lô hàng
                                </th>
                                <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                    SL dự kiến
                                </th>
                                <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                    SL thực tế
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                    Trạng thái
                                </th>
                                <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.details && data.details.length > 0 ? (
                                data.details.map((detail) => {
                                    const actualQty =
                                        editingQty[detail.id] ?? detail.actual_qty ?? 0;
                                    const isMatch = actualQty === detail.expected_qty;
                                    const isMismatch = actualQty > 0 && !isMatch;
                                    const rowClass = getRowClass(detail.id, detail.expected_qty);

                                    return (
                                        <tr
                                            key={detail.id}
                                            className={`transition-colors ${rowClass}`}
                                        >
                                            <td className="py-3 px-4">
                                                <p className="font-medium text-sm">
                                                    {detail.product?.name || "—"}
                                                </p>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {detail.product?.sku || "—"}
                                            </td>
                                            <td className="py-3 px-4 text-sm">
                                                {detail.batch?.code || "—"}
                                            </td>
                                            <td className="py-3 px-4 text-center font-semibold text-sm">
                                                {detail.expected_qty}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={actualQty}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setEditingQty((prev) => ({
                                                            ...prev,
                                                            [detail.id]: val,
                                                        }));
                                                    }}
                                                    className="w-20 h-8 rounded-xl text-center text-sm mx-auto"
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                {actualQty === 0 ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        Chưa kiểm
                                                    </span>
                                                ) : isMatch ? (
                                                    <Badge className="bg-green-50 text-green-700 border-green-200 gap-1 rounded-full shadow-none font-normal text-xs">
                                                        <CheckCircleIcon className="w-3 h-3" />
                                                        Khớp
                                                    </Badge>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 rounded-full shadow-none font-normal text-xs">
                                                            Lệch{" "}
                                                            {Math.abs(
                                                                actualQty - detail.expected_qty
                                                            )}
                                                        </Badge>
                                                        {isMismatch && (
                                                            <Input
                                                                placeholder="Lý do..."
                                                                value={
                                                                    mismatchReasons[detail.id] || ""
                                                                }
                                                                onChange={(e) =>
                                                                    setMismatchReasons((prev) => ({
                                                                        ...prev,
                                                                        [detail.id]: e.target.value,
                                                                    }))
                                                                }
                                                                className="h-7 text-xs rounded-lg w-32"
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl h-7"
                                                    onClick={() =>
                                                        handleQuarantine(
                                                            detail.id,
                                                            detail.product?.name || ""
                                                        )
                                                    }
                                                >
                                                    <ShieldExclamationIcon className="w-3.5 h-3.5" />
                                                    Biệt trữ
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        Chưa có chi tiết hàng hóa
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Action Bar ── */}
            <div className="approval-actions">
                <Button
                    variant="outline"
                    className="gap-2 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setRejectOpen(true)}
                >
                    Từ chối
                </Button>
                <Button
                    variant="outline"
                    className="gap-2 rounded-xl"
                    onClick={() => setPutawayOpen(true)}
                >
                    <MapPinIcon className="w-4 h-4" />
                    Duyệt & Phân bổ
                </Button>
                <Button
                    className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                    onClick={handleApproveProcess}
                >
                    <CheckCircleIcon className="w-4 h-4" />
                    Duyệt & Đang xử lý
                </Button>
            </div>

            {/* ── Reject Dialog ── */}
            <RejectReasonDialog
                open={rejectOpen}
                onOpenChange={setRejectOpen}
                ticketCode={data.code}
                onConfirm={handleRejectConfirm}
            />

            {/* ── Putaway Allocation Dialog ── */}
            <Dialog open={putawayOpen} onOpenChange={setPutawayOpen}>
                <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <MapPinIcon className="w-5 h-5 text-[#0F766E]" />
                            Phân bổ vị trí cất hàng
                        </DialogTitle>
                        <DialogDescription>
                            Hệ thống gợi ý vị trí dựa trên khối lượng và dung tích kho.
                            Bạn có thể điều chỉnh trước khi xác nhận.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 max-h-[400px] overflow-y-auto">
                        {/* Header */}
                        <div className="approval-putaway__row text-xs font-semibold text-muted-foreground uppercase border-b pb-2">
                            <span>Sản phẩm</span>
                            <span className="text-center">Số lượng</span>
                            <span className="text-center">Vị trí gợi ý</span>
                        </div>

                        {putawaySuggestions.map((row, idx) => (
                            <div key={idx} className="approval-putaway__row">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {row.product}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {row.sku}
                                    </p>
                                </div>
                                <div className="text-center font-semibold text-sm">
                                    {row.qty}
                                </div>
                                <div className="flex justify-center">
                                    <div className="approval-putaway__location">
                                        <MapPinIcon className="w-4 h-4" />
                                        Ô {row.location}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="p-6 border-t">
                        <Button
                            variant="outline"
                            onClick={() => setPutawayOpen(false)}
                            className="rounded-xl"
                        >
                            Hủy
                        </Button>
                        <Button
                            className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                            onClick={() => {
                                showToast(
                                    "Đã xác nhận phân bổ — Phiếu hướng dẫn đang được in",
                                    "success"
                                );
                                setPutawayOpen(false);
                            }}
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Xác nhận & In phiếu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
