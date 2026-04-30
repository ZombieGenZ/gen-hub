import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
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
    ChevronUpDownIcon,
    BuildingStorefrontIcon,
    PlusIcon,
    CheckCircleIcon,
    XCircleIcon,
    EllipsisHorizontalIcon,
    PencilSquareIcon,
    DocumentDuplicateIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { TablePagination } from "@/components/ui/table-pagination";

interface WarehouseTableProps {
    loading: boolean;
    error: string | null;
    sortedWarehouses: Warehouse[];
    selectedIds: string[];
    toggleSelection: (id: string) => void;
    toggleSelectAll: () => void;
    setSortPriceDir: React.Dispatch<React.SetStateAction<"asc" | "desc" | null>>;
    sortPriceDir: "asc" | "desc" | null;
    searchTerm: string;
    setCreateDialogOpen: (val: boolean) => void;
    handleEdit: (id: string) => void;
    handleDuplicate: (warehouse: Warehouse) => void;
    handleDelete: (warehouse: Warehouse) => void;
    totalItems: number;
    currentPage: number;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    totalPages: number;
    ITEMS_PER_PAGE: number;
    formatVND: (value: string | number) => string;
    IMG_API: string | undefined;
}

function WarehouseTypeBadge({ warehouse }: { warehouse: Warehouse }) {
    if (warehouse.is_shared_warehouse) {
        return (
            <Badge variant="outline" className="rounded-md font-normal bg-violet-50 text-violet-700 border-violet-200">
                Chia sẻ
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="rounded-md font-normal bg-white text-gray-600 border-gray-200">
            Tiêu chuẩn
        </Badge>
    );
}

export function WarehouseTable({
    loading,
    error,
    sortedWarehouses,
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    setSortPriceDir,
    sortPriceDir,
    searchTerm,
    setCreateDialogOpen,
    handleEdit,
    handleDuplicate,
    handleDelete,
    totalItems,
    currentPage,
    setCurrentPage,
    totalPages,
    ITEMS_PER_PAGE,
    formatVND,
    IMG_API,
}: WarehouseTableProps) {
    return (
        <>
            <Card className="border-0 shadow-premium overflow-hidden rounded-3xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30 border-b">
                                <tr>
                                    <th className="w-12 py-3 px-4">
                                        <Checkbox
                                            checked={sortedWarehouses.length > 0 && selectedIds.length === sortedWarehouses.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[30%]">
                                        Thông tin kho
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Thông số
                                    </th>
                                    <th
                                        className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase cursor-pointer select-none"
                                        onClick={() =>
                                            setSortPriceDir((prev) =>
                                                prev === null ? "asc" : prev === "asc" ? "desc" : null
                                            )
                                        }
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Giá thuê</span>
                                            <ChevronUpDownIcon className="w-4 h-4" />
                                            {sortPriceDir && (
                                                <span className="text-[10px] text-primary">
                                                    {sortPriceDir === "asc" ? "↑" : "↓"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Trạng thái
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={`skeleton-${index}`}>
                                            <td className="py-4 px-4">
                                                <Skeleton className="h-4 w-4 rounded" />
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-12 w-12 rounded-lg" />
                                                    <div>
                                                        <Skeleton className="h-5 w-32 mb-2" />
                                                        <Skeleton className="h-4 w-24" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <Skeleton className="h-5 w-24 mb-1" />
                                                <Skeleton className="h-5 w-16 rounded-md" />
                                            </td>
                                            <td className="py-4 px-4">
                                                <Skeleton className="h-6 w-28" />
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex justify-center">
                                                    <Skeleton className="h-6 w-24 rounded-full" />
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex justify-end gap-2">
                                                    <Skeleton className="h-8 w-8 rounded-full" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : error ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                            {error}
                                        </td>
                                    </tr>
                                ) : sortedWarehouses.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                    <BuildingStorefrontIcon className="w-8 h-8 text-muted-foreground/50" />
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground font-medium">Không tìm thấy kho nào</p>
                                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                                        {searchTerm ? "Thử thay đổi từ khóa tìm kiếm" : "Bắt đầu bằng cách thêm kho mới"}
                                                    </p>
                                                </div>
                                                {!searchTerm && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCreateDialogOpen(true)}
                                                        className="gap-2 mt-2 transition-all duration-200 active:scale-[0.97] rounded-xl"
                                                    >
                                                        <PlusIcon className="w-4 h-4" />
                                                        Thêm kho đầu tiên
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    sortedWarehouses.map((w) => (
                                        <tr
                                            key={w.id}
                                            className="hover:bg-muted/50 transition-colors group cursor-pointer"
                                            onClick={() => handleEdit(w.id)}
                                        >
                                            <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedIds.includes(w.id)}
                                                    onCheckedChange={() => toggleSelection(w.id)}
                                                />
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                                        {w.images?.[0] ? (
                                                            <Image
                                                                src={
                                                                    w.images[0].url?.startsWith("http")
                                                                        ? w.images[0].url
                                                                        : `${IMG_API || ""}${w.images[0].url}`
                                                                }
                                                                alt={w.name}
                                                                fill
                                                                className="object-cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-lg">
                                                                📦
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-base text-gray-900">
                                                            {w.name}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground/80 mt-0.5 font-normal">
                                                            {w.ward?.province?.name || "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        {w.length} × {w.width} m
                                                    </span>
                                                    <WarehouseTypeBadge warehouse={w} />
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-base text-[#0F766E]">
                                                    {formatVND(w.price_per_month)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {w.is_active ? (
                                                    <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 gap-1 pl-1 pr-2 rounded-full shadow-none font-normal">
                                                        <CheckCircleIcon className="w-4 h-4" /> Hoạt động
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="secondary"
                                                        className="gap-1 pl-1 pr-2 rounded-full shadow-none font-normal text-muted-foreground"
                                                    >
                                                        <XCircleIcon className="w-4 h-4" /> Khóa
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 opacity-100 transition-opacity">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full"
                                                            >
                                                                <EllipsisHorizontalIcon className="w-5 h-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(w.id)}>
                                                                <PencilSquareIcon className="w-4 h-4 mr-2" />
                                                                Chỉnh sửa
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDuplicate(w)}>
                                                                <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                                                                Nhân bản
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => handleDelete(w)}
                                                            >
                                                                <TrashIcon className="w-4 h-4 mr-2" />
                                                                Xóa
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {totalItems > ITEMS_PER_PAGE && (
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            )}
        </>
    );
}
