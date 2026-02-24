'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerBody,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
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

interface AmenityDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    amenity?: AmenityResponse | null;
    onSave: (data: AmenityRequest) => Promise<void>;
    isLoading?: boolean;
}

export function AmenityDrawer({
    open,
    onOpenChange,
    mode,
    amenity,
    onSave,
    isLoading,
}: AmenityDrawerProps) {
    const [formData, setFormData] = useState<AmenityRequest>({
        name: '',
        description: '',
        is_active: true,
        icon: 'CubeIcon',
    });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form when drawer opens/closes or amenity changes
    useEffect(() => {
        if (open) {
            if (mode === 'edit' && amenity) {
                setFormData({
                    name: amenity.name || '',
                    description: amenity.description || '',
                    is_active: amenity.is_active ?? true,
                    icon: amenity.icon || 'CubeIcon',
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    is_active: true,
                    icon: 'CubeIcon',
                });
            }
            setErrors({});
        }
    }, [open, mode, amenity]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Tên tiện ích không được để trống';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        await onSave(formData);
    };

    const applySuggestion = (template: string) => {
        const description = template.replace('{name}', formData.name || 'tiện ích');
        setFormData(prev => ({ ...prev, description }));
        setShowSuggestions(false);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange} direction="right">
            <DrawerContent className="h-full w-[420px] max-w-full">
                {/* Header */}
                <DrawerHeader className="flex flex-row items-center justify-between">
                    <div>
                        <DrawerTitle>
                            {mode === 'create' ? 'Thêm tiện ích mới' : 'Chỉnh sửa tiện ích'}
                        </DrawerTitle>
                        <DrawerDescription>
                            {mode === 'create'
                                ? 'Điền thông tin để tạo tiện ích mới'
                                : 'Cập nhật thông tin tiện ích'}
                        </DrawerDescription>
                    </div>
                    <DrawerClose asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <XMarkIcon className="h-5 w-5" />
                        </Button>
                    </DrawerClose>
                </DrawerHeader>

                {/* Body */}
                <DrawerBody className="overflow-y-auto">
                    <div className="space-y-6">
                        {/* Live Preview */}
                        <div className="flex justify-center pb-4 border-b">
                            <AmenityPhonePreview
                                icon={formData.icon}
                                name={formData.name}
                            />
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            {/* Icon Picker */}
                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <IconPicker
                                    value={formData.icon}
                                    onChange={(icon: string) => setFormData(prev => ({ ...prev, icon }))}
                                />
                            </div>

                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Tên tiện ích <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="WiFi tốc độ cao"
                                    style={{ borderRadius: '12px' }}
                                    className={errors.name ? 'border-red-500' : ''}
                                />
                                {errors.name && (
                                    <p className="text-xs text-red-500">{errors.name}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="description">Mô tả</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowSuggestions(!showSuggestions)}
                                        className="h-7 text-xs gap-1 text-primary hover:text-primary"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        Gợi ý
                                    </Button>
                                </div>

                                {/* Description Suggestions */}
                                {showSuggestions && (
                                    <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Chọn mẫu câu:
                                        </p>
                                        {DESCRIPTION_SUGGESTIONS.map((template, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => applySuggestion(template)}
                                                className="w-full text-left text-sm p-2 rounded-lg hover:bg-primary/10 transition-colors"
                                            >
                                                {template.replace('{name}', formData.name || 'tiện ích')}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Mô tả chi tiết về tiện ích..."
                                    rows={3}
                                    style={{ borderRadius: '12px' }}
                                />
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between py-2">
                                <div className="space-y-0.5">
                                    <Label htmlFor="is_active">Trạng thái hoạt động</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Tiện ích sẽ hiển thị cho khách hàng khi bật
                                    </p>
                                </div>
                                <Switch
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) =>
                                        setFormData(prev => ({ ...prev, is_active: checked }))
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </DrawerBody>

                {/* Footer */}
                <DrawerFooter>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full gap-2"
                        style={{ borderRadius: '12px' }}
                    >
                        {isLoading ? 'Đang lưu...' : 'Lưu & Áp dụng'}
                    </Button>
                    <DrawerClose asChild>
                        <Button
                            variant="outline"
                            className="w-full"
                            style={{ borderRadius: '12px' }}
                        >
                            Hủy
                        </Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
