"use client";

import { useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { IsuranceService } from "@/services/Insurance/Insurance.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Insurance, CreateInsuranceRequest } from "@/types/insurance/Insurance.types";

const insuranceService = new IsuranceService();

interface InsuranceFormProps {
    initialData?: Insurance;
    onSuccess: () => void;
    onCancel: () => void;
    isEdit?: boolean;
}

export function InsuranceForm({ initialData, onSuccess, onCancel, isEdit = false }: InsuranceFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreateInsuranceRequest>({
        name: initialData?.name || "",
        description: initialData?.description || "",
        price: initialData?.price || "0",
        use_management_fee: initialData?.use_management_fee || false,
        management_fee_type: initialData?.management_fee_type || "PERCENT",
        management_fee_value: initialData?.management_fee_value || "0",
        is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
    });

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (isEdit && initialData?.id) {
                await insuranceService.updateInsurance(token, initialData.id, formData);
            } else {
                await insuranceService.createInsurance(token, formData);
            }
            onSuccess();
        } catch (error: any) {
            console.error("Failed to save insurance", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 overflow-y-auto">
            <div className="space-y-8">
                {/* Phần 1: Định danh */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">1. Thông tin cơ bản</h3>
                    <div className="space-y-2">
                        <Label htmlFor="name">Tên gói bảo hiểm <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            style={{ borderRadius: "12px" }}
                            className="bg-muted/30"
                        />
                    </div>
                </div>

                {/* Phần 2: Cấu hình phí */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">2. Cấu hình chi phí</h3>

                    <div className="space-y-2">
                        <Label htmlFor="price">Giá trị / Phí cơ bản (VNĐ)</Label>
                        <div className="relative">
                            <Input
                                id="price"
                                type="text"
                                value={formData.price !== "0" && formData.price ? new Intl.NumberFormat('vi-VN').format(parseFloat(formData.price)) : ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\./g, '').replace(/\D/g, '');
                                    setFormData({ ...formData, price: val || "0" });
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

                    <div className="border rounded-xl p-4 bg-muted/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="use_management_fee" className="cursor-pointer font-medium">Áp dụng phí quản lý</Label>
                            <Switch
                                id="use_management_fee"
                                checked={formData.use_management_fee}
                                onCheckedChange={(checked) => setFormData({ ...formData, use_management_fee: checked })}
                            />
                        </div>

                        {formData.use_management_fee && (
                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in">
                                <div className="space-y-2">
                                    <Label>Loại phí</Label>
                                    <Select
                                        value={formData.management_fee_type}
                                        onValueChange={(val) => setFormData({ ...formData, management_fee_type: val })}
                                    >
                                        <SelectTrigger style={{ borderRadius: "12px" }} className="bg-white">
                                            <SelectValue placeholder="Chọn loại phí" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PERCENT">Theo phần trăm (%)</SelectItem>
                                            <SelectItem value="AMOUNT">Cố định (VND)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="management_fee_value">Giá trị phí</Label>
                                    <div className="relative">
                                        <Input
                                            id="management_fee_value"
                                            type="text"
                                            value={formData.management_fee_value !== "0" ? new Intl.NumberFormat('vi-VN').format(parseFloat(formData.management_fee_value)) : ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\./g, '').replace(/\D/g, '');
                                                setFormData({ ...formData, management_fee_value: val || "0" });
                                            }}
                                            style={{ borderRadius: "12px" }}
                                            className="bg-white pr-12"
                                            placeholder="0"
                                        />
                                        <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-sm text-muted-foreground">
                                            {formData.management_fee_type === 'PERCENT' ? '%' : '₫'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
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
                            placeholder="Mô tả phạm vi bảo hiểm, điều kiện áp dụng..."
                            className="bg-muted/30 min-h-[80px]"
                            style={{ borderRadius: "12px" }}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/10">
                        <div className="space-y-0.5">
                            <Label htmlFor="is_active" className="text-base cursor-pointer font-medium">Kích hoạt gói bảo hiểm</Label>
                            <p className="text-xs text-muted-foreground">
                                Gói bảo hiểm sẽ hiển thị để khách hàng lựa chọn
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
