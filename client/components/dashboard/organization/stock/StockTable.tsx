import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { ExclamationTriangleIcon, MapPinIcon } from "@heroicons/react/24/outline";
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

/** Hiển thị cảnh báo tồn thực tế */
function StockLevelCell({ qty }: { qty: number }) {
    if (qty <= 0) {
        return (
            <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-bold text-red-600">{formatQty(qty)}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                    Hết hàng
                </span>
            </div>
        );
    }
    if (qty <= 5) {
        return (
            <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-bold text-red-600">{formatQty(qty)}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 leading-none">
                    <ExclamationTriangleIcon className="w-2.5 h-2.5" />
                    Sắp hết
                </span>
            </div>
        );
    }
    if (qty <= 20) {
        return (
            <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold text-amber-600">{formatQty(qty)}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    Tồn thấp
                </span>
            </div>
        );
    }
    return <span className="text-sm font-semibold">{formatQty(qty)}</span>;
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
    const COL_COUNT = 7;

    return (
        <div className="space-y-4">
            <Card className="border-0 shadow-premium overflow-hidden rounded-3xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30 border-b">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">
                                        Sản phẩm
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">
                                        Kho
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">
                                        Vị trí
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">
                                        Tồn thực tế
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">
                                        Đang giữ
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">
                                        Khả dụng
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase whitespace-nowrap">
                                        Ngày lưu kho
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, idx) => (
                                        <tr key={`sk-${idx}`}>
                                            {Array.from({ length: COL_COUNT }).map((_, ci) => (
                                                <td key={ci} className="py-4 px-4">
                                                    <Skeleton className="h-5 w-20" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : error ? (
                                    <tr>
                                        <td colSpan={COL_COUNT} className="py-12 text-center text-muted-foreground">
                                            {error}
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={COL_COUNT} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                    <span className="text-2xl text-muted-foreground/40 font-light select-none">0</span>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground font-medium">Không có dữ liệu tồn kho</p>
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
                                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                                            {/* Sản phẩm */}
                                            <td className="py-3.5 px-4">
                                                <div>
                                                    <p className="font-medium text-sm leading-snug whitespace-nowrap">{item.product_name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{item.sku}</p>
                                                </div>
                                            </td>

                                            {/* Kho */}
                                            <td className="py-3.5 px-4 text-sm whitespace-nowrap max-w-[200px]">
                                                <span className="truncate block">{item.warehouse_name}</span>
                                            </td>

                                            {/* Vị trí */}
                                            <td className="py-3.5 px-4">
                                                {item.location ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MapPinIcon className="w-3 h-3 shrink-0" />
                                                        <span className="font-mono">{item.location}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Tồn thực tế */}
                                            <td className="py-3.5 px-4 text-right">
                                                <StockLevelCell qty={item.quantity_on_hand} />
                                            </td>

                                            {/* Đang giữ */}
                                            <td className="py-3.5 px-4 text-right">
                                                {item.quantity_allocated > 0 ? (
                                                    <span className="text-sm font-medium text-amber-600">{formatQty(item.quantity_allocated)}</span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">0</span>
                                                )}
                                            </td>

                                            {/* Khả dụng */}
                                            <td className="py-3.5 px-4 text-right">
                                                <span className={`text-sm font-bold ${item.quantity_available > 0 ? "text-[#0F766E]" : "text-muted-foreground"}`}>
                                                    {formatQty(item.quantity_available)}
                                                </span>
                                            </td>

                                            {/* Ngày lưu kho */}
                                            <td className="py-3.5 px-4 text-right text-sm text-muted-foreground whitespace-nowrap">
                                                {item.days_in_storage > 0 ? `${item.days_in_storage} ngày` : "Hôm nay"}
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

            {/* Summary */}
            {!loading && items.length > 0 && (
                <p className="text-xs text-muted-foreground text-right px-1">
                    Hiển thị {items.length} sản phẩm trong tổng số {totalItems} SKU theo kho
                </p>
            )}
        </div>
    );
}
