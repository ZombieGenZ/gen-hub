"use client";

import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { StockTake, StockTakeStatus } from "@/services/inventory/inventory.types";

const inventoryService = new InventoryService();

const STATUS_CONFIG: Record<StockTakeStatus, { label: string; color: string }> = {
    DRAFT: { label: "Nháp", color: "bg-gray-50 text-gray-700 border-gray-200" },
    IN_PROGRESS: { label: "Đang kiểm", color: "bg-blue-50 text-blue-700 border-blue-200" },
    COMPLETED: { label: "Đã kiểm xong", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    ADJUSTED: { label: "Đã điều chỉnh", color: "bg-green-50 text-green-700 border-green-200" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-700 border-red-200" },
};

interface StockTakeDetailModalProps {
    stockTakeId: string | null;
    open: boolean;
    onClose: () => void;
    onUpdated: () => void;
}

export function StockTakeDetailModal({
    stockTakeId,
    open,
    onClose,
    onUpdated,
}: StockTakeDetailModalProps) {
    const { showToast } = useToast();
    const [stockTake, setStockTake] = useState<StockTake | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    // detail_id -> actual_qty string
    const [counts, setCounts] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open && stockTakeId) {
            void fetchDetail();
        }
    }, [open, stockTakeId]);

    const fetchDetail = async () => {
        if (!stockTakeId) return;
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await inventoryService.getStockTakeById(token, stockTakeId);
            const data = res?.data as unknown as StockTake;
            setStockTake(data);
            // init counts from actual_qty
            const initCounts: Record<string, string> = {};
            data.details?.forEach((d) => {
                initCounts[d.id] = d.actual_qty != null ? String(d.actual_qty) : "";
            });
            setCounts(initCounts);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: "start" | "complete" | "adjust" | "cancel") => {
        if (!stockTakeId) return;
        try {
            setActionLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (action === "start") {
                await inventoryService.startStockTake(token, stockTakeId);
                showToast("Đã bắt đầu kiểm kê", "success");
            } else if (action === "complete") {
                // Save counts first
                const details = Object.entries(counts)
                    .filter(([, v]) => v !== "")
                    .map(([id, v]) => ({ detail_id: id, actual_qty: Number(v) }));
                if (details.length > 0) {
                    await inventoryService.updateStockTakeDetails(token, stockTakeId, { details });
                }
                await inventoryService.completeStockTake(token, stockTakeId);
                showToast("Đã hoàn tất kiểm kê", "success");
            } else if (action === "adjust") {
                await inventoryService.adjustStockTake(token, stockTakeId);
                showToast("Đã điều chỉnh tồn kho", "success");
            } else if (action === "cancel") {
                await inventoryService.cancelStockTake(token, stockTakeId);
                showToast("Đã hủy phiếu kiểm kê", "success");
            }

            await fetchDetail();
            onUpdated();
        } catch (err: any) {
            showToast(err.message || "Thao tác thất bại", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveCounts = async () => {
        if (!stockTakeId) return;
        try {
            setActionLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            const details = Object.entries(counts)
                .filter(([, v]) => v !== "")
                .map(([id, v]) => ({ detail_id: id, actual_qty: Number(v) }));
            await inventoryService.updateStockTakeDetails(token, stockTakeId, { details });
            showToast("Đã lưu số đếm", "success");
        } catch (err: any) {
            showToast(err.message || "Không thể lưu số đếm", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const statusConfig = stockTake ? STATUS_CONFIG[stockTake.status] : null;
    const isInProgress = stockTake?.status === "IN_PROGRESS";
    const isDraft = stockTake?.status === "DRAFT";
    const isCompleted = stockTake?.status === "COMPLETED";
    const canCancel =
        stockTake?.status && !["ADJUSTED", "CANCELLED"].includes(stockTake.status);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-4xl rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <DialogTitle>
                            {loading ? "Đang tải..." : `Phiếu kiểm kê ${stockTake?.code ?? ""}`}
                        </DialogTitle>
                        {statusConfig && (
                            <Badge
                                variant="outline"
                                className={`rounded-full text-xs border ${statusConfig.color}`}
                            >
                                {statusConfig.label}
                            </Badge>
                        )}
                    </div>
                    {stockTake && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Kho: <strong>{stockTake.warehouse?.name}</strong>
                            {stockTake.notes && ` · ${stockTake.notes}`}
                        </p>
                    )}
                </DialogHeader>

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/30 border-b sticky top-0">
                                <tr>
                                    <th className="text-left py-2 px-3 font-semibold text-xs text-muted-foreground uppercase">Sản phẩm</th>
                                    <th className="text-left py-2 px-3 font-semibold text-xs text-muted-foreground uppercase">Lô</th>
                                    <th className="text-right py-2 px-3 font-semibold text-xs text-muted-foreground uppercase">Hệ thống</th>
                                    {isInProgress && (
                                        <th className="text-right py-2 px-3 font-semibold text-xs text-muted-foreground uppercase">Thực đếm</th>
                                    )}
                                    {!isDraft && !isInProgress && (
                                        <>
                                            <th className="text-right py-2 px-3 font-semibold text-xs text-muted-foreground uppercase">Thực đếm</th>
                                            <th className="text-right py-2 px-3 font-semibold text-xs text-muted-foreground uppercase">Chênh lệch</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            {Array.from({ length: 4 }).map((_, ci) => (
                                                <td key={ci} className="py-3 px-3">
                                                    <Skeleton className="h-4 w-20" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (stockTake?.details ?? []).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-muted-foreground">
                                            Không có dữ liệu
                                        </td>
                                    </tr>
                                ) : (
                                    (stockTake?.details ?? []).map((detail) => {
                                        const diff =
                                            detail.actual_qty != null
                                                ? detail.actual_qty - detail.system_qty
                                                : null;
                                        return (
                                            <tr key={detail.id} className="hover:bg-muted/30">
                                                <td className="py-3 px-3">
                                                    <div className="font-medium">{detail.product?.name ?? "—"}</div>
                                                    <div className="text-xs text-muted-foreground">{detail.product?.sku}</div>
                                                </td>
                                                <td className="py-3 px-3 text-muted-foreground text-xs">
                                                    {detail.batch_id ? (detail.batch?.batch_number ?? detail.batch_id) : "—"}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono">
                                                    {new Intl.NumberFormat("vi-VN").format(detail.system_qty)}
                                                </td>
                                                {isInProgress ? (
                                                    <td className="py-2 px-3">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            className="text-right h-8 w-28 ml-auto rounded-lg"
                                                            value={counts[detail.id] ?? ""}
                                                            onChange={(e) =>
                                                                setCounts((prev) => ({
                                                                    ...prev,
                                                                    [detail.id]: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </td>
                                                ) : !isDraft ? (
                                                    <>
                                                        <td className="py-3 px-3 text-right font-mono">
                                                            {detail.actual_qty != null
                                                                ? new Intl.NumberFormat("vi-VN").format(detail.actual_qty)
                                                                : "—"}
                                                        </td>
                                                        <td className={`py-3 px-3 text-right font-mono font-semibold ${
                                                            diff == null
                                                                ? ""
                                                                : diff > 0
                                                                ? "text-green-600"
                                                                : diff < 0
                                                                ? "text-red-600"
                                                                : "text-muted-foreground"
                                                        }`}>
                                                            {diff == null
                                                                ? "—"
                                                                : diff > 0
                                                                ? `+${new Intl.NumberFormat("vi-VN").format(diff)}`
                                                                : new Intl.NumberFormat("vi-VN").format(diff)}
                                                        </td>
                                                    </>
                                                ) : null}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Action buttons */}
                {stockTake && (
                    <div className="flex items-center justify-between pt-4 border-t gap-2">
                        <div>
                            {canCancel && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 border-red-200"
                                    onClick={() => handleAction("cancel")}
                                    disabled={actionLoading}
                                >
                                    Hủy phiếu
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose} size="sm">
                                Đóng
                            </Button>
                            {isDraft && (
                                <Button
                                    size="sm"
                                    onClick={() => handleAction("start")}
                                    disabled={actionLoading}
                                >
                                    Bắt đầu kiểm kê
                                </Button>
                            )}
                            {isInProgress && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSaveCounts}
                                        disabled={actionLoading}
                                    >
                                        Lưu số đếm
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleAction("complete")}
                                        disabled={actionLoading}
                                    >
                                        Hoàn tất kiểm kê
                                    </Button>
                                </>
                            )}
                            {isCompleted && (
                                <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleAction("adjust")}
                                    disabled={actionLoading}
                                >
                                    Điều chỉnh tồn kho
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
