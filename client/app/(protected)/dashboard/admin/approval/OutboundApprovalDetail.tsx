"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { WarehouseManagerInventoryService } from "@/services/inventory/warehouse-manager-inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { OutboundRequest, PickingStrategy } from "@/services/inventory/inventory.types";
import { useApprovalDetailRealtime } from "@/hooks/useApprovalDetailRealtime";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
    CheckCircleIcon,
    PrinterIcon,
    ExclamationTriangleIcon,
    BoltIcon,
    ScissorsIcon,
    XCircleIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    TruckIcon,
} from "@heroicons/react/24/outline";

import RejectReasonDialog from "./RejectReasonDialog";

const wmInventoryService = new WarehouseManagerInventoryService();

const OUTBOUND_DETAIL_REALTIME_EVENTS = [
    "outbound:approved",
    "outbound:rejected",
    "outbound:split",
    "outbound:picking-confirmed",
    "outbound:checking-confirmed",
    "outbound:shipment-completed",
];

const OUTBOUND_REALTIME_TOAST_MESSAGES: Record<string, string> = {
    "outbound:approved": "Phiếu xuất đã được duyệt",
    "outbound:rejected": "Phiếu xuất đã bị từ chối",
    "outbound:split": "Phiếu xuất đã được tách",
    "outbound:picking-confirmed": "Đã xác nhận nhặt hàng",
    "outbound:checking-confirmed": "Đã xác nhận kiểm tra",
    "outbound:shipment-completed": "Phiếu xuất đã hoàn tất",
};

// ────────────────────────────────────────────────
// Strategy options (for PENDING step)
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Chờ duyệt", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    PICKING: { label: "Đang nhặt", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    CHECKING: { label: "Đang kiểm", color: "bg-purple-50 text-purple-700 border-purple-200" },
    PACKED: { label: "Đã đóng gói", color: "bg-orange-50 text-orange-700 border-orange-200" },
    SHIPPED: { label: "Đã xuất kho", color: "bg-green-50 text-green-700 border-green-200" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-700 border-red-200" },
};

const OUTBOUND_STEPS = [
    { key: "PENDING", label: "Chờ duyệt" },
    { key: "PICKING", label: "Nhặt hàng" },
    { key: "CHECKING", label: "Kiểm tra" },
    { key: "PACKED", label: "Đóng gói" },
    { key: "SHIPPED", label: "Xuất kho" },
];

const STEP_ORDER = ["PENDING", "PICKING", "CHECKING", "PACKED", "SHIPPED"];

