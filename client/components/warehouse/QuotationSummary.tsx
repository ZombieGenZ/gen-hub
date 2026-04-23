"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircleIcon,
    TagIcon,
    ShieldCheckIcon,
    CubeIcon,
    ReceiptPercentIcon,
    TicketIcon,
} from '@heroicons/react/24/outline';
import { QuotationBreakdown } from '@/types/booking/booking.type';
import { AddonResponse } from '@/types/addon/addon.type';
import { Insurance } from '@/types/insurance/Insurance.types';
import { formatCurrencyFull } from '@/lib/format-currency';

interface QuotationSummaryProps {
    breakdown: QuotationBreakdown;
    selectedAddons?: AddonResponse[];
    selectedInsurance?: Insurance | null;
    appliedCoupon?: { code: string; discount: number } | null;
    onCouponClick?: () => void;
    rentalType?: "whole" | "row";
    warehouseName?: string;
    className?: string;
    showHeader?: boolean;
}

/**
 * Read-only quotation summary component for checkout and review pages.
 * Displays a detailed breakdown of all costs and discounts.
 */
export function QuotationSummary({
    breakdown,
    selectedAddons = [],
    selectedInsurance,
    appliedCoupon,
    onCouponClick,
    rentalType = "whole",
    warehouseName,
    className,
    showHeader = true,
}: QuotationSummaryProps) {
    // Logic cũ: Server tính phí dịch vụ trên subtotal gốc (trước coupon)
    // const effectiveServiceFee = breakdown.serviceFee;
    // const effectiveGrandTotal = breakdown.grandTotal;
    // const depositAmount = Math.round(effectiveGrandTotal * 0.1);
    
    // Logic mới: Giảm phí dịch vụ (10%) trên tổng đã trừ coupon
    const subtotal = breakdown.subtotal;
    const couponAmount = appliedCoupon?.discount || breakdown.couponDiscount || 0;
    const taxableAmount = Math.max(0, subtotal - couponAmount);
    const effectiveServiceFee = Math.round(taxableAmount * 0.1);
    const effectiveGrandTotal = taxableAmount + effectiveServiceFee;
    const depositAmount = Math.round(effectiveGrandTotal * 0.1);
    // breakdown?.depositAmount || 
    
    return (
        <div className={cn(
            "rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden",
            className
        )}>
            {/* Header */}
            {showHeader && (
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
                    <h3 className="text-lg font-bold">Chi tiết báo giá</h3>
                    {warehouseName && (
                        <p className="text-teal-100 text-sm mt-1">{warehouseName}</p>
                    )}
                </div>
            )}

            <div className="p-6 space-y-4">
                {/* Rental Type Badge */}
                <div className="flex items-center gap-2">
                    <CubeIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Loại thuê:</span>
                    <Badge variant="outline" className="border-[#0F766E] text-[#0F766E]">
                        {rentalType === "whole" ? "Thuê nguyên kho" : "Thuê theo dãy/kệ"}
                    </Badge>
                </div>

                <Separator className="bg-slate-100" />

                {/* Base Rental Cost */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-700 font-medium">Giá thuê cơ bản</span>
                        </div>
                        <span className="text-slate-900 font-semibold">
                            {formatCurrencyFull(breakdown.basePrice)}/tháng
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-500">
                        <span>× {breakdown.durationMonths} tháng</span>
                        <span>{formatCurrencyFull(breakdown.basePrice * breakdown.durationMonths)}</span>
                    </div>
                </div>

                {/* Duration Discount */}
                {breakdown.durationDiscountAmount > 0 && (
                    <div className="flex justify-between items-center bg-orange-50 rounded-lg px-3 py-2 -mx-1">
                        <div className="flex items-center gap-2">
                            <ReceiptPercentIcon className="w-4 h-4 text-orange-600" />
                            <span className="text-orange-700 text-sm font-medium">
                                Giảm giá kỳ hạn ({breakdown.durationDiscountPercent}%)
                            </span>
                        </div>
                        <span className="text-orange-600 font-semibold">
                            -{formatCurrencyFull(breakdown.durationDiscountAmount)}
                        </span>
                    </div>
                )}

                {/* Addons */}
                {selectedAddons.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-600">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">Dịch vụ cộng thêm</span>
                        </div>
                        <div className="pl-6 space-y-1">
                            {selectedAddons.map((addon) => (
                                <div key={addon.id} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{addon.name}</span>
                                    <span className="text-slate-700">
                                        +{formatCurrencyFull(addon.price)}/{addon.is_monthly_payment ? 'tháng' : 'lần'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-sm pl-6 pt-1 border-t border-dashed border-slate-200">
                            <span className="text-slate-500">Tổng dịch vụ</span>
                            <span className="font-medium text-slate-900">
                                +{formatCurrencyFull(breakdown.addonsCost)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Insurance */}
                {selectedInsurance && parseFloat(selectedInsurance.price) > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-600">
                            <ShieldCheckIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">Bảo hiểm</span>
                        </div>
                        <div className="pl-6 flex justify-between text-sm">
                            <span className="text-slate-600">{selectedInsurance.name}</span>
                            <span className="text-slate-700">
                                +{formatCurrencyFull(parseFloat(selectedInsurance.price))}/tháng
                            </span>
                        </div>
                        {breakdown.managementFee > 0 && (
                            <div className="pl-6 flex justify-between text-xs text-slate-500">
                                <span>Phí quản lý bảo hiểm</span>
                                <span>+{formatCurrencyFull(breakdown.managementFee)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm pl-6 pt-1 border-t border-dashed border-slate-200">
                            <span className="text-slate-500">Tổng bảo hiểm ({breakdown.durationMonths} tháng)</span>
                            <span className="font-medium text-slate-900">
                                +{formatCurrencyFull(breakdown.insuranceCost + breakdown.managementFee)}
                            </span>
                        </div>
                    </div>
                )}

                <Separator className="bg-slate-100" />

                {/* Subtotal */}
                <div className="flex justify-between items-center">
                    <span className="text-slate-600">Tạm tính</span>
                    <span className="text-slate-900 font-medium">
                        {formatCurrencyFull(breakdown.subtotal)}
                    </span>
                </div>

                {/* Coupon Section */}
                {appliedCoupon && appliedCoupon.discount > 0 ? (
                    <div
                        className={cn(
                            "flex justify-between items-center bg-teal-50 rounded-xl px-4 py-3 -mx-1 border border-teal-100",
                            onCouponClick && "cursor-pointer hover:bg-teal-100/60 transition-colors"
                        )}
                        onClick={onCouponClick}
                        role={onCouponClick ? "button" : undefined}
                    >
                        <div className="flex items-center gap-2">
                            <TagIcon className="w-4 h-4 text-teal-600" />
                            <div className="flex flex-col">
                                <span className="text-teal-700 text-sm font-medium">
                                    Mã: {appliedCoupon.code}
                                </span>
                                {onCouponClick && (
                                    <span className="text-xs text-teal-500">Nhấn để thay đổi</span>
                                )}
                            </div>
                        </div>
                        <span className="text-teal-600 font-semibold">
                            -{formatCurrencyFull(couponAmount)}
                        </span>
                    </div>
                ) : onCouponClick ? (
                    <button
                        onClick={onCouponClick}
                        className="w-full flex items-center gap-3 px-4 py-3 -mx-1 rounded-xl border border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/50 transition-all group"
                    >
                        <TicketIcon className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                        <div className="flex-1 text-left">
                            <span className="text-sm font-medium text-slate-600 group-hover:text-teal-700 transition-colors">
                                Mã giảm giá
                            </span>
                            <p className="text-xs text-slate-400">Nhấn để chọn hoặc nhập mã</p>
                        </div>
                        <span className="text-sm font-medium text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Chọn mã
                        </span>
                    </button>
                ) : null}

                {/* Phí dịch vụ - tính trên tổng sau giảm giá */}
                <div className="flex justify-between items-center text-slate-600">
                    <span>Phí dịch vụ (10%)</span>
                    <span className="font-medium text-slate-700">+{formatCurrencyFull(effectiveServiceFee)}</span>
                </div>

                <Separator className="bg-slate-200" />

                {/* Grand Total */}
                <div className="flex justify-between items-center pt-2">
                    <div>
                        <span className="text-lg font-bold text-slate-900">Tổng cộng</span>
                        <p className="text-xs text-slate-500">Đã bao gồm VAT</p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-slate-900">
                            {formatCurrencyFull(effectiveGrandTotal)}
                        </span>
                    </div>
                </div>

                {/* Deposit & Remaining Split */}
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mt-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-teal-800">Cọc giữ chỗ (10%)</span>
                            <span className="text-xs text-teal-600">Thanh toán ngay để khóa kho</span>
                        </div>
                        <span className="text-xl font-bold text-[#0F766E]">
                            {formatCurrencyFull(depositAmount)}
                        </span>
                    </div>
                    <Separator className="bg-teal-200" />
                    <div className="flex justify-between items-center opacity-75">
                        <span className="text-sm font-medium text-slate-600">Còn lại (Thanh toán sau)</span>
                        <span className="text-base font-semibold text-slate-700">
                            {formatCurrencyFull(Math.max(0, effectiveGrandTotal - depositAmount))}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
