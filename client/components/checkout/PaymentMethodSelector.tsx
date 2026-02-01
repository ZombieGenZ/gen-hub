"use client";

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PaymentMethod, PAYMENT_METHODS } from '@/types/checkout/checkout.type';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    QrCodeIcon,
    BuildingLibraryIcon,
    CheckCircleIcon,
    ClockIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useCheckout } from './CheckoutWizard';
import { formatCurrency } from '@/lib/utils';

interface PaymentMethodSelectorProps {
    value?: PaymentMethod;
    onChange: (method: PaymentMethod) => void;
    disabled?: boolean;
    className?: string;
}

export function PaymentMethodSelector({
    value,
    onChange,
    disabled = false,
    className
}: PaymentMethodSelectorProps) {
    const { setCanProceed } = useCheckout();

    // Enable "Xác nhận & Tạo đơn" button when a payment method is selected
    useEffect(() => {
        setCanProceed(!!value);
    }, [value, setCanProceed]);

    // Render icon theo loại
    const renderIcon = (iconName: string) => {
        switch (iconName) {
            case 'qr-code':
                return <QrCodeIcon className="w-8 h-8" />;
            case 'building-library':
                return <BuildingLibraryIcon className="w-8 h-8" />;
            default:
                return null;
        }
    };

    return (
        <div className={cn("space-y-6", className)}>
            {/* Order Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-4">Thông tin đơn hàng</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-600">Tổng giá trị hợp đồng</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(450000000)}đ</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-600">Thời gian thuê</span>
                        <span className="text-slate-700">6 tháng</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-900">Số tiền đặt cọc</span>
                            <span className="text-lg font-bold text-[#0F766E]">{formatCurrency(45000000)}đ</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">10% giá trị hợp đồng</p>
                    </div>
                </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                    <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-blue-900">Thanh toán đặt cọc</h4>
                    <p className="text-sm text-blue-700 mt-1">
                        Thanh toán đặt cọc để giữ chỗ. Sau đó bạn sẽ ký hợp đồng điện tử và hoàn tất quy trình.
                    </p>
                </div>
            </div>

            <RadioGroup
                value={value}
                onValueChange={(val) => onChange(val as PaymentMethod)}
                disabled={disabled}
                className="grid grid-cols-1 gap-4"
            >
                {PAYMENT_METHODS.map((method) => {
                    const isSelected = value === method.id;

                    return (
                        <div
                            key={method.id}
                            className={cn(
                                "relative flex items-start p-4 rounded-xl border-2 transition-all cursor-pointer",
                                isSelected
                                    ? "border-[#0F766E] bg-teal-50/50"
                                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => !disabled && onChange(method.id)}
                        >
                            <RadioGroupItem
                                value={method.id}
                                id={`payment-${method.id}`}
                                className="mt-1"
                            />

                            <div className="ml-4 flex-1">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        isSelected ? "bg-[#0F766E] text-white" : "bg-slate-100 text-slate-600"
                                    )}>
                                        {renderIcon(method.icon)}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Label
                                                htmlFor={`payment-${method.id}`}
                                                className="text-base font-semibold text-slate-800 cursor-pointer"
                                            >
                                                {method.name}
                                            </Label>
                                            {method.isRecommended && (
                                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none text-xs">
                                                    Khuyên dùng
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {method.description}
                                        </p>
                                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                                            <ClockIcon className="w-3 h-3" />
                                            <span>Thời gian xác nhận: {method.processingTime}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isSelected && (
                                <CheckCircleIcon className="absolute top-4 right-4 w-5 h-5 text-[#0F766E]" />
                            )}
                        </div>
                    );
                })}
            </RadioGroup>

            {/* SePay QR Info */}
            {value === 'sepay-qr' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-4">
                    <h4 className="font-semibold text-blue-800 text-sm">Thanh toán qua SePay QR</h4>
                    <ul className="mt-2 space-y-1 text-sm text-blue-700">
                        <li>• Mở app ngân hàng hoặc ví điện tử</li>
                        <li>• Quét mã QR sẽ hiển thị ở bước tiếp theo</li>
                        <li>• Thanh toán sẽ được xác nhận tự động</li>
                    </ul>
                </div>
            )}

        </div>
    );
}
