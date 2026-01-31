"use client";

import { useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { CouponService } from "@/services/coupons/coupon.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CouponRequest, Coupon } from "@/types/coupons/coupon.type";
import { cn } from "@/lib/utils";
import {
    BanknotesIcon,
    PercentBadgeIcon,
    GiftIcon,
    CalendarIcon
} from "@heroicons/react/24/outline";

const couponService = new CouponService();

interface CouponFormProps {
    initialData?: Coupon;
    onSuccess: () => void;
    onCancel: () => void;
    isEdit?: boolean;
}

type CouponTypeOption = 'AMOUNT' | 'PERCENT' | 'FREE_MONTHS' | 'GIFT';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CouponForm({ initialData, onSuccess, onCancel, isEdit = false }: CouponFormProps) {
    const [loading, setLoading] = useState(false);

    // Determine initial selected type
    const [selectedType, setSelectedType] = useState<CouponTypeOption>(() => {
        if (!initialData) return 'AMOUNT';
        return initialData.discount_type === 'PERCENT' ? 'PERCENT' : 'AMOUNT';
    });

    // ... (rest of the state and handlers remain the same) ...

    const [formData, setFormData] = useState<CouponRequest>({
        name: initialData?.name || "",
        description: initialData?.description || "",
        code: initialData?.code || "",
        coupon_type: initialData?.coupon_type || "PUBLIC",
        discount_type: initialData?.discount_type || "AMOUNT",
        discount_value: initialData?.discount_value || 0,
        require_min_warehouses: initialData?.require_min_warehouses || false,
        min_warehouses: initialData?.min_warehouses || 0,
        require_min_rows: initialData?.require_min_rows || false,
        min_rows: initialData?.min_rows || 0,
        require_min_order_amount: initialData?.require_min_order_amount || false,
        min_order_amount: initialData?.min_order_amount || 0,
        require_min_rental_duration: initialData?.require_min_rental_duration || false,
        min_rental_duration_value: initialData?.min_rental_duration_value || 0,
        min_rental_duration_unit: initialData?.min_rental_duration_unit || "MONTH",
        is_unlimited_discount: initialData?.is_unlimited_discount || false,
        max_discount_amount: initialData?.max_discount_amount || 0,
        is_permanent: initialData?.is_permanent || false,
        starts_at: initialData?.starts_at || new Date().toISOString(),
        ends_at: initialData?.ends_at || new Date().toISOString(),
        max_usage: initialData?.max_usage || 0,
        is_public: initialData?.is_public || true,
        apply_for_first_rental: initialData?.apply_for_first_rental || false,
        apply_for_renewal: initialData?.apply_for_renewal || false,
        apply_for_all_warehouses: initialData?.apply_for_all_warehouses || true,
        apply_for_all_rows: initialData?.apply_for_all_rows || true,
        apply_for_all_addons: initialData?.apply_for_all_addons || true,
        apply_for_all_insurances: initialData?.apply_for_all_insurances || true,
        target_warehouse_ids: [],
        target_row_ids: [],
        target_addon_ids: [],
        target_insurance_ids: [],
        is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
        is_unlimited_stack: initialData?.is_unlimited_stack || false,
        max_stack_count: initialData?.max_stack_count || 1,
        has_gift_addons: initialData?.has_gift_addons || false,
        gift_addon_ids: [],
        has_gift_insurances: initialData?.has_gift_insurances || false,
        gift_insurance_ids: []
    });

    const handleTypeSelect = (type: CouponTypeOption) => {
        setSelectedType(type);

        const updates: Partial<CouponRequest> = {
            coupon_type: 'PUBLIC', // Default to PUBLIC
            has_gift_addons: false,
        };

        if (type === 'GIFT') {
            updates.discount_type = 'PERCENT'; // API Doc Example 5 uses PERCENT with 0 value for gifts
            updates.discount_value = 0;
            updates.has_gift_addons = true;
        } else if (type === 'PERCENT') {
            updates.discount_type = 'PERCENT';
        } else if (type === 'AMOUNT') {
            updates.discount_type = 'AMOUNT';
        } else if (type === 'FREE_MONTHS') {
            updates.discount_type = 'FREE_MONTHS';
        }

        setFormData(prev => ({
            ...prev,
            ...updates
        }));
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (isEdit && initialData?.id) {
                await couponService.updateCoupon(token, initialData.id, formData);
            } else {
                await couponService.createCoupon(token, formData);
            }
            onSuccess();
        } catch (error) {
            console.error("Failed to save coupon", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="general">Thông tin chung</TabsTrigger>
                    <TabsTrigger value="applicability">Phạm vi áp dụng</TabsTrigger>
                </TabsList>


                <TabsContent value="general" className="space-y-8">
                    {/* 1. Type Selection Cards */}
                    <div className="space-y-4">
                        <Label className="text-base font-semibold">Chọn loại ưu đãi muốn tạo:</Label>
                        <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
                            {/* ... Buttons for types ... */}
                            <button
                                onClick={() => handleTypeSelect('AMOUNT')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer h-32 gap-3",
                                    selectedType === 'AMOUNT'
                                        ? "border-orange-500 bg-orange-50 text-orange-600 ring-2 ring-orange-500 ring-offset-2"
                                        : "border-transparent bg-orange-100 text-orange-600 hover:bg-orange-200"
                                )}
                            >
                                <BanknotesIcon className="w-8 h-8" />
                                <span className="font-semibold">Giảm tiền</span>
                            </button>

                            <button
                                onClick={() => handleTypeSelect('PERCENT')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer h-32 gap-3",
                                    selectedType === 'PERCENT'
                                        ? "border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-500 ring-offset-2"
                                        : "border-transparent bg-blue-100 text-blue-600 hover:bg-blue-200"
                                )}
                            >
                                <PercentBadgeIcon className="w-8 h-8" />
                                <span className="font-semibold">Giảm %</span>
                            </button>

                            <button
                                onClick={() => handleTypeSelect('FREE_MONTHS')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer h-32 gap-3",
                                    selectedType === 'FREE_MONTHS'
                                        ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500 ring-offset-2"
                                        : "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200"
                                )}
                            >
                                <CalendarIcon className="w-8 h-8" />
                                <span className="font-semibold">Tặng tháng</span>
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-border my-6" />

                    {/* 2. Main Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="code" className="flex items-center gap-2">
                                Mã giảm giá (Code)
                                <span className="text-muted-foreground/60 scale-75 border rounded-full w-4 h-4 flex items-center justify-center text-[10px] cursor-help">i</span>
                            </Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                style={{ borderRadius: "12px" }}
                                placeholder="VD: SUMMER2026"
                                className="bg-muted/30"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên chương trình</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{ borderRadius: "12px" }}
                                placeholder="VD: Khuyến mãi chào hè"
                                className="bg-muted/30"
                            />
                        </div>
                    </div>
                    {/*  secondary Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="discount_value" className="flex items-center gap-2">
                                {selectedType === 'PERCENT' ? 'Phần trăm giảm' :
                                    selectedType === 'FREE_MONTHS' ? 'Số tháng tặng' :
                                        selectedType === 'GIFT' ? 'Giá trị quà tặng (ước tính)' : 'Số tiền giảm'}
                                <span className="text-muted-foreground/60 scale-75 border rounded-full w-4 h-4 flex items-center justify-center text-[10px] cursor-help">i</span>
                            </Label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    {selectedType === 'PERCENT' ? '%' :
                                        selectedType === 'FREE_MONTHS' ? 'Tháng' : 'đ'}
                                </div>
                                <Input
                                    id="discount_value"
                                    type="number"
                                    min={0}
                                    value={formData.discount_value}
                                    onChange={(e) => setFormData({ ...formData, discount_value: Math.max(0, parseFloat(e.target.value) || 0) })}
                                    style={{ borderRadius: "12px" }}
                                    placeholder={selectedType === 'PERCENT' ? "15" : "100000"}
                                    className="pl-14 bg-muted/30"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border my-6" />

                    {/* 5. Date Range */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                                Thời gian áp dụng
                                <span className="text-muted-foreground/60 scale-75 border rounded-full w-4 h-4 flex items-center justify-center text-[10px] cursor-help">i</span>
                            </Label>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="is_permanent"
                                    checked={formData.is_permanent}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_permanent: checked })}
                                />
                                <Label htmlFor="is_permanent" className="font-normal text-sm cursor-pointer">Vô thời hạn</Label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Bắt đầu</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.starts_at.slice(0, 16)}
                                    onChange={(e) => setFormData({ ...formData, starts_at: new Date(e.target.value).toISOString() })}
                                    style={{ borderRadius: "12px" }}
                                    className="bg-muted/30"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Kết thúc</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.ends_at.slice(0, 16)}
                                    onChange={(e) => setFormData({ ...formData, ends_at: new Date(e.target.value).toISOString() })}
                                    style={{ borderRadius: "12px" }}
                                    className={cn("bg-muted/30", formData.is_permanent && "opacity-50 cursor-not-allowed")}
                                    disabled={formData.is_permanent}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 6. Usage Limits */}
                    <div className="space-y-4">
                        <Label>Giới hạn sử dụng</Label>
                        <div className="flex items-center gap-3 p-4 border rounded-xl bg-muted/10">
                            <Switch
                                id="limit_uses"
                                checked={formData.max_usage > 0}
                                onCheckedChange={(checked) => setFormData({ ...formData, max_usage: checked ? 10 : 0 })}
                            />
                            <Label htmlFor="limit_uses" className="font-normal flex-1 cursor-pointer">
                                Giới hạn số lượt dùng của mã này
                            </Label>
                            {formData.max_usage > 0 && (
                                <Input
                                    type="number"
                                    className="w-24 h-8 bg-background"
                                    value={formData.max_usage}
                                    onChange={(e) => setFormData({ ...formData, max_usage: parseInt(e.target.value) || 0 })}
                                />
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="applicability" className="space-y-8">
                    <div className="space-y-4">
                        <Label className="text-lg">Tùy chỉnh phạm vi áp dụng</Label>
                        <p className="text-sm text-muted-foreground">Chọn các điều kiện mà mã giảm giá này có thể được áp dụng.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div className="flex items-center gap-3 p-4 border rounded-xl bg-card hover:bg-muted/30 transition-colors">
                                <Switch
                                    id="apply_for_all_warehouses"
                                    checked={formData.apply_for_all_warehouses}
                                    onCheckedChange={(checked) => setFormData({ ...formData, apply_for_all_warehouses: checked })}
                                />
                                <Label htmlFor="apply_for_all_warehouses" className="font-normal cursor-pointer text-sm flex-1">
                                    Áp dụng cho tất cả kho
                                </Label>
                            </div>

                            <div className="flex items-center gap-3 p-4 border rounded-xl bg-card hover:bg-muted/30 transition-colors">
                                <Switch
                                    id="apply_for_all_rows"
                                    checked={formData.apply_for_all_rows}
                                    onCheckedChange={(checked) => setFormData({ ...formData, apply_for_all_rows: checked })}
                                />
                                <Label htmlFor="apply_for_all_rows" className="font-normal cursor-pointer text-sm flex-1">
                                    Áp dụng cho tất cả dãy (row)
                                </Label>
                            </div>

                            <div className="flex items-center gap-3 p-4 border rounded-xl bg-card hover:bg-muted/30 transition-colors">
                                <Switch
                                    id="apply_for_all_addons"
                                    checked={formData.apply_for_all_addons}
                                    onCheckedChange={(checked) => setFormData({ ...formData, apply_for_all_addons: checked })}
                                />
                                <Label htmlFor="apply_for_all_addons" className="font-normal cursor-pointer text-sm flex-1">
                                    Áp dụng cho tất cả dịch vụ (addon)
                                </Label>
                            </div>

                            {formData.apply_for_all_insurances !== undefined && (
                                <div className="flex items-center gap-3 p-4 border rounded-xl bg-card hover:bg-muted/30 transition-colors">
                                    <Switch
                                        id="apply_for_all_insurances"
                                        checked={formData.apply_for_all_insurances}
                                        onCheckedChange={(checked) => setFormData({ ...formData, apply_for_all_insurances: checked })}
                                    />
                                    <Label htmlFor="apply_for_all_insurances" className="font-normal cursor-pointer text-sm flex-1">
                                        Áp dụng cho tất cả bảo hiểm
                                    </Label>
                                </div>
                            )}

                            <div className="flex items-center gap-3 p-4 border rounded-xl bg-card hover:bg-muted/30 transition-colors">
                                <Switch
                                    id="apply_for_first_rental"
                                    checked={formData.apply_for_first_rental}
                                    onCheckedChange={(checked) => setFormData({ ...formData, apply_for_first_rental: checked })}
                                />
                                <Label htmlFor="apply_for_first_rental" className="font-normal cursor-pointer text-sm flex-1">
                                    Áp dụng cho thuê lần đầu
                                </Label>
                            </div>

                            <div className="flex items-center gap-3 p-4 border rounded-xl bg-card hover:bg-muted/30 transition-colors">
                                <Switch
                                    id="apply_for_renewal"
                                    checked={formData.apply_for_renewal}
                                    onCheckedChange={(checked) => setFormData({ ...formData, apply_for_renewal: checked })}
                                />
                                <Label htmlFor="apply_for_renewal" className="font-normal cursor-pointer text-sm flex-1">
                                    Áp dụng cho gia hạn
                                </Label>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className="flex justify-end pt-6 border-t gap-3">
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
                    {loading ? "Đang xử lý..." : isEdit ? "Cập nhật" : "Tạo mã"}
                </Button>
            </div>
        </div>
    );
}
