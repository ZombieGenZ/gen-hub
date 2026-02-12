"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
    TagIcon,
    CheckCircleIcon,
    TicketIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { CouponService } from '@/services/coupons/coupon.service';
import { authStorage } from '@/services/auth/auth-storage.service';

// Types
interface CouponItem {
    id: string;
    code: string;
    name: string;
    description?: string;
    discount_type: 'PERCENT' | 'FIXED';
    discount_value: number;
    max_discount_amount?: number;
    min_order_amount?: number;
    valid_from?: string;
    valid_until?: string;
    is_applicable: boolean;
    not_applicable_reason?: string;
}

interface CouponDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCouponApplied: (coupon: { code: string; discount: number } | null) => void;
    appliedCoupon?: { code: string; discount: number } | null;
    // Context for filtering applicable coupons
    warehouseId?: string;
    rentalType?: 'whole' | 'row';
    rowIds?: string[];
    addonIds?: string[];
    durationTierId?: string;
    orderAmount?: number;
}

export function CouponDrawer({
    open,
    onOpenChange,
    onCouponApplied,
    appliedCoupon,
    warehouseId,
    rentalType,
    rowIds,
    addonIds,
    durationTierId,
    orderAmount = 0,
}: CouponDrawerProps) {
    const [coupons, setCoupons] = useState<CouponItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [isApplying, setIsApplying] = useState(false);
    const [applyError, setApplyError] = useState<string | null>(null);

    // Fetch available coupons
    useEffect(() => {
        if (!open) return;

        const fetchCoupons = async () => {
            setIsLoading(true);
            setError(null);

            const token = authStorage.getAccessToken();
            const API = process.env.NEXT_PUBLIC_API_URL;

            try {
                let couponList: CouponItem[] = [];

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
                        const applicableCoupons = data.data || [];
                        couponList = applicableCoupons.map((c: any) => ({
                            id: c.id,
                            code: c.code,
                            name: c.name,
                            description: c.description,
                            discount_type: c.discount_type,
                            discount_value: c.discount_value,
                            max_discount_amount: c.max_discount_amount,
                            min_order_amount: c.min_order_amount,
                            valid_from: c.starts_at,
                            valid_until: c.ends_at,
                            is_applicable: c.is_applicable !== false,
                            not_applicable_reason: c.is_applicable === false ? 'Không đủ điều kiện' : undefined,
                        }));
                    }
                }

                // Also fetch public coupons (no auth required)
                const publicRes = await fetch(`${API}/public/coupons?limit=20`);
                if (publicRes.ok) {
                    const publicData = await publicRes.json();
                    const publicCoupons = publicData.data?.items || publicData.data || [];

                    // Add public coupons that aren't already in the list
                    const existingCodes = new Set(couponList.map(c => c.code));
                    const newPublicCoupons = publicCoupons
                        .filter((c: any) => !existingCodes.has(c.code))
                        .map((c: any) => ({
                            id: c.id,
                            code: c.code,
                            name: c.name,
                            description: c.description,
                            discount_type: c.discount_type,
                            discount_value: c.discount_value,
                            max_discount_amount: c.max_discount_amount,
                            min_order_amount: c.min_order_amount,
                            valid_from: c.starts_at,
                            valid_until: c.ends_at,
                            is_applicable: true, // Will be validated when applied
                            not_applicable_reason: undefined,
                        }));

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
                    // Fallback to mock if no coupons from API
                    setCoupons(MOCK_COUPONS);
                }
            } catch (err) {
                console.error('Error fetching coupons:', err);
                setCoupons(MOCK_COUPONS);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCoupons();
    }, [open, orderAmount, warehouseId, rowIds, addonIds, durationTierId]);


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
    const handleApplyCoupon = useCallback(async (coupon: CouponItem) => {
        if (!coupon.is_applicable) return;

        setIsApplying(true);
        setApplyError(null);

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
                onCouponApplied({ code: coupon.code, discount: result.discount_amount });
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
    }, [warehouseId, rowIds, addonIds, durationTierId, onCouponApplied, onOpenChange]);

    // Apply manual coupon code
    const handleApplyManualCode = useCallback(async () => {
        if (!manualCode.trim()) return;

        setIsApplying(true);
        setApplyError(null);

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
                onCouponApplied({ code: manualCode.toUpperCase(), discount: result.discount_amount });
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
    }, [manualCode, warehouseId, rowIds, addonIds, durationTierId, onCouponApplied, onOpenChange]);

    // Remove applied coupon
    const handleRemoveCoupon = useCallback(() => {
        onCouponApplied(null);
    }, [onCouponApplied]);

    // Format discount display
    const formatDiscount = (coupon: CouponItem) => {
        if (coupon.discount_type === 'PERCENT') {
            return `Giảm ${coupon.discount_value}%${coupon.max_discount_amount ? ` (tối đa ${coupon.max_discount_amount.toLocaleString('vi-VN')}₫)` : ''}`;
        }
        return `Giảm ${coupon.discount_value.toLocaleString('vi-VN')}₫`;
    };

    // Format validity  
    const formatValidity = (coupon: CouponItem) => {
        if (coupon.valid_until) {
            const date = new Date(coupon.valid_until);
            return `HSD: ${date.toLocaleDateString('vi-VN')}`;
        }
        return null;
    };

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
                {appliedCoupon && (
                    <div className="mx-6 mt-4 p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-[#0F766E]" />
                            <div>
                                <p className="font-semibold text-[#0F766E]">{appliedCoupon.code}</p>
                                <p className="text-xs text-teal-600">
                                    Giảm {appliedCoupon.discount.toLocaleString('vi-VN')}₫
                                </p>
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
                                className="pr-10 h-12 rounded-xl uppercase"
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
                            className="h-12 px-6 bg-[#0F766E] hover:bg-[#0D655D] rounded-xl"
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
                            // Loading skeletons
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
                        ) : error ? (
                            <div className="text-center py-8 text-slate-500">
                                <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                                <p>{error}</p>
                            </div>
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
                                        appliedCoupon?.code === coupon.code && "border-[#0F766E] bg-teal-50/30"
                                    )}
                                >
                                    {/* Applied check mark */}
                                    {appliedCoupon?.code === coupon.code && (
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#0F766E] rounded-full flex items-center justify-center">
                                            <CheckIcon className="w-4 h-4 text-white" />
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        {/* Coupon Icon / Badge */}
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

                                        {/* Content */}
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

                                            {coupon.min_order_amount && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Đơn tối thiểu {coupon.min_order_amount.toLocaleString('vi-VN')}₫
                                                </p>
                                            )}

                                            <div className="flex items-center gap-3 mt-2">
                                                {formatValidity(coupon) && (
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <ClockIcon className="w-3 h-3" />
                                                        {formatValidity(coupon)}
                                                    </span>
                                                )}

                                                {!coupon.is_applicable && coupon.not_applicable_reason && (
                                                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
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
            </SheetContent>
        </Sheet>
    );
}

// Trigger Button Component (for convenience)
interface CouponTriggerButtonProps {
    appliedCoupon?: { code: string; discount: number } | null;
    onClick: () => void;
    className?: string;
}

export function CouponTriggerButton({
    appliedCoupon,
    onClick,
    className,
}: CouponTriggerButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full p-4 rounded-xl border-2 border-dashed transition-all flex items-center justify-between",
                appliedCoupon
                    ? "border-[#0F766E] bg-teal-50/50"
                    : "border-slate-200 hover:border-[#0F766E] hover:bg-slate-50",
                className
            )}
        >
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    appliedCoupon ? "bg-[#0F766E]" : "bg-slate-100"
                )}>
                    <TicketIcon className={cn(
                        "w-5 h-5",
                        appliedCoupon ? "text-white" : "text-slate-500"
                    )} />
                </div>
                <div className="text-left">
                    {appliedCoupon ? (
                        <>
                            <p className="font-semibold text-[#0F766E]">{appliedCoupon.code}</p>
                            <p className="text-xs text-teal-600">
                                Giảm {appliedCoupon.discount.toLocaleString('vi-VN')}₫
                            </p>
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
                {appliedCoupon ? 'Thay đổi' : 'Chọn mã'}
            </span>
        </button>
    );
}

