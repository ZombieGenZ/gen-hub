"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ProductService } from "@/services/product/product.service";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    MagnifyingGlassIcon,
    PhotoIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { Product } from "@/services/product/product.types";

const productService = new ProductService();

/** Placeholder khi sản phẩm không có ảnh */
function ProductImagePlaceholder({ className }: { className?: string }) {
    return (
        <div
            className={`flex items-center justify-center bg-muted rounded-xl ${className ?? ""}`}
        >
            <PhotoIcon className="w-5 h-5 text-muted-foreground/50" />
        </div>
    );
}

interface ProductBrowseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Danh sách product_id đã được thêm vào phiếu — dùng để disable */
    alreadyAddedIds: string[];
    /** Callback khi user bấm Xác nhận */
    onConfirm: (products: Product[]) => void;
    /** ID kho đang chọn — dùng để lấy quantity_available */
    warehouseId?: string;
    /** Có block sản phẩm hết hàng không (false cho phiếu nhập kho) — mặc định true */
    disableOutOfStock?: boolean;
}

/**
 * Modal duyệt toàn bộ danh sách sản phẩm và chọn hàng loạt.
 * Hiển thị hình ảnh, tên, SKU, đơn vị cơ bản và giá vốn.
 */
export function ProductBrowseModal({
    open,
    onOpenChange,
    alreadyAddedIds,
    onConfirm,
    warehouseId,
    disableOutOfStock = true,
}: ProductBrowseModalProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const debouncedSearch = useDebounce(search, 300);
    const PAGE_SIZE = 20;

    const loadProducts = useCallback(
        async (pageNum: number, keyword: string, replace: boolean) => {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setIsLoading(true);
            try {
                const res = await productService.list(token, {
                    limit: PAGE_SIZE,
                    offset: (pageNum - 1) * PAGE_SIZE,
                    keywords: keyword || undefined,
                    is_active: true,
                    warehouse_id: warehouseId || undefined,
                });
                const items: Product[] = res?.data?.items ?? [];
                const total: number = res?.data?.total ?? 0;
                setProducts((prev) => (replace ? items : [...prev, ...items]));
                setHasMore((pageNum - 1) * PAGE_SIZE + items.length < total);
            } catch {
                // silent fail
            } finally {
                setIsLoading(false);
            }
        },
        [warehouseId],
    );

    // Reset và tải lại khi mở modal, keyword hoặc warehouse thay đổi
    useEffect(() => {
        if (open) {
            setPage(1);
            setSelectedIds(new Set());
            loadProducts(1, debouncedSearch, true);
        }
    }, [open, debouncedSearch, warehouseId, loadProducts]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadProducts(nextPage, debouncedSearch, false);
    };

    const alreadyAddedSet = useMemo(
        () => new Set(alreadyAddedIds),
        [alreadyAddedIds],
    );

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        const availableIds = products
            .filter((p) => {
                if (alreadyAddedSet.has(p.id)) return false;
                if (warehouseId && disableOutOfStock) {
                    const qty = p.quantity_available ?? null;
                    if (qty !== null && qty <= 0) return false;
                }
                return true;
            })
            .map((p) => p.id);

        const allSelected = availableIds.every((id) => selectedIds.has(id));
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(availableIds));
        }
    };

    const handleConfirm = () => {
        const chosen = products.filter((p) => selectedIds.has(p.id));
        onConfirm(chosen);
        onOpenChange(false);
    };

    const availableCount = products.filter((p) => {
        if (alreadyAddedSet.has(p.id)) return false;
        if (warehouseId && disableOutOfStock) {
            const qty = p.quantity_available ?? null;
            if (qty !== null && qty <= 0) return false;
        }
        return true;
    }).length;
    const allAvailableSelected =
        availableCount > 0 &&
        products
            .filter((p) => {
                if (alreadyAddedSet.has(p.id)) return false;
                if (warehouseId && disableOutOfStock) {
                    const qty = p.quantity_available ?? null;
                    if (qty !== null && qty <= 0) return false;
                }
                return true;
            })
            .every((p) => selectedIds.has(p.id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col overflow-hidden rounded-3xl p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle className="text-[20px] leading-[130%]">
                        Chọn sản phẩm
                    </DialogTitle>
                    <DialogDescription>
                        Tìm kiếm và tích chọn nhiều sản phẩm để thêm vào phiếu
                    </DialogDescription>
                    {/* Search */}
                    <div className="relative mt-3">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm theo tên, SKU..."
                            className="pl-9 rounded-xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </DialogHeader>

                {/* Table Header - Select All */}
                <div className="px-6 py-2 border-b bg-muted/30 shrink-0">
                    <div className={`grid ${warehouseId ? 'grid-cols-[auto_1fr_90px_80px_110px]' : 'grid-cols-[auto_1fr_90px_80px_100px]'} gap-4 items-center`}>
                        <Checkbox
                            checked={allAvailableSelected ? true : (selectedIds.size > 0 ? "indeterminate" : false)}
                            onCheckedChange={handleSelectAll}
                            aria-label="Chọn tất cả"
                        />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Sản phẩm
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Đơn vị
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                            Giá vốn
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                            {warehouseId ? 'Tồn khả dụng' : 'Trạng thái'}
                        </span>
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {isLoading && products.length === 0 ? (
                        <div className="flex items-center justify-center py-16">
                            <svg
                                className="animate-spin h-6 w-6 text-[#0F766E]"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <MagnifyingGlassIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">Không tìm thấy sản phẩm nào</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {products.map((product) => {
                                const isAdded = alreadyAddedSet.has(product.id);
                                const qtyAvailable = product.quantity_available ?? null;
                                const outOfStock = warehouseId && disableOutOfStock && qtyAvailable !== null && qtyAvailable <= 0;
                                const isDisabled = isAdded || !!outOfStock;
                                const isSelected = selectedIds.has(product.id);

                                return (
                                    <label
                                        key={product.id}
                                        className={`grid ${warehouseId ? 'grid-cols-[auto_1fr_90px_80px_110px]' : 'grid-cols-[auto_1fr_90px_80px_100px]'} gap-4 items-center px-6 py-3 cursor-pointer transition-colors ${isDisabled
                                                ? "opacity-40 cursor-not-allowed bg-muted/20"
                                                : isSelected
                                                    ? "bg-[#0F766E]/5"
                                                    : "hover:bg-muted/40"
                                            }`}
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            disabled={isDisabled}
                                            onCheckedChange={() =>
                                                !isDisabled && toggleSelect(product.id)
                                            }
                                            aria-label={`Chọn ${product.name}`}
                                        />

                                        {/* Ảnh + Tên + SKU */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            {product.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-10 h-10 rounded-xl object-cover shrink-0 border"
                                                />
                                            ) : (
                                                <ProductImagePlaceholder className="w-10 h-10 shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate leading-snug">
                                                    {product.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {product.sku}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Đơn vị cơ bản */}
                                        <span className="text-sm text-muted-foreground truncate">
                                            {product.base_unit?.name ?? "—"}
                                        </span>

                                        {/* Giá vốn */}
                                        <span className="text-sm text-right tabular-nums">
                                            {product.cost_price != null
                                                ? product.cost_price.toLocaleString("vi-VN")
                                                : "—"}
                                        </span>

                                        {/* Cột phải: tồn kho (khi có warehouse) hoặc trạng thái */}
                                        <div className="flex flex-col items-end gap-0.5">
                                            {warehouseId && qtyAvailable !== null ? (
                                                outOfStock ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
                                                        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                                        Hết hàng
                                                    </span>
                                                ) : (
                                                    <span className={`text-sm font-semibold tabular-nums ${qtyAvailable < 10 ? 'text-amber-600' : 'text-[#0F766E]'
                                                        }`}>
                                                        {qtyAvailable.toLocaleString('vi-VN')}
                                                    </span>
                                                )
                                            ) : warehouseId && qtyAvailable === null ? (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            ) : isAdded ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-[#0F766E] font-medium">
                                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                                    Đã thêm
                                                </span>
                                            ) : isSelected ? (
                                                <span className="inline-flex items-center text-xs text-[#0F766E] font-medium">
                                                    Đã chọn
                                                </span>
                                            ) : null}
                                            {/* Nhãn phụ: đã thêm / đã chọn khi hiển thị tồn kho */}
                                            {warehouseId && isAdded && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-[#0F766E]">
                                                    <CheckCircleIcon className="w-3 h-3" />
                                                    Đã thêm
                                                </span>
                                            )}
                                            {warehouseId && !isAdded && isSelected && !outOfStock && (
                                                <span className="text-[10px] text-[#0F766E]">Đã chọn</span>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}

                            {/* Load more */}
                            {hasMore && (
                                <div className="px-6 py-4 flex justify-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="rounded-xl text-xs"
                                        onClick={handleLoadMore}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Đang tải..." : "Tải thêm sản phẩm"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-white shrink-0 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                        <p className="text-sm text-muted-foreground">
                            Đã chọn{" "}
                            <span className="font-semibold text-foreground">
                                {selectedIds.size}
                            </span>{" "}
                            sản phẩm
                        </p>
                        {!warehouseId && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                                <ExclamationTriangleIcon className="w-3 h-3" />
                                Chọn kho trước để xem tồn kho khả dụng
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => onOpenChange(false)}
                        >
                            Hủy
                        </Button>
                        <Button
                            disabled={selectedIds.size === 0}
                            className="rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white min-w-[140px]"
                            onClick={handleConfirm}
                        >
                            Thêm {selectedIds.size > 0 ? `${selectedIds.size} sản phẩm` : ""}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
