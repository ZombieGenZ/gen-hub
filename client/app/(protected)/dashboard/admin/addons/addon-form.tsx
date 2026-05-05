"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AddonsService } from "@/services/addons/addons.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { AddonResponse, AddonRequest } from "@/types/addon/addon.type";

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
    });

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (isEdit && initialData?.id) {
                await addonsService.updateAddon(token, initialData.id, formData);
                toast.success(`Đã cập nhật dịch vụ "${formData.name}" ✅`);
            } else {
                await addonsService.createAddon(token, formData);
                toast.success(`Đã tạo dịch vụ "${formData.name}" thành công ✅`);
            }
            onSuccess();
        } catch (error: any) {
            console.error("Failed to save addon", error);
            toast.error(error.message || "Không thể lưu thông tin dịch vụ");
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
                            className="bg-muted/30 min-h-20"
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
