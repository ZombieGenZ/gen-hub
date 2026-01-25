"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useCheckout } from './CheckoutWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    UserIcon,
    IdentificationIcon,
    PhoneIcon,
    EnvelopeIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { validatePhoneNumber, validateEmail } from '@/lib/validation.utils';

interface RepresentativeData {
    representative_name: string;
    representative_title: string;
    representative_phone: string;
    representative_email: string;
}

interface RepresentativeInfoStepProps {
    initialData?: Partial<RepresentativeData>;
    onChange?: (data: RepresentativeData, isValid: boolean) => void;
}

/**
 * Step 3: Thông tin người đại diện
 */
export function RepresentativeInfoStep({ initialData, onChange }: RepresentativeInfoStepProps) {
    const { setCanProceed } = useCheckout();

    const [formData, setFormData] = useState<RepresentativeData>({
        representative_name: initialData?.representative_name || '',
        representative_title: initialData?.representative_title || '',
        representative_phone: initialData?.representative_phone || '',
        representative_email: initialData?.representative_email || '',
    });

    const [errors, setErrors] = useState<Partial<Record<keyof RepresentativeData, string>>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Validate single field
    const validateField = useCallback((field: keyof RepresentativeData, value: string): string | undefined => {
        switch (field) {
            case 'representative_name':
                if (!value || value.trim().length < 2) {
                    return 'Tên người đại diện phải có ít nhất 2 ký tự';
                }
                break;
            case 'representative_phone':
                const phoneResult = validatePhoneNumber(value);
                if (!phoneResult.isValid) {
                    return phoneResult.message;
                }
                break;
            case 'representative_email':
                const emailResult = validateEmail(value);
                if (!emailResult.isValid) {
                    return emailResult.message;
                }
                break;
        }
        return undefined;
    }, []);

    // Validate all
    const validateAll = useCallback((): boolean => {
        const requiredFields: (keyof RepresentativeData)[] = [
            'representative_name',
            'representative_phone',
            'representative_email'
        ];
        let isValid = true;

        requiredFields.forEach(field => {
            const error = validateField(field, formData[field]);
            if (error) isValid = false;
        });

        return isValid;
    }, [formData, validateField]);

    // Update canProceed
    useEffect(() => {
        const isValid = validateAll();
        setCanProceed(isValid);
        if (onChange) {
            onChange(formData, isValid);
        }
    }, [formData, validateAll, setCanProceed, onChange]);

    // Handle change
    const handleChange = useCallback((field: keyof RepresentativeData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    }, [errors]);

    // Handle blur
    const handleBlur = useCallback((field: keyof RepresentativeData) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        const error = validateField(field, formData[field]);
        if (error) {
            setErrors(prev => ({ ...prev, [field]: error }));
        }
    }, [formData, validateField]);

    // Render field
    const renderField = (
        field: keyof RepresentativeData,
        label: string,
        icon: React.ReactNode,
        placeholder: string,
        required: boolean = true,
        type: string = 'text'
    ) => {
        const value = formData[field];
        const error = touched[field] ? errors[field] : undefined;

        return (
            <div className="space-y-2">
                <Label className="text-slate-700 font-medium flex items-center gap-2">
                    {icon}
                    {label}
                    {required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                    type={type}
                    value={value}
                    onChange={(e) => handleChange(field, e.target.value)}
                    onBlur={() => handleBlur(field)}
                    placeholder={placeholder}
                    className={cn(
                        "h-12 rounded-xl border-slate-200",
                        error && "border-red-400 focus:border-red-500"
                    )}
                />
                {error && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                        <ExclamationCircleIcon className="w-3 h-3" />
                        {error}
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-[#0F766E]" />
                    Thông tin người đại diện
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                    Người đại diện pháp lý sẽ ký hợp đồng thuê kho
                </p>
            </div>

            {/* Name & Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField(
                    'representative_name',
                    'Họ và tên',
                    <UserIcon className="w-4 h-4 text-slate-400" />,
                    'VD: Nguyễn Văn A',
                    true
                )}
                {renderField(
                    'representative_title',
                    'Chức danh',
                    <IdentificationIcon className="w-4 h-4 text-slate-400" />,
                    'VD: Giám đốc, Chủ tịch HĐQT',
                    false
                )}
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField(
                    'representative_phone',
                    'Số điện thoại',
                    <PhoneIcon className="w-4 h-4 text-slate-400" />,
                    '0901234567',
                    true
                )}
                {renderField(
                    'representative_email',
                    'Email',
                    <EnvelopeIcon className="w-4 h-4 text-slate-400" />,
                    'email@company.com',
                    true,
                    'email'
                )}
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                    <strong>Lưu ý:</strong> Thông tin người đại diện sẽ được sử dụng để liên hệ và ký kết hợp đồng điện tử.
                    Vui lòng đảm bảo thông tin chính xác.
                </p>
            </div>
        </div>
    );
}
