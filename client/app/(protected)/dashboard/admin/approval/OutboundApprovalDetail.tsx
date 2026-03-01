"use client";

import React, { useState, useCallback, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { OutboundRequest, PickingStrategy } from "@/services/inventory/inventory.types";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    CheckCircleIcon,
    PrinterIcon,
    ExclamationTriangleIcon,
    BoltIcon,
    ScissorsIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";

import RejectReasonDialog from "./RejectReasonDialog";

const inventoryService = new InventoryService();

// ────────────────────────────────────────────────
// Strategy options
// ────────────────────────────────────────────────
const STRATEGY_OPTIONS: {
    value: PickingStrategy | "NEAREST";
    title: string;
    desc: string;
}[] = [
        { value: "FEFO", title: "FEFO", desc: "Hết hạn trước, xuất trước" },
        { value: "FIFO", title: "FIFO", desc: "Nhập trước, xuất trước" },
        { value: "NEAREST", title: "Gần nhất", desc: "Gần cửa nhất, tiết kiệm thời gian" },
    ];

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
interface OutboundApprovalDetailProps {
    ticketId: string;
}

export default function OutboundApprovalDetail({
    ticketId,
}: OutboundApprovalDetailProps) {
    const { showToast } = useToast();

    const [data, setData] = useState<OutboundRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [strategy, setStrategy] = useState<PickingStrategy | "NEAREST">("FEFO");
    const [rejectOpen, setRejectOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setLoading(true);
            const res = await inventoryService.getOutboundById(token, ticketId);
            const item = (res as any)?.data || res;
            setData(item);
        } catch {
            showToast("Không thể tải chi tiết phiếu xuất", "error");
        } finally {
            setLoading(false);
        }
    }, [ticketId, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Simulated stock availability check
    const getStockInfo = (detail: any) => {
        // In production, this comes from the API
        const requested = detail.quantity || 0;
        const available = (detail.product as any)?.quantity_available ?? Math.floor(requested * (0.6 + Math.random() * 0.6));
        const ratio = requested > 0 ? Math.min(available / requested, 1) : 0;
        const sufficient = available >= requested;

        let barClass = "approval-stock-bar__fill--ok";
        if (ratio < 1) barClass = "approval-stock-bar__fill--danger";
        else if (ratio < 1.2) barClass = "approval-stock-bar__fill--warning";

        return { requested, available, ratio, sufficient, barClass };
    };

    const hasInsufficientStock = data?.details?.some((d) => {
        const info = getStockInfo(d);
        return !info.sufficient;
    });

    const handleApproveOutbound = () => {
        showToast(
            "Đã duyệt lệnh xuất — Lệnh lấy hàng (Pick List) đã được tạo và gửi cho nhân viên",
            "success"
        );
    };

    const handleSplitOrder = () => {
        showToast(
            "Đã tách phiếu — Chỉ xuất những sản phẩm đủ tồn kho",
            "success"
        );
    };

    const handleRejectConfirm = (category: string, reason: string) => {
        showToast(`Đã từ chối phiếu — Lý do: ${reason}`, "success");
        setRejectOpen(false);
    };

    // ── Loading ──
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
                <p className="text-muted-foreground">Không tìm thấy phiếu xuất</p>
            </div>
        );
    }

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
                                className="rounded-full px-3 py-0.5 text-xs font-normal approval-type--outbound"
                            >
                                Xuất kho
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
                {data.sales_order_code && (
                    <p className="text-xs text-muted-foreground mt-2">
                        Mã SO: <strong>{data.sales_order_code}</strong>
                    </p>
                )}
            </div>

            {/* ── Strategy Selector ── */}
            <div className="px-6 pt-6">
                <h3 className="text-[16px] font-semibold leading-[150%] mb-3">
                    Chiến lược xuất hàng
                </h3>
                <div className="approval-strategy">
                    {STRATEGY_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            className={`approval-strategy__option ${strategy === opt.value
                                    ? "approval-strategy__option--active"
                                    : ""
                                }`}
                            onClick={() => setStrategy(opt.value)}
                        >
                            <div className="approval-strategy__option-title">
                                {opt.title}
                            </div>
                            <div className="approval-strategy__option-desc">
                                {opt.desc}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Inventory Check Table ── */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[16px] font-semibold leading-[150%]">
                        Kiểm tra tồn kho
                    </h3>
                    {hasInsufficientStock && (
                        <Badge className="bg-red-50 text-red-700 border-red-200 rounded-full shadow-none font-normal text-xs gap-1">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            Tồn kho không đủ
                        </Badge>
                    )}
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
                                <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                    Yêu cầu
                                </th>
                                <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                    Khả dụng
                                </th>
                                <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-36">
                                    Tiến trình
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                    Trạng thái
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.details && data.details.length > 0 ? (
                                data.details.map((detail) => {
                                    const stock = getStockInfo(detail);
                                    return (
                                        <tr
                                            key={detail.id}
                                            className={`transition-colors ${!stock.sufficient
                                                    ? "approval-reconciliation__row--insufficient"
                                                    : ""
                                                }`}
                                        >
                                            <td className="py-3 px-4">
                                                <p className="font-medium text-sm">
                                                    {detail.product?.name || "—"}
                                                </p>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {detail.product?.sku || "—"}
                                            </td>
                                            <td className="py-3 px-4 text-center font-semibold text-sm">
                                                {stock.requested}
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm">
                                                <span
                                                    className={
                                                        stock.sufficient
                                                            ? "text-green-600 font-medium"
                                                            : "text-red-600 font-semibold"
                                                    }
                                                >
                                                    {stock.available}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="space-y-1">
                                                    <div className="approval-stock-bar">
                                                        <div
                                                            className={`approval-stock-bar__fill ${stock.barClass}`}
                                                            style={{
                                                                width: `${Math.min(stock.ratio * 100, 100)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground text-center">
                                                        {Math.round(stock.ratio * 100)}%
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                {stock.sufficient ? (
                                                    <Badge className="bg-green-50 text-green-700 border-green-200 gap-1 rounded-full shadow-none font-normal text-xs">
                                                        <CheckCircleIcon className="w-3 h-3" />
                                                        Đủ hàng
                                                    </Badge>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <Badge className="bg-red-50 text-red-700 border-red-200 rounded-full shadow-none font-normal text-xs">
                                                            Thiếu{" "}
                                                            {stock.requested - stock.available}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        Chưa có chi tiết hàng hóa
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Suggestion when stock insufficient */}
                {hasInsufficientStock && (
                    <Card className="border border-amber-200 bg-amber-50/50 rounded-2xl mt-4">
                        <CardContent className="p-4 flex items-start gap-3">
                            <BoltIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-amber-800">
                                    Tồn kho không đủ cho một số sản phẩm
                                </p>
                                <p className="text-xs text-amber-700">
                                    Bạn có thể tách phiếu để chỉ xuất những sản phẩm đang có sẵn,
                                    hoặc hủy toàn bộ yêu cầu.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 rounded-xl text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-100"
                                        onClick={handleSplitOrder}
                                    >
                                        <ScissorsIcon className="w-3.5 h-3.5" />
                                        Tách phiếu xuất
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="gap-1 rounded-xl text-xs h-7 text-red-600 hover:bg-red-50"
                                        onClick={() => setRejectOpen(true)}
                                    >
                                        <XCircleIcon className="w-3.5 h-3.5" />
                                        Hủy yêu cầu
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
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
                {hasInsufficientStock && (
                    <Button
                        variant="outline"
                        className="gap-2 rounded-xl"
                        onClick={handleSplitOrder}
                    >
                        <ScissorsIcon className="w-4 h-4" />
                        Tách phiếu
                    </Button>
                )}
                <Button
                    className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                    onClick={handleApproveOutbound}
                    disabled={!!hasInsufficientStock}
                >
                    <CheckCircleIcon className="w-4 h-4" />
                    Duyệt lệnh xuất
                </Button>
            </div>

            {/* ── Reject Dialog ── */}
            <RejectReasonDialog
                open={rejectOpen}
                onOpenChange={setRejectOpen}
                ticketCode={data.code}
                onConfirm={handleRejectConfirm}
            />
        </div>
    );
}
