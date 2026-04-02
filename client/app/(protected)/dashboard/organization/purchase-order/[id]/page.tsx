"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { InboundRequest, ReceiptStatus } from "@/services/inventory/inventory.types";
import { useOrganizationRealtime } from "@/hooks/useOrganizationRealtime";

// ── shadcn/ui ──
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// ── Icons ──
import {
    ArrowLeftIcon,
    PrinterIcon,
    CheckCircleIcon,
    MapPinIcon,
} from "@heroicons/react/24/outline";

import "../purchase-order.css";

const inventoryService = new InventoryService();

const INBOUND_DETAIL_EVENTS = [
    "inbound:approved",
    "inbound:cancelled",
    "inbound:receiving-started",
    "inbound:receiving-confirmed",
    "inbound:putaway-confirmed",
];

const INBOUND_DETAIL_REALTIME_TOAST_MESSAGES: Record<string, string> = {
    "inbound:approved": "Phiếu PO đã được duyệt",
    "inbound:cancelled": "Phiếu PO đã bị hủy",
    "inbound:receiving-started": "Đã bắt đầu kiểm đếm phiếu PO",
    "inbound:receiving-confirmed": "Đã xác nhận kiểm đếm phiếu PO",
    "inbound:putaway-confirmed": "Phiếu PO đã hoàn tất nhập kho",
};

// ────────────────────────────────────────────────
// Status config
// ────────────────────────────────────────────────
const STATUS_CONFIG: Record<ReceiptStatus, { label: string; className: string }> = {
    PENDING: { label: "Chờ xử lý", className: "inbound-status--pending" },
    APPROVED: { label: "Đã duyệt", className: "inbound-status--approved" },
    RECEIVING: { label: "Đang kiểm đếm", className: "inbound-status--receiving" },
    PROCESSING: { label: "Đang nhập kho", className: "inbound-status--processing" },
    PUTAWAY: { label: "Đang cất hàng", className: "inbound-status--putaway" },
    COMPLETED: { label: "Hoàn thành", className: "inbound-status--completed" },
    CANCELLED: { label: "Đã hủy", className: "inbound-status--cancelled" },
};

// ────────────────────────────────────────────────
// Timeline steps
// ────────────────────────────────────────────────
const TIMELINE_STEPS = [
    { key: "PENDING", label: "Khởi tạo" },
    { key: "PROCESSING", label: "Đang kiểm đếm" },
    { key: "COMPLETED", label: "Đã lưu kho" },
];

const STATUS_ORDER: ReceiptStatus[] = ["PENDING", "PROCESSING", "COMPLETED"];

function getStepState(
    stepKey: string,
    currentStatus: ReceiptStatus
): "completed" | "active" | "pending" {
    if (currentStatus === "CANCELLED") {
        return stepKey === "PENDING" ? "active" : "pending";
    }
    const currentIdx = STATUS_ORDER.indexOf(currentStatus);
    const stepIdx = STATUS_ORDER.indexOf(stepKey as ReceiptStatus);
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "active";
    return "pending";
}