function StepBar({ status }: { status: string }) {
    const current = STEP_ORDER.indexOf(status);
    return (
        <div className="flex items-center gap-1 px-4 py-2.5 border-b bg-muted/20 overflow-x-auto">
            {OUTBOUND_STEPS.map((step, idx) => {
                const done = idx < current;
                const active = idx === current;
                return (
                    <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center min-w-16">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                                ${done ? "bg-[#0F766E] border-[#0F766E] text-white" :
                                    active ? "bg-white border-[#0F766E] text-[#0F766E]" :
                                        "bg-white border-muted-foreground/30 text-muted-foreground/50"}`}>
                                {done ? <CheckCircleIcon className="w-4 h-4" /> : idx + 1}
                            </div>
                            <span className={`text-[10px] mt-1 text-center ${active ? "font-semibold text-[#0F766E]" : done ? "text-[#0F766E]" : "text-muted-foreground/50"}`}>
                                {step.label}
                            </span>
                        </div>
                        {idx < OUTBOUND_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 -mt-2.5 ${idx < current ? "bg-[#0F766E]" : "bg-muted-foreground/20"}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function formatDate(dateStr?: string | null) {
    if (!dateStr) return "—";
    try {
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        }).format(new Date(dateStr));
    } catch { return "—"; }
}

// ════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════
interface OutboundApprovalDetailProps {
    ticketId: string;
    onOpenSplitTicket?: (ticketId: string) => void | Promise<void>;
}

interface SplitResultInfo {
    split_export_id?: string;
    split_export_code?: string;
    moved_detail_count?: number;
    kept_detail_count?: number;
}

export default function OutboundApprovalDetail({
    ticketId,
    onOpenSplitTicket,
}: OutboundApprovalDetailProps) {

    const { showToast } = useToast();

    const [data, setData] = useState<OutboundRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // PENDING: picking strategy selection
    const [strategy, setStrategy] = useState<PickingStrategy | "NEAREST">("FEFO");

    // PICKING: picked qty per pick_list_detail
    const [pickedQty, setPickedQty] = useState<Record<string, number>>({});

    // CHECKING: per export_detail { checked_qty, passed }
    const [checkingData, setCheckingData] = useState<Record<string, { checked_qty: number; passed: boolean }>>({});
    const [checkingMismatchAcknowledged, setCheckingMismatchAcknowledged] = useState(false);
    const [splitResult, setSplitResult] = useState<SplitResultInfo | null>(null);

    const [rejectOpen, setRejectOpen] = useState(false);
    const lastRealtimeToastRef = useRef<{ eventName: string; at: number } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setLoading(true);
            const res = await wmInventoryService.getOutboundById(token, ticketId);
            const item = (res as any)?.data ?? res;
            setData(item);
            // Init picking data if available
            const pickListDetails = item?.pick_lists?.[0]?.details ?? [];
            if (pickListDetails.length) {
                const map: Record<string, number> = {};
                pickListDetails.forEach((d: any) => { map[d.id] = Number(d.picked_qty) || 0; });
                setPickedQty(map);
            }
            if (item?.details) {
                const map: Record<string, { checked_qty: number; passed: boolean }> = {};
                item.details.forEach((d: any) => { map[d.id] = { checked_qty: d.checked_qty ?? d.quantity ?? 0, passed: d.passed ?? true }; });
                setCheckingData(map);
            }
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    useEffect(() => {
        setSplitResult(null);
        fetchData();
    }, [fetchData]);

    useApprovalDetailRealtime({
        ticketId,
        events: OUTBOUND_DETAIL_REALTIME_EVENTS,
        onRefresh: fetchData,
        getEventTicketId: (payload) => {
            const data = payload as { exportId?: string; splitExportId?: string } | undefined;
            return data?.splitExportId || data?.exportId;
        },
        onMatchedEvent: (eventName) => {
            const now = Date.now();
            const lastToast = lastRealtimeToastRef.current;
            if (lastToast && lastToast.eventName === eventName && now - lastToast.at < 1500) {
                return;
            }

            const message = OUTBOUND_REALTIME_TOAST_MESSAGES[eventName];
            if (message) {
                showToast(message, "success");
                lastRealtimeToastRef.current = { eventName, at: now };
            }
        },
    });

    const getToken = () => {
        const t = authStorage.getAccessToken();
        if (!t) { showToast("Phiên đăng nhập hết hạn", "error"); return null; }
        return t;
    };

    // Stock availability check (from product data)
    const getStockInfo = (detail: any) => {
        const requested = detail.quantity || 0;
        const available = (detail.product as any)?.quantity_available ?? requested;
        const sufficient = available >= requested;
        const ratio = requested > 0 ? Math.min(available / requested, 1) : 0;
        let barClass = "approval-stock-bar__fill--ok";
        if (ratio < 1) barClass = "approval-stock-bar__fill--danger";
        else if (ratio < 1.2) barClass = "approval-stock-bar__fill--warning";
        return { requested, available, ratio, sufficient, barClass };
    };

    const hasInsufficientStock = data?.details?.some(d => !getStockInfo(d).sufficient);

    // ── PENDING: Approve ──
    const handleApproveOutbound = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            const pickingStrategy = strategy === "NEAREST" ? "FEFO" : strategy;
            await wmInventoryService.approveOutbound(token, ticketId, { picking_strategy: pickingStrategy as "FEFO" | "FIFO" });
            showToast("Đã duyệt lệnh xuất — chuyển sang Đang nhặt hàng", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể duyệt phiếu xuất", "error");
        } finally { setSubmitting(false); }
    };

    // ── PENDING: Reject ──
    const handleRejectConfirm = async (_cat: string, reason: string) => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await wmInventoryService.rejectOutbound(token, ticketId, reason);
            showToast(`Đã từ chối phiếu xuất — Lý do: ${reason}`, "success");
            setRejectOpen(false);
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể từ chối phiếu xuất", "error");
            setRejectOpen(false);
            fetchData();
        } finally { setSubmitting(false); }
    };

    // ── PICKING: Confirm picking ──
    const handleConfirmPicking = async () => {
        const token = getToken(); if (!token) return;
        // Kiểm tra tất cả số lượng nhặt phải lớn hơn 0
        const allPickedPositive = Object.values(pickedQty).every(qty => qty > 0);
        if (!allPickedPositive) {
            showToast("Số lượng nhặt phải lớn hơn 0 cho tất cả sản phẩm", "error");
            return;
        }
        setSubmitting(true);
        try {
            const details = Object.entries(pickedQty).map(([pick_list_detail_id, qty]) => ({
                pick_list_detail_id,
                picked_qty: qty,
            }));
            await wmInventoryService.confirmPicking(token, ticketId, { details });
            showToast("Đã xác nhận nhặt hàng — chuyển sang Đang kiểm tra", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể xác nhận nhặt hàng", "error");
            if (err.status === 403) {
                authStorage.clearTokens();
                window.location.href = '/auth/login';
                return;
            }
            fetchData();
        } finally { setSubmitting(false); }
    };

    // ── CHECKING: Confirm checking ──
    const handleConfirmChecking = async () => {
        const token = getToken(); if (!token) return;
        // Kiểm tra tất cả số lượng kiểm tra phải lớn hơn 0
        const allCheckedPositive = Object.values(checkingData).every(d => d.checked_qty > 0);
        if (!allCheckedPositive) {
            showToast("Số lượng kiểm tra phải lớn hơn 0 cho tất cả sản phẩm", "error");
            return;
        }
        // Kiểm tra chênh lệch giữa số lượng kiểm thực tế và số lượng yêu cầu
        const hasMismatch = data?.details?.some(d => {
            const cd = checkingData[d.id];
            return cd && cd.checked_qty !== (d.quantity || 0);
        });
        if (hasMismatch && !checkingMismatchAcknowledged) {
            setCheckingMismatchAcknowledged(true);
            showToast("Số lượng kiểm thực tế không khớp với yêu cầu. Vui lòng xem cảnh báo bên dưới và xác nhận tiếp tục.", "error");
            return;
        }
        setSubmitting(true);
        try {
            const details = Object.entries(checkingData).map(([export_detail_id, d]) => ({
                export_detail_id,
                checked_qty: d.checked_qty,
                passed: d.passed,
            }));
            await wmInventoryService.confirmChecking(token, ticketId, { details });
            showToast("Đã xác nhận kiểm tra — chuyển sang Đóng gói", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể xác nhận kiểm tra", "error");
            if (err.status === 403) {
                authStorage.clearTokens();
                window.location.href = '/auth/login';
                return;
            }
            fetchData();
        } finally { setSubmitting(false); }
    };

    // ── PACKED: Complete shipment ──
    const handleCompleteShipment = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await wmInventoryService.completeShipment(token, ticketId, {});
            showToast("Hoàn tất xuất kho! Hàng đã được giao cho vận chuyển.", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể hoàn tất xuất kho", "error");
        } finally { setSubmitting(false); }
    };

    const handleSplitOrder = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            const res = await wmInventoryService.splitOutbound(token, ticketId);
            const splitData = (res as any)?.data;
            setSplitResult(splitData || null);
            if (splitData?.split_export_code) {
                showToast(`Đã tách phiếu thành công: ${splitData.split_export_code}`, "success");
            } else {
                showToast("Đã tách phiếu xuất thành công", "success");
            }
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể tách phiếu xuất", "error");
        } finally { setSubmitting(false); }
    };

    const handleOpenSplitTicket = async () => {
        if (!splitResult?.split_export_id || !onOpenSplitTicket) return;
        try {
            await onOpenSplitTicket(splitResult.split_export_id);
        } catch {
            showToast("Không thể mở phiếu mới vừa tách", "error");
        }
    };

    // ── PICKING → PENDING (undo approval) ──
    const handleRevertToPending = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await wmInventoryService.revertOutboundToPending(token, ticketId);
            showToast("Đã quay lại bước Chờ duyệt", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể hoàn tác bước duyệt", "error");
        } finally { setSubmitting(false); }
    };

    // ── CHECKING → PICKING (undo picking confirmation) ──
    const handleRevertToPicking = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await wmInventoryService.revertOutboundToPicking(token, ticketId);
            showToast("Đã quay lại bước Nhặt hàng", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể hoàn tác bước nhặt hàng", "error");
        } finally { setSubmitting(false); }
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

    const statusInfo = STATUS_LABELS[data.status] ?? { label: data.status, color: "bg-muted text-muted-foreground" };

    return (
        <div className="flex flex-col h-full">
            {/* ── Header ── */}
            <div className="px-4 py-3 border-b">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-[20px] font-bold leading-[130%]">{data.code}</h2>
                            <Badge variant="outline" className="rounded-full px-3 py-0.5 text-xs font-normal approval-type--outbound">
                                Xuất kho
                            </Badge>
                            <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-xs font-normal ${statusInfo.color}`}>
                                {statusInfo.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {data.warehouse?.name || "—"} • {data.partner?.name || "—"} • {formatDate(data.created_at)}
                        </p>
                        {splitResult?.split_export_code && (
                            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                                <p className="text-xs font-semibold text-emerald-700">
                                    Đã tách phiếu thành công
                                </p>
                                <p className="text-xs text-emerald-700/90 mt-0.5">
                                    Phiếu mới: <strong>{splitResult.split_export_code}</strong>
                                    {typeof splitResult.moved_detail_count === "number" && (
                                        <> • Đã tách {splitResult.moved_detail_count} dòng thiếu tồn</>
                                    )}
                                    {typeof splitResult.kept_detail_count === "number" && (
                                        <> • Giữ lại {splitResult.kept_detail_count} dòng đủ tồn</>
                                    )}
                                </p>
                                {!!splitResult.split_export_id && !!onOpenSplitTicket && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 h-7 rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                        onClick={handleOpenSplitTicket}
                                    >
                                        Mở phiếu mới
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 rounded-xl shrink-0 self-start">
                        <PrinterIcon className="w-4 h-4" />In phiếu
                    </Button>
                </div>
                {data.sales_order_code && (
                    <p className="text-xs text-muted-foreground mt-2">Mã SO: <strong>{data.sales_order_code}</strong></p>
                )}
            </div>

            {/* ── Stepper (hide for cancelled/shipped) ── */}
            {data.status !== "CANCELLED" && <StepBar status={data.status} />}

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto">

                {/* ─── PENDING ─── */}
                {data.status === "PENDING" && (
                    <div className="flex flex-col gap-0">
                        {/* Strategy selector */}
                        <div className="px-4 pt-4">
                            <h3 className="text-[15px] font-semibold mb-2">Chiến lược xuất hàng</h3>
                            <div className="approval-strategy">
                                {STRATEGY_OPTIONS.map(opt => (
                                    <button key={opt.value}
                                        className={`approval-strategy__option ${strategy === opt.value ? "approval-strategy__option--active" : ""}`}
                                        onClick={() => setStrategy(opt.value)}>
                                        <div className="approval-strategy__option-title">{opt.title}</div>
                                        <div className="approval-strategy__option-desc">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stock check table */}
                        <div className="p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <h3 className="text-[15px] font-semibold">Kiểm tra tồn kho</h3>
                                {hasInsufficientStock && (
                                    <Badge className="bg-red-50 text-red-700 border-red-200 rounded-full shadow-none font-normal text-xs gap-1">
                                        <ExclamationTriangleIcon className="w-3 h-3" />Tồn kho không đủ
                                    </Badge>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[480px]">
                                    <thead className="bg-muted/30 border-b">
                                        <tr>
                                            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Sản phẩm</th>
                                            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">SKU</th>
                                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Yêu cầu</th>
                                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Khả dụng</th>
                                            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data.details?.length ? data.details.map(detail => {
                                            const stock = getStockInfo(detail);
                                            return (
                                                <tr key={detail.id} className={`transition-colors ${!stock.sufficient ? "approval-reconciliation__row--insufficient" : ""}`}>
                                                    <td className="py-2 px-3 text-sm font-medium">{detail.product?.name || "—"}</td>
                                                    <td className="py-2 px-3 text-sm text-muted-foreground">{detail.product?.sku || "—"}</td>
                                                    <td className="py-2 px-3 text-center font-semibold text-sm">{stock.requested}</td>
                                                    <td className="py-2 px-3 text-center text-sm">
                                                        <span className={stock.sufficient ? "text-green-600 font-medium" : "text-red-600 font-semibold"}>{stock.available}</span>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        {stock.sufficient ? (
                                                            <Badge className="bg-green-50 text-green-700 border-green-200 gap-1 rounded-full shadow-none font-normal text-xs">
                                                                <CheckCircleIcon className="w-3 h-3" />Đủ hàng
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-red-50 text-red-700 border-red-200 rounded-full shadow-none font-normal text-xs">
                                                                Thiếu {stock.requested - stock.available}
                                                            </Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan={5} className="py-10 text-center text-muted-foreground text-sm">Chưa có chi tiết</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {hasInsufficientStock && (
                                <Card className="border border-amber-200 bg-amber-50/50 rounded-2xl mt-4">
                                    <CardContent className="p-4 flex items-start gap-3">
                                        <BoltIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-amber-800">Tồn kho không đủ</p>
                                            <p className="text-xs text-amber-700">Bạn có thể tách phiếu để chỉ xuất sản phẩm đủ tồn kho.</p>
                                            <Button size="sm" variant="outline"
                                                className="gap-1 rounded-xl text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-100"
                                                onClick={handleSplitOrder}>
                                                <ScissorsIcon className="w-3.5 h-3.5" />Tách phiếu xuất
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

                                {/* ─── PICKING ─── */}
                {data.status === "PICKING" && (
                    <div className="p-4">
                        <h3 className="text-[15px] font-semibold mb-0.5">Nhặt hàng theo phiếu</h3>
                        <p className="text-xs text-muted-foreground mb-3">Nhập số lượng thực tế nhặt được cho từng dòng hàng.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[480px]">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Sản phẩm</th>
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Vị trí lấy hàng</th>
                                        <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">SL yêu cầu</th>
                                        <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">SL nhặt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(() => {
                                        const pickDetails = data.pick_lists?.[0]?.details ?? [];
                                        if (!pickDetails.length) {
                                            return <tr><td colSpan={4} className="py-10 text-center text-muted-foreground text-sm">Chưa có danh sách nhặt hàng</td></tr>;
                                        }

                                        // Group by (export_detail_id) so same product+batch shows as one row
                                        // with all block positions listed together
                                        const groups = new Map<string, { details: typeof pickDetails; productName: string; totalRequired: number }>();
                                        for (const d of pickDetails) {
                                            const key = d.export_detail_id ?? d.id;
                                            if (!groups.has(key)) {
                                                groups.set(key, {
                                                    details: [],
                                                    productName: d.export_detail?.product?.name ?? "—",
                                                    totalRequired: 0,
                                                });
                                            }
                                            const g = groups.get(key)!;
                                            g.details.push(d);
                                            g.totalRequired += Number(d.required_qty);
                                        }

                                        return Array.from(groups.values()).map((g, idx) => {
                                            const positions = g.details.map(d => d.block?.code).filter(Boolean) as string[];
                                            const uniquePositions = Array.from(new Set(positions));
                                            const totalPicked = g.details.reduce((sum, d) => sum + (pickedQty[d.id] ?? 0), 0);

                                            // Parse block code: B-ZONE-RACK-RACKID-ROW-SHELF-SLOT
                                            // Group by rack+shelf for compact display
                                            interface ShelfGroup { rack: string; shelf: string; slots: string[] }
                                            const shelfMap = new Map<string, ShelfGroup>();
                                            const unparsed: string[] = [];
                                            for (const code of uniquePositions) {
                                                const p = code.split('-');
                                                if (p.length >= 7) {
                                                    const rack = `${p[1]}-RACK-${p[3]}`;
                                                    const shelf = p[5];
                                                    const slot = p[6];
                                                    const key = `${rack}|${shelf}`;
                                                    if (!shelfMap.has(key)) shelfMap.set(key, { rack, shelf, slots: [] });
                                                    shelfMap.get(key)!.slots.push(slot);
                                                } else {
                                                    unparsed.push(code);
                                                }
                                            }
                                            // Sort slots numerically within each shelf group
                                            shelfMap.forEach(sg => sg.slots.sort((a, b) => Number(a) - Number(b)));

                                            return (
                                                <tr key={idx}>
                                                    <td className="py-2 px-3 text-sm font-medium">{g.productName}</td>
                                                    <td className="py-2 px-3">
                                                        {uniquePositions.length === 0 ? (
                                                            <span className="text-muted-foreground text-sm">—</span>
                                                        ) : (
                                                            <details className="group">
                                                                <summary className="list-none cursor-pointer select-none inline-flex items-center gap-1.5">
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-semibold">
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                                                        {uniquePositions.length} vị trí
                                                                    </span>
                                                                    <svg className="w-3 h-3 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                                                                </summary>
                                                                <div className="mt-2 space-y-1.5 pl-1">
                                                                    {Array.from(shelfMap.values()).map((sg, si) => (
                                                                        <div key={si} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                                                                            <span className="text-[11px] font-semibold text-slate-500 shrink-0 font-mono">{sg.rack} · T{sg.shelf}:</span>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {sg.slots.map((slot, si2) => (
                                                                                    <span key={si2} className="inline-flex items-center px-1.5 py-0 rounded border border-slate-200 bg-slate-50 text-[11px] font-mono font-medium text-slate-700">
                                                                                        Ô {slot}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {unparsed.map((code, ui) => (
                                                                        <span key={ui} className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-600">{code}</span>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-center text-sm font-semibold">{g.totalRequired}</td>
                                                    <td className="py-2 px-3 text-center">
                                                        <Input
                                                            type="number" min={0}
                                                            value={totalPicked}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                const details = g.details;
                                                                setPickedQty(p => {
                                                                    const next = { ...p };
                                                                    // rem must be inside the updater so React StrictMode
                                                                    // double-invocation doesn't corrupt the value
                                                                    let rem = val;
                                                                    details.forEach((d, i) => {
                                                                        const share = i === details.length - 1
                                                                            ? rem
                                                                            : Math.min(rem, Number(d.required_qty));
                                                                        next[d.id] = Math.max(0, share);
                                                                        rem -= next[d.id];
                                                                    });
                                                                    return next;
                                                                });
                                                            }}
                                                            className="w-20 h-8 rounded-xl text-center text-sm mx-auto"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {data.status === "CHECKING" && (
                    <div className="p-4">
                        <h3 className="text-[15px] font-semibold mb-0.5">Kiểm tra chất lượng</h3>
                        <p className="text-xs text-muted-foreground mb-3">Kiểm tra từng sản phẩm và đánh dấu đạt/không đạt.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[360px]">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Sản phẩm</th>
                                        <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">SL đặt</th>
                                        <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">SL kiểm</th>
                                        <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Đạt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.details?.length ? data.details.map(d => {
                                        const cd = checkingData[d.id] ?? { checked_qty: d.quantity || 0, passed: true };
                                        const isMismatch = cd.checked_qty !== (d.quantity || 0);
                                        return (
                                            <tr key={d.id} className={`transition-colors ${!cd.passed ? "approval-reconciliation__row--shortage" : isMismatch ? "bg-amber-50" : ""}`}>
                                                <td className="py-2 px-3 text-sm font-medium">{d.product?.name || "—"}</td>
                                                <td className="py-2 px-3 text-center text-sm font-semibold">{d.quantity}</td>
                                                <td className="py-2 px-3 text-center">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <Input type="number" min={0}
                                                            value={cd.checked_qty}
                                                            onChange={e => {
                                                                setCheckingMismatchAcknowledged(false);
                                                                setCheckingData(p => ({ ...p, [d.id]: { ...cd, checked_qty: parseInt(e.target.value) || 0 } }));
                                                            }}
                                                            className={`w-20 h-8 rounded-xl text-center text-sm mx-auto ${isMismatch ? "border-amber-400 focus-visible:ring-amber-400" : ""}`} />
                                                        {isMismatch && (
                                                            <span className="text-[10px] text-amber-600 font-medium">
                                                                {cd.checked_qty > (d.quantity || 0) ? `+${cd.checked_qty - (d.quantity || 0)}` : `${cd.checked_qty - (d.quantity || 0)}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    <Checkbox
                                                        checked={cd.passed}
                                                        onCheckedChange={v => setCheckingData(p => ({ ...p, [d.id]: { ...cd, passed: !!v } }))}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan={4} className="py-10 text-center text-muted-foreground text-sm">Chưa có chi tiết</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {checkingMismatchAcknowledged && (
                            <Card className="border border-amber-200 bg-amber-50/60 rounded-2xl mt-4">
                                <CardContent className="p-4 flex items-start gap-3">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-semibold text-amber-800">Cảnh báo: Số lượng không khớp</p>
                                        <p className="text-xs text-amber-700">
                                            Số lượng kiểm thực tế khác với số lượng yêu cầu trong phiếu xuất. Tồn kho sẽ được trừ theo số lượng thực tế kiểm đếm.
                                        </p>
                                        <div className="mt-2 space-y-1">
                                            {data.details?.filter(d => {
                                                const cd = checkingData[d.id];
                                                return cd && cd.checked_qty !== (d.quantity || 0);
                                            }).map(d => {
                                                const cd = checkingData[d.id];
                                                const diff = cd.checked_qty - (d.quantity || 0);
                                                return (
                                                    <p key={d.id} className="text-xs text-amber-700">
                                                        • <strong>{d.product?.name || "—"}</strong>: đặt {d.quantity}, kiểm {cd.checked_qty}{" "}
                                                        <span className={diff > 0 ? "text-blue-600 font-semibold" : "text-red-600 font-semibold"}>
                                                            ({diff > 0 ? "+" : ""}{diff})
                                                        </span>
                                                    </p>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-amber-700 font-medium pt-1">Nhấn &quot;Xác nhận kiểm tra&quot; lần nữa để tiếp tục.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* ─── PACKED ─── */}
                {data.status === "PACKED" && (
                    <div className="p-4">
                        <div className="flex flex-col items-center gap-3 text-center mb-4">
                            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
                                <TruckIcon className="w-7 h-7 text-orange-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-[15px]">Hàng đã đóng gói xong</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Nhấn bên dưới để hoàn tất xuất kho và bàn giao cho vận chuyển.
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[260px]">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Sản phẩm</th>
                                        <th className="text-center py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">SL xuất</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.details?.map(d => (
                                        <tr key={d.id}>
                                            <td className="py-2 px-4 text-sm text-left">{d.product?.name || "—"}</td>
                                            <td className="py-2 px-4 text-center font-semibold text-sm text-[#0F766E]">{d.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── SHIPPED ─── */}
                {data.status === "SHIPPED" && (
                    <div className="p-4 space-y-4">
                        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl p-4">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-green-800">Xuất kho hoàn tất!</p>
                                <p className="text-sm text-green-600 mt-0.5">
                                    Hàng đã xuất kho và bàn giao cho vận chuyển
                                    {(data as any).shipped_at && ` • ${formatDate((data as any).shipped_at)}`}
                                </p>
                            </div>
                        </div>

                        {/* Shipped goods summary */}
                        <h3 className="text-[15px] font-semibold">Danh sách hàng đã xuất</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[300px]">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Sản phẩm</th>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">SKU</th>
                                        <th className="text-center py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">SL xuất</th>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Đơn vị</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.details?.length ? data.details.map(d => (
                                        <tr key={d.id}>
                                            <td className="py-2 px-4 text-sm font-medium">{d.product?.name || "—"}</td>
                                            <td className="py-2 px-4 text-sm text-muted-foreground">{d.product?.sku || "—"}</td>
                                            <td className="py-2 px-4 text-center font-semibold text-sm text-[#0F766E]">{d.quantity}</td>
                                            <td className="py-2 px-4 text-sm text-muted-foreground">{(d as any).unit?.name || "—"}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="py-10 text-center text-muted-foreground text-sm">Chưa có chi tiết</td></tr>
                                    )}
                                </tbody>
                                {data.details && data.details.length > 0 && (
                                    <tfoot className="border-t bg-muted/20">
                                        <tr>
                                            <td colSpan={2} className="py-2 px-4 text-xs font-semibold text-muted-foreground">
                                                Tổng: {data.details.length} mặt hàng
                                            </td>
                                            <td className="py-2 px-4 text-center text-xs font-semibold text-slate-700">
                                                {data.details.reduce((s, d) => s + Number(d.quantity), 0)}
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {(data as any).tracking_number && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                <TruckIcon className="w-4 h-4 shrink-0" />
                                <span>Mã vận đơn: <strong>{(data as any).tracking_number}</strong></span>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── CANCELLED ─── */}
                {data.status === "CANCELLED" && (
                    <div className="p-4 flex flex-col items-center gap-3 text-center min-h-40 justify-center">
                        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                            <XCircleIcon className="w-8 h-8 text-red-500" />
                        </div>
                        <p className="font-bold text-[16px] text-red-600">Phiếu xuất đã bị hủy</p>
                    </div>
                )}
            </div>

            {/* ── Action Bar ── */}
            {data.status !== "SHIPPED" && data.status !== "CANCELLED" && (
                <div className="approval-actions">
                    {data.status === "PENDING" && (
                        <>
                            <Button variant="outline" disabled={submitting}
                                className="gap-2 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setRejectOpen(true)}>
                                Từ chối
                            </Button>
                            {hasInsufficientStock && (
                                <Button variant="outline" disabled={submitting}
                                    className="gap-2 rounded-xl"
                                    onClick={handleSplitOrder}>
                                    <ScissorsIcon className="w-4 h-4" />Tách phiếu
                                </Button>
                            )}
                            <Button disabled={submitting || !!hasInsufficientStock}
                                className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                onClick={handleApproveOutbound}>
                                <CheckCircleIcon className="w-4 h-4" />
                                {submitting ? "Đang duyệt..." : "Duyệt lệnh xuất"}
                            </Button>
                        </>
                    )}
                    {data.status === "PICKING" && (
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" disabled={submitting}
                                className="gap-2 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
                                onClick={handleRevertToPending}>
                                <ArrowLeftIcon className="w-4 h-4" />
                                {submitting ? "Đang xử lý..." : "Quay lại bước trước"}
                            </Button>
                            <Button disabled={submitting}
                                className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                onClick={handleConfirmPicking}>
                                <ArrowRightIcon className="w-4 h-4" />
                                {submitting ? "Đang xử lý..." : "Xác nhận nhặt hàng"}
                            </Button>
                        </div>
                    )}
                    {data.status === "CHECKING" && (
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" disabled={submitting}
                                className="gap-2 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
                                onClick={handleRevertToPicking}>
                                <ArrowLeftIcon className="w-4 h-4" />
                                {submitting ? "Đang xử lý..." : "Quay lại bước trước"}
                            </Button>
                            <Button disabled={submitting}
                                className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                onClick={handleConfirmChecking}>
                                <CheckCircleIcon className="w-4 h-4" />
                                {submitting ? "Đang xử lý..." : "Xác nhận kiểm tra"}
                            </Button>
                        </div>
                    )}
                    {data.status === "PACKED" && (
                        <Button disabled={submitting}
                            className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white ml-auto"
                            onClick={handleCompleteShipment}>
                            <TruckIcon className="w-4 h-4" />
                            {submitting ? "Đang xuất kho..." : "Hoàn tất xuất kho"}
                        </Button>
                    )}
                </div>
            )}

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
