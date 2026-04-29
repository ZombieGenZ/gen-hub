"use client";

import React, { useEffect } from 'react';
import { useCheckout } from './CheckoutWizard';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    CalendarIcon,
    ClockIcon,
    CubeIcon,
    MapPinIcon,
    TagIcon,
    CheckCircleIcon,
    ShieldCheckIcon,
    PlusCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatCurrencyFull } from '@/lib/format-currency';

/**
 * Step 1: Xác nhận thông tin thuê
 * Hiển thị tóm tắt thông tin đã chọn từ BookingWidget
 */
export function RentalInfoStep() {
    const { session, setCanProceed } = useCheckout();

    // Auto enable proceed - thông tin đã được chọn sẵn từ BookingWidget
    useEffect(() => {
        const hasRequiredInfo =
            session.warehouse_template_id &&
            session.duration_tier_id &&
            session.start_date;

        setCanProceed(!!hasRequiredInfo);
    }, [session, setCanProceed]);

    const startDate = session.start_date ? new Date(session.start_date) : new Date();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-[#0F766E]" />
                    Xác nhận thông tin thuê
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                    Vui lòng kiểm tra lại thông tin trước khi tiếp tục
                </p>
            </div>

            {/* Warehouse Info Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-slate-200 rounded-lg flex items-center justify-center">
                        <CubeIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-lg">
                            {session.warehouse_name || 'Kho bãi đã chọn'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                            <MapPinIcon className="w-4 h-4" />
                            <span>{session.warehouse_details?.address || 'Vị trí sẽ được xác nhận sau'}</span>
                        </div>
                        <Badge
                            variant="outline"
                            className={`mt-2 ${session.rental_type === 'whole'
                                ? 'border-[#0F766E] text-[#0F766E]'
                                : 'border-blue-500 text-blue-600'
                                }`}
                        >
                            {session.rental_type === 'whole' ? 'Thuê nguyên kho' : 'Thuê theo dãy/kệ'}
                        </Badge>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Rental Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg">
                            <CalendarIcon className="w-5 h-5 text-[#0F766E]" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Ngày bắt đầu</p>
                            <p className="font-semibold text-slate-900">
                                {format(startDate, "d 'tháng' M, yyyy", { locale: vi })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Duration */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg">
                            <ClockIcon className="w-5 h-5 text-[#0F766E]" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Thời hạn thuê</p>
                            <p className="font-semibold text-slate-900">
                                {session.duration_tier_name || `${session.duration_months} tháng`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Selected Addons */}
            {session.addon_ids && session.addon_ids.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-medium text-slate-700 flex items-center gap-2">
                        <PlusCircleIcon className="w-4 h-4 text-[#0F766E]" />
                        Dịch vụ cộng thêm
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {session.addon_details ? (
                            session.addon_details.map((addon) => (
                                <Badge
                                    key={addon.id}
                                    variant="secondary"
                                    className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                                >
                                    {addon.name}
                                    {addon.price > 0 && (
                                        <span className="ml-1 text-slate-500">
                                            ({formatCurrencyFull(addon.price)})
                                        </span>
                                    )}
                                </Badge>
                            ))
                        ) : (
                            session.addon_ids.map((id) => (
                                <Badge key={id} variant="secondary" className="bg-slate-100 text-slate-700">
                                    {id}
                                </Badge>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Insurance */}
            {session.insurance_id && (
                <div className="space-y-3">
                    <h4 className="font-medium text-slate-700 flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-[#0F766E]" />
                        Gói bảo hiểm
                    </h4>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                        {session.insurance_details?.name || session.insurance_id}
                        {session.insurance_details?.price ? (
                            <span className="ml-1 text-blue-600 opacity-80">
                                ({session.insurance_details.price > 1000
                                    ? `${formatCurrencyFull(session.insurance_details.price)}/tháng`
                                    : `${session.insurance_details.price}%`})
                            </span>
                        ) : null}
                    </Badge>
                </div>
            )}

            {/* Coupon */}
            {session.coupon_code && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <TagIcon className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-sm font-medium text-green-800">
                                Mã giảm giá đã áp dụng
                            </p>
                            <p className="text-green-700 font-bold">{session.coupon_code}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Row Selection (if partial rental) */}
            {session.rental_type === 'row' && session.row_template_ids && session.row_template_ids.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-medium text-slate-700 flex items-center gap-2">
                        <CubeIcon className="w-4 h-4 text-[#0F766E]" />
                        Dãy/Kệ đã chọn ({session.row_template_ids.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {session.row_details ? (
                            session.row_details.map((row) => (
                                <Badge
                                    key={row.id}
                                    variant="outline"
                                    className="border-slate-300"
                                >
                                    {row.name}
                                </Badge>
                            ))
                        ) : (
                            session.row_template_ids.map((rowId) => (
                                <Badge
                                    key={rowId}
                                    variant="outline"
                                    className="border-slate-300"
                                >
                                    {rowId}
                                </Badge>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Price Summary */}
            {session.quotation && (
                <div className="bg-[#0F766E] rounded-xl text-white overflow-hidden">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-teal-100 text-sm mb-1">Tổng giá trị hợp đồng</p>
                                <p className="text-3xl font-black">
                                    {formatCurrencyFull(session.quotation.grandTotal)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-teal-100 text-sm mb-1">Thời hạn</p>
                                <p className="text-xl font-bold">{session.duration_months || 0} tháng</p>
                            </div>
                        </div>

                        <Separator className="bg-teal-700/50 mb-4" />

                        {/* Detailed Breakdown inside the green card */}
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-teal-50/90">
                                <span>Giá thuê cơ bản ({formatCurrencyFull(session.quotation.basePrice)}/tháng x {session.duration_months || 0})</span>
                                <span className="font-medium">{formatCurrencyFull(session.quotation.basePrice * (session.duration_months || 0))}</span>
                            </div>

                            {session.quotation.durationDiscountAmount > 0 && (
                                <div className="flex justify-between text-orange-200">
                                    <span>Giảm giá kỳ hạn ({session.quotation.durationDiscountPercent}%)</span>
                                    <span>-{formatCurrencyFull(session.quotation.durationDiscountAmount)}</span>
                                </div>
                            )}

                            {session.quotation.addonsCost > 0 && (
                                <div className="flex justify-between text-teal-50/90">
                                    <span>Dịch vụ cộng thêm</span>
                                    <span>+{formatCurrencyFull(session.quotation.addonsCost)}</span>
                                </div>
                            )}

                            {(session.quotation.insuranceCost + session.quotation.managementFee) > 0 && (
                                <div className="flex justify-between text-teal-50/90">
                                    <span>Bảo hiểm ({session.duration_months || 0} tháng)</span>
                                    <span>+{formatCurrencyFull(session.quotation.insuranceCost + session.quotation.managementFee)}</span>
                                </div>
                            )}

                            {session.quotation.couponDiscount > 0 && (
                                <div className="flex justify-between text-orange-200">
                                    <span>Mã giảm giá</span>
                                    <span>-{formatCurrencyFull(session.quotation.couponDiscount)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-teal-50/90">
                                <span>VAT (10%)</span>
                                <span>+{formatCurrencyFull(session.quotation.serviceFee)}</span>
                            </div>

                            <Separator className="bg-teal-700/50 my-3" />

                            <div className="flex justify-between items-center text-teal-50">
                                <span className="font-medium">Tổng cộng</span>
                                <span className="font-bold text-lg text-white">
                                    {formatCurrencyFull(session.quotation.grandTotal)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-teal-50">
                                <span className="font-medium">Cọc giữ chỗ (10%)</span>
                                <span className="font-bold text-lg text-white">
                                    {formatCurrencyFull(session.quotation.depositAmount ?? Math.round(session.quotation.grandTotal * 0.1))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