// ────────────────────────────────────────────────
// Format helpers
// ────────────────────────────────────────────────
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
// MAIN COMPONENT
// ════════════════════════════════════════════════
export default function InboundDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const { showToast } = useToast();

    const [data, setData] = useState<InboundRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [orgId, setOrgId] = useState<string | null>(null);
    const lastRealtimeToastRef = useRef<{ key: string; at: number } | null>(null);
    const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Actual qty editing ──
    const [editingQty, setEditingQty] = useState<Record<string, number>>({});
    const [mismatchReasons, setMismatchReasons] = useState<Record<string, string>>({});

    const fetchData = useCallback(async (showLoading = true) => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }

            if (showLoading) {
                setLoading(true);
            }
            const res = await inventoryService.getInboundById(token, id);
            const item = res?.data ?? res;
            setData(item);
            setOrgId(item?.organization_id ?? null);

            // Initialize editing qty from actual_qty
            if (item?.details) {
                const qtyMap: Record<string, number> = {};
                item.details.forEach((d) => {
                    qtyMap[d.id] = d.actual_qty ?? 0;
                });
                setEditingQty(qtyMap);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") { router.push("/login"); return; }
            setError("Không thể tải thông tin phiếu PO.");
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    useEffect(() => {
        return () => {
            if (realtimeRefreshTimeoutRef.current) {
                clearTimeout(realtimeRefreshTimeoutRef.current);
                realtimeRefreshTimeoutRef.current = null;
            }
        };
    }, []);

    const handleRealtimeEvent = useCallback((eventName: string, payload: unknown) => {
        const data = payload as { receiptId?: string; code?: string } | undefined;
        if (!data?.receiptId || data.receiptId !== id) {
            return;
        }

        if (realtimeRefreshTimeoutRef.current) {
            clearTimeout(realtimeRefreshTimeoutRef.current);
        }

        realtimeRefreshTimeoutRef.current = setTimeout(() => {
            void fetchData(false);
        }, 250);

        const message = INBOUND_DETAIL_REALTIME_TOAST_MESSAGES[eventName];
        if (!message) return;

        const toastKey = `${eventName}:${data.receiptId ?? data.code ?? "unknown"}`;
        const lastToast = lastRealtimeToastRef.current;
        if (lastToast && lastToast.key === toastKey && Date.now() - lastToast.at < 1500) {
            return;
        }

        const messageWithCode = data.code ? `${message} (${data.code})` : message;
        showToast(messageWithCode, "success");
        lastRealtimeToastRef.current = { key: toastKey, at: Date.now() };
    }, [fetchData, id, showToast]);

    useOrganizationRealtime({
        orgId,
        events: INBOUND_DETAIL_EVENTS,
        enabled: !!orgId,
        onEvent: handleRealtimeEvent,
    });

    const getRowClass = (detailId: string, expectedQty: number) => {
        const actual = editingQty[detailId] ?? 0;
        if (actual === 0) return "";
        if (actual === expectedQty) return "inbound-reconciliation__row--match";
        if (actual > 0 && actual < expectedQty) return "inbound-reconciliation__row--mismatch";
        return "inbound-reconciliation__row--critical";
    };

    // ════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════
    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-20 w-full rounded-3xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 rounded-3xl" />
                    <Skeleton className="h-64 rounded-3xl lg:col-span-2" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/dashboard/organization/purchase-order")}
                    className="gap-2 rounded-xl"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Quay lại
                </Button>
                <Card className="border-0 shadow-premium rounded-3xl">
                    <CardContent className="py-16 text-center text-muted-foreground">
                        {error || "Không tìm thấy phiếu PO"}
                    </CardContent>
                </Card>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[data.status] || STATUS_CONFIG.PENDING;

    return (
        <div className="space-y-6">
            {/* ── Back + Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard/organization/purchase-order")}
                        className="rounded-full h-10 w-10"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[32px] font-bold tracking-tight leading-[130%]">
                                {data.code}
                            </h1>
                            <Badge
                                variant="outline"
                                className={`rounded-full font-normal px-3 py-0.5 text-xs border ${statusConfig.className}`}
                            >
                                {statusConfig.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">
                            Tạo lúc {formatDate(data.created_at)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 rounded-xl">
                        <PrinterIcon className="w-4 h-4" />
                        In phiếu
                    </Button>
                </div>
            </div>

            {/* ── Timeline ── */}
            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-0">
                    <div className="inbound-timeline">
                        {TIMELINE_STEPS.map((step, idx) => {
                            const state = getStepState(step.key, data.status);
                            return (
                                <React.Fragment key={step.key}>
                                    <div className="inbound-timeline__step">
                                        <div
                                            className={`inbound-timeline__dot inbound-timeline__dot--${state}`}
                                        >
                                            {state === "completed" ? (
                                                <CheckCircleIcon className="w-5 h-5" />
                                            ) : (
                                                idx + 1
                                            )}
                                        </div>
                                        <span
                                            className={`inbound-timeline__label inbound-timeline__label--${state}`}
                                        >
                                            {step.label}
                                        </span>
                                    </div>
                                    {idx < TIMELINE_STEPS.length - 1 && (
                                        <div
                                            className={`inbound-timeline__connector inbound-timeline__connector--${state === "completed" ? "completed" : "pending"
                                                }`}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {data.status === "CANCELLED" && (
                            <>
                                <div className="inbound-timeline__connector inbound-timeline__connector--pending" />
                                <div className="inbound-timeline__step">
                                    <div className="inbound-timeline__dot inbound-timeline__dot--cancelled">
                                        ✕
                                    </div>
                                    <span className="inbound-timeline__label inbound-timeline__label--cancelled">
                                        Đã hủy
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Content: Info + Reconciliation Table ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left — General Info */}
                <Card className="border-0 shadow-premium rounded-3xl">
                    <CardContent className="p-6 space-y-4">
                        <h2 className="text-[20px] font-semibold leading-[130%]">
                            Thông tin chung
                        </h2>
                        <div className="space-y-3">
                            <InfoRow label="Mã phiếu" value={data.code} />
                            <InfoRow
                                label="Mã PO"
                                value={data.purchase_order_code || "—"}
                            />
                            <InfoRow
                                label="Kho"
                                value={data.warehouse?.name || "—"}
                            />
                            <InfoRow
                                label="NCC"
                                value={
                                    data.partner
                                        ? `${data.partner.name}${data.partner.code ? ` (${data.partner.code})` : ""}`
                                        : "—"
                                }
                            />
                            <InfoRow
                                label="Ngày tạo"
                                value={formatDate(data.created_at)}
                            />
                            <InfoRow
                                label="Cập nhật"
                                value={formatDate(data.updated_at)}
                            />
                            {data.notes && (
                                <InfoRow label="Ghi chú" value={data.notes} />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Right — Reconciliation Table */}
                <Card className="border-0 shadow-premium rounded-3xl lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-[20px] font-semibold leading-[130%]">
                                Bảng đối chiếu hàng hóa
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 rounded-xl"
                            >
                                <MapPinIcon className="w-4 h-4" />
                                Gợi ý vị trí
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
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.details && data.details.length > 0 ? (
                                        data.details.map((detail) => {
                                            const actualQty = editingQty[detail.id] ?? detail.actual_qty ?? 0;
                                            const isMatch = actualQty === detail.expected_qty;
                                            const isMismatch = actualQty > 0 && !isMatch;
                                            const rowClass = getRowClass(detail.id, detail.expected_qty);

                                            return (
                                                <tr
                                                    key={detail.id}
                                                    className={`transition-colors ${rowClass}`}
                                                >
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="font-medium text-sm">
                                                                {detail.product?.name || "—"}
                                                            </p>
                                                        </div>
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
                                                            disabled={data.status === "COMPLETED" || data.status === "CANCELLED"}
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
                                                                    Lệch {Math.abs(actualQty - detail.expected_qty)}
                                                                </Badge>
                                                                {isMismatch && (
                                                                    <Input
                                                                        placeholder="Lý do..."
                                                                        value={mismatchReasons[detail.id] || ""}
                                                                        onChange={(e) =>
                                                                            setMismatchReasons((prev) => ({
                                                                                ...prev,
                                                                                [detail.id]: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="h-7 text-xs rounded-lg w-32"
                                                                        disabled={data.status === "COMPLETED" || data.status === "CANCELLED"}
                                                                    />
                                                                )}
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────
// Info row helper
// ────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-2">
            <span className="text-sm text-muted-foreground shrink-0">{label}</span>
            <span className="text-sm font-medium text-right">{value}</span>
        </div>
    );
}
