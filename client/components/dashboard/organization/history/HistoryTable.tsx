import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    Bars3Icon,
    ArrowsRightLeftIcon,
    ArrowDownLeftIcon,
    ArrowUpRightIcon,
    AdjustmentsHorizontalIcon,
    ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import type { InventoryTransaction, TransactionType } from "@/services/inventory/inventory.types";

interface HistoryTableProps {
    items: InventoryTransaction[];
    loading: boolean;
    error: string | null;
    searchTerm: string;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
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

function getTransactionIcon(type: TransactionType) {
    switch (type) {
        case 'INBOUND': return <ArrowDownLeftIcon className="w-5 h-5 text-emerald-500" />;
        case 'OUTBOUND': return <ArrowUpRightIcon className="w-5 h-5 text-orange-500" />;
        case 'TRANSFER': return <ArrowsRightLeftIcon className="w-5 h-5 text-blue-500" />;
        case 'ADJUSTMENT': return <AdjustmentsHorizontalIcon className="w-5 h-5 text-slate-500" />;
        case 'RETURN': return <ArrowUturnLeftIcon className="w-5 h-5 text-rose-500" />;
        default: return <Bars3Icon className="w-5 h-5 text-slate-400" />;
    }
}

function getTransactionLabel(type: TransactionType) {
    switch (type) {
        case 'INBOUND': return "Nhập kho";
        case 'OUTBOUND': return "Xuất kho";
        case 'TRANSFER': return "Điều chuyển";
        case 'ADJUSTMENT': return "Điều chỉnh";
        case 'RETURN': return "Trả hàng";
        default: return "Khác";
    }
}

export const HistoryTable = ({
    items,
    loading,
    error,
    searchTerm,
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
}: HistoryTableProps) => {
    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center border-2 border-dashed rounded-xl bg-destructive/5 border-destructive/20 mt-4">
                <p className="text-destructive font-medium">{error}</p>
                <Button variant="ghost" onClick={() => window.location.reload()} className="mt-2">
                    Thử lại
                </Button>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed rounded-xl border-slate-200 mt-4 h-[300px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Bars3Icon className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">
                    {searchTerm ? "Không tìm thấy giao dịch nào phù hợp." : "Chưa có giao dịch kho nào."}
                </p>
                {searchTerm && (
                    <Button variant="link" onClick={() => window.location.reload()}>
                        Xóa tìm kiếm
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-12">
            <div className="space-y-2">
                {items.map((item) => (
                    <Card key={item.id} className="overflow-hidden hover:bg-slate-50/50 transition-colors border-slate-100">
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        {getTransactionIcon(item.type)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900">{getTransactionLabel(item.type)}</span>
                                            <span className="text-slate-400">•</span>
                                            <span className="font-mono text-sm text-slate-500">{item.reference_code}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                            <span className="font-medium text-slate-700">
                                                {item.product?.name || "Sản phẩm không rõ"}
                                            </span>
                                            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                                SKU: {item.product?.sku || "N/A"}
                                            </span>
                                            <span>
                                                Số lượng: <span className={item.type === 'INBOUND' ? 'text-emerald-600 font-bold' : item.type === 'OUTBOUND' ? 'text-orange-600 font-bold' : 'font-bold'}>
                                                    {item.type === 'OUTBOUND' ? '-' : '+'}{item.quantity}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0 text-xs sm:text-sm">
                                    <span className="font-medium text-slate-600">
                                        {formatDate(item.created_at)}
                                    </span>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        {item.from_block && (
                                            <>
                                                <span>Từ: {item.from_block.code}</span>
                                                <ChevronRightIcon className="w-3 h-3" />
                                            </>
                                        )}
                                        {item.to_block && (
                                            <span>Tới: {item.to_block.code}</span>
                                        )}
                                        {(!item.from_block && !item.to_block) && (
                                            <span>Kho: {item.warehouse?.name || "—"}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                        Hiển thị {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, totalItems)} trong {totalItems} kết quả
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => onPageChange(currentPage - 1)}
                        >
                            <ChevronLeftIcon className="w-4 h-4 mr-1" />
                            Trước
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }).map((_, i) => {
                                const pageNum = i + 1;
                                // Simple logic to show current, first, and last pages if too many
                                if (totalPages > 5 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                                    if (pageNum === currentPage - 2 || pageNum === currentPage + 2) return <span key={i}>...</span>;
                                    return null;
                                }
                                return (
                                    <Button
                                        key={i}
                                        variant={currentPage === pageNum ? "default" : "outline"}
                                        size="sm"
                                        className="w-8 h-8 p-0"
                                        onClick={() => onPageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => onPageChange(currentPage + 1)}
                        >
                            Sau
                            <ChevronRightIcon className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
