"use client";

import React, { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MagnifyingGlassIcon, Squares2X2Icon, PhotoIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import type { Product } from "@/services/product/product.types";

/** Placeholder ảnh nhỏ trong search gợi ý */
function MiniProductImage({ src, alt }: { src: string | null; alt: string }) {
    if (src) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={src}
                alt={alt}
                className="w-9 h-9 rounded-xl object-cover shrink-0 border"
            />
        );
    }
    return (
        <div className="w-9 h-9 rounded-xl shrink-0 bg-muted flex items-center justify-center border">
            <PhotoIcon className="w-4 h-4 text-muted-foreground/50" />
        </div>
    );
}

interface ProductSelectorProps {
    /** Giá trị tìm kiếm hiện tại */
    value: string;
    /** Callback khi user thay đổi text */
    onChange: (v: string) => void;
    /** Danh sách gợi ý đã được lọc sẵn (loại trừ sản phẩm đã thêm) */
    suggestions: Product[];
    /** Callback khi user chọn một sản phẩm từ gợi ý */
    onSelect: (product: Product, scannedBarcode?: string) => void;
    /** Callback khi user bấm nút "Chọn từ danh sách" */
    onBrowse: () => void;
    /** Xử lý KeyDown để hỗ trợ quét barcode / Enter */
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    /** Placeholder text */
    placeholder?: string;
}

/**
 * Ô tìm kiếm sản phẩm thông minh.
 * - Gợi ý inline với hình ảnh, tên, SKU và giá vốn.
 * - Nút "Chọn từ danh sách" để mở ProductBrowseModal.
 * - Hỗ trợ quét barcode qua onKeyDown.
 */
export function ProductSelector({
    value,
    onChange,
    suggestions,
    onSelect,
    onBrowse,
    onKeyDown,
    placeholder = "Tìm sản phẩm theo tên, SKU hoặc quét barcode...",
}: ProductSelectorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = React.useState(false);

    // Đóng dropdown khi click bên ngoài
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Mở dropdown khi có gợi ý
    useEffect(() => {
        setOpen(value.length > 0 && suggestions.length > 0);
    }, [value, suggestions]);

    return (
        <div ref={containerRef} className="relative flex gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder={placeholder}
                    className="pl-9 rounded-xl pr-4"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => {
                        if (value && suggestions.length > 0) setOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setOpen(false);
                        onKeyDown?.(e);
                    }}
                />

                {/* Dropdown gợi ý */}
                {open && suggestions.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border rounded-2xl shadow-lg overflow-hidden">
                        <div className="max-h-[280px] overflow-y-auto divide-y">
                            {suggestions.map((product) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3"
                                    onMouseDown={(e) => {
                                        // mouseDown thay vì click để tránh mất focus làm đóng dropdown trước
                                        e.preventDefault();
                                        onSelect(product);
                                        setOpen(false);
                                    }}
                                >
                                    <MiniProductImage
                                        src={product.image_url}
                                        alt={product.name}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate leading-snug">
                                            {product.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {product.sku}
                                            {product.base_unit?.name && (
                                                <span className="ml-2 text-muted-foreground/60">
                                                    · {product.base_unit.name}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {product.cost_price != null && (
                                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                                            {product.cost_price.toLocaleString("vi-VN")}đ
                                        </span>
                                    )}
                                    <PlusIcon className="w-4 h-4 text-[#0F766E] shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Nút chọn từ danh sách */}
            <Button
                type="button"
                variant="outline"
                className="rounded-xl gap-2 shrink-0 text-sm"
                onClick={onBrowse}
            >
                <Squares2X2Icon className="w-4 h-4" />
                <span className="hidden sm:inline">Chọn từ danh sách</span>
            </Button>
        </div>
    );
}
