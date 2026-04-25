"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { orgHelper } from "@/lib/organization.utils";
import { WarehouseManagerInventoryService } from "@/services/inventory/warehouse-manager-inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { InboundRequest } from "@/services/inventory/inventory.types";
import { useApprovalDetailRealtime } from "@/hooks/useApprovalDetailRealtime";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CheckCircleIcon,
    MapPinIcon,
    PrinterIcon,
    ExclamationTriangleIcon,
    ArrowRightIcon,
    ShieldExclamationIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    XMarkIcon,
    ArrowLeftIcon,
} from "@heroicons/react/24/outline";

import RejectReasonDialog from "./RejectReasonDialog";

const inventoryService = new WarehouseManagerInventoryService();

const INBOUND_DETAIL_REALTIME_EVENTS = [
    "inbound:approved",
    "inbound:cancelled",
    "inbound:receiving-started",
    "inbound:receiving-confirmed",
    "inbound:putaway-confirmed",
];

const INBOUND_REALTIME_TOAST_MESSAGES: Record<string, string> = {
    "inbound:approved": "Phiếu đã được duyệt",
    "inbound:cancelled": "Phiếu đã bị hủy",
    "inbound:receiving-started": "Đã bắt đầu kiểm đếm",
    "inbound:receiving-confirmed": "Đã xác nhận kiểm đếm",
    "inbound:putaway-confirmed": "Phiếu đã hoàn tất nhập kho",
};

