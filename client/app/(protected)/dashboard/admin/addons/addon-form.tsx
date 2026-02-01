"use client";

import { useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AddonsService } from "@/services/addons/addons.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { AddonResponse, AddonRequest } from "@/types/addon/addon.type";
import { cn } from "@/lib/utils";

const addonsService = new AddonsService();

interface AddonFormProps {
    initialData?: AddonResponse;
    onSuccess: () => void;
    onCancel: () => void;
    isEdit?: boolean;
}

export function AddonForm({ initialData, onSuccess, onCancel, isEdit = false }: AddonFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<AddonRequest>({
        name: initialData?.name || "",
        description: initialData?.description || "",
        price: initialData?.price || 0,
        is_monthly_payment: initialData?.is_monthly_payment || false,
        is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
        unit: initialData?.unit || ""
    });

    const [openUnit, setOpenUnit] = useState(false);

    // Suggestion options
    const unitOptions = formData.is_monthly_payment
        ? ["Cái", "Chiếc", "Bộ", "Người", "Tháng", "Vị trí"]
        : ["Tấn", "Chuyến", "Giờ", "Lần", "Pallet", "Km", "Khối", "Ngày"];

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (isEdit && initialData?.id) {
                await addonsService.updateAddon(token, initialData.id, formData);
            } else {
                await addonsService.createAddon(token, formData);
            }
            onSuccess();
        } catch (error: any) {
            console.error("Failed to save addon", error);
            // In a real app, use toast here. For now, simple alert or let parent handle
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-8">
                {/* Phần 1: Định danh */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">1. Định danh dịch vụ</h3>
                    <div className="space-y-2">
                        <Label htmlFor="name">Tên dịch vụ <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            style={{ borderRadius: "12px" }}
                            placeholder="VD: Thuê xe nâng, Bốc xếp..."
                            className="bg-muted/30"
                        />
                    </div>
                </div>

                {/* Phần 2: Cấu hình giá */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">2. Cấu hình tính phí</h3>

                    <div className="space-y-3">
                        <Label>Loại tính phí</Label>
                        <RadioGroup
                            value={formData.is_monthly_payment ? "monthly" : "onetime"}
                            onValueChange={(val) => setFormData({ ...formData, is_monthly_payment: val === "monthly" })}
                            className="mt-2 grid grid-cols-2 gap-4"
                        >
                            <div className={`flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-colors ${!formData.is_monthly_payment ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                                <RadioGroupItem value="onetime" id="onetime" />
                                <Label htmlFor="onetime" className="cursor-pointer flex-1">
                                    <span className="font-semibold block">Một lần</span>
                                    <span className="text-xs text-muted-foreground font-normal">Bốc xếp, vận chuyển</span>
                                </Label>
                            </div>
                            <div className={`flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-colors ${formData.is_monthly_payment ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                                <RadioGroupItem value="monthly" id="monthly" />
                                <Label htmlFor="monthly" className="cursor-pointer flex-1">
                                    <span className="font-semibold block">Định kỳ</span>
                                    <span className="text-xs text-muted-foreground font-normal">Thuê bao tháng, phí duy trì</span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Đơn giá (VNĐ)</Label>
                            <div className="relative">
                                <Input
                                    id="price"
                                    type="text"
                                    value={formData.price > 0 ? new Intl.NumberFormat('vi-VN').format(formData.price) : ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value.replace(/\./g, '').replace(/\D/g, '')) || 0;
                                        setFormData({ ...formData, price: val });
                                    }}
                                    style={{ borderRadius: "12px" }}
                                    className="bg-muted/30 pr-12 font-medium"
                                    placeholder="0"
                                />
                                <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-sm text-muted-foreground">
                                    ₫
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unit">Đơn vị tính</Label>
                            <Popover open={openUnit} onOpenChange={setOpenUnit}>
                                <div className="relative">
                                    <Input
                                        id="unit"
                                        value={formData.unit || ""}
                                        onChange={(e) => {
                                            setFormData({ ...formData, unit: e.target.value });
                                            setOpenUnit(true);
                                        }}
                                        onFocus={() => setOpenUnit(true)}
                                        style={{ borderRadius: "12px" }}
                                        className="bg-muted/30 pr-10"
                                        placeholder={formData.is_monthly_payment ? "VD: Cái, Chiếc..." : "VD: Tấn, Giờ, Chuyến..."}
                                        autoComplete="off"
                                    />
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent"
                                            onClick={() => setOpenUnit(!openUnit)}
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                </div>
                                <PopoverContent
                                    className="p-1 w-[150px]"
                                    align="end"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                    <div className="grid">
                                        {unitOptions.filter(u => u.toLowerCase().includes((formData.unit || "").toLowerCase())).length > 0 ? (
                                            unitOptions.filter(u => u.toLowerCase().includes((formData.unit || "").toLowerCase())).map((unit) => (
                                                <div
                                                    key={unit}
                                                    className={cn(
                                                        "flex items-center px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                                                        formData.unit === unit ? "bg-primary/5 text-primary font-medium" : ""
                                                    )}
                                                    onClick={() => {
                                                        setFormData({ ...formData, unit: unit });
                                                        setOpenUnit(false);
                                                    }}
                                                >
                                                    {formData.unit === unit && <Check className="mr-2 h-3 w-3" />}
                                                    <span className={formData.unit === unit ? "" : "ml-5"}>{unit}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-2 text-sm text-muted-foreground text-center">
                                                Nhập để tạo mới "{formData.unit}"
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>

                {/* Phần 3: Hiển thị */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">3. Hiển thị & Trạng thái</h3>

                    <div className="space-y-2">
                        <Label htmlFor="description">Mô tả chi tiết</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Mô tả phạm vi công việc, quy cách tính phí..."
                            className="bg-muted/30 min-h-[80px]"
                            style={{ borderRadius: "12px" }}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/10">
                        <div className="space-y-0.5">
                            <Label htmlFor="is_active" className="text-base cursor-pointer font-medium">Kích hoạt dịch vụ</Label>
                            <p className="text-xs text-muted-foreground">
                                Dịch vụ sẽ hiển thị trong danh sách đặt chỗ
                            </p>
                        </div>
                        <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end pt-6 border-t gap-3 mt-auto">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                    style={{ borderRadius: "12px" }}
                    className="px-6"
                >
                    Hủy bỏ
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ borderRadius: "12px" }}
                    className="px-8 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {loading ? "Đang xử lý..." : isEdit ? "Cập nhật" : "Tạo mới"}
                </Button>
            </div>
        </div>
    );
}
