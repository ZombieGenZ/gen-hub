import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    InboxIcon,
    PlusIcon,
    EllipsisHorizontalIcon,
    MagnifyingGlassIcon,
    PrinterIcon,
    XCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { InboundStatusBadge } from "./InboundStatusBadge";
import type { InboundRequest } from "@/services/inventory/inventory.types";

export const ITEMS_PER_PAGE = 10;

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

interface InboundTableProps {
    items: InboundRequest[];
    loading: boolean;
    error: string | null;
    searchTerm: string;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onCreateClick: () => void;
    onCancelClick: (item: InboundRequest) => void;
    onPageChange: (page: number) => void;
}

export function InboundTable({
    items,
    loading,
    error,
    searchTerm,
    currentPage,
    totalPages,
    totalItems,
    onCreateClick,
    onCancelClick,
    onPageChange,
}: InboundTableProps) {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-premium overflow-hidden rounded-3xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30 border-b">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Mã phiếu PO
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Mã PO
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Kho
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Đối tác
                                    </th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Trạng thái
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Ngày tạo
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={`sk-${idx}`}>
                                            {Array.from({ length: 7 }).map((_, ci) => (
                                                <td key={ci} className="py-4 px-4">
                                                    <Skeleton className="h-5 w-24" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : error ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                                            {error}
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                    <InboxIcon className="w-8 h-8 text-muted-foreground/50" />
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground font-medium">
                                                        Không tìm thấy phiếu PO nào
                                                    </p>
                                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                                        {searchTerm
                                                            ? "Thử thay đổi từ khóa tìm kiếm"
                                                            : "Bắt đầu bằng cách tạo phiếu PO mới"}
                                                    </p>
                                                </div>
                                                {!searchTerm && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={onCreateClick}
                                                        className="gap-2 mt-2 rounded-xl"
                                                    >
                                                        <PlusIcon className="w-4 h-4" />
                                                        Tạo phiếu PO đầu tiên
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-muted/50 transition-colors group cursor-pointer"
                                            onClick={() => router.push(`/dashboard/organization/purchase-order/${item.id}`)}
                                        >
                                            <td className="py-4 px-4">
                                                <span className="font-semibold text-sm text-[#0F766E]">
                                                    {item.code}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-muted-foreground">
                                                {item.purchase_order_code || "—"}
                                            </td>
                                            <td className="py-4 px-4 text-sm">
                                                {item.warehouse?.name || "—"}
                                            </td>
                                            <td className="py-4 px-4 text-sm">
                                                {item.partner?.name || "—"}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <InboundStatusBadge status={item.status} />
                                            </td>
                                            <td className="py-4 px-4 text-sm text-muted-foreground">
                                                {formatDate(item.created_at)}
                                            </td>
                                            <td
                                                className="py-4 px-4 text-right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    router.push(`/dashboard/organization/purchase-order/${item.id}`)
                                                                }
                                                            >
                                                                <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                                                                Xem chi tiết
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                <PrinterIcon className="w-4 h-4 mr-2" />
                                                                In phiếu
                                                            </DropdownMenuItem>
                                                            {item.status === "PENDING" && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => onCancelClick(item)}
                                                                    >
                                                                        <XCircleIcon className="w-4 h-4 mr-2" />
                                                                        Hủy phiếu
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
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

            {/* ── Pagination ── */}
            {totalItems > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} đến{" "}
                        {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} trong tổng số{" "}
                        {totalItems} kết quả
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(
                                    (page) =>
                                        Math.abs(page - currentPage) <= 2 ||
                                        page === 1 ||
                                        page === totalPages
                                )
                                .map((page, index, array) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="text-gray-400">...</span>
                                        )}
                                        <Button
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => onPageChange(page)}
                                            className={`h-8 min-w-8 rounded-lg ${
                                                currentPage === page
                                                    ? "bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                                    : "text-gray-600"
                                            }`}
                                        >
                                            {page}
                                        </Button>
                                    </React.Fragment>
                                ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

