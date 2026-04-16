"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useCheckout } from './CheckoutWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    UserIcon,
    IdentificationIcon,
    PhoneIcon,
    EnvelopeIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { validatePhoneNumber, validateEmail } from '@/lib/validation.utils';

// Common business titles for the representative
export const REPRESENTATIVE_TITLES = [
    { value: 'giam-doc', label: 'Giám đốc' },
    { value: 'tong-giam-doc', label: 'Tổng Giám đốc' },
    { value: 'chu-tich-hdqt', label: 'Chủ tịch HĐQT' },
    { value: 'pho-giam-doc', label: 'Phó Giám đốc' },
    { value: 'giam-doc-tai-chinh', label: 'Giám đốc Tài chính (CFO)' },
    { value: 'giam-doc-dieu-hanh', label: 'Giám đốc Điều hành (COO)' },
    { value: 'truong-phong', label: 'Trưởng phòng' },
    { value: 'ke-toan-truong', label: 'Kế toán trưởng' },
    { value: 'nguoi-dai-dien-phap-luat', label: 'Người đại diện pháp luật' },
    { value: 'chu-doanh-nghiep', label: 'Chủ doanh nghiệp' },
];

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
                const trimmedName = value.trim();
                if (!trimmedName) {
                    return 'Vui lòng nhập họ và tên';
                }
                if (trimmedName.length < 2) {
                    return 'Tên người đại diện phải có ít nhất 2 ký tự';
                }
                if (trimmedName.length > 100) {
                    return 'Tên người dại diện không được quá 100 ký tự';
                }
                // Kiểm tra ký tự hợp lệ (chữ, số, dấu cách, dấu gạch ngang, dấu chấm)
                if (!/^[a-zA-Z0-9À-ỿ\s\-\.]+$/.test(trimmedName)) {
                    return 'Tên chỉ được chứa chữ, số, dấu cách, dấu gạch ngang hoặc dấu chấm';
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
            case 'representative_title':
                if (!value || value.trim().length === 0) {
                    return 'Vui lòng chọn chức danh';
                }
                break;
        }
        return undefined;
    }, []);

    // Validate all
    const validateAll = useCallback((): boolean => {
        const requiredFields: (keyof RepresentativeData)[] = [
            'representative_name',
            'representative_title',
            'representative_phone',
            'representative_email'
        ];
        let isValid = true;
        const newErrors: Partial<Record<keyof RepresentativeData, string>> = {};

        requiredFields.forEach(field => {
            const error = validateField(field, formData[field]);
            if (error) {
                isValid = false;
                newErrors[field] = error;
            }
        });

        setErrors(newErrors);
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
        let processedValue = value;
        
        // Filter input cho tên - chỉ cho phép chữ (kể cả tiếng Việt), số, dấu cách, gạch, chấm
        if (field === 'representative_name') {
            // Loại bỏ ký tự đặc biệt, giữ lại chữ, số, dấu cách, gạch, chấm
            processedValue = value
                .replace(/[^a-zA-Z0-9À-ỿ\s\-\.]/g, '') // Xóa ký tự đặc biệt
                .replace(/\s+/g, ' ') // Gộp khoảng trắng
                .trimStart(); // Xóa khoảng trắng đầu
        }
        
        // Filter input cho số điện thoại - chỉ cho phép số, +, -, khoảng trắng
        if (field === 'representative_phone') {
            processedValue = value.replace(/[^\d+\-()\s]/g, ''); // Chỉ giữ số, +, -, (), khoảng trắng
        }
        
        setFormData(prev => ({ ...prev, [field]: processedValue }));

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    }, [errors]);

    // Handle blur
    const handleBlur = useCallback((field: keyof RepresentativeData) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        
        let blurValue = formData[field];
        
        // Auto-trim cho tên và email
        if (field === 'representative_name' || field === 'representative_email') {
            blurValue = blurValue.trim();
            setFormData(prev => ({ ...prev, [field]: blurValue }));
        }
        
        // Auto-trim cho số điện thoại (loại bỏ khoảng trắng)
        if (field === 'representative_phone') {
            blurValue = blurValue.trim();
            setFormData(prev => ({ ...prev, [field]: blurValue }));
        }
        
        const error = validateField(field, blurValue);
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
                    'Nhập họ và tên',
                    true
                )}
                {/* Title Combobox */}
                <div className="space-y-2">
                    <Label className="text-slate-700 font-medium flex items-center gap-2">
                        <IdentificationIcon className="w-4 h-4 text-slate-400" />
                        Chức danh
                        <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={formData.representative_title}
                        onValueChange={(value) => {
                            handleChange('representative_title', value);
                            setTouched(prev => ({ ...prev, representative_title: true }));
                        }}
                    >
                        <SelectTrigger className={cn(
                            "h-12 rounded-xl border-slate-200",
                            touched['representative_title'] && errors['representative_title'] && "border-red-400"
                        )}>
                            <SelectValue placeholder="Chọn chức danh" />
                        </SelectTrigger>
                        <SelectContent>
                            {REPRESENTATIVE_TITLES.map((title) => (
                                <SelectItem key={title.value} value={title.value}>
                                    {title.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {touched['representative_title'] && errors['representative_title'] && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <ExclamationCircleIcon className="w-3 h-3" />
                            {errors['representative_title']}
                        </p>
                    )}
                </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
