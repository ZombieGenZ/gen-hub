"use client";

import { useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { CouponService } from "@/services/coupons/coupon.service";
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
import { CouponRequest, Coupon } from "@/types/coupons/coupon.type";
import { cn } from "@/lib/utils";
import {
    BanknotesIcon,
    PercentBadgeIcon,
    GiftIcon,
    CalendarIcon
} from "@heroicons/react/24/outline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";

const couponService = new CouponService();

interface CouponFormProps {
    initialData?: Coupon;
    onSuccess: () => void;
    onCancel: () => void;
    isEdit?: boolean;
}

type CouponTypeOption = 'AMOUNT' | 'PERCENT' | 'FREE_MONTHS' | 'GIFT';

export function CouponForm({ initialData, onSuccess, onCancel, isEdit = false }: CouponFormProps) {
    const [loading, setLoading] = useState(false);

    // Determine initial selected type
    const [selectedType, setSelectedType] = useState<CouponTypeOption>(() => {
        if (!initialData) return 'AMOUNT';
        return initialData.discount_type === 'PERCENT' ? 'PERCENT' : 'AMOUNT';
    });

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
        ends_at: initialData?.ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
        gift_insurance_ids: [],
        target_user_ids: initialData?.target_user_ids || []
    });

    const handleTypeSelect = (type: CouponTypeOption) => {
        setSelectedType(type);

        const updates: Partial<CouponRequest> = {
            coupon_type: 'PUBLIC',
            has_gift_addons: false,
        };

        if (type === 'GIFT') {
            updates.discount_type = 'PERCENT';
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
        } catch (error: any) {
            console.error("Failed to save coupon", error);
            alert(error.message || "Failed to save coupon");
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
                        <div className="mt-2 grid grid-cols-3 md:grid-cols-3 gap-4">
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

                    <div className="space-y-2">
                        <Label htmlFor="description">Mô tả chi tiết</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Mô tả chi tiết về chương trình khuyến mãi..."
                            className="bg-muted/30 min-h-[80px]"
                            style={{ borderRadius: "12px" }}
                        />
                    </div>
                    {/*  secondary Inputs */}
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="discount_value" className="flex items-center gap-2">
                                {selectedType === 'PERCENT' ? 'Phần trăm giảm' :
                                    selectedType === 'FREE_MONTHS' ? 'Số tháng tặng' : 'Số tiền giảm'}
                                <span className="text-muted-foreground/60 scale-75 border rounded-full w-4 h-4 flex items-center justify-center text-[10px] cursor-help">i</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="discount_value"
                                    type={selectedType === 'AMOUNT' ? "text" : "number"}
                                    min={0}
                                    value={
                                        selectedType === 'AMOUNT'
                                            ? (formData.discount_value > 0 ? new Intl.NumberFormat('vi-VN').format(formData.discount_value) : '')
                                            : formData.discount_value || ''
                                    }
                                    onChange={(e) => {
                                        if (selectedType === 'AMOUNT') {
                                            const val = parseInt(e.target.value.replace(/\./g, '').replace(/\D/g, '')) || 0;
                                            setFormData({ ...formData, discount_value: val });
                                        } else {
                                            setFormData({ ...formData, discount_value: Math.max(0, parseFloat(e.target.value) || 0) });
                                        }
                                    }}
                                    placeholder={selectedType === 'PERCENT' ? "15" : selectedType === 'FREE_MONTHS' ? "" : "100.000"}
                                    className={cn(
                                        "peer [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                        selectedType === 'AMOUNT' && "ps-6 pe-12",
                                        (selectedType === 'PERCENT' || selectedType === 'FREE_MONTHS') && "pe-12"
                                    )}
                                />
                                {selectedType === 'AMOUNT' && (
                                    <>
                                        <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-sm text-muted-foreground peer-disabled:opacity-50">
                                            đ
                                        </span>
                                        <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-sm text-muted-foreground peer-disabled:opacity-50">
                                            VND
                                        </span>
                                    </>
                                )}
                                {selectedType === 'PERCENT' && (
                                    <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-sm text-muted-foreground peer-disabled:opacity-50">
                                        %
                                    </span>
                                )}
                                {selectedType === 'FREE_MONTHS' && (
                                    <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-sm text-muted-foreground peer-disabled:opacity-50">
                                        Tháng
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {selectedType === 'PERCENT' && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="is_unlimited_discount"
                                    checked={formData.is_unlimited_discount}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_unlimited_discount: checked })}
                                />
                                <Label htmlFor="is_unlimited_discount" className="font-normal cursor-pointer">Không giới hạn số tiền giảm tối đa</Label>
                            </div>

                            {!formData.is_unlimited_discount && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label htmlFor="max_discount_amount">Số tiền giảm tối đa</Label>
                                    <div className="relative">
                                        <Input
                                            id="max_discount_amount"
                                            type="text"
                                            value={formData.max_discount_amount > 0 ? new Intl.NumberFormat('vi-VN').format(formData.max_discount_amount) : ''}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value.replace(/\./g, '').replace(/\D/g, '')) || 0;
                                                setFormData({ ...formData, max_discount_amount: val });
                                            }}
                                            className="peer ps-6 pe-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="500.000"
                                        />
                                        <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-sm text-muted-foreground peer-disabled:opacity-50">
                                            đ
                                        </span>
                                        <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-sm text-muted-foreground peer-disabled:opacity-50">
                                            VND
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="h-px bg-border my-6" />

                    {/* 5. Date Range */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-base font-semibold">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="starts_at" className="text-sm font-medium">Ngày bắt đầu</Label>
                                <DatePicker
                                    date={new Date(formData.starts_at)}
                                    onDateChange={(date) => {
                                        if (date) {
                                            const currentDate = new Date(formData.starts_at);
                                            date.setHours(currentDate.getHours(), currentDate.getMinutes());
                                            setFormData({ ...formData, starts_at: date.toISOString() });
                                        }
                                    }}
                                    placeholder="Chọn ngày bắt đầu"
                                    className="bg-muted/30"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ends_at" className="text-sm font-medium">Ngày kết thúc</Label>
                                <DatePicker
                                    date={formData.is_permanent ? undefined : new Date(formData.ends_at)}
                                    onDateChange={(date) => {
                                        if (date) {
                                            const currentDate = new Date(formData.ends_at);
                                            date.setHours(currentDate.getHours(), currentDate.getMinutes());
                                            setFormData({ ...formData, ends_at: date.toISOString() });
                                        }
                                    }}
                                    placeholder="Chọn ngày kết thúc"
                                    className={cn("bg-muted/30", formData.is_permanent && "opacity-50 cursor-not-allowed")}
                                    disabled={() => formData.is_permanent}
                                    fromDate={new Date(formData.starts_at)}
                                />
                                {formData.is_permanent && (
                                    <div className="text-xs text-amber-600 italic flex items-center">
                                        ∞ Không giới hạn thời gian
                                    </div>
                                )}
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

                        <div className="flex items-center gap-3 p-4 border rounded-xl bg-muted/10">
                            <Switch
                                id="is_unlimited_stack"
                                checked={formData.is_unlimited_stack}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_unlimited_stack: checked })}
                            />
                            <Label htmlFor="is_unlimited_stack" className="font-normal flex-1 cursor-pointer">
                                Có thể áp dụng chung với các mã khuyến mãi khác
                            </Label>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="applicability" className="space-y-8">
                    <div className="space-y-4">
                        <Label className="text-lg">Tùy chỉnh phạm vi áp dụng</Label>
                        <p className="text-sm text-muted-foreground">Chọn các điều kiện mà mã giảm giá này có thể được áp dụng.</p>

                        <div className="space-y-4 border-b pb-6">
                            <Label className="text-base font-medium">Điều kiện đơn hàng</Label>
                            <div className="grid grid-cols-1 gap-4">
                                {/* Min Order Amount */}
                                <div className="flex flex-col gap-3 p-4 border rounded-xl bg-card">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="require_min_order_amount"
                                            checked={formData.require_min_order_amount}
                                            onCheckedChange={(checked) => setFormData({ ...formData, require_min_order_amount: checked })}
                                        />
                                        <Label htmlFor="require_min_order_amount" className="cursor-pointer">Yêu cầu giá trị đơn hàng tối thiểu</Label>
                                    </div>
                                    {formData.require_min_order_amount && (
                                        <div className="pl-12">
                                            <div className="relative max-w-xs">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">đ</div>
                                                <Input
                                                    type="number"
                                                    value={formData.min_order_amount}
                                                    onChange={(e) => setFormData({ ...formData, min_order_amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                                                    className="pl-8"
                                                    placeholder="VD: 1000000"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Min Warehouses */}
                                <div className="flex flex-col gap-3 p-4 border rounded-xl bg-card">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="require_min_warehouses"
                                            checked={formData.require_min_warehouses}
                                            onCheckedChange={(checked) => setFormData({ ...formData, require_min_warehouses: checked })}
                                        />
                                        <Label htmlFor="require_min_warehouses" className="cursor-pointer">Yêu cầu số lượng kho tối thiểu</Label>
                                    </div>
                                    {formData.require_min_warehouses && (
                                        <div className="pl-12">
                                            <Input
                                                type="number"
                                                value={formData.min_warehouses}
                                                onChange={(e) => setFormData({ ...formData, min_warehouses: Math.max(0, parseInt(e.target.value) || 0) })}
                                                className="max-w-xs"
                                                placeholder="VD: 2"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Min Rental Duration */}
                                <div className="flex flex-col gap-3 p-4 border rounded-xl bg-card">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="require_min_rental_duration"
                                            checked={formData.require_min_rental_duration}
                                            onCheckedChange={(checked) => setFormData({ ...formData, require_min_rental_duration: checked })}
                                        />
                                        <Label htmlFor="require_min_rental_duration" className="cursor-pointer">Yêu cầu thời gian thuê tối thiểu</Label>
                                    </div>
                                    {formData.require_min_rental_duration && (
                                        <div className="pl-12 flex gap-3">
                                            <Input
                                                type="number"
                                                value={formData.min_rental_duration_value}
                                                onChange={(e) => setFormData({ ...formData, min_rental_duration_value: Math.max(0, parseInt(e.target.value) || 0) })}
                                                className="max-w-[120px]"
                                                placeholder="VD: 6"
                                            />
                                            <Select
                                                value={formData.min_rental_duration_unit}
                                                onValueChange={(val: any) => setFormData({ ...formData, min_rental_duration_unit: val })}
                                            >
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MONTH">Tháng</SelectItem>
                                                    <SelectItem value="YEAR">Năm</SelectItem>
                                                    <SelectItem value="week">Tuần</SelectItem>
                                                    <SelectItem value="day">Ngày</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Label className="text-base font-medium block pt-2">Phạm vi áp dụng</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
