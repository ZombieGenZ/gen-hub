"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { CategoryService } from "@/services/article/category.service";
import { filterNameInput, filterCodeInput } from "@/lib/validation.utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CategoryResponse, CreateCategoryDto } from "@/types/article/category.type";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/contexts/ToastContext";
const categoryService = new CategoryService();

interface CategoryFormProps {
    initialData?: CategoryResponse;
    onSuccess: () => void;
    onCancel: () => void;
    isEdit?: boolean;
}

export function CategoryForm({ initialData, onSuccess, onCancel, isEdit = false }: CategoryFormProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [formData, setFormData] = useState<CreateCategoryDto>({
        name: initialData?.name || "",
        slug: initialData?.slug || "",
        description: initialData?.description || "",
        parent_id: initialData?.parent_id || null,
        order: initialData?.order || 0,
        is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
    });

    useEffect(() => {
        const fetchCategories = async () => {
             try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const data: any = await categoryService.getAllCategories(token, { limit: 1000 });
                let items: CategoryResponse[] = [];
                if (data?.items) items = data.items;
                else if (data?.data?.items) items = data.data.items;
                else if (Array.isArray(data)) items = data;
                else if (Array.isArray(data?.data)) items = data.data;

                // Remove current category and its children from parent options to prevent circular dependency
                const validParents = items.filter(c => c.id !== initialData?.id);
                setCategories(validParents);
            } catch(e) {
                console.error(e);
                showToast("Không thể tải danh sách danh mục cha", "error");
            }
        };
        fetchCategories();
    }, [initialData?.id]);

    const handleSubmit = async () => {
        try {
            if(!formData.name.trim()) {
                showToast("Vui lòng nhập tên danh mục", "error");
                return;
            }

            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) {
                 showToast("Lỗi xác thực, vui lòng đăng nhập lại", "error");
                 return;
            }

            // Clean up empty slug to let server auto-generate
            const submitData = { ...formData };
            if (!submitData.slug?.trim()) {
                delete submitData.slug;
            }

            // Handle 'none' value for parent_id
            if (submitData.parent_id === 'none') {
                submitData.parent_id = null;
            }

            if (isEdit && initialData?.id) {
                await categoryService.updateCategory(token, initialData.id, submitData);
                showToast("Cập nhật danh mục thành công", "success");
            } else {
                await categoryService.createCategory(token, submitData);
                showToast("Tạo danh mục mới thành công", "success");
            }
            onSuccess();
        } catch (error: any) {
             console.error("Failed to save category", error);
             showToast(error.message || "Có lỗi xảy ra khi lưu danh mục", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-8">
                {/* Phần 1: Thông tin cơ bản */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">1. Thông tin cơ bản</h3>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên danh mục <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: filterNameInput(e.target.value) })}
                                maxLength={100}
                                style={{ borderRadius: "12px" }}
                                className="bg-muted/30"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug (Đường dẫn tĩnh)</Label>
                            <Input
                                id="slug"
                                value={formData.slug || ""}
                                onChange={(e) => setFormData({ ...formData, slug: filterCodeInput(e.target.value) })}
                                style={{ borderRadius: "12px" }}
                                placeholder="Để trống để tự động tạo từ tên..."
                                maxLength={50}                                className="bg-muted/30"
                            />
                            <p className="text-xs text-muted-foreground">Chỉ chứa chữ cái, số và dấu gạch ngang (-)</p>
                        </div>
                    </div>
                </div>

                {/* Phần 2: Phân cấp & Vị trí */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">2. Phân cấp & Vị trí</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="parent_id">Danh mục cha</Label>
                            <Select 
                                value={formData.parent_id || "none"} 
                                onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                            >
                                <SelectTrigger id="parent_id" style={{ borderRadius: "12px" }} className="bg-muted/30">
                                    <SelectValue placeholder="Chọn danh mục cha" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Không có --</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="order">Thứ tự hiển thị</Label>
                            <Input
                                id="order"
                                type="number"
                                min={0}
                                value={formData.order}
                                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                style={{ borderRadius: "12px" }}
                                className="bg-muted/30"
                            />
                        </div>
                    </div>
                </div>

                {/* Phần 3: Trạng thái & Mô tả */}
                <div className="space-y-4">
                     <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">3. Mô tả & Hiển thị</h3>
                    
                     <div className="space-y-2">
                        <Label htmlFor="description">Mô tả chi tiết</Label>
                        <Textarea
                            id="description"
                            value={formData.description || ""}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Mô tả nội dung của danh mục..."
                            className="bg-muted/30 min-h-[80px]"
                            style={{ borderRadius: "12px" }}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/10">
                        <div className="space-y-0.5">
                            <Label htmlFor="is_active" className="text-base cursor-pointer font-medium">Kích hoạt danh mục</Label>
                            <p className="text-xs text-muted-foreground">
                                Cho phép danh mục hiển thị trên website công khai
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