// Mock Coupons for fallback
const MOCK_COUPONS: CouponItem[] = [
    {
        id: 'coupon-1',
        code: 'NEWUSER2024',
        name: 'Ưu đãi khách hàng mới',
        description: 'Giảm 10% cho đơn thuê đầu tiên',
        discount_type: 'PERCENT',
        discount_value: 10,
        max_discount_amount: 5000000,
        min_order_amount: 10000000,
        valid_until: '2024-12-31',
        is_applicable: true,
    },
    {
        id: 'coupon-2',
        code: 'GENHUB500K',
        name: 'Mã giảm cố định',
        description: 'Giảm trực tiếp 500.000₫',
        discount_type: 'FIXED',
        discount_value: 500000,
        min_order_amount: 5000000,
        valid_until: '2024-11-30',
        is_applicable: true,
    },
    {
        id: 'coupon-3',
        code: 'LONGTERM15',
        name: 'Ưu đãi thuê dài hạn',
        description: 'Giảm 15% cho đơn thuê từ 12 tháng',
        discount_type: 'PERCENT',
        discount_value: 15,
        max_discount_amount: 10000000,
        min_order_amount: 50000000,
        valid_until: '2024-12-31',
        is_applicable: false,
        not_applicable_reason: 'Đơn tối thiểu 50.000.000₫',
    },
];
