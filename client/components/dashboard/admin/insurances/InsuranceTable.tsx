import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ShieldCheckIcon,
    PlusIcon,
    CheckCircleIcon,
    XCircleIcon,
    PencilIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Insurance } from "@/types/insurance/Insurance.types";

interface InsuranceTableProps {
    loading: boolean;
    insurances: Insurance[];
    totalItems: number;
    searchTerm: string;
    setIsCreateOpen: (val: boolean) => void;
    setTargetInsurance: (val: Insurance | null) => void;
    selectedIds: string[];
    toggleSelectAll: () => void;
    toggleSelection: (id: string) => void;
    formatCurrency: (amount: string | number) => string;
    setIsEditOpen: (val: boolean) => void;
    setIsDeleteOpen: (val: boolean) => void;
    currentPage: number;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    itemsPerPage: number;
    totalPages: number;
}

export function InsuranceTable({
    loading,
    insurances,
    totalItems,
    searchTerm,
    setIsCreateOpen,
    setTargetInsurance,
    selectedIds,
    toggleSelectAll,
    toggleSelection,
    formatCurrency,
    setIsEditOpen,
    setIsDeleteOpen,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
}: InsuranceTableProps) {
    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-premium rounded-3xl overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-lg text-primary">Danh sách gói bảo hiểm</h3>
                    <Badge variant="secondary" className="rounded-full bg-white shadow-sm hover:bg-white text-muted-foreground">
                        {totalItems} gói
                    </Badge>
                </div>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white border-b">
                                    <tr>
                                        <th className="w-12 py-3 px-4 bg-muted/5"><Skeleton className="h-4 w-4 rounded" /></th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase"><Skeleton className="h-4 w-20" /></th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase"><Skeleton className="h-4 w-20" /></th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase"><Skeleton className="h-4 w-20" /></th>
                                        <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase"><Skeleton className="h-4 w-20" /></th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase"><Skeleton className="h-4 w-20" /></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y relative">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={`skeleton-${index}`}>
                                            <td className="py-4 px-4"><Skeleton className="h-4 w-4 rounded" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-4 w-48" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-6 w-24" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-5 w-16" /></td>
                                            <td className="py-4 px-4"><div className="flex justify-center"><Skeleton className="h-6 w-24 rounded-full" /></div></td>
                                            <td className="py-4 px-4"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : insurances.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                    <ShieldCheckIcon className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-medium">Không tìm thấy gói bảo hiểm nào</p>
                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                        {searchTerm ? "Thử thay đổi từ khóa tìm kiếm" : "Bắt đầu bằng cách thêm gói bảo hiểm mới"}
                                    </p>
                                </div>
                                {!searchTerm && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setTargetInsurance(null); setIsCreateOpen(true); }}
                                        className="rounded-xl gap-2 mt-2 transition-all duration-200 active:scale-[0.97]"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Thêm gói đầu tiên
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white border-b">
                                    <tr>
                                        <th className="w-12 py-3 px-4 bg-muted/5">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === insurances.length && insurances.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                            />
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[30%]">Tên gói</th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Giá trị / Phí</th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Phí quản lý</th>
                                        <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Trạng thái</th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {insurances.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/50 transition-colors group">
                                            <td className="py-4 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => toggleSelection(item.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                />
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-semibold text-base text-gray-900">{item.name}</div>
                                                <div className="text-sm text-muted-foreground/80 line-clamp-1 mt-0.5 font-normal">{item.description}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-base text-[#0F766E]">
                                                    {formatCurrency(item.price)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {item.use_management_fee ? (
                                                    <Badge variant="outline" className="text-xs bg-white text-gray-700 border-gray-200 font-medium">
                                                        {item.management_fee_type === 'PERCENT'
                                                            ? `${item.management_fee_value}%`
                                                            : formatCurrency(Number(item.management_fee_value))}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {item.is_active ? (
                                                    <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 gap-1 pl-1 pr-2 rounded-full shadow-none font-normal">
                                                        <CheckCircleIcon className="w-4 h-4" /> Hoạt động
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="gap-1 pl-1 pr-2 rounded-full shadow-none font-normal text-muted-foreground">
                                                        <XCircleIcon className="w-4 h-4" /> Đã tắt
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-100 transition-all duration-200">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-blue-50 text-blue-600/70 hover:text-blue-600 transition-all duration-200 active:scale-90"
                                                        onClick={() => {
                                                            setTargetInsurance(item);
                                                            setIsEditOpen(true);
                                                        }}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-red-50 text-red-600/70 hover:text-red-600 transition-all duration-200 active:scale-90"
                                                        onClick={() => {
                                                            setTargetInsurance(item);
                                                            setIsDeleteOpen(true);
                                                        }}
                                                        title="Xóa"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {totalItems > itemsPerPage && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Hiển thị {(currentPage - 1) * itemsPerPage + 1} đến {Math.min(currentPage * itemsPerPage, totalItems)} trong tổng số {totalItems} kết quả
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages)
                                .map((page, index, array) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="text-gray-400">...</span>
                                        )}
                                        <Button
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                            className={`h-8 min-w-[32px] rounded-lg ${currentPage === page ? 'bg-[#0F766E] hover:bg-[#0F766E]/90' : 'text-gray-600'}`}
                                        >
                                            {page}
                                        </Button>
                                    </React.Fragment>
                                ))
                            }
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
