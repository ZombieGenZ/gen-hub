import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/ui/table-pagination";
import type { StockItem } from "@/services/inventory/inventory.types";

export const ITEMS_PER_PAGE = 20;

function formatDate(dateStr: string) {
    try {
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(new Date(dateStr));
    } catch {
        return "—";
    }
}

function formatQty(value: number) {
    return new Intl.NumberFormat("vi-VN").format(value);
}

function ExpiryBadge({ date }: { date: string | null | undefined }) {
    if (!date) return <span className="text-muted-foreground text-xs">—</span>;

    const expiry = new Date(date);
    const now = new Date();
    const daysLeft = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysLeft <= 0) {
        return (
            <Badge
                variant="outline"
                className="rounded-full text-xs font-normal border-red-200 bg-red-50 text-red-600"
            >
                Đã hết hạn
            </Badge>
        );
    }
    if (daysLeft <= 30) {
        return (
            <Badge
                variant="outline"
                className="rounded-full text-xs font-normal border-amber-200 bg-amber-50 text-amber-600"
            >
                Còn {daysLeft} ngày
            </Badge>
        );
    }
    return (
        <span className="text-sm text-muted-foreground">
            {formatDate(date)}
        </span>
    );
}

interface StockTableProps {
    items: StockItem[];
    loading: boolean;
    error: string | null;
    searchTerm: string;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

export function StockTable({
    items,
    loading,
    error,
    searchTerm,
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
}: StockTableProps) {
    return (
        <div className="space-y-4">
            <Card className="border-0 shadow-premium overflow-hidden rounded-3xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30 border-b">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Sản phẩm
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Kho
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Vị trí
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Lô hàng
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Hạn sử dụng
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Tồn thực tế
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Đang giữ
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Khả dụng
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Ngày lưu kho
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, idx) => (
                                        <tr key={`sk-${idx}`}>
                                            {Array.from({ length: 9 }).map((_, ci) => (
                                                <td key={ci} className="py-4 px-4">
                                                    <Skeleton className="h-5 w-20" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : error ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            {error}
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                    <span className="text-2xl text-muted-foreground/40 font-light select-none">
                                                        0
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground font-medium">
                                                        Không có dữ liệu tồn kho
                                                    </p>
                                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                                        {searchTerm
                                                            ? "Thử thay đổi từ khóa hoặc chọn kho khác"
                                                            : "Tổ chức chưa có hàng hóa nào trong kho"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-muted/50 transition-colors"
                                        >
                                            {/* Sản phẩm */}
                                            <td className="py-4 px-4">
                                                <div>
                                                    <p className="font-medium text-sm leading-snug">
                                                        {item.product_name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {item.sku}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Kho */}
                                            <td className="py-4 px-4 text-sm">
                                                {item.warehouse_name}
                                            </td>

                                            {/* Vị trí */}
                                            <td className="py-4 px-4">
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    {item.location || "—"}
                                                </span>
                                            </td>

                                            {/* Lô hàng */}
                                            <td className="py-4 px-4">
                                                {item.batch_code ? (
                                                    <span className="text-xs font-mono text-[#0F766E]">
                                                        {item.batch_code}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Hạn sử dụng */}
                                            <td className="py-4 px-4">
                                                <ExpiryBadge date={item.expiry_date} />
                                            </td>

                                            {/* Tồn thực tế */}
                                            <td className="py-4 px-4 text-right">
                                                <span className="text-sm font-semibold">
                                                    {formatQty(item.quantity_on_hand)}
                                                </span>
                                            </td>

                                            {/* Đang giữ */}
                                            <td className="py-4 px-4 text-right">
                                                <span className="text-sm text-amber-600">
                                                    {item.quantity_allocated > 0
                                                        ? formatQty(item.quantity_allocated)
                                                        : <span className="text-muted-foreground">0</span>}
                                                </span>
                                            </td>

                                            {/* Khả dụng */}
                                            <td className="py-4 px-4 text-right">
                                                <span className="text-sm font-semibold text-[#0F766E]">
                                                    {formatQty(item.quantity_available)}
                                                </span>
                                            </td>

                                            {/* Ngày lưu kho */}
                                            <td className="py-4 px-4 text-right text-sm text-muted-foreground">
                                                {item.days_in_storage > 0
                                                    ? `${item.days_in_storage} ngày`
                                                    : "Hôm nay"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 py-4 border-t">
                            <TablePagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                itemsPerPage={ITEMS_PER_PAGE}
                                onPageChange={onPageChange}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Summary dòng cuối */}
            {!loading && items.length > 0 && (
                <p className="text-xs text-muted-foreground text-right px-1">
                    Hiển thị {items.length} trong tổng số {totalItems} dòng tồn kho
                </p>
            )}
        </div>
    );
}
