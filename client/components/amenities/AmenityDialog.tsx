'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    SparklesIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { IconPicker } from './IconPicker';
import { AmenityPhonePreview } from './AmenityPhonePreview';
import { AmenityRequest, AmenityResponse } from '@/types/amenities/amenities.type';

// Description suggestion templates
const DESCRIPTION_SUGGESTIONS = [
    'Dịch vụ {name} chất lượng cao, hoạt động 24/7',
    'Tiện ích {name} hiện đại, đáp ứng mọi nhu cầu',
    'Hệ thống {name} được kiểm soát và bảo trì thường xuyên',
    'Trang bị {name} tiêu chuẩn cao, an toàn và tiện lợi',
];

interface AmenityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    amenity?: AmenityResponse | null;
    onSave: (data: AmenityRequest) => Promise<void>;
    isLoading?: boolean;
}

export function AmenityDialog({
    open,
    onOpenChange,
    mode,
    amenity,
    onSave,
}: AmenityDialogProps) {
    const getInitialFormData = (): AmenityRequest => {
        if (mode === 'edit' && amenity) {
            return {
                name: amenity.name || '',
                description: amenity.description || '',
                is_active: amenity.is_active ?? true,
                icon: amenity.icon || 'CubeIcon',
            };
        }
        return { name: '', description: '', is_active: true, icon: 'CubeIcon' };
    };

    const [formData, setFormData] = useState<AmenityRequest>(getInitialFormData);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Reset form when dialog opens or amenity changes
    useEffect(() => {
        if (open) {
            setFormData(getInitialFormData());
            setErrors({});
            setTouched({});
            setSaveState('idle');
            setShowSuggestions(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mode, amenity]);

    const validateField = useCallback((field: string, value: string): string => {
        if (field === 'name' && !value.trim()) {
            return 'Tên tiện ích không được để trống';
        }
        if (field === 'name' && value.trim().length < 2) {
            return 'Tên tiện ích cần ít nhất 2 ký tự';
        }
        return '';
    }, []);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        const nameError = validateField('name', formData.name);
        if (nameError) newErrors.name = nameError;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFieldChange = (field: keyof AmenityRequest, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Live validation for touched fields
        if (touched[field] && typeof value === 'string') {
            const error = validateField(field, value);
            setErrors(prev => {
                const next = { ...prev };
                if (error) next[field] = error;
                else delete next[field];
                return next;
            });
        }
    };

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (typeof formData[field as keyof AmenityRequest] === 'string') {
            const error = validateField(field, formData[field as keyof AmenityRequest] as string);
            setErrors(prev => {
                const next = { ...prev };
                if (error) next[field] = error;
                else delete next[field];
                return next;
            });
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            // Mark all fields as touched to show errors
            setTouched({ name: true, description: true });
            return;
        }

        setSaveState('saving');
        try {
            await onSave(formData);
            setSaveState('success');

            // Brief success flash before closing
            setTimeout(() => {
                setSaveState('idle');
            }, 600);
        } catch {
            setSaveState('error');
            setTimeout(() => setSaveState('idle'), 2000);
        }
    };

    const applySuggestion = (template: string) => {
        const description = template.replace('{name}', formData.name || 'tiện ích');
        setFormData(prev => ({ ...prev, description }));
        setShowSuggestions(false);
    };

    const getSaveButtonContent = () => {
        switch (saveState) {
            case 'saving':
                return (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang lưu...
                    </span>
                );
            case 'success':
                return (
                    <span className="flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4" />
                        Đã lưu!
                    </span>
                );
            case 'error':
                return (
                    <span className="flex items-center gap-2">
                        <ExclamationCircleIcon className="h-4 w-4" />
                        Lỗi, thử lại
                    </span>
                );
            default:
                return mode === 'create' ? 'Tạo tiện ích' : 'Lưu thay đổi';
        }
    };

    const getSaveButtonClass = () => {
        switch (saveState) {
            case 'success':
                return 'bg-green-600 hover:bg-green-700 text-white';
            case 'error':
                return 'bg-red-600 hover:bg-red-700 text-white';
            default:
                return 'bg-[#0F766E] hover:bg-[#0F766E]/90 text-white';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-2xl overflow-hidden p-0"
                style={{ borderRadius: '20px' }}
            >
                {/* Header */}
                <DialogHeader className="rounded-t-[20px]">
                    <DialogTitle>
                        {mode === 'create' ? '✨ Thêm tiện ích mới' : '✏️ Chỉnh sửa tiện ích'}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'create'
                            ? 'Điền thông tin để tạo tiện ích mới cho kho'
                            : `Cập nhật thông tin tiện ích "${amenity?.name}"`}
                    </DialogDescription>
                </DialogHeader>

                {/* Body - Split View */}
                <DialogBody className="p-0">
                    <div className="flex flex-col md:flex-row">
                        {/* Left: Form */}
                        <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                            {/* Icon Picker */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Icon hiển thị</Label>
                                <IconPicker
                                    value={formData.icon}
                                    onChange={(icon: string) => handleFieldChange('icon', icon)}
                                />
                            </div>

                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="amenity-name" className="text-sm font-medium">
                                    Tên tiện ích <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="amenity-name"
                                    value={formData.name}
                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                    onBlur={() => handleBlur('name')}
                                    placeholder="Ví dụ: WiFi tốc độ cao"
                                    style={{ borderRadius: '12px' }}
                                    className={`transition-all duration-200 ${errors.name
                                            ? 'border-red-400 focus:ring-red-200 bg-red-50/50'
                                            : touched.name && !errors.name && formData.name
                                                ? 'border-green-400 focus:ring-green-200'
                                                : ''
                                        }`}
                                />
                                {errors.name && (
                                    <p className="text-xs text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                        <ExclamationCircleIcon className="w-3.5 h-3.5" />
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="amenity-description" className="text-sm font-medium">
                                        Mô tả
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowSuggestions(!showSuggestions)}
                                        className={`h-7 text-xs gap-1 transition-all duration-200 ${showSuggestions
                                                ? 'text-primary bg-primary/10'
                                                : 'text-muted-foreground hover:text-primary'
                                            }`}
                                        style={{ borderRadius: '8px' }}
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        Gợi ý AI
                                    </Button>
                                </div>

                                {/* Suggestions with animation */}
                                {showSuggestions && (
                                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                                        <p className="text-xs text-muted-foreground font-medium mb-2">
                                            💡 Chọn mẫu câu:
                                        </p>
                                        {DESCRIPTION_SUGGESTIONS.map((template, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => applySuggestion(template)}
                                                className="w-full text-left text-sm p-2.5 rounded-lg hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-150 active:scale-[0.98]"
                                            >
                                                {template.replace('{name}', formData.name || 'tiện ích')}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <Textarea
                                    id="amenity-description"
                                    value={formData.description}
                                    onChange={(e) => handleFieldChange('description', e.target.value)}
                                    placeholder="Mô tả chi tiết về tiện ích..."
                                    rows={3}
                                    style={{ borderRadius: '12px' }}
                                    className="transition-all duration-200 resize-none"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {formData.description.length}/200
                                </p>
                            </div>

                            {/* Status Toggle */}
                            <div
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${formData.is_active
                                        ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                                        : 'bg-gray-50/50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800'
                                    }`}
                            >
                                <div className="space-y-0.5">
                                    <Label htmlFor="amenity-is_active" className="text-sm font-medium cursor-pointer">
                                        Trạng thái hoạt động
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        {formData.is_active
                                            ? '✅ Tiện ích sẽ hiển thị cho khách hàng'
                                            : '⏸️ Tiện ích sẽ bị ẩn khỏi khách hàng'}
                                    </p>
                                </div>
                                <Switch
                                    id="amenity-is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
                                />
                            </div>
                        </div>

                        {/* Right: Live Preview */}
                        <div className="hidden md:flex flex-col items-center justify-center w-[220px] bg-gradient-to-b from-muted/30 to-muted/50 border-l p-6">
                            <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                                Xem trước
                            </p>
                            <div className="transition-all duration-300">
                                <AmenityPhonePreview
                                    icon={formData.icon}
                                    name={formData.name}
                                />
                            </div>
                        </div>
                    </div>
                </DialogBody>

                {/* Footer */}
                <DialogFooter className="rounded-b-[20px]">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saveState === 'saving'}
                        style={{ borderRadius: '12px' }}
                        className="transition-all duration-200"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={saveState === 'saving' || saveState === 'success'}
                        className={`gap-2 min-w-[140px] transition-all duration-300 ${getSaveButtonClass()}`}
                        style={{ borderRadius: '12px' }}
                    >
                        {getSaveButtonContent()}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
