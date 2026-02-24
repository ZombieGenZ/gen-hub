"use client";

import React, { useState, useMemo } from "react";
import type { Product } from "@/services/product/product.types";
import type { Batch } from "@/services/batch/batch.types";
import { BatchService } from "@/services/batch/batch.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";
import {
    getExpiryStatus,
    getDaysUntilExpiry,
    expiryStatusConfig,
    suggestBatchCode,
    type ExpiryStatus,
} from "@/types/product-inventory";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    PlusIcon,
    EllipsisHorizontalIcon,
    PencilSquareIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import {
    Layers,
    TrendingUp,
    TrendingDown,
    Minus,
    Ticket,
    Lock,
    Camera,
} from "lucide-react";

// Import recharts for sparkline
import {
    LineChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const batchService = new BatchService();

// ────────────────────────────────────────────────
// Mini Sparkline — Biểu đồ biến động giá nhập
// ────────────────────────────────────────────────
function PriceSparkline({ batches }: { batches: Batch[] }) {
    const data = useMemo(() => {
        return batches
            .filter((b) => b.import_price != null)
            .sort(
                (a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            .map((b) => ({
                name: b.code,
                price: b.import_price || 0,
                date: new Date(b.created_at).toLocaleDateString("vi-VN"),
            }));
    }, [batches]);

    if (data.length < 2) return null;

    const prices = data.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const latestPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const change = ((latestPrice - prevPrice) / prevPrice) * 100;

    return (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 mb-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">
                        Biến động giá nhập
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {change > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                    ) : change < 0 ? (
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                        <Minus className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span
                        className={`text-sm font-semibold ${change > 0
                                ? "text-red-600"
                                : change < 0
                                    ? "text-emerald-600"
                                    : "text-slate-500"
                            }`}
                    >
                        {change > 0 ? "+" : ""}
                        {change.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400 ml-1">
                        so với lô trước
                    </span>
                </div>
            </div>

            <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <XAxis dataKey="name" hide />
                        <YAxis
                            domain={[minPrice * 0.95, maxPrice * 1.05]}
                            hide
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1e293b",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: "#fff",
                            }}
                            formatter={(value) => [
                                `${new Intl.NumberFormat("vi-VN").format(Number(value))} ₫`,
                                "Giá nhập",
                            ]}
                            labelFormatter={(label) => `Lô: ${label}`}
                        />
                        <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#0F766E"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "#0F766E" }}
                            activeDot={{ r: 5, fill: "#0F766E" }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                <span>{data[0]?.date}</span>
                <span>
                    Mới nhất:{" "}
                    <span className="font-medium text-slate-600">
                        {new Intl.NumberFormat("vi-VN").format(latestPrice)} ₫
                    </span>
                </span>
                <span>{data[data.length - 1]?.date}</span>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────
// Expiry Status Badge
// ────────────────────────────────────────────────
function ExpiryBadge({
    expiryDate,
    warningDays = 30,
}: {
    expiryDate: string | null;
    warningDays?: number;
}) {
    if (!expiryDate) {
        return (
            <span className="text-xs text-slate-400">Không có HSD</span>
        );
    }

    const status = getExpiryStatus(expiryDate, warningDays);
    const daysLeft = getDaysUntilExpiry(expiryDate);
    const config = expiryStatusConfig[status];

    return (
        <div className="flex items-center gap-1.5">
            <span className="text-sm">{config.icon}</span>
            <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}
            >
                {status === "expired"
                    ? `Hết hạn ${Math.abs(daysLeft || 0)} ngày`
                    : status === "warning"
                        ? `Còn ${daysLeft} ngày`
                        : `Còn ${daysLeft} ngày`}
            </span>
        </div>
    );
}

// ────────────────────────────────────────────────
// Create/Edit Batch Dialog
// ────────────────────────────────────────────────
function BatchFormDialog({
    open,
    onClose,
    product,
    editBatch,
    batchCount,
    onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    product: Product;
    editBatch: Batch | null;
    batchCount: number;
    onSuccess: () => void;
}) {
    const { showToast } = useToast();
    const isEdit = !!editBatch;

    const [formData, setFormData] = useState({
        code: editBatch?.code || suggestBatchCode(product.sku, batchCount),
        manufacturing_date: editBatch?.manufacturing_date?.slice(0, 10) || "",
        expiry_date: editBatch?.expiry_date?.slice(0, 10) || "",
        import_price: editBatch?.import_price?.toString() || "",
    });
    const [saving, setSaving] = useState(false);

    // OCR placeholder state
    const [isOcrMode, setIsOcrMode] = useState(false);

    const handleSave = async () => {
        if (!formData.code.trim()) {
            showToast("Vui lòng nhập mã lô hàng", "error");
            return;
        }

        const token = authStorage.getAccessToken();
        if (!token) return;

        setSaving(true);
        try {
            if (isEdit && editBatch) {
                await batchService.update(token, editBatch.id, {
                    code: formData.code,
                    manufacturing_date: formData.manufacturing_date || undefined,
                    expiry_date: formData.expiry_date || undefined,
                    import_price: formData.import_price
                        ? parseFloat(formData.import_price)
                        : undefined,
                });
                showToast(`Đã cập nhật lô ${formData.code} thành công!`, "success");
            } else {
                await batchService.create(token, {
                    product_id: product.id,
                    code: formData.code,
                    manufacturing_date: formData.manufacturing_date || undefined,
                    expiry_date: formData.expiry_date || undefined,
                    import_price: formData.import_price
                        ? parseFloat(formData.import_price)
                        : undefined,
                });
                showToast(`Đã tạo lô ${formData.code} thành công! 🎉`, "success");
            }
            onClose();
            onSuccess();
        } catch {
            showToast(
                isEdit ? "Cập nhật lô hàng thất bại" : "Tạo lô hàng thất bại",
                "error"
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Cập nhật lô hàng" : "Tạo lô hàng mới"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? `Chỉnh sửa thông tin lô ${editBatch?.code}`
                            : `Tạo lô hàng mới cho sản phẩm ${product.name}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* OCR button */}
                    <div className="flex items-center justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs rounded-lg gap-1.5"
                            onClick={() => setIsOcrMode(!isOcrMode)}
                        >
                            <Camera className="w-3.5 h-3.5" />
                            Quét nhãn (OCR)
                        </Button>
                    </div>

                    {/* OCR placeholder */}
                    {isOcrMode && (
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                            <Camera className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                            <p className="text-sm text-blue-700 font-medium">
                                Chụp ảnh nhãn thùng hàng
                            </p>
                            <p className="text-xs text-blue-500 mt-1">
                                Hệ thống sẽ tự động bóc tách mã lô, NSX, HSD từ ảnh
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 text-xs rounded-lg bg-white"
                                onClick={() => {
                                    // Placeholder: In production, this would open camera/file picker
                                    // and use OCR API to extract text
                                    showToast(
                                        "Tính năng OCR đang được phát triển",
                                        "info"
                                    );
                                }}
                            >
                                <Camera className="w-3.5 h-3.5 mr-1.5" />
                                Mở Camera
                            </Button>
                        </div>
                    )}

                    {/* Batch code */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                            Mã lô hàng <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={formData.code}
                            onChange={(e) =>
                                setFormData({ ...formData, code: e.target.value })
                            }
                            placeholder="VD: 20260224-SKU001-01"
                            className="rounded-xl font-mono"
                        />
                        <p className="text-xs text-slate-400">
                            Gợi ý: {suggestBatchCode(product.sku, batchCount)}
                        </p>
                    </div>

                    {/* Manufacturing date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">
                                Ngày sản xuất (NSX)
                            </Label>
                            <Input
                                type="date"
                                value={formData.manufacturing_date}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        manufacturing_date: e.target.value,
                                    })
                                }
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">
                                Hạn sử dụng (HSD)
                            </Label>
                            <Input
                                type="date"
                                value={formData.expiry_date}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        expiry_date: e.target.value,
                                    })
                                }
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Import price */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                            Giá nhập (VNĐ)
                        </Label>
                        <Input
                            type="number"
                            value={formData.import_price}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    import_price: e.target.value,
                                })
                            }
                            placeholder="0"
                            className="rounded-xl"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="rounded-xl"
                    >
                        Hủy
                    </Button>
                    <Button
                        className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving
                            ? "Đang lưu..."
                            : isEdit
                                ? "Cập nhật"
                                : "Tạo lô hàng"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ════════════════════════════════════════════════
// Tab 3: Batch Management
// ════════════════════════════════════════════════
interface BatchManagementTabProps {
    product: Product;
    batches: Batch[];
    loading: boolean;
    onRefresh: () => void;
}

export function BatchManagementTab({
    product,
    batches,
    loading,
    onRefresh,
}: BatchManagementTabProps) {
    const { showToast } = useToast();

    // ── Dialogs ──
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editBatch, setEditBatch] = useState<Batch | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    // ── Sort & filter ──
    const [expiryFilter, setExpiryFilter] = useState<ExpiryStatus | "all">(
        "all"
    );

    // ── Filtered batches ──
    const filteredBatches = useMemo(() => {
        let result = [...batches];
        if (expiryFilter !== "all") {
            result = result.filter(
                (b) => getExpiryStatus(b.expiry_date) === expiryFilter
            );
        }
        // Sort: expired first, then warning, then safe
        result.sort((a, b) => {
            const statusOrder: Record<ExpiryStatus, number> = {
                expired: 0,
                warning: 1,
                safe: 2,
            };
            const sA = getExpiryStatus(a.expiry_date);
            const sB = getExpiryStatus(b.expiry_date);
            return statusOrder[sA] - statusOrder[sB];
        });
        return result;
    }, [batches, expiryFilter]);

    // ── Delete handler ──
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await batchService.delete(token, deleteTarget.id);
            showToast(`Đã xóa lô ${deleteTarget.code} 🗑️`, "success");
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            onRefresh();
        } catch {
            showToast("Xóa thất bại, vui lòng thử lại", "error");
        } finally {
            setIsDeleteLoading(false);
        }
    };

    // ── Stats ──
    const stats = useMemo(() => {
        const expired = batches.filter(
            (b) => getExpiryStatus(b.expiry_date) === "expired"
        ).length;
        const warning = batches.filter(
            (b) => getExpiryStatus(b.expiry_date) === "warning"
        ).length;
        const safe = batches.filter(
            (b) => getExpiryStatus(b.expiry_date) === "safe"
        ).length;
        return { expired, warning, safe, total: batches.length };
    }, [batches]);

    return (
        <div className="space-y-4">
            {/* Price sparkline */}
            <PriceSparkline batches={batches} />

            {/* Stats + Actions bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Expiry filter chips */}
                    <button
                        onClick={() => setExpiryFilter("all")}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${expiryFilter === "all"
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                    >
                        Tất cả ({stats.total})
                    </button>
                    <button
                        onClick={() => setExpiryFilter("expired")}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 ${expiryFilter === "expired"
                                ? "bg-red-500 text-white border-red-500"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                    >
                        🔴 Hết hạn ({stats.expired})
                    </button>
                    <button
                        onClick={() => setExpiryFilter("warning")}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 ${expiryFilter === "warning"
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                    >
                        🟡 Sắp hết hạn ({stats.warning})
                    </button>
                    <button
                        onClick={() => setExpiryFilter("safe")}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 ${expiryFilter === "safe"
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                    >
                        🟢 An toàn ({stats.safe})
                    </button>
                </div>

                <Button
                    className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                    onClick={() => {
                        setEditBatch(null);
                        setCreateDialogOpen(true);
                    }}
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Tạo lô mới
                </Button>
            </div>

            {/* Batch table */}
            <Card className="shadow-premium rounded-3xl border-0">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80">
                                    <TableHead className="min-w-35">
                                        Mã lô
                                    </TableHead>
                                    <TableHead className="min-w-30">
                                        Ngày hết hạn
                                    </TableHead>
                                    <TableHead className="min-w-35">
                                        Trạng thái
                                    </TableHead>
                                    <TableHead className="min-w-30 text-right">
                                        Giá nhập
                                    </TableHead>
                                    <TableHead className="min-w-25">
                                        Trạng thái
                                    </TableHead>
                                    <TableHead className="w-16" />
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading &&
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={`skel-${i}`}>
                                            <TableCell>
                                                <Skeleton className="h-4 w-28" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-5 w-24 rounded-full" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-20 ml-auto" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-5 w-16 rounded-full" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-6 w-6" />
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                {!loading && filteredBatches.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="py-12 text-center"
                                        >
                                            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                            <p className="font-medium text-slate-600">
                                                {expiryFilter !== "all"
                                                    ? "Không có lô hàng phù hợp với bộ lọc"
                                                    : "Chưa có lô hàng nào"}
                                            </p>
                                            <p className="text-sm text-slate-400 mt-1">
                                                Tạo lô hàng để bắt đầu quản lý tồn kho
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                )}

                                {!loading &&
                                    filteredBatches.map((batch) => {
                                        const status = getExpiryStatus(
                                            batch.expiry_date
                                        );
                                        const isExpired = status === "expired";

                                        return (
                                            <TableRow
                                                key={batch.id}
                                                className={`transition-colors ${isExpired
                                                        ? "bg-red-50/50"
                                                        : status === "warning"
                                                            ? "bg-amber-50/30"
                                                            : ""
                                                    }`}
                                            >
                                                {/* Code */}
                                                <TableCell>
                                                    <span className="font-mono text-sm font-medium text-slate-900">
                                                        {batch.code}
                                                    </span>
                                                </TableCell>

                                                {/* Manufacturing date */}
                                                <TableCell>
                                                    <span className="text-sm text-slate-600">
                                                        {batch.manufacturing_date
                                                            ? new Date(
                                                                batch.manufacturing_date
                                                            ).toLocaleDateString(
                                                                "vi-VN"
                                                            )
                                                            : "—"}
                                                    </span>
                                                </TableCell>

                                                {/* Expiry with traffic light */}
                                                <TableCell>
                                                    <ExpiryBadge
                                                        expiryDate={batch.expiry_date}
                                                    />
                                                </TableCell>

                                                {/* Import price */}
                                                <TableCell className="text-right">
                                                    <span className="text-sm font-medium text-slate-900 tabular-nums">
                                                        {batch.import_price != null
                                                            ? new Intl.NumberFormat(
                                                                "vi-VN"
                                                            ).format(
                                                                batch.import_price
                                                            ) + " ₫"
                                                            : "—"}
                                                    </span>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell>
                                                    {isExpired ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-md font-normal bg-red-50 text-red-700 border-red-200"
                                                        >
                                                            <Lock className="w-3 h-3 mr-1" />
                                                            Đã khóa
                                                        </Badge>
                                                    ) : batch.is_active ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-md font-normal bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        >
                                                            Hoạt động
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-md font-normal bg-gray-50 text-gray-500 border-gray-200"
                                                        >
                                                            Ngừng
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                            >
                                                                <EllipsisHorizontalIcon className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            className="w-48"
                                                        >
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setEditBatch(batch);
                                                                    setCreateDialogOpen(
                                                                        true
                                                                    );
                                                                }}
                                                            >
                                                                <PencilSquareIcon className="w-4 h-4 mr-2" />
                                                                Chỉnh sửa
                                                            </DropdownMenuItem>
                                                            {status === "warning" && (
                                                                <DropdownMenuItem>
                                                                    <Ticket className="w-4 h-4 mr-2" />
                                                                    Tạo mã giảm giá
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-600"
                                                                onClick={() => {
                                                                    setDeleteTarget(
                                                                        batch
                                                                    );
                                                                    setDeleteDialogOpen(
                                                                        true
                                                                    );
                                                                }}
                                                            >
                                                                <TrashIcon className="w-4 h-4 mr-2" />
                                                                Xóa lô hàng
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit dialog */}
            {createDialogOpen && (
                <BatchFormDialog
                    open={createDialogOpen}
                    onClose={() => {
                        setCreateDialogOpen(false);
                        setEditBatch(null);
                    }}
                    product={product}
                    editBatch={editBatch}
                    batchCount={batches.length}
                    onSuccess={onRefresh}
                />
            )}

            {/* Delete confirmation */}
            <Dialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa lô hàng</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa lô &quot;
                            {deleteTarget?.code}&quot;? Thao tác này không thể
                            hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Hủy
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                            onClick={handleDelete}
                            disabled={isDeleteLoading}
                        >
                            {isDeleteLoading ? "Đang xóa..." : "Xóa"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
