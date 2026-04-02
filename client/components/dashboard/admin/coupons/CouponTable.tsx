import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    GiftIcon,
    PlusIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    PencilIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { Coupon } from "@/types/coupons/coupon.type";
import { TablePagination } from "@/components/ui/table-pagination";

type CouponFilterStatus = 'all' | 'active' | 'scheduled' | 'expired' | 'depleted' | 'inactive';

interface CouponTableProps {
    loading: boolean;
    filteredCoupons: Coupon[];
    paginatedCoupons: Coupon[];
    searchTerm: string;
    hasActiveFilters: boolean;
    setIsCreateDialogOpen: (val: boolean) => void;
    selectedCouponIds: string[];
    toggleSelectAll: () => void;
    toggleSelectCoupon: (id: string) => void;
    formatCurrency: (amount: number) => string;
    formatDate: (dateString: string) => string;
    getCouponComputedStatus: (coupon: Coupon) => CouponFilterStatus;
    openEditDialog: (coupon: Coupon) => void;
    openDeleteDialog: (coupon: Coupon) => void;
    currentPage: number;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    itemsPerPage: number;
    totalPages: number;
}

export function CouponTable({
    loading,
    filteredCoupons,
    paginatedCoupons,
    searchTerm,
    hasActiveFilters,
    setIsCreateDialogOpen,
    selectedCouponIds,
    toggleSelectAll,
    toggleSelectCoupon,
    formatCurrency,
    formatDate,
    getCouponComputedStatus,
    openEditDialog,
    openDeleteDialog,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
}: CouponTableProps) {
    return (
        <Card className="border-0 shadow-premium rounded-3xl">
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : filteredCoupons.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                <GiftIcon className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <div>
                                <p className="text-muted-foreground font-medium">Không tìm thấy mã giảm giá nào</p>
                                <p className="text-sm text-muted-foreground/70 mt-1">
                                    {searchTerm || hasActiveFilters ? "Thử thay đổi bộ lọc hoặc từ khóa" : "Bắt đầu bằng cách thêm mã giảm giá mới"}
                                </p>
                            </div>
                            {!searchTerm && !hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsCreateDialogOpen(true)}
                                    className="gap-2 mt-2 transition-all duration-200 active:scale-[0.97] rounded-xl"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Thêm mã đầu tiên
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-border">
                                    <tr>
                                        <th className="text-left py-3 px-4 w-12">
                                            <input
                                                type="checkbox"
                                                checked={filteredCoupons.length > 0 && selectedCouponIds.length === filteredCoupons.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E] cursor-pointer"
                                            />
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Mã</th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Giảm giá</th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Lượt dùng</th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Ngày bắt đầu</th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Ngày hết hạn</th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Trạng thái</th>
                                        <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginatedCoupons.map((coupon) => (
                                        <tr key={coupon.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCouponIds.includes(coupon.id)}
                                                    onChange={() => toggleSelectCoupon(coupon.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E] cursor-pointer"
                                                />
                                            </td>
                                            <td className="py-3 px-4 text-base">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{coupon.name}</span>
                                                    <code className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded w-fit mt-1">
                                                        {coupon.code}
                                                    </code>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-medium text-base">
                                                {coupon.discount_type === 'PERCENT' ? (
                                                    <span>{coupon.discount_value}%</span>
                                                ) : (
                                                    <span>{formatCurrency(coupon.discount_value)}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-muted-foreground text-base">
                                                {coupon.current_usage} / {coupon.max_usage > 0 ? coupon.max_usage : '∞'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                <div>{formatDate(coupon.starts_at)}</div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {coupon.is_permanent ? (
                                                    <span className="text-xs italic">Vô thời hạn</span>
                                                ) : (
                                                    <div>{formatDate(coupon.ends_at)}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {(() => {
                                                    const status = getCouponComputedStatus(coupon);
                                                    const statusConfig = {
                                                        active: {
                                                            variant: "default" as const,
                                                            icon: <CheckCircleIcon className="w-3 h-3" />,
                                                            label: "Đang hoạt động",
                                                            className: "bg-green-500/10 text-green-600 border-green-500/20"
                                                        },
                                                        scheduled: {
                                                            variant: "secondary" as const,
                                                            icon: <ClockIcon className="w-3 h-3" />,
                                                            label: "Chờ chạy",
                                                            className: "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                        },
                                                        expired: {
                                                            variant: "secondary" as const,
                                                            icon: <XCircleIcon className="w-3 h-3" />,
                                                            label: "Hết hạn",
                                                            className: "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                                        },
                                                        depleted: {
                                                            variant: "secondary" as const,
                                                            icon: <XCircleIcon className="w-3 h-3" />,
                                                            label: "Hết lượt",
                                                            className: "bg-red-500/10 text-red-600 border-red-500/20"
                                                        },
                                                        inactive: {
                                                            variant: "secondary" as const,
                                                            icon: <XCircleIcon className="w-3 h-3" />,
                                                            label: "Đã tắt",
                                                            className: "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                                        },
                                                        all: {
                                                            variant: "secondary" as const,
                                                            icon: <ClockIcon className="w-3 h-3" />,
                                                            label: "Tất cả",
                                                            className: "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                                        }
                                                    };
                                                    const config = statusConfig[status] || statusConfig.inactive;
                                                    return (
                                                        <Badge variant={config.variant} className={`gap-1 border rounded-xl ${config.className}`}>
                                                            {config.icon}
                                                            {config.label}
                                                        </Badge>
                                                    );
                                                })()}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditDialog(coupon)}
                                                        className="rounded-xl text-blue-600/70 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openDeleteDialog(coupon)}
                                                        className="rounded-xl text-red-600/70 hover:text-red-600 hover:bg-red-50 transition-colors"
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
                        {filteredCoupons.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border">
                                <TablePagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={filteredCoupons.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
