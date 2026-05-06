"use client";

import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AddonsTypeService } from "@/services/addons/addonsType.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AddonType } from "@/types/addon/addonType.type";

const addonsTypeService = new AddonsTypeService();

interface AddonTypeFormProps {
    initialData?: AddonType;
    onSuccess: () => void;
    onCancel: () => void;
    isEdit?: boolean;
}

export function AddonTypeForm({ initialData, onSuccess, onCancel, isEdit = false }: AddonTypeFormProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        description: initialData?.description || "",
        is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
    });

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (isEdit && initialData?.id) {
                await addonsTypeService.updateAddonType(token, initialData.id, formData);
                showToast(`Đã cập nhật nhóm dịch vụ "${formData.name}" ✅`, "success");
            } else {
                await addonsTypeService.createAddonType(token, formData);
                showToast(`Đã tạo nhóm dịch vụ "${formData.name}" thành công ✅`, "success");
            }
            onSuccess();
        } catch (error: any) {
            console.error("Failed to save addon type", error);
            showToast(error.message || "Không thể lưu thông tin nhóm dịch vụ", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Tên nhóm dịch vụ</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        style={{ borderRadius: "12px" }}
                        className="bg-muted/30"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Mô tả về nhóm dịch vụ này..."
                        className="bg-muted/30 min-h-[100px]"
                        style={{ borderRadius: "12px" }}
                    />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-xl bg-card hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                        <Label htmlFor="is_active" className="text-base cursor-pointer">Đang hoạt động</Label>
                        <p className="text-sm text-muted-foreground">
                            Nhóm dịch vụ khả dụng để thêm dịch vụ mới vào
                        </p>
                    </div>
                    <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
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
