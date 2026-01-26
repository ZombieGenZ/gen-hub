"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useCheckout } from './CheckoutWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    BuildingOffice2Icon,
    IdentificationIcon,
    MapPinIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { validateTaxCode } from '@/lib/validation.utils';

interface CompanyData {
    name: string;
    international_name: string;
    tax_code: string;
    headquarters_address: string;
    invoice_address: string;
}

interface CompanyInfoStepProps {
    initialData?: Partial<CompanyData>;
    onChange?: (data: CompanyData, isValid: boolean) => void;
}

/**
 * Step 2: Thông tin doanh nghiệp
 * Chỉ bao gồm thông tin công ty, không có thông tin người đại diện
 */
export function CompanyInfoStep({ initialData, onChange }: CompanyInfoStepProps) {
    const { setCanProceed } = useCheckout();

    const [formData, setFormData] = useState<CompanyData>({
        name: initialData?.name || '',
        international_name: initialData?.international_name || '',
        tax_code: initialData?.tax_code || '',
        headquarters_address: initialData?.headquarters_address || '',
        invoice_address: initialData?.invoice_address || '',
    });

    const [errors, setErrors] = useState<Partial<Record<keyof CompanyData, string>>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isValidatingTaxCode, setIsValidatingTaxCode] = useState(false);
    const [taxCodeStatus, setTaxCodeStatus] = useState<'idle' | 'valid' | 'exists'>('idle');
    const [sameAsHeadquarters, setSameAsHeadquarters] = useState(true);

    // Validate single field
    const validateField = useCallback((field: keyof CompanyData, value: string): string | undefined => {
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
        }
        return undefined;
    }, []);

    // Validate all and update canProceed
    const validateAll = useCallback((): boolean => {
        const requiredFields: (keyof CompanyData)[] = ['name', 'tax_code', 'headquarters_address'];
        let isValid = true;

        requiredFields.forEach(field => {
            const error = validateField(field, formData[field]);
            if (error) isValid = false;
        });

        return isValid && taxCodeStatus !== 'exists';
    }, [formData, validateField, taxCodeStatus]);

    // Update canProceed when form changes
    useEffect(() => {
        const isValid = validateAll();
        setCanProceed(isValid);
        if (onChange) {
            onChange(formData, isValid);
        }
    }, [formData, taxCodeStatus, validateAll, setCanProceed, onChange]);

    // Handle change
    const handleChange = useCallback((field: keyof CompanyData, value: string) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'headquarters_address' && sameAsHeadquarters) {
                newData.invoice_address = value;
            }
            return newData;
        });

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }

        if (field === 'tax_code') {
            setTaxCodeStatus('idle');
        }
    }, [sameAsHeadquarters, errors]);

    // Handle blur
    const handleBlur = useCallback((field: keyof CompanyData) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        const error = validateField(field, formData[field]);
        if (error) {
            setErrors(prev => ({ ...prev, [field]: error }));
        }

        // Check tax code exists
        if (field === 'tax_code' && !error && formData.tax_code.length >= 10) {
            checkTaxCodeExists(formData.tax_code);
        }
    }, [formData, validateField]);

    // Check tax code exists
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
                        tax_code: `Mã số thuế này đã được đăng ký`
                    }));
                } else {
                    setTaxCodeStatus('valid');
                }
            } else {
                setTaxCodeStatus('valid');
            }
        } catch {
            setTaxCodeStatus('valid');
        } finally {
            setIsValidatingTaxCode(false);
        }
    }, []);

    const handleSameAddressChange = useCallback((checked: boolean) => {
        setSameAsHeadquarters(checked);
        if (checked) {
            setFormData(prev => ({ ...prev, invoice_address: prev.headquarters_address }));
        }
    }, []);

    // Render field
    const renderField = (
        field: keyof CompanyData,
        label: string,
        icon: React.ReactNode,
        placeholder: string,
        required: boolean = true
    ) => {
        const value = formData[field];
        const error = touched[field] ? errors[field] : undefined;
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
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(field, e.target.value)}
                        onBlur={() => handleBlur(field)}
                        placeholder={placeholder}
                        className={cn(
                            "h-12 rounded-xl border-slate-200",
                            error && "border-red-400 focus:border-red-500",
                            showTaxCodeStatus && taxCodeStatus === 'valid' && "border-green-400"
                        )}
                    />
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
                    <p className="text-xs text-red-500 flex items-center gap-1">
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
        <div className="space-y-6">
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

            {/* Company Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField(
                    'name',
                    'Tên công ty',
                    <BuildingOffice2Icon className="w-4 h-4 text-slate-400" />,
                    'VD: Công ty TNHH ABC',
                    true
                )}
                {renderField(
                    'international_name',
                    'Tên quốc tế',
                    <BuildingOffice2Icon className="w-4 h-4 text-slate-400" />,
                    'VD: ABC Company Limited',
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

            {/* Address */}
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
        </div>
    );
}
