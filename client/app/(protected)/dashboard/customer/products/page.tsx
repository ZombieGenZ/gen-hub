"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import ReactBarcode from "react-barcode";
import { ProductService } from "@/services/product/product.service";
import type { Product } from "@/services/product/product.types";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";
import {
    type ProductQuickFilter,
} from "@/types/product-inventory";

// ── shadcn/ui ──
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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

// ── Icons ──
import {
    MagnifyingGlassIcon,
    PlusIcon,
    EllipsisHorizontalIcon,
    PencilSquareIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CubeIcon,
    ExclamationTriangleIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import { Barcode, Package, ScanLine, Eye } from "lucide-react";
import BarcodeScannerQuickAdd from "@/components/products/BarcodeScannerQuickAdd";

// ── Services ──
const productService = new ProductService();
const ITEMS_PER_PAGE = 15;
const IMG_API = process.env.NEXT_PUBLIC_API_URL;

// ────────────────────────────────────────────────
// Barcode Display Dialog
// ────────────────────────────────────────────────
function BarcodeDialog({
    open,
    onClose,
    barcode,
    productName,
}: {
    open: boolean;
    onClose: () => void;
    barcode: string;
    productName: string;
}) {
    const barcodeRef = useRef<HTMLDivElement>(null);

    const handleDownload = () => {
        const svg = barcodeRef.current?.querySelector("svg");
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new window.Image();
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            const a = document.createElement("a");
            a.download = `barcode-${barcode}.png`;
            a.href = canvas.toDataURL("image/png");
            a.click();
        };
        img.src = url;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Mã vạch sản phẩm</DialogTitle>
                    <DialogDescription>{productName}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-6">
                    <div
                        ref={barcodeRef}
                        className="bg-white border-2 border-gray-200 rounded-lg p-4 w-full flex justify-center"
                    >
                        {barcode ? (
                            <ReactBarcode
                                value={barcode}
                                width={1.8}
                                height={80}
                                fontSize={16}
                                margin={10}
                                background="#ffffff"
                                lineColor="#000000"
                            />
                        ) : (
                            <p className="text-sm text-gray-400 py-8">Không có mã vạch</p>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">
                        Quét mã vạch này bằng máy quét để tra cứu nhanh sản phẩm
                    </p>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleDownload} disabled={!barcode}>
                        Tải xuống PNG
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Đóng
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ════════════════════════════════════════════════
// MAIN PAGE: Product Master List
// ════════════════════════════════════════════════
export default function ProductMasterListPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // ── Data state ──
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);

    // ── Selection ──
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // ── Dialogs ──
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    // ── Barcode dialog ──
    const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
    const [selectedBarcode, setSelectedBarcode] = useState({ code: "", name: "" });

    // ── Barcode scanner quick add ──
    const [scannerOpen, setScannerOpen] = useState(false);

    // ── Filters ──
    const [searchTerm, setSearchTerm] = useState("");
    const [quickFilter, setQuickFilter] = useState<ProductQuickFilter>("all");

    // ── Pagination ──
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const debouncedKeywords = useDebounce(searchTerm, 500);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Fetch products ──
    const fetchProducts = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }

            setLoading(true);
            setError(null);

            const offset = (currentPage - 1) * ITEMS_PER_PAGE;
            const result = await productService.list(token, {
                keywords: debouncedKeywords || undefined,
                limit: ITEMS_PER_PAGE,
                offset,
                is_active: true,
            });

            if (result?.data) {
                setProducts(result.data.items || []);
                setTotalItems(result.data.total || 0);
                showToast("Đã cập nhật danh sách sản phẩm.", "success");
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            setError("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.");
            showToast("Lỗi khi tải danh sách sản phẩm.", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, currentPage, router]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedKeywords, quickFilter]);

    // ── Selection helpers ──
    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((item) => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === products.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(products.map((p) => p.id));
        }
    };

    // ── Delete ──
    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await productService.delete(token, deleteTarget.id);
            showToast(`Đã xóa "${deleteTarget.name}" 🗑️`, "success");
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            setSelectedIds([]);
            fetchProducts();
        } catch {
            showToast("Xóa thất bại, vui lòng thử lại", "error");
        } finally {
            setIsDeleteLoading(false);
        }
    };

    // ── Bulk delete ──
    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await productService.deleteMany(token, selectedIds);
            showToast(
                `Đã xóa ${selectedIds.length} sản phẩm thành công! 🗑️`,
                "success"
            );
            setIsBulkDeleteDialogOpen(false);
            setSelectedIds([]);
            fetchProducts();
        } catch {
            showToast("Xóa thất bại, vui lòng thử lại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // ── Navigate to detail ──
    const handleViewDetail = (id: string) =>
        router.push(`/dashboard/customer/products/${id}`);

    // ── Show barcode ──
    const handleShowBarcode = (barcode: string, name: string) => {
        setSelectedBarcode({ code: barcode, name });
        setBarcodeDialogOpen(true);
    };

    // ── Quick filter client-side ──
    // Note: In production, these filters would be server-side.
    // For now we apply them client-side as enhancement hints.
    const filteredProducts = products;

    // ════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════
    return (
        <div className="flex-1 overflow-auto bg-slate-50/50">
            <main className="pt-0 py-4 px-4 space-y-6">
                {/* ── Page header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Quản lý Hàng Hoá
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Danh sách tổng hợp tất cả hàng hóa trong hệ thống kho
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="rounded-xl border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E]/5"
                            onClick={() => setScannerOpen(true)}
                        >
                            <ScanLine className="w-4 h-4 mr-2" />
                            Quét để thêm
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() =>
                                router.push("/dashboard/customer/products/create")
                            }
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Thêm sản phẩm
                        </Button>
                    </div>
                </div>

                {/* ── Search & Quick Filters ── */}
                <Card className="shadow-premium rounded-3xl border-0">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search bar with barcode scanner hint */}
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Tìm kiếm theo tên, SKU hoặc quét mã vạch..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-10 h-10 rounded-xl"
                                />
                                <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            </div>

                            {/* Quick filter chips */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setQuickFilter("all")}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${quickFilter === "all"
                                        ? "bg-[#0F766E] text-white border-[#0F766E]"
                                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    Tất cả
                                </button>
                                <button
                                    onClick={() => setQuickFilter("low_stock")}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1.5 ${quickFilter === "low_stock"
                                        ? "bg-amber-500 text-white border-amber-500"
                                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                    Sắp hết hàng
                                </button>
                                <button
                                    onClick={() => setQuickFilter("expiring_soon")}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1.5 ${quickFilter === "expiring_soon"
                                        ? "bg-red-500 text-white border-red-500"
                                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    Lô sắp hết hạn
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Data Grid ── */}
                <Card className="shadow-premium rounded-3xl border-0">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80">
                                        <TableHead className="w-12 pl-4">
                                            <Checkbox
                                                checked={
                                                    products.length > 0 &&
                                                    selectedIds.length === products.length
                                                }
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead className="min-w-70">
                                            Sản phẩm
                                        </TableHead>
                                        <TableHead className="min-w-30">
                                            Mã vạch
                                        </TableHead>
                                        <TableHead className="min-w-25">
                                            Đơn vị cơ bản
                                        </TableHead>
                                        <TableHead className="min-w-30 text-right">
                                            Giá vốn
                                        </TableHead>
                                        <TableHead className="min-w-25 text-right">
                                            Tổng tồn kho
                                        </TableHead>
                                        <TableHead className="min-w-25">
                                            Trạng thái
                                        </TableHead>
                                        <TableHead className="w-16" />
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {/* Loading skeleton */}
                                    {loading &&
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={`skeleton-${i}`}>
                                                <TableCell className="pl-4">
                                                    <Skeleton className="h-4 w-4 rounded" />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="h-10 w-10 rounded-lg" />
                                                        <div className="space-y-1.5">
                                                            <Skeleton className="h-4 w-36" />
                                                            <Skeleton className="h-3 w-20" />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-24" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-16" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-20 ml-auto" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-12 ml-auto" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-5 w-16 rounded-full" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-6 w-6 rounded" />
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                    {/* Empty state */}
                                    {!loading && filteredProducts.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={8}
                                                className="py-16 text-center"
                                            >
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                                        <Package className="w-8 h-8 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-700">
                                                            Chưa có sản phẩm nào
                                                        </p>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            {searchTerm
                                                                ? "Không tìm thấy sản phẩm phù hợp với từ khóa tìm kiếm."
                                                                : "Thêm sản phẩm đầu tiên để bắt đầu quản lý kho hàng."}
                                                        </p>
                                                    </div>
                                                    {!searchTerm && (
                                                        <Button
                                                            className="mt-2 bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                                                            onClick={() =>
                                                                router.push(
                                                                    "/dashboard/customer/products/create"
                                                                )
                                                            }
                                                        >
                                                            <PlusIcon className="w-4 h-4 mr-2" />
                                                            Thêm sản phẩm
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {/* Data rows */}
                                    {!loading &&
                                        filteredProducts.map((product) => (
                                            <TableRow
                                                key={product.id}
                                                className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                                                onClick={() => handleViewDetail(product.id)}
                                            >
                                                {/* Checkbox */}
                                                <TableCell
                                                    className="pl-4"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Checkbox
                                                        checked={selectedIds.includes(product.id)}
                                                        onCheckedChange={() =>
                                                            toggleSelection(product.id)
                                                        }
                                                    />
                                                </TableCell>

                                                {/* Product name + image + SKU */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                                                            {product.image_url ? (
                                                                <Image
                                                                    src={
                                                                        product.image_url.startsWith("http")
                                                                            ? product.image_url
                                                                            : `${IMG_API}${product.image_url}`
                                                                    }
                                                                    alt={product.name}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="40px"
                                                                />
                                                            ) : (
                                                                <CubeIcon className="w-5 h-5 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-slate-900 truncate max-w-50">
                                                                {product.name}
                                                            </p>
                                                            <p className="text-xs text-slate-500 font-mono">
                                                                SKU: {product.sku}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Barcode */}
                                                <TableCell
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {product.barcode ? (
                                                        <button
                                                            onClick={() =>
                                                                handleShowBarcode(
                                                                    product.barcode!,
                                                                    product.name
                                                                )
                                                            }
                                                            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#0F766E] transition-colors group"
                                                        >
                                                            <Barcode className="w-4 h-4 text-slate-400 group-hover:text-[#0F766E]" />
                                                            <span className="font-mono text-xs">
                                                                {product.barcode}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Base unit */}
                                                <TableCell>
                                                    <span className="text-sm text-slate-700">
                                                        {product.base_unit?.name || "—"}
                                                    </span>
                                                </TableCell>

                                                {/* Cost price */}
                                                <TableCell className="text-right">
                                                    <span className="text-sm font-medium text-slate-900 tabular-nums">
                                                        {product.cost_price != null
                                                            ? new Intl.NumberFormat("vi-VN").format(
                                                                product.cost_price
                                                            ) + " ₫"
                                                            : "—"}
                                                    </span>
                                                </TableCell>

                                                {/* Total stock (placeholder — would need aggregate API) */}
                                                <TableCell className="text-right">
                                                    <span className="text-sm font-semibold text-slate-900 tabular-nums">
                                                        —
                                                    </span>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell>
                                                    {product.is_active ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-md font-normal bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        >
                                                            Đang bán
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-md font-normal bg-gray-50 text-gray-500 border-gray-200"
                                                        >
                                                            Ngừng bán
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                            >
                                                                <EllipsisHorizontalIcon className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            className="w-44"
                                                        >
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleViewDetail(product.id)
                                                                }
                                                            >
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Xem chi tiết
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/dashboard/admin/products/${product.id}`
                                                                    )
                                                                }
                                                            >
                                                                <PencilSquareIcon className="w-4 h-4 mr-2" />
                                                                Chỉnh sửa
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-600"
                                                                onClick={() => {
                                                                    setDeleteTarget(product);
                                                                    setDeleteDialogOpen(true);
                                                                }}
                                                            >
                                                                <TrashIcon className="w-4 h-4 mr-2" />
                                                                Xóa
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* ── Pagination ── */}
                        {!loading && totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                                <p className="text-sm text-slate-500">
                                    Hiển thị{" "}
                                    <span className="font-medium text-slate-700">
                                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                                    </span>{" "}
                                    -{" "}
                                    <span className="font-medium text-slate-700">
                                        {Math.min(
                                            currentPage * ITEMS_PER_PAGE,
                                            totalItems
                                        )}
                                    </span>{" "}
                                    trong{" "}
                                    <span className="font-medium text-slate-700">
                                        {totalItems}
                                    </span>{" "}
                                    sản phẩm
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage((p) => p - 1)}
                                    >
                                        <ChevronLeftIcon className="w-4 h-4" />
                                    </Button>
                                    {Array.from({ length: Math.min(totalPages, 5) }).map(
                                        (_, i) => {
                                            let page: number;
                                            if (totalPages <= 5) {
                                                page = i + 1;
                                            } else if (currentPage <= 3) {
                                                page = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                page = totalPages - 4 + i;
                                            } else {
                                                page = currentPage - 2 + i;
                                            }
                                            return (
                                                <Button
                                                    key={page}
                                                    variant={
                                                        page === currentPage
                                                            ? "default"
                                                            : "ghost"
                                                    }
                                                    size="icon"
                                                    className={`h-8 w-8 text-xs ${page === currentPage
                                                        ? "bg-[#0F766E] hover:bg-[#0D6B63] text-white"
                                                        : ""
                                                        }`}
                                                    onClick={() => setCurrentPage(page)}
                                                >
                                                    {page}
                                                </Button>
                                            );
                                        }
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage((p) => p + 1)}
                                    >
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Floating bulk action bar ── */}
                {selectedIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                        <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl">
                            <span className="text-sm">
                                Đã chọn{" "}
                                <span className="font-bold">{selectedIds.length}</span>{" "}
                                sản phẩm
                            </span>
                            <div className="w-px h-5 bg-slate-600" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                onClick={() => setIsBulkDeleteDialogOpen(true)}
                            >
                                <TrashIcon className="w-4 h-4 mr-1.5" />
                                Xóa
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-300 hover:text-white"
                                onClick={() => setSelectedIds([])}
                            >
                                Bỏ chọn
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Delete single dialog ── */}
                <Dialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Xác nhận xóa sản phẩm</DialogTitle>
                            <DialogDescription>
                                Bạn có chắc chắn muốn xóa sản phẩm &quot;
                                {deleteTarget?.name}&quot;? Thao tác này không thể hoàn
                                tác.
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
                                onClick={handleDeleteConfirm}
                                disabled={isDeleteLoading}
                            >
                                {isDeleteLoading ? "Đang xóa..." : "Xóa"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Bulk delete dialog ── */}
                <Dialog
                    open={isBulkDeleteDialogOpen}
                    onOpenChange={setIsBulkDeleteDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Xóa nhiều sản phẩm</DialogTitle>
                            <DialogDescription>
                                Bạn có chắc chắn muốn xóa{" "}
                                <span className="font-bold">{selectedIds.length}</span>{" "}
                                sản phẩm đã chọn? Thao tác này không thể hoàn tác.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsBulkDeleteDialogOpen(false)}
                                className="rounded-xl"
                            >
                                Hủy
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                                onClick={handleBulkDelete}
                                disabled={isBulkActionLoading}
                            >
                                {isBulkActionLoading
                                    ? "Đang xóa..."
                                    : `Xóa ${selectedIds.length} sản phẩm`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Barcode dialog ── */}
                <BarcodeDialog
                    open={barcodeDialogOpen}
                    onClose={() => setBarcodeDialogOpen(false)}
                    barcode={selectedBarcode.code}
                    productName={selectedBarcode.name}
                />

                {/* ── Barcode Scanner Quick Add ── */}
                <BarcodeScannerQuickAdd
                    open={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onProductCreated={fetchProducts}
                />
            </main>
        </div>
    );
}
