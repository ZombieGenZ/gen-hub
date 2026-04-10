"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    BuildingOffice2Icon,
    IdentificationIcon,
    MapPinIcon,
    UserIcon,
    PhoneIcon,
    EnvelopeIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { validateTaxCode, validatePhoneNumber, validateEmail, formatTaxCode } from '@/lib/validation.utils';
import { OrganizationRequest } from '@/types/organization/organization.type';

interface OrganizationFormProps {
    initialData?: Partial<OrganizationRequest>;
    onSubmit?: (data: OrganizationRequest) => Promise<void>;
    onChange?: (data: Partial<OrganizationRequest>, isValid: boolean) => void;
    readonly?: boolean;
    isLoading?: boolean;
    className?: string;
}

interface FormErrors {
    name?: string;
    tax_code?: string;
    headquarters_address?: string;
    representative_name?: string;
    representative_phone?: string;
    representative_email?: string;
}

/**
 * Form đăng ký thông tin doanh nghiệp (KYC)
 */
export function OrganizationForm({
    initialData,
    onSubmit,
    onChange,
    readonly = false,
    isLoading = false,
    className
}: OrganizationFormProps) {
    // Form state
    const [formData, setFormData] = useState<Partial<OrganizationRequest>>({
        name: '',
        international_name: '',
        tax_code: '',
        headquarters_address: '',
        invoice_address: '',
        representative_name: '',
        representative_title: '',
        representative_phone: '',
        representative_email: '',
        ...initialData
    });

    // Validation state
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isValidatingTaxCode, setIsValidatingTaxCode] = useState(false);
    const [taxCodeStatus, setTaxCodeStatus] = useState<'idle' | 'valid' | 'invalid' | 'exists'>('idle');

    // Checkbox: Địa chỉ xuất HĐ giống địa chỉ trụ sở
    const [sameAsHeadquarters, setSameAsHeadquarters] = useState(true);

    // Validate single field
    const validateField = useCallback((field: keyof OrganizationRequest, value: string): string | undefined => {
        switch (field) {
            case 'name':
                if (!value || value.trim().length < 3) {
                    return 'Tên công ty phải có ít nhất 3 ký tự';
                }
                break;
            case 'tax_code':
                const taxResult = validateTaxCode(value);
                if (!taxResult.isValid) {
                    return taxResult.message;
                }
                break;
            case 'headquarters_address':
                if (!value || value.trim().length < 10) {
                    return 'Địa chỉ phải có ít nhất 10 ký tự';
                }
                break;
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

    // Validate all fields
    const validateAllFields = useCallback((): boolean => {
        const newErrors: FormErrors = {};
        const requiredFields: (keyof OrganizationRequest)[] = [
            'name',
            'tax_code',
            'headquarters_address',
            'representative_name',
            'representative_phone',
            'representative_email'
        ];

        requiredFields.forEach(field => {
            const error = validateField(field, (formData[field] as string) || '');
            if (error) {
                newErrors[field as keyof FormErrors] = error;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, validateField]);

    // Handle field change
    const handleChange = useCallback((field: keyof OrganizationRequest, value: string) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Nếu địa chỉ HĐ giống trụ sở, sync value
            if (field === 'headquarters_address' && sameAsHeadquarters) {
                newData.invoice_address = value;
            }

            return newData;
        });

        // Clear error when user starts typing
        if (errors[field as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }

        // Reset tax code status when changed
        if (field === 'tax_code') {
            setTaxCodeStatus('idle');
        }
    }, [sameAsHeadquarters, errors]);

    // Handle field blur (validate on blur)
    const handleBlur = useCallback((field: keyof OrganizationRequest) => {
        setTouched(prev => ({ ...prev, [field]: true }));

        const value = (formData[field] as string) || '';
        const error = validateField(field, value);

        if (error) {
            setErrors(prev => ({ ...prev, [field]: error }));
        }

        // Validate tax code format and check existence
        if (field === 'tax_code' && !error && value.length >= 10) {
            checkTaxCodeExists(value);
        }
    }, [formData, validateField]);

    // Check if tax code exists in system
    const checkTaxCodeExists = useCallback(async (taxCode: string) => {
        setIsValidatingTaxCode(true);
        try {
            const API = process.env.NEXT_PUBLIC_API_URL;
            const response = await fetch(`${API}/public/organizations/check-tax-code?tax_code=${encodeURIComponent(taxCode)}`);

            if (response.ok) {
                const result = await response.json();
                if (result.exists) {
                    setTaxCodeStatus('exists');
                    setErrors(prev => ({
                        ...prev,
                        tax_code: `Mã số thuế này đã được đăng ký bởi "${result.organization_name || 'một công ty khác'}"`
                    }));
                } else {
                    setTaxCodeStatus('valid');
                }
            } else {
                // API không available, coi như valid
                setTaxCodeStatus('valid');
            }
        } catch {
            // Lỗi network, coi như valid
            setTaxCodeStatus('valid');
        } finally {
            setIsValidatingTaxCode(false);
        }
    }, []);

    // Handle checkbox change
    const handleSameAddressChange = useCallback((checked: boolean) => {
        setSameAsHeadquarters(checked);
        if (checked) {
            setFormData(prev => ({
                ...prev,
                invoice_address: prev.headquarters_address
            }));
        }
    }, []);

    // Handle form submit
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Mark all fields as touched
        const allTouched: Record<string, boolean> = {};
        Object.keys(formData).forEach(key => {
            allTouched[key] = true;
        });
        setTouched(allTouched);

        // Validate
        if (!validateAllFields()) {
            return;
        }

        // Check tax code status
        if (taxCodeStatus === 'exists') {
            return;
        }

        // Submit
        if (onSubmit) {
            await onSubmit(formData as OrganizationRequest);
        }
    }, [formData, validateAllFields, taxCodeStatus, onSubmit]);

    // Call onChange when form data changes
    useEffect(() => {
        if (onChange) {
            const isValid = validateAllFields();
            onChange(formData, isValid && taxCodeStatus !== 'exists');
        }
    }, [formData, taxCodeStatus]); // eslint-disable-line react-hooks/exhaustive-deps

    // Render field with error
    const renderField = (
        field: keyof OrganizationRequest,
        label: string,
        icon: React.ReactNode,
        placeholder: string,
        required: boolean = true,
        type: string = 'text'
    ) => {
        const value = (formData[field] as string) || '';
        const error = touched[field] ? errors[field as keyof FormErrors] : undefined;
        const showTaxCodeStatus = field === 'tax_code' && touched[field] && !error;

        return (
            <div className="space-y-2">
                <Label className="text-slate-700 font-medium flex items-center gap-2">
                    {icon}
                    {label}
                    {required && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                    <Input
                        type={type}
                        value={value}
                        onChange={(e) => handleChange(field, e.target.value)}
                        onBlur={() => handleBlur(field)}
                        placeholder={placeholder}
                        disabled={readonly || isLoading}
                        aria-invalid={!!error}
                        aria-describedby={error ? `org-${field}-error` : undefined}
                        className={cn(
                            "h-12 rounded-xl border-slate-200",
                            error && "border-red-400 focus:border-red-500",
                            showTaxCodeStatus && taxCodeStatus === 'valid' && "border-green-400",
                            readonly && "bg-slate-50"
                        )}
                    />
                    {/* Tax code validation indicator */}
                    {field === 'tax_code' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isValidatingTaxCode && (
                                <ArrowPathIcon className="w-5 h-5 text-slate-400 animate-spin" />
                            )}
                            {!isValidatingTaxCode && taxCodeStatus === 'valid' && (
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            )}
                            {!isValidatingTaxCode && taxCodeStatus === 'exists' && (
                                <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                            )}
                        </div>
                    )}
                </div>
                {error && (
                    <p id={`org-${field}-error`} role="alert" className="text-xs text-red-500 flex items-center gap-1">
                        <ExclamationCircleIcon className="w-3 h-3" />
                        {error}
                    </p>
                )}
                {field === 'tax_code' && taxCodeStatus === 'valid' && !error && touched[field] && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" />
                        Mã số thuế hợp lệ
                    </p>
                )}
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
            {/* Header */}
            <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BuildingOffice2Icon className="w-5 h-5 text-[#0F766E]" />
                    Thông tin doanh nghiệp
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                    Vui lòng cung cấp thông tin chính xác để xuất hóa đơn VAT
                </p>
            </div>

            {/* Company Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField(
                    'name',
                    'Tên công ty',
                    <BuildingOffice2Icon className="w-4 h-4 text-slate-400" />,
                    'Nhập tên công ty đầy đủ',
                    true
                )}
                {renderField(
                    'international_name',
                    'Tên quốc tế',
                    <BuildingOffice2Icon className="w-4 h-4 text-slate-400" />,
                    'Nhập tên quốc tế (nếu có)',
                    false
                )}
            </div>

            {/* Tax Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField(
                    'tax_code',
                    'Mã số thuế',
                    <IdentificationIcon className="w-4 h-4 text-slate-400" />,
                    '10 hoặc 13 số',
                    true
                )}
            </div>

            {/* Address Section */}
            <div className="space-y-4">
                {renderField(
                    'headquarters_address',
                    'Địa chỉ trụ sở chính',
                    <MapPinIcon className="w-4 h-4 text-slate-400" />,
                    'Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố',
                    true
                )}

                <div className="flex items-center gap-2">
                    <Checkbox
                        id="same-address"
                        checked={sameAsHeadquarters}
                        onCheckedChange={(checked) => handleSameAddressChange(checked as boolean)}
                        disabled={readonly || isLoading}
                        className="data-[state=checked]:bg-[#0F766E] data-[state=checked]:border-[#0F766E]"
                    />
                    <Label htmlFor="same-address" className="text-sm text-slate-600 cursor-pointer">
                        Địa chỉ xuất hóa đơn giống địa chỉ trụ sở
                    </Label>
                </div>

                {!sameAsHeadquarters && renderField(
                    'invoice_address',
                    'Địa chỉ xuất hóa đơn',
                    <MapPinIcon className="w-4 h-4 text-slate-400" />,
                    'Địa chỉ nhận hóa đơn VAT',
                    false
                )}
            </div>

            {/* Representative Section */}
            <div className="border-t border-slate-200 pt-6">
                <h4 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[#0F766E]" />
                    Thông tin người đại diện
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField(
                        'representative_name',
                        'Họ và tên',
                        <UserIcon className="w-4 h-4 text-slate-400" />,
                        'Họ và tên người đại diện',
                        true
                    )}
                    {renderField(
                        'representative_title',
                        'Chức danh',
                        <IdentificationIcon className="w-4 h-4 text-slate-400" />,
                        'Chức danh (ví dụ: Giám đốc)',
                        false
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {renderField(
                        'representative_phone',
                        'Số điện thoại',
                        <PhoneIcon className="w-4 h-4 text-slate-400" />,
                        'Nhập số điện thoại',
                        true
                    )}
                    {renderField(
                        'representative_email',
                        'Email',
                        <EnvelopeIcon className="w-4 h-4 text-slate-400" />,
                        'Nhập email',
                        true,
                        'email'
                    )}
                </div>
            </div>

            {/* Submit Button */}
            {onSubmit && !readonly && (
                <div className="pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0D655D] text-white font-bold"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                Đang xử lý...
                            </span>
                        ) : (
                            'Lưu thông tin doanh nghiệp'
                        )}
                    </Button>
                </div>
            )}
        </form>
    );
}
