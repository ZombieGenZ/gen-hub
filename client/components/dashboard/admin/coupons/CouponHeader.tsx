import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    XCircleIcon,
    ClockIcon,
    CheckCircleIcon,
    CalendarIcon,
    XMarkIcon,
    PercentBadgeIcon,
    CurrencyDollarIcon,
    GiftIcon,
} from "@heroicons/react/24/outline";

type CouponFilterStatus = 'all' | 'active' | 'scheduled' | 'expired' | 'depleted' | 'inactive';

interface CouponHeaderProps {
    error: string | null;
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    statusFilter: CouponFilterStatus;
    setStatusFilter: (val: CouponFilterStatus) => void;
    typeFilter: "all" | "PUBLIC" | "PRIVATE";
    setTypeFilter: (val: "all" | "PUBLIC" | "PRIVATE") => void;
    discountFilter: "all" | "PERCENT" | "AMOUNT" | "FREE_MONTHS";
    setDiscountFilter: (val: "all" | "PERCENT" | "AMOUNT" | "FREE_MONTHS") => void;
    startDateFilter: Date | undefined;
    setStartDateFilter: (val: Date | undefined) => void;
    endDateFilter: Date | undefined;
    setEndDateFilter: (val: Date | undefined) => void;
    clearAllFilters: () => void;
    hasActiveFilters: boolean;
    setIsCreateDialogOpen: (val: boolean) => void;
    formatDateRange: () => string;
    getStatusLabel: (status: CouponFilterStatus) => string;
    getTypeLabel: (type: string) => string;
    getDiscountLabel: (discount: string) => string;
}

