import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    EllipsisHorizontalIcon,
    PencilSquareIcon,
    TrashIcon,
    CubeIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";
import { Barcode, Package, Eye } from "lucide-react";
import type { Product } from "@/services/product/product.types";
import { TablePagination } from "@/components/ui/table-pagination";

export const ITEMS_PER_PAGE = 15;

interface ProductTableProps {
    products: Product[];
    totalProductsOnPage: number;
    loading: boolean;
    searchTerm: string;
    selectedIds: string[];
    toggleSelection: (id: string) => void;
    toggleSelectAll: () => void;
    handleViewDetail: (id: string) => void;
    handleShowBarcode: (barcode: string, name: string) => void;
    setDeleteTarget: (product: Product) => void;
    setDeleteDialogOpen: (open: boolean) => void;
    stockMap: Record<string, number>;
    IMG_API: string;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    setCurrentPage: (page: number | ((p: number) => number)) => void;
}

export function ProductTable({
    products,
    totalProductsOnPage,
    loading,
    searchTerm,
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    handleViewDetail,
    handleShowBarcode,
    setDeleteTarget,
    setDeleteDialogOpen,
    stockMap,
    IMG_API,
    currentPage,
    totalPages,
    totalItems,
    setCurrentPage,
}: ProductTableProps) {
    const router = useRouter();

    return (
        <Card className="shadow-premium rounded-3xl border-0">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80">
                                <TableHead className="w-12 pl-4">
                                    <Checkbox
                                        checked={
                                            totalProductsOnPage > 0 &&
                                            selectedIds.length === totalProductsOnPage
                                        }
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="min-w-70">Sản phẩm</TableHead>
                                <TableHead className="min-w-30">Mã vạch</TableHead>
                                <TableHead className="min-w-25">Đơn vị cơ bản</TableHead>
                                <TableHead className="min-w-30 text-right">Giá vốn</TableHead>
                                <TableHead className="min-w-25 text-right">Tổng tồn kho</TableHead>
                                <TableHead className="min-w-25">Trạng thái</TableHead>
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
                            {!loading && products.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-16 text-center">
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
                                                            "/dashboard/organization/products/create"
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
                                products.map((product) => (
                                    <TableRow
                                        key={product.id}
                                        className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                                        onClick={() => handleViewDetail(product.id)}
                                    >
                                        <TableCell
                                            className="pl-4"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Checkbox
                                                checked={selectedIds.includes(product.id)}
                                                onCheckedChange={() => toggleSelection(product.id)}
                                            />
                                        </TableCell>

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

                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            {product.barcode ? (
                                                <button
                                                    onClick={() =>
                                                        handleShowBarcode(
                                                            product.barcode!,
                                                            product.name
                                                        )
                                                    }
                                                    className="btn-raw flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#0F766E] group"
                                                >
                                                    <Barcode className="w-4 h-4 text-slate-400 group-hover:text-[#0F766E]" />
                                                    <span className="font-mono text-xs">
                                                        {product.barcode}
                                                    </span>
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <span className="text-sm text-slate-700">
                                                {product.base_unit?.name || "—"}
                                            </span>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <span className="text-sm font-medium text-slate-900 tabular-nums">
                                                {product.cost_price != null
                                                    ? new Intl.NumberFormat("vi-VN").format(
                                                        product.cost_price
                                                    ) + " ₫"
                                                    : "—"}
                                            </span>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <span className="text-sm font-semibold text-slate-900 tabular-nums">
                                                {stockMap[product.id] != null
                                                    ? new Intl.NumberFormat("vi-VN").format(
                                                        stockMap[product.id]
                                                    )
                                                    : "0"}
                                            </span>
                                        </TableCell>

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

                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <EllipsisHorizontalIcon className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44">
                                                    <DropdownMenuItem onClick={() => handleViewDetail(product.id)}>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Xem chi tiết
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            router.push(
                                                                `/dashboard/organization/products/${product.id}`
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
                    <div className="px-6 py-4 border-t border-slate-100">
                        <TablePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