// ─────────────────────────────────
// Helpers
// ─────────────────────────────────
function formatDate(dateStr?: string | null) {
    if (!dateStr) return "—";
    try {
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        }).format(new Date(dateStr));
    } catch { return "—"; }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Chờ duyệt", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    APPROVED: { label: "Đã duyệt", color: "bg-blue-50 text-blue-700 border-blue-200" },
    RECEIVING: { label: "Đang kiểm đếm", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    PROCESSING: { label: "Chờ cất hàng", color: "bg-purple-50 text-purple-700 border-purple-200" },
    PUTAWAY: { label: "Đang cất hàng", color: "bg-orange-50 text-orange-700 border-orange-200" },
    COMPLETED: { label: "Hoàn tất", color: "bg-green-50 text-green-700 border-green-200" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-700 border-red-200" },
};

const INBOUND_STEPS = [
    { key: "PENDING", label: "Chờ duyệt" },
    { key: "APPROVED", label: "Đã duyệt" },
    { key: "RECEIVING", label: "Kiểm đếm" },
    { key: "PROCESSING", label: "Cất hàng" },
    { key: "COMPLETED", label: "Hoàn tất" },
];

const STEP_ORDER = ["PENDING", "APPROVED", "RECEIVING", "PROCESSING", "COMPLETED"];

function StepBar({ status }: { status: string }) {
    const current = STEP_ORDER.indexOf(status);
    return (
        <div className="flex items-center gap-1 px-6 py-4 border-b bg-muted/20 overflow-x-auto">
            {INBOUND_STEPS.map((step, idx) => {
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
                        {idx < INBOUND_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 -mt-2.5 ${idx < current ? "bg-[#0F766E]" : "bg-muted-foreground/20"}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
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
    const [submitting, setSubmitting] = useState(false);

    // Actual qty for RECEIVING step
    const [actualQty, setActualQty] = useState<Record<string, number>>({});

    const [rejectOpen, setRejectOpen] = useState(false);

    // Mismatch modal state
    interface MismatchItem {
        detail_id: string;
        product_id: string;
        expected_qty: number;
        actual_qty: number;
        diff: number;
    }
    const [mismatchModal, setMismatchModal] = useState<{
        open: boolean;
        mismatches: MismatchItem[];
        pendingDetails: { detail_id: string; actual_qty: number }[];
    }>({ open: false, mismatches: [], pendingDetails: [] });
    const lastRealtimeToastRef = useRef<{ eventName: string; at: number } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setLoading(true);
            const res = await inventoryService.getInboundById(token, ticketId);
            const item = (res as any)?.data ?? res;
            setData(item);
            if (item?.details) {
                const map: Record<string, number> = {};
                item.details.forEach((d: any) => { map[d.id] = d.actual_qty ?? d.expected_qty ?? 0; });
                setActualQty(map);
            }
        } catch {
            showToast("Không thể tải chi tiết phiếu PO", "error");
        } finally {
            setLoading(false);
        }
    }, [ticketId, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useApprovalDetailRealtime({
        ticketId,
        events: INBOUND_DETAIL_REALTIME_EVENTS,
        onRefresh: fetchData,
        getEventTicketId: (payload) => {
            const data = payload as { receiptId?: string } | undefined;
            return data?.receiptId;
        },
        onMatchedEvent: (eventName) => {
            const now = Date.now();
            const lastToast = lastRealtimeToastRef.current;
            if (lastToast && lastToast.eventName === eventName && now - lastToast.at < 1500) {
                return;
            }

            const message = INBOUND_REALTIME_TOAST_MESSAGES[eventName];
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

    const handleApprove = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await inventoryService.approveInbound(token, ticketId);
            showToast("Duyệt phiếu PO thành công — chuyển sang Đã duyệt", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể duyệt phiếu", "error");
        } finally { setSubmitting(false); }
    };

    const handleRejectConfirm = async (_cat: string, reason: string) => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await inventoryService.rejectInbound(token, ticketId, reason);
            showToast(`Đã từ chối phiếu — Lý do: ${reason}`, "success");
            setRejectOpen(false);
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể từ chối phiếu", "error");
            setRejectOpen(false);
            fetchData();
        } finally { setSubmitting(false); }
    };

    const handleStartReceiving = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await inventoryService.startReceiving(token, ticketId, {});
            showToast("Đã bắt đầu kiểm đếm — chuyển sang Đang kiểm đếm", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể bắt đầu kiểm đếm", "error");
            fetchData();
        } finally { setSubmitting(false); }
    };

    const handleConfirmReceiving = async (is_customer_agreed?: boolean, notes?: string) => {
        const token = getToken(); if (!token) return;
        if (!data?.details?.length) return;
        setSubmitting(true);
        try {
            // Khi gọi từ mismatch modal (is_customer_agreed xác định), dùng pendingDetails đã
            // được capture trước khi fetchData() reset actualQty state.
            const details = (is_customer_agreed !== undefined && mismatchModal.pendingDetails.length > 0)
                ? mismatchModal.pendingDetails
                : data.details.map(d => ({
                    detail_id: d.id,
                    actual_qty: actualQty[d.id] ?? d.actual_qty ?? 0,
                }));
            const payload: { details: typeof details; is_customer_agreed?: boolean; notes?: string } = { details };
            if (is_customer_agreed !== undefined) payload.is_customer_agreed = is_customer_agreed;
            if (notes) payload.notes = notes;
            await inventoryService.confirmReceiving(token, ticketId, payload);
            setMismatchModal({ open: false, mismatches: [], pendingDetails: [] });
            if (is_customer_agreed === false) {
                showToast("Đã thông báo cho khách hàng — Phiếu nhập bị hủy do lệch số lượng", "error");
            } else {
                showToast("Đã xác nhận kiểm đếm — chuyển sang Chờ cất hàng", "success");
            }
            fetchData();
        } catch (err: any) {
            if (err.require_customer_agreement && err.mismatches?.length) {
                // Server yêu cầu xác nhận KH — capture details trước khi fetchData() reset state
                const details = data.details.map(d => ({
                    detail_id: d.id,
                    actual_qty: actualQty[d.id] ?? d.actual_qty ?? 0,
                }));
                setMismatchModal({ open: true, mismatches: err.mismatches, pendingDetails: details });
            } else {
                showToast(err.message || "Không thể xác nhận kiểm đếm", "error");
            }
            fetchData();
        } finally { setSubmitting(false); }
    };

    const handleConfirmPutaway = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await inventoryService.confirmPutaway(token, ticketId);
            showToast("Đã xác nhận cất hàng — phiếu PO Hoàn tất!", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể xác nhận cất hàng", "error");
            fetchData();
        } finally { setSubmitting(false); }
    };

    const handleRefillInventory = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await inventoryService.refillInventory(token, ticketId);
            showToast("Đã bổ sung tồn kho thành công!", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể bổ sung tồn kho", "error");
            if (err.status === 403) {
                authStorage.clearTokens();
                window.location.href = '/auth/login';
                return;
            }
            fetchData();
        } finally { setSubmitting(false); }
    };

    // Tự tạo helper revert cục bộ để gọi đúng endpoint backend yêu cầu (PATCH)
    const revertSteps = async (urlSuffix: string, errorMessage: string, successMessage: string) => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations/${orgId}/inventory/inbound/${ticketId}/${urlSuffix}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error(errorMessage);
            showToast(successMessage, "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || errorMessage, "error");
        } finally { setSubmitting(false); }
    };

    const handleRevertToApproved = () => revertSteps('revert-to-approved', 'Không thể hoàn tác bước kiểm đếm', 'Đã quay lại bước Đã duyệt');
    const handleRevertToReceiving = () => revertSteps('revert-to-receiving', 'Không thể hoàn tác bước cất hàng', 'Đã quay lại bước Kiểm đếm');

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
                <p className="text-muted-foreground">Không tìm thấy phiếu PO</p>
            </div>
        );
    }

    const statusInfo = STATUS_LABELS[data.status] ?? { label: data.status, color: "bg-muted text-muted-foreground" };

    return (
        <div className="flex flex-col h-full">
            {/* ── Mismatch Confirmation Modal ── */}
            {mismatchModal.open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mismatch-title"
                >
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
                            </div>
                            <div className="flex-1">
                                <h3 id="mismatch-title" className="text-base font-bold text-slate-800">
                                    Số lượng thực tế khác phiếu
                                </h3>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {mismatchModal.mismatches.length} sản phẩm lệch số lượng. Cần xác nhận với khách hàng trước khi tiếp tục.
                                </p>
                            </div>
                            <button
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                                onClick={() => setMismatchModal(s => ({ ...s, open: false }))}
                                aria-label="Đóng"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Mismatch table */}
                        <div className="px-6 py-4 max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-center pb-2 text-xs font-semibold text-muted-foreground uppercase">Sản phẩm</th>
                                        <th className="text-center pb-2 text-xs font-semibold text-muted-foreground uppercase">Dự kiến</th>
                                        <th className="text-center pb-2 text-xs font-semibold text-muted-foreground uppercase">Thực tế</th>
                                        <th className="text-center pb-2 text-xs font-semibold text-muted-foreground uppercase">Chênh lệch</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {mismatchModal.mismatches.map((m) => {
                                        const detail = data?.details?.find(d => d.id === m.detail_id);
                                        const isOver = m.diff > 0;
                                        return (
                                            <tr key={m.detail_id} className={isOver ? "bg-blue-50/30" : "bg-red-50/30"}>
                                                <td className="py-2.5 font-medium text-slate-700">
                                                    {detail?.product?.name ?? "—"}
                                                    {detail?.product?.sku && (
                                                        <span className="ml-1.5 text-xs text-muted-foreground font-normal">{detail.product.sku}</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 text-center text-slate-600">{m.expected_qty}</td>
                                                <td className="py-2.5 text-center font-semibold text-slate-800">{m.actual_qty}</td>
                                                <td className="py-2.5 text-center">
                                                    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${isOver ? "text-blue-600" : "text-red-500"
                                                        }`}>
                                                        {isOver
                                                            ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                                                            : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
                                                        }
                                                        {isOver ? "+" : ""}{m.diff}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6 pt-4 bg-slate-50 border-t flex flex-col gap-2.5">
                            <p className="text-xs text-muted-foreground text-center mb-1">
                                Chọn thao tác xử lý khi số lượng thực tế sai lệch:
                            </p>
                            <button
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-semibold transition-colors disabled:opacity-50"
                                onClick={() => handleConfirmReceiving(false)}
                            >
                                <XMarkIcon className="w-4 h-4 shrink-0" />
                                <span className="truncate">Thông báo cho khách hàng</span>
                            </button>
                            <button
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                                onClick={() => handleConfirmReceiving(true, "Tiếp tục xác nhận nhập hoàn thành đơn PO với số lượng thực tế thiếu")}
                            >
                                <CheckCircleIcon className="w-4 h-4 shrink-0" />
                                <span className="truncate">Tiếp tục xác nhận nhập hoàn thành đơn PO (SL thiếu)</span>
                            </button>
                            <button
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                                onClick={() => handleConfirmReceiving(true, "Xác nhận nhập và thông báo lại nhà cung cấp để đơn sau nhập kèm số lượng thiếu")}
                            >
                                <CheckCircleIcon className="w-4 h-4 shrink-0" />
                                <span className="truncate">Xác nhận nhập & thông báo NCC nhập bù đơn sau</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <div className="p-6 border-b">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-[20px] font-bold leading-[130%]">{data.code}</h2>
                            <Badge variant="outline" className="rounded-full px-3 py-0.5 text-xs font-normal approval-type--inbound">
                                Nhập kho
                            </Badge>
                            <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-xs font-normal ${statusInfo.color}`}>
                                {statusInfo.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {data.warehouse?.name || "—"} • {data.partner?.name || "—"} • {formatDate(data.created_at)}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                        <PrinterIcon className="w-4 h-4" />In phiếu
                    </Button>
                </div>
                {data.purchase_order_code && (
                    <p className="text-xs text-muted-foreground mt-2">Mã PO: <strong>{data.purchase_order_code}</strong></p>
                )}
                {data.notes && (
                    <p className="text-xs text-muted-foreground mt-1">Ghi chú: {data.notes}</p>
                )}
            </div>

            {/* ── Stepper (hide for cancelled) ── */}
            {data.status !== "CANCELLED" && <StepBar status={data.status} />}

            {/* ── Body (status-specific) ── */}
            <div className="flex-1 overflow-y-auto">

                {/* ─── PENDING ─── */}
                {data.status === "PENDING" && (
                    <div className="p-6">
                        <h3 className="text-[15px] font-semibold mb-4">Danh sách hàng hoá yêu cầu nhập</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Sản phẩm</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">SKU</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Lô hàng</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">SL dự kiến</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Đơn vị</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.details?.length ? data.details.map(d => (
                                        <tr key={d.id}>
                                            <td className="py-3 px-4 text-sm font-medium">{d.product?.name || "—"}</td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">{d.product?.sku || "—"}</td>
                                            <td className="py-3 px-4 text-sm">{d.batch?.code || "—"}</td>
                                            <td className="py-3 px-4 text-center font-semibold text-sm">{d.expected_qty}</td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">{(d as any).unit?.name || "—"}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="py-10 text-center text-muted-foreground text-sm">Chưa có chi tiết hàng hoá</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── APPROVED ─── */}
                {data.status === "APPROVED" && (
                    <div className="p-6 flex flex-col items-center justify-center gap-4 text-center min-h-50">
                        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                            <CheckCircleIcon className="w-7 h-7 text-blue-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-[15px]">Phiếu đã được duyệt</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Duyệt lúc: {formatDate((data as any).approved_at)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Nhấn bên dưới để bắt đầu quá trình kiểm đếm hàng hoá.
                            </p>
                        </div>
                    </div>
                )}

                {/* ─── RECEIVING ─── */}
                {data.status === "RECEIVING" && (
                    <div className="p-6">
                        <h3 className="text-[15px] font-semibold mb-1">Kiểm đếm số lượng thực tế</h3>
                        <p className="text-xs text-muted-foreground mb-4">Nhập số lượng thực tế nhận được cho từng sản phẩm.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Sản phẩm</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">SKU</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Lô hàng</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">SL dự kiến</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">SL thực tế</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Trạng thái</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.details?.length ? data.details.map(d => {
                                        const qty = actualQty[d.id] ?? d.expected_qty ?? 0;
                                        const isMatch = qty === d.expected_qty;
                                        const rowClass = qty === 0 ? "" :
                                            isMatch ? "approval-reconciliation__row--match" :
                                                qty < d.expected_qty ? "approval-reconciliation__row--shortage" :
                                                    "approval-reconciliation__row--critical";
                                        return (
                                            <tr key={d.id} className={`transition-colors ${rowClass}`}>
                                                <td className="py-3 px-4 text-sm font-medium">{d.product?.name || "—"}</td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">{d.product?.sku || "—"}</td>
                                                <td className="py-3 px-4 text-sm">{d.batch?.code || "—"}</td>
                                                <td className="py-3 px-4 text-center font-semibold text-sm">{d.expected_qty}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <Input
                                                        type="number" min={0}
                                                        value={qty}
                                                        onChange={e => setActualQty(p => ({ ...p, [d.id]: parseInt(e.target.value) || 0 }))}
                                                        className="w-20 h-8 rounded-xl text-center text-sm mx-auto"
                                                    />
                                                </td>
                                                <td className="py-3 px-4">
                                                    {qty === 0 ? (
                                                        <span className="text-xs text-muted-foreground">Chưa kiểm</span>
                                                    ) : isMatch ? (
                                                        <Badge className="bg-green-50 text-green-700 border-green-200 gap-1 rounded-full shadow-none font-normal text-xs">
                                                            <CheckCircleIcon className="w-3 h-3" />Khớp
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 rounded-full shadow-none font-normal text-xs">
                                                            Lệch {Math.abs(qty - d.expected_qty)}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Button variant="ghost" size="sm"
                                                        className="gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl h-7">
                                                        <ShieldExclamationIcon className="w-3.5 h-3.5" />Biệt trữ
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan={7} className="py-10 text-center text-muted-foreground text-sm">Chưa có chi tiết</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── PROCESSING ─── */}
                {data.status === "PROCESSING" && (
                    <div className="p-6">
                        <h3 className="text-[15px] font-semibold mb-1">Kết quả kiểm đếm</h3>
                        <p className="text-xs text-muted-foreground mb-4">Kiểm đếm hoàn tất. Hàng sẵn sàng được cất vào kho.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Sản phẩm</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Lô hàng</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">SL dự kiến</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">SL thực nhận</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Gợi ý vị trí</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.details?.map((d, i) => {
                                        const locs = ["A1", "A2", "B1", "B2", "C1", "C2"];
                                        return (
                                            <tr key={d.id}>
                                                <td className="py-3 px-4 text-sm font-medium">{d.product?.name || "—"}</td>
                                                <td className="py-3 px-4 text-sm">{d.batch?.code || "—"}</td>
                                                <td className="py-3 px-4 text-center text-sm">{d.expected_qty}</td>
                                                <td className="py-3 px-4 text-center font-semibold text-sm text-[#0F766E]">{d.actual_qty ?? d.expected_qty}</td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border rounded-lg px-2 py-1">
                                                        <MapPinIcon className="w-3 h-3" />Ô {locs[i % locs.length]}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── COMPLETED ─── */}
                {data.status === "COMPLETED" && (
                    <div className="p-6 flex flex-col items-center gap-4 text-center min-h-50 justify-center">
                        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                            <CheckCircleIcon className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                            <p className="font-bold text-[16px] text-green-700">Phiếu PO hoàn tất!</p>
                            <p className="text-sm text-muted-foreground mt-1">Hàng đã được nhập kho và lưu vào hệ thống tồn kho.</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={submitting}
                            onClick={handleRefillInventory}
                            className="gap-2 text-[#0F766E] border-[#0F766E]/30 hover:bg-[#0F766E]/5"
                        >
                            {submitting ? "Đang xử lý..." : "Bổ sung tồn kho (nếu thiếu)"}
                        </Button>
                        <div className="overflow-x-auto w-full mt-2">
                            <table className="w-full">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Sản phẩm</th>
                                        <th className="text-center py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">SL nhập</th>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Lô hàng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.details?.map(d => (
                                        <tr key={d.id}>
                                            <td className="py-2 px-4 text-left text-sm">{d.product?.name || "—"}</td>
                                            <td className="py-2 px-4 text-center font-semibold text-sm text-[#0F766E]">{d.actual_qty ?? d.expected_qty}</td>
                                            <td className="py-2 px-4 text-left text-sm text-muted-foreground">{d.batch?.code || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── CANCELLED ─── */}
                {data.status === "CANCELLED" && (
                    <div className="p-6 flex flex-col items-center gap-4 text-center min-h-50 justify-center">
                        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                            <p className="font-bold text-[16px] text-red-600">Phiếu đã bị hủy</p>
                            {data.notes && <p className="text-sm text-muted-foreground mt-1">Lý do: {data.notes}</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Action Bar (status-driven) ── */}
            {data.status !== "COMPLETED" && data.status !== "CANCELLED" && (
                <div className="approval-actions">
                    {data.status === "PENDING" && (
                        <>
                            <Button variant="outline" disabled={submitting}
                                className="gap-2 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setRejectOpen(true)}>
                                Từ chối
                            </Button>
                            <Button disabled={submitting}
                                className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                onClick={handleApprove}>
                                <CheckCircleIcon className="w-4 h-4" />
                                {submitting ? "Đang duyệt..." : "Duyệt phiếu"}
                            </Button>
                        </>
                    )}
                    {data.status === "APPROVED" && (
                        <Button disabled={submitting}
                            className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white ml-auto"
                            onClick={handleStartReceiving}>
                            <ArrowRightIcon className="w-4 h-4" />
                            {submitting ? "Đang xử lý..." : "Bắt đầu kiểm đếm"}
                        </Button>
                    )}
                    {data.status === "RECEIVING" && (
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" disabled={submitting}
                                className="gap-2 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
                                onClick={handleRevertToApproved}>
                                <ArrowLeftIcon className="w-4 h-4" />
                                {submitting ? "Đang xử lý..." : "Quay lại bước trước"}
                            </Button>
                            <Button disabled={submitting}
                                className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                onClick={() => handleConfirmReceiving()}>
                                <CheckCircleIcon className="w-4 h-4" />
                                {submitting ? "Đang xử lý..." : "Xác nhận kiểm đếm"}
                            </Button>
                        </div>
                    )}
                    {data.status === "PROCESSING" && (
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" disabled={submitting}
                                className="gap-2 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
                                onClick={handleRevertToReceiving}>
                                <ArrowLeftIcon className="w-4 h-4" />
                                {submitting ? "Đang xử lý..." : "Quay lại bước trước"}
                            </Button>
                            <Button disabled={submitting}
                                className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                onClick={() => handleConfirmPutaway()}>
                                <CheckCircleIcon className="w-4 h-4" />
                                {submitting ? "Đang cất hàng..." : "Xác nhận cất hàng vào kho"}
                            </Button>
                        </div>
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
