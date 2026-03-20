"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
    TicketIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { CouponService } from '@/services/coupons/coupon.service';
import { authStorage } from '@/services/auth/auth-storage.service';
import { CouponUIItem } from "@/types/coupons/coupon.type";

const extractCouponArray = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.items)) return data.items;
    return [];
};

interface CouponDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouseId?: string;
    rowIds?: string[];
    addonIds?: string[];
    durationTierId?: string;
    orderAmount: number;
    onApply: (coupon: { code: string; discount_amount: number }) => void;
    appliedCode?: string;
}

export function CouponDrawer({
    open,
    onOpenChange,
    warehouseId,
    rowIds,
    addonIds,
    durationTierId,
    orderAmount,
    onApply,
    appliedCode,
}: CouponDrawerProps) {
    const [coupons, setCoupons] = useState<CouponUIItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [manualCode, setManualCode] = useState("");
    const [isApplying, setIsApplying] = useState(false);
    const [applyError, setApplyError] = useState("");

    const fetchCoupons = useCallback(async () => {
        setIsLoading(true);
        try {
            const API = process.env.NEXT_PUBLIC_API_URL;
            const token = authStorage.getAccessToken();
            let couponList: CouponUIItem[] = [];

            let applicableFetched = false;

            if (token && durationTierId) {
                // If user is logged in and has order context, fetch applicable coupons
                const res = await fetch(`${API}/public/coupons/applicable`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        warehouse_template_ids: warehouseId ? [warehouseId] : undefined,
                        row_template_ids: rowIds,
                        addon_ids: addonIds,
                        rental_duration_tier_id: durationTierId,
                        type: 'NEW_CONTRACT',
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    const applicableCoupons = extractCouponArray(data?.data);
                    couponList = applicableCoupons.map((c: any) => CouponService.parseCouponToUI(c, orderAmount, true));
                    applicableFetched = true;
                }
            }

            // Also fetch public coupons (no auth required)
            const publicRes = await fetch(`${API}/public/coupons?limit=20`);
            if (publicRes.ok) {
                const publicData = await publicRes.json();
                const publicCoupons = extractCouponArray(publicData?.data);

                // Add public coupons that aren't already in the list
                const existingCodes = new Set(couponList.map(c => c.code));
                const newPublicCoupons = publicCoupons
                    .filter((c: any) => !existingCodes.has(c.code))
                    .map((c: any) => CouponService.parseCouponToUI(c, orderAmount, applicableFetched ? false : undefined));

                couponList = [...couponList, ...newPublicCoupons];
            }

            if (couponList.length > 0) {
                // Sort: applicable first, then by discount value
                couponList.sort((a, b) => {
                    if (a.is_applicable !== b.is_applicable) {
                        return a.is_applicable ? -1 : 1;
                    }
                    return b.discount_value - a.discount_value;
                });
                setCoupons(couponList);
            } else {
                setCoupons([]);
            }
        } catch (err) {
            console.error('Error fetching coupons:', err);
            setCoupons([]);
        } finally {
            setIsLoading(false);
        }
    }, [warehouseId, rowIds, addonIds, durationTierId, orderAmount]);

    useEffect(() => {
        if (open) {
            fetchCoupons();
        }
    }, [open, fetchCoupons]);

    // Filter coupons by search
    const filteredCoupons = useMemo(() => {
        if (!searchQuery) return coupons;
        const q = searchQuery.toLowerCase();
        return coupons.filter(c =>
            c.code.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            c.description?.toLowerCase().includes(q)
        );
    }, [coupons, searchQuery]);

    // Apply a coupon from the list
    const handleApplyCoupon = useCallback(async (coupon: CouponUIItem) => {
        if (!coupon.is_applicable) return;

        setIsApplying(true);
        setApplyError("");

        const token = authStorage.getAccessToken();
        if (!token) {
            setApplyError('Vui lòng đăng nhập');
            setIsApplying(false);
            return;
        }

        try {
            const couponService = new CouponService();
            const result = await couponService.validateCoupon(
                coupon.code,
                {
                    warehouse_template_ids: warehouseId ? [warehouseId] : undefined,
                    row_template_ids: rowIds,
                    addon_ids: addonIds,
                    rental_duration_tier_id: durationTierId || '',
                    type: 'NEW_CONTRACT',
                },
                token
            );

            if (result.is_valid) {
                onApply({ code: coupon.code, discount_amount: result.discount_amount });
                onOpenChange(false);
            } else {
                setApplyError(result.message || 'Mã không áp dụng được');
            }
        } catch (err) {
            console.error('Error applying coupon:', err);
            setApplyError('Lỗi áp dụng mã giảm giá');
        } finally {
            setIsApplying(false);
        }
    }, [warehouseId, rowIds, addonIds, durationTierId, onApply, onOpenChange]);

    // Apply manual coupon code
    const handleApplyManualCode = useCallback(async () => {
        if (!manualCode.trim()) return;

        setIsApplying(true);
        setApplyError("");

        const token = authStorage.getAccessToken();
        if (!token) {
            setApplyError('Vui lòng đăng nhập');
            setIsApplying(false);
            return;
        }

        try {
            const couponService = new CouponService();
            const result = await couponService.validateCoupon(
                manualCode.toUpperCase(),
                {
                    warehouse_template_ids: warehouseId ? [warehouseId] : undefined,
                    row_template_ids: rowIds,
                    addon_ids: addonIds,
                    rental_duration_tier_id: durationTierId || '',
                    type: 'NEW_CONTRACT',
                },
                token
            );

            if (result.is_valid) {
                onApply({ code: manualCode.toUpperCase(), discount_amount: result.discount_amount });
                onOpenChange(false);
                setManualCode('');
            } else {
                setApplyError(result.message || 'Mã không hợp lệ hoặc không áp dụng được');
            }
        } catch (err) {
            console.error('Error applying manual coupon:', err);
            setApplyError('Lỗi áp dụng mã giảm giá');
        } finally {
            setIsApplying(false);
        }
    }, [manualCode, warehouseId, rowIds, addonIds, durationTierId, onApply, onOpenChange]);

    // Remove applied coupon (usually handled by parent, but keeping logic for consistency)
    const handleRemoveCoupon = useCallback(() => {
        onApply({ code: "", discount_amount: 0 });
    }, [onApply]);

    // Format discount display
    const formatDiscount = (coupon: CouponUIItem) => {
        if (coupon.discount_type === 'PERCENT') {
            return `Giảm ${coupon.discount_value}%${coupon.max_discount_amount ? ` (tối đa ${coupon.max_discount_amount.toLocaleString('vi-VN')}₫)` : ''}`;
        }
        return `Giảm ${coupon.discount_value.toLocaleString('vi-VN')}₫`;
    };

    // Format validity  
    const formatValidity = (coupon: CouponUIItem) => {
        if (coupon.valid_until) {
            const date = new Date(coupon.valid_until);
            return `HSD: ${date.toLocaleDateString('vi-VN')}`;
        }
        return null;
    };

    // Get applied coupon data
    const appliedCouponData = useMemo(() => {
        if (!appliedCode) return null;
        return coupons.find(c => c.code === appliedCode);
    }, [coupons, appliedCode]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b border-slate-100">
                    <SheetTitle className="flex items-center gap-2 text-lg">
                        <TicketIcon className="w-5 h-5 text-[#0F766E]" />
                        Mã giảm giá
                    </SheetTitle>
                    <SheetDescription className="text-sm text-slate-500">
                        Chọn hoặc nhập mã giảm giá
                    </SheetDescription>
                </SheetHeader>

                {/* Applied Coupon Banner */}
                {appliedCode && (
                    <div className="mx-6 mt-4 p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-[#0F766E]" />
                            <div>
                                <p className="font-semibold text-[#0F766E]">{appliedCode}</p>
                                {appliedCouponData && (
                                    <p className="text-xs text-teal-600">
                                        Giảm {appliedCouponData.discount_value.toLocaleString('vi-VN')}₫
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveCoupon}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Manual Code Input */}
                <div className="px-6 py-4 border-b border-slate-100">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                placeholder="Nhập mã giảm giá"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                className="pr-10 h-12 rounded-xl uppercase border-slate-200 focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E]"
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyManualCode()}
                            />
                            {manualCode && (
                                <button
                                    onClick={() => setManualCode('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <Button
                            onClick={handleApplyManualCode}
                            disabled={!manualCode.trim() || isApplying}
                            className="h-12 px-6 bg-[#0F766E] hover:bg-[#0D655D] rounded-xl text-white font-bold"
                        >
                            {isApplying ? '...' : 'Áp dụng'}
                        </Button>
                    </div>
                    {applyError && (
                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                            {applyError}
                        </p>
                    )}
                </div>

                {/* Search */}
                <div className="px-6 py-3 border-b border-slate-100">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Tìm mã giảm giá..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-lg bg-slate-50 border-slate-200"
                        />
                    </div>
                </div>

                {/* Coupon List */}
                <ScrollArea className="flex-1 px-6">
                    <div className="py-4 space-y-3">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="p-4 rounded-xl border border-slate-200">
                                    <div className="flex gap-3">
                                        <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-full" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : filteredCoupons.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <TicketIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p>Không tìm thấy mã giảm giá</p>
                            </div>
                        ) : (
                            filteredCoupons.map((coupon) => (
                                <div
                                    key={coupon.id}
                                    onClick={() => coupon.is_applicable && handleApplyCoupon(coupon)}
                                    className={cn(
                                        "relative p-4 rounded-xl border-2 transition-all",
                                        coupon.is_applicable
                                            ? "border-slate-200 hover:border-[#0F766E] hover:shadow-md cursor-pointer"
                                            : "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed",
                                        appliedCode === coupon.code && "border-[#0F766E] bg-teal-50/30"
                                    )}
                                >
                                    {appliedCode === coupon.code && (
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#0F766E] rounded-full flex items-center justify-center">
                                            <CheckIcon className="w-4 h-4 text-white" />
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <div className={cn(
                                            "w-14 h-14 rounded-lg flex items-center justify-center shrink-0",
                                            coupon.discount_type === 'PERCENT'
                                                ? "bg-gradient-to-br from-orange-400 to-orange-500"
                                                : "bg-gradient-to-br from-teal-400 to-teal-500"
                                        )}>
                                            <span className="text-white font-bold text-lg">
                                                {coupon.discount_type === 'PERCENT'
                                                    ? `${coupon.discount_value}%`
                                                    : `${Math.round(coupon.discount_value / 1000)}K`
                                                }
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">
                                                        {coupon.code}
                                                    </p>
                                                    <p className="text-xs text-slate-600 mt-0.5">
                                                        {coupon.name}
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="text-sm font-medium text-[#0F766E] mt-1">
                                                {formatDiscount(coupon)}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                                {formatValidity(coupon) && (
                                                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                        <ClockIcon className="w-3 h-3" />
                                                        {formatValidity(coupon)}
                                                    </span>
                                                )}
                                                
                                                {coupon.min_order_amount && (
                                                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                        Tối thiểu {coupon.min_order_amount.toLocaleString('vi-VN')}₫
                                                    </span>
                                                )}

                                                {!coupon.is_applicable && coupon.not_applicable_reason && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 bg-red-50 text-red-600 border-red-100 font-bold px-2">
                                                        {coupon.not_applicable_reason}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <Button 
                        variant="outline" 
                        onClick={() => onOpenChange(false)}
                        className="w-full h-11 rounded-xl text-slate-600 font-bold"
                    >
                        Đóng
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

// Trigger Button Component (for convenience)
interface CouponTriggerButtonProps {
    appliedCode?: string;
    discountAmount?: number;
    onClick: () => void;
    className?: string;
}

export function CouponTriggerButton({
    appliedCode,
    discountAmount,
    onClick,
    className,
}: CouponTriggerButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full p-4 rounded-xl border-2 border-dashed transition-all flex items-center justify-between",
                appliedCode
                    ? "border-[#0F766E] bg-teal-50/50"
                    : "border-slate-200 hover:border-[#0F766E] hover:bg-slate-50",
                className
            )}
        >
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    appliedCode ? "bg-[#0F766E]" : "bg-slate-100"
                )}>
                    <TicketIcon className={cn(
                        "w-5 h-5",
                        appliedCode ? "text-white" : "text-slate-500"
                    )} />
                </div>
                <div className="text-left">
                    {appliedCode ? (
                        <>
                            <p className="font-semibold text-[#0F766E]">{appliedCode}</p>
                            {discountAmount !== undefined && (
                                <p className="text-xs text-teal-600">
                                    Giảm {discountAmount.toLocaleString('vi-VN')}₫
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="font-medium text-slate-700">Mã giảm giá</p>
                            <p className="text-xs text-slate-500">Nhấn để chọn hoặc nhập mã</p>
                        </>
                    )}
                </div>
            </div>
            <span className="text-[#0F766E] font-medium text-sm">
                {appliedCode ? 'Thay đổi' : 'Chọn mã'}
            </span>
        </button>
    );
}

