"use client";

import React, { useState, useCallback, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { WarehouseManagerInventoryService } from "@/services/inventory/warehouse-manager-inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { InboundRequest } from "@/services/inventory/inventory.types";

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
} from "@heroicons/react/24/outline";

import RejectReasonDialog from "./RejectReasonDialog";

const inventoryService = new InventoryService();
const wmInventoryService = new WarehouseManagerInventoryService();

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
    PENDING:    { label: "Chờ duyệt",       color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    APPROVED:   { label: "Đã duyệt",         color: "bg-blue-50 text-blue-700 border-blue-200" },
    RECEIVING:  { label: "Đang kiểm đếm",    color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    PROCESSING: { label: "Chờ cất hàng",     color: "bg-purple-50 text-purple-700 border-purple-200" },
    PUTAWAY:    { label: "Đang cất hàng",    color: "bg-orange-50 text-orange-700 border-orange-200" },
    COMPLETED:  { label: "Hoàn tất",         color: "bg-green-50 text-green-700 border-green-200" },
    CANCELLED:  { label: "Đã huỷ",           color: "bg-red-50 text-red-700 border-red-200" },
};

const INBOUND_STEPS = [
    { key: "PENDING",    label: "Chờ duyệt" },
    { key: "APPROVED",   label: "Đã duyệt" },
    { key: "RECEIVING",  label: "Kiểm đếm" },
    { key: "PROCESSING", label: "Cất hàng" },
    { key: "COMPLETED",  label: "Hoàn tất" },
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
                                ${ done ? "bg-[#0F766E] border-[#0F766E] text-white" :
                                  active ? "bg-white border-[#0F766E] text-[#0F766E]" :
                                  "bg-white border-muted-foreground/30 text-muted-foreground/50"}` }>
                                {done ? <CheckCircleIcon className="w-4 h-4" /> : idx + 1}
                            </div>
                            <span className={`text-[10px] mt-1 text-center ${ active ? "font-semibold text-[#0F766E]" : done ? "text-[#0F766E]" : "text-muted-foreground/50"}`}>
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

    const fetchData = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setLoading(true);
            const res = await wmInventoryService.getInboundById(token, ticketId);
            const item = (res as any)?.data ?? res;
            setData(item);
            if (item?.details) {
                const map: Record<string, number> = {};
                item.details.forEach((d: any) => { map[d.id] = d.actual_qty ?? d.expected_qty ?? 0; });
                setActualQty(map);
            }
        } catch {
            showToast("Không thể tải chi tiết phiếu nhập", "error");
        } finally {
            setLoading(false);
        }
    }, [ticketId, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getToken = () => {
        const t = authStorage.getAccessToken();
        if (!t) { showToast("Phiên đăng nhập hết hạn", "error"); return null; }
        return t;
    };

    const handleApprove = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            const actual_quantities = data?.details?.map((d) => ({
                detail_id: d.id,
                actual_qty: actualQty[d.id] ?? d.expected_qty,
            }));
            await wmInventoryService.approveInbound(token, ticketId, { actual_quantities });
            showToast("Duyệt phiếu nhập thành công — chuyển sang Đã duyệt", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể duyệt phiếu", "error");
        } finally { setSubmitting(false); }
    };

    const handleRejectConfirm = async (_cat: string, reason: string) => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await wmInventoryService.rejectInbound(token, ticketId, reason);
            showToast(`Đã từ chối phiếu — Lý do: ${reason}`, "success");
            setRejectOpen(false);
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể từ chối phiếu", "error");
        } finally { setSubmitting(false); }
    };

    const handleStartReceiving = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await wmInventoryService.startReceiving(token, ticketId, {});
            showToast("Đã bắt đầu kiểm đếm — chuyển sang Đang kiểm đếm", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể bắt đầu kiểm đếm", "error");
        } finally { setSubmitting(false); }
    };

    const handleConfirmReceiving = async () => {
        const token = getToken(); if (!token) return;
        if (!data?.details?.length) return;
        setSubmitting(true);
        try {
            const details = data.details.map(d => ({
                detail_id: d.id,
                actual_qty: actualQty[d.id] ?? d.actual_qty ?? 0,
            }));
            await wmInventoryService.confirmReceiving(token, ticketId, { details });
            showToast("Đã xác nhận kiểm đếm — chuyển sang Chờ cất hàng", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể xác nhận kiểm đếm", "error");
        } finally { setSubmitting(false); }
    };

    const handleConfirmPutaway = async () => {
        const token = getToken(); if (!token) return;
        setSubmitting(true);
        try {
            await wmInventoryService.confirmPutaway(token, ticketId, {});
            showToast("Đã xác nhận cất hàng — phiếu nhập Hoàn tất!", "success");
            fetchData();
        } catch (err: any) {
            showToast(err.message || "Không thể xác nhận cất hàng", "error");
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
        } finally { setSubmitting(false); }
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

    const statusInfo = STATUS_LABELS[data.status] ?? { label: data.status, color: "bg-muted text-muted-foreground" };

    return (
        <div className="flex flex-col h-full">
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
                                        const locs = ["A1","A2","B1","B2","C1","C2"];
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
                            <p className="font-bold text-[16px] text-green-700">Phiếu nhập hoàn tất!</p>
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
                                            <td className="py-2 px-4 text-sm">{d.product?.name || "—"}</td>
                                            <td className="py-2 px-4 text-center font-semibold text-sm text-[#0F766E]">{d.actual_qty ?? d.expected_qty}</td>
                                            <td className="py-2 px-4 text-sm text-muted-foreground">{d.batch?.code || "—"}</td>
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
                            <p className="font-bold text-[16px] text-red-600">Phiếu đã bị huỷ</p>
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
                        <Button disabled={submitting}
                            className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white ml-auto"
                            onClick={handleConfirmReceiving}>
                            <CheckCircleIcon className="w-4 h-4" />
                            {submitting ? "Đang xử lý..." : "Xác nhận kiểm đếm"}
                        </Button>
                    )}
                    {data.status === "PROCESSING" && (
                        <Button disabled={submitting}
                            className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white ml-auto"
                            onClick={handleConfirmPutaway}>
                            <CheckCircleIcon className="w-4 h-4" />
                            {submitting ? "Đang cất hàng..." : "Xác nhận cất hàng vào kho"}
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