export function CouponHeader({
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    discountFilter,
    setDiscountFilter,
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setEndDateFilter,
    clearAllFilters,
    hasActiveFilters,
    setIsCreateDialogOpen,
    formatDateRange,
    getStatusLabel,
    getTypeLabel,
    getDiscountLabel,
}: CouponHeaderProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[32px] leading-[130%]">
                        Mã giảm giá
                    </h1>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 rounded-xl">
                    <PlusIcon className="w-4 h-4" />
                    Tạo mã giảm giá
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="relative w-[360px] min-w-[300px] max-w-[400px]">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm theo mã (CODE), tên chương trình..."
                                    className="pl-9 rounded-xl"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="h-8 w-px bg-border hidden sm:block" />

                            <div className="flex flex-wrap items-center gap-3">
                                <Select
                                    value={statusFilter}
                                    onValueChange={(val: CouponFilterStatus) => setStatusFilter(val)}
                                >
                                    <SelectTrigger className="w-fit gap-2 rounded-xl">
                                        <ClockIcon className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="Trạng thái" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="active">
                                            <span className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                                Đang hoạt động
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="scheduled">
                                            <span className="flex items-center gap-2">
                                                <ClockIcon className="w-4 h-4 text-blue-500" />
                                                Chờ chạy
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="expired">
                                            <span className="flex items-center gap-2">
                                                <XCircleIcon className="w-4 h-4 text-orange-500" />
                                                Hết hạn
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="depleted">
                                            <span className="flex items-center gap-2">
                                                <XCircleIcon className="w-4 h-4 text-red-500" />
                                                Hết lượt
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            <span className="flex items-center gap-2">
                                                <XCircleIcon className="w-4 h-4 text-gray-400" />
                                                Đã tắt
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={typeFilter}
                                    onValueChange={(val: "all" | "PUBLIC" | "PRIVATE") => setTypeFilter(val)}
                                >
                                    <SelectTrigger className="w-fit gap-2 rounded-xl">
                                        <SelectValue placeholder="Loại mã" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="PUBLIC">Công khai</SelectItem>
                                        <SelectItem value="PRIVATE">Riêng tư</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={discountFilter}
                                    onValueChange={(val: "all" | "PERCENT" | "AMOUNT" | "FREE_MONTHS") => setDiscountFilter(val)}
                                >
                                    <SelectTrigger className="w-fit gap-2 rounded-xl">
                                        <PercentBadgeIcon className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="Loại giảm giá" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="PERCENT">
                                            <span className="flex items-center gap-2">
                                                <PercentBadgeIcon className="w-4 h-4" />
                                                Theo %
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="AMOUNT">
                                            <span className="flex items-center gap-2">
                                                <CurrencyDollarIcon className="w-4 h-4" />
                                                Số tiền
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="FREE_MONTHS">
                                            <span className="flex items-center gap-2">
                                                <GiftIcon className="w-4 h-4" />
                                                Tặng tháng
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="h-8 w-px bg-border hidden sm:block" />

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="gap-2 min-w-[200px] justify-start font-normal rounded-xl"
                                    >
                                        <CalendarIcon className="w-4 h-4" />
                                        {startDateFilter || endDateFilter ? (
                                            <span>{formatDateRange()}</span>
                                        ) : (
                                            <span className="text-muted-foreground">Chọn khoảng thời gian</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4 rounded-2xl" align="end" side="bottom">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-muted-foreground">Từ ngày</label>
                                                <div className="px-3 py-2 border rounded-lg text-sm min-w-[120px]">
                                                    {startDateFilter ? startDateFilter.toLocaleDateString('vi-VN') : '-- / -- / ----'}
                                                </div>
                                            </div>
                                            <span className="text-muted-foreground">→</span>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-muted-foreground">Đến ngày</label>
                                                <div className="px-3 py-2 border rounded-lg text-sm min-w-[120px]">
                                                    {endDateFilter ? endDateFilter.toLocaleDateString('vi-VN') : '-- / -- / ----'}
                                                </div>
                                            </div>
                                        </div>

                                        <Calendar
                                            mode="range"
                                            selected={{ from: startDateFilter, to: endDateFilter }}
                                            onSelect={(range) => {
                                                setStartDateFilter(range?.from);
                                                setEndDateFilter(range?.to);
                                            }}
                                            numberOfMonths={1}
                                        />

                                        {(startDateFilter || endDateFilter) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setStartDateFilter(undefined);
                                                    setEndDateFilter(undefined);
                                                }}
                                                className="self-end text-muted-foreground"
                                            >
                                                <XMarkIcon className="w-4 h-4 mr-1" />
                                                Xóa ngày
                                            </Button>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {hasActiveFilters && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                                <span className="text-sm text-muted-foreground mr-2">Đang lọc:</span>

                                {statusFilter !== "all" && (
                                    <Badge variant="secondary" className="gap-1.5 px-3 py-1 cursor-pointer hover:bg-secondary/80 rounded-xl">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        {getStatusLabel(statusFilter)}
                                        <button onClick={() => setStatusFilter("all")} className="ml-1 hover:text-destructive transition-colors">
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                )}

                                {typeFilter !== "all" && (
                                    <Badge variant="secondary" className="gap-1.5 px-3 py-1 cursor-pointer hover:bg-secondary/80 rounded-xl">
                                        {getTypeLabel(typeFilter)}
                                        <button onClick={() => setTypeFilter("all")} className="ml-1 hover:text-destructive transition-colors">
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                )}

                                {discountFilter !== "all" && (
                                    <Badge variant="secondary" className="gap-1.5 px-3 py-1 cursor-pointer hover:bg-secondary/80 rounded-xl">
                                        <PercentBadgeIcon className="w-3.5 h-3.5" />
                                        {getDiscountLabel(discountFilter)}
                                        <button onClick={() => setDiscountFilter("all")} className="ml-1 hover:text-destructive transition-colors">
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                )}

                                {(startDateFilter || endDateFilter) && (
                                    <Badge variant="secondary" className="gap-1.5 px-3 py-1 cursor-pointer hover:bg-secondary/80 rounded-xl">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        {formatDateRange()}
                                        <button
                                            onClick={() => {
                                                setStartDateFilter(undefined);
                                                setEndDateFilter(undefined);
                                            }}
                                            className="ml-1 hover:text-destructive transition-colors"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                )}

                                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-destructive ml-auto">
                                    <XMarkIcon className="w-4 h-4 mr-1" />
                                    Xóa tất cả
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
