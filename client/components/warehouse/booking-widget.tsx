"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    CheckIcon,
    DocumentTextIcon,
    ChatBubbleLeftRightIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
    QuotationBreakdown,
    RowTemplate,
    CouponValidationResult,
    MOCK_DURATION_TIERS,
    MOCK_ADDONS,
    MOCK_INSURANCES,
    MOCK_ROWS
} from '@/types/booking/booking.type';
import { RentalDurationTier } from '@/types/rental-duration-tier/rental-duration-tier.type';
import { AddonResponse } from '@/types/addon/addon.type';
import { Insurance } from '@/types/insurance/Insurance.types';
import { CouponService } from '@/services/coupons/coupon.service';
import { authStorage } from '@/services/auth/auth-storage.service';
import { publicQuotationService, QuotationApiResponse } from '@/services/public-quotation/public-quotation.service';

interface BookingWidgetProps {
    warehouseId?: string;
    price: number;
    unit?: string;
}

// Extended types with discount info (from API or mock)
interface DurationTierWithDiscount extends Partial<RentalDurationTier> {
    id: string;
    name: string;
    duration_value: number;
    duration_unit: string;
    description?: string;
    discount_percent?: number;
    gift_insurance?: boolean;
}

export function BookingWidget({ warehouseId, price, unit = "tháng" }: BookingWidgetProps) {
    const router = useRouter();
    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [dataError, setDataError] = useState<string | null>(null);

    // Data from API (or mock fallback)
    const [durationTiers, setDurationTiers] = useState<DurationTierWithDiscount[]>([]);
    const [addons, setAddons] = useState<AddonResponse[]>([]);
    const [insurances, setInsurances] = useState<Insurance[]>([]);
    const [rows, setRows] = useState<RowTemplate[]>([]);

    // Selection states
    const [rentalType, setRentalType] = useState<"whole" | "row">("whole");
    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedDurationId, setSelectedDurationId] = useState<string>("");
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [selectedInsuranceId, setSelectedInsuranceId] = useState<string>("");

    // Coupon State
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
    const [couponError, setCouponError] = useState("");
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    // API Quotation State
    const [apiQuotation, setApiQuotation] = useState<QuotationApiResponse | null>(null);
    const [isCalculatingQuotation, setIsCalculatingQuotation] = useState(false);
    const [quotationError, setQuotationError] = useState<string | null>(null);
    const quotationDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const handleBooking = () => {
        const params = new URLSearchParams();
        if (warehouseId) params.append('warehouseId', warehouseId.toString());
        params.append('rentalType', rentalType);
        if (selectedDurationId) params.append('durationId', selectedDurationId);
        if (date) params.append('startDate', date.toISOString());

        if (selectedAddons.length > 0) {
            selectedAddons.forEach(id => params.append('addonIds', id));
        }

        if (selectedInsuranceId) params.append('insuranceId', selectedInsuranceId);
        if (appliedCoupon) params.append('couponCode', appliedCoupon.code);

        if (rentalType === 'row' && selectedRowIds.length > 0) {
            selectedRowIds.forEach(id => params.append('rowIds', id));
        }

        router.push(`/checkout?${params.toString()}`);
    };

    // Fetch data on mount
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            setDataError(null);

            try {
                const API = process.env.NEXT_PUBLIC_API_URL;

                // Fetch all data in parallel with Promise.allSettled
                const [tiersRes, addonsRes, insuranceRes] = await Promise.allSettled([
                    fetch(`${API}/public/rental-duration-tiers/active`),
                    fetch(`${API}/public/addons/active`),
                    fetch(`${API}/public/insurances/active`),
                ]);

                // Process duration tiers
                if (tiersRes.status === 'fulfilled' && tiersRes.value.ok) {
                    const tiersData = await tiersRes.value.json();
                    setDurationTiers(tiersData.data || tiersData);
                } else {
                    console.warn('Using mock duration tiers');
                    setDurationTiers(MOCK_DURATION_TIERS);
                }

                // Process addons
                if (addonsRes.status === 'fulfilled' && addonsRes.value.ok) {
                    const addonsData = await addonsRes.value.json();
                    setAddons(addonsData.data || addonsData);
                } else {
                    console.warn('Using mock addons');
                    setAddons(MOCK_ADDONS as AddonResponse[]);
                }

                // Process insurances
                if (insuranceRes.status === 'fulfilled' && insuranceRes.value.ok) {
                    const insuranceData = await insuranceRes.value.json();
                    setInsurances(insuranceData.data || insuranceData);
                } else {
                    console.warn('Using mock insurances');
                    setInsurances(MOCK_INSURANCES as unknown as Insurance[]);
                }

                // Set default row data (mock for now)
                setRows(MOCK_ROWS);

            } catch (error) {
                console.error('Error fetching booking data:', error);
                setDataError('Không thể tải dữ liệu. Sử dụng dữ liệu mẫu.');
                // Use all mock data as fallback
                setDurationTiers(MOCK_DURATION_TIERS);
                setAddons(MOCK_ADDONS as AddonResponse[]);
                setInsurances(MOCK_INSURANCES as unknown as Insurance[]);
                setRows(MOCK_ROWS);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [warehouseId]);

    // Set default selections after data loads
    useEffect(() => {
        if (!isLoading && durationTiers.length > 0 && !selectedDurationId) {
            // Default to 6-month tier if available
            const defaultTier = durationTiers.find(t => t.duration_value === 6) || durationTiers[0];
            setSelectedDurationId(defaultTier.id);
        }
        if (!isLoading && insurances.length > 0 && !selectedInsuranceId) {
            // Default to basic insurance (not "none")
            const basicIns = insurances.find(i => i.name?.includes('cơ bản')) || insurances[1];
            if (basicIns) setSelectedInsuranceId(basicIns.id);
        }
    }, [isLoading, durationTiers, insurances, selectedDurationId, selectedInsuranceId]);

    // Get selected tier
    const selectedTier = useMemo(() => {
        return durationTiers.find(t => t.id === selectedDurationId);
    }, [durationTiers, selectedDurationId]);

    // Get duration in months
    const durationMonths = useMemo(() => {
        if (!selectedTier) return 6;
        if (selectedTier.duration_unit === 'YEAR') {
            return selectedTier.duration_value * 12;
        }
        return selectedTier.duration_value;
    }, [selectedTier]);

    // Get selected insurance
    const selectedInsurance = useMemo(() => {
        return insurances.find(i => i.id === selectedInsuranceId);
    }, [insurances, selectedInsuranceId]);

    // Calculate quotation (client-side fallback)
    const clientSideQuotation = useMemo((): QuotationBreakdown => {
        // Base price calculation
        let basePrice = rentalType === "whole" ? price : 0;
        if (rentalType === "row" && selectedRowIds.length > 0) {
            basePrice = selectedRowIds.reduce((sum, rowId) => {
                const row = rows.find(r => r.id === rowId);
                return sum + (row?.price_per_month || 0);
            }, 0);
        }

        // Duration discount
        const discountPercent = selectedTier?.discount_percent || 0;
        const baseTotalBeforeDiscount = basePrice * durationMonths;
        const durationDiscountAmount = baseTotalBeforeDiscount * (discountPercent / 100);

        // Addons cost
        const addonsCost = selectedAddons.reduce((sum, addonId) => {
            const addon = addons.find(a => a.id === addonId);
            if (!addon) return sum;
            return addon.is_monthly_payment
                ? sum + addon.price * durationMonths
                : sum + addon.price;
        }, 0);

        // Insurance cost
        const insurancePrice = selectedInsurance ? parseFloat(selectedInsurance.price) : 0;
        const insuranceCost = insurancePrice * durationMonths;

        // Management fee from insurance
        let managementFee = 0;
        if (selectedInsurance?.use_management_fee) {
            if (selectedInsurance.management_fee_type === 'PERCENT') {
                managementFee = insuranceCost * (parseFloat(selectedInsurance.management_fee_value) / 100);
            } else {
                managementFee = parseFloat(selectedInsurance.management_fee_value) * durationMonths;
            }
        }

        // Subtotal before service fee and coupon
        const subtotal = baseTotalBeforeDiscount - durationDiscountAmount + addonsCost + insuranceCost + managementFee;

        // Service fee (10%)
        const serviceFee = subtotal * 0.1;

        // Coupon discount
        const couponDiscount = appliedCoupon?.discount || 0;

        // Grand total
        const grandTotal = Math.max(0, subtotal + serviceFee - couponDiscount);

        return {
            basePrice,
            durationMonths,
            durationDiscountPercent: discountPercent,
            durationDiscountAmount,
            addonsCost,
            insuranceCost,
            managementFee,
            serviceFee,
            couponDiscount,
            subtotal,
            grandTotal,
        };
    }, [price, rentalType, selectedRowIds, rows, selectedTier, durationMonths, selectedAddons, addons, selectedInsurance, appliedCoupon]);

    // Call API for server-side quotation calculation (debounced)
    useEffect(() => {
        // Clear previous debounce
        if (quotationDebounceRef.current) {
            clearTimeout(quotationDebounceRef.current);
        }

        // Skip if no warehouse or duration selected
        if (!warehouseId || !selectedDurationId || !date) {
            return;
        }

        // Skip if rental_type is row but no rows selected
        if (rentalType === 'row' && selectedRowIds.length === 0) {
            return;
        }

        quotationDebounceRef.current = setTimeout(async () => {
            setIsCalculatingQuotation(true);
            setQuotationError(null);

            try {
                const result = await publicQuotationService.calculateQuotation({
                    warehouse_template_id: warehouseId,
                    rental_type: rentalType,
                    duration_months: durationMonths,
                    start_date: date.toISOString().split('T')[0],
                    row_ids: rentalType === 'row' ? selectedRowIds : undefined,
                    selected_amenities: selectedAddons.length > 0 ? selectedAddons : undefined,
                    insurance_id: selectedInsuranceId || undefined,
                    coupon_code: appliedCoupon?.code || undefined,
                });

                setApiQuotation(result);
            } catch (error) {
                console.warn('API quotation failed, using client-side calculation:', error);
                setQuotationError('Đang sử dụng tính toán cục bộ');
                setApiQuotation(null);
            } finally {
                setIsCalculatingQuotation(false);
            }
        }, 500);

        return () => {
            if (quotationDebounceRef.current) {
                clearTimeout(quotationDebounceRef.current);
            }
        };
    }, [warehouseId, rentalType, durationMonths, date, selectedRowIds, selectedAddons, selectedInsuranceId, appliedCoupon, selectedDurationId]);

    // Use API quotation if available, otherwise fall back to client-side
    const quotation = useMemo((): QuotationBreakdown => {
        if (apiQuotation) {
            return {
                basePrice: apiQuotation.base_price_per_month,
                durationMonths: apiQuotation.duration_months,
                durationDiscountPercent: apiQuotation.duration_discount_percent,
                durationDiscountAmount: (apiQuotation.base_price_per_month * apiQuotation.duration_months) * (apiQuotation.duration_discount_percent / 100),
                addonsCost: 0, // API includes this in subtotal
                insuranceCost: 0, // API includes this in subtotal
                managementFee: 0, // API includes this in subtotal
                serviceFee: apiQuotation.service_fee,
                couponDiscount: apiQuotation.coupon_discount,
                subtotal: apiQuotation.subtotal,
                grandTotal: apiQuotation.grand_total,
            };
        }
        return clientSideQuotation;
    }, [apiQuotation, clientSideQuotation]);

    // Handle coupon validation
    const handleApplyCoupon = useCallback(async () => {
        if (!couponCode) return;
        setCouponError("");
        setIsValidatingCoupon(true);

        // Check if user is logged in
        const accessToken = authStorage.getAccessToken();
        if (!accessToken) {
            setCouponError("LOGIN_REQUIRED");
            setIsValidatingCoupon(false);
            return;
        }

        try {
            const couponService = new CouponService();
            const result = await couponService.validateCoupon(
                couponCode,
                {
                    warehouse_template_ids: warehouseId ? [warehouseId] : undefined,
                    row_template_ids: rentalType === 'row' ? selectedRowIds : undefined,
                    addon_ids: selectedAddons.length > 0 ? selectedAddons : undefined,
                    rental_duration_tier_id: selectedDurationId,
                    type: 'NEW_CONTRACT',
                },
                accessToken
            );

            if (result.is_valid) {
                setAppliedCoupon({ code: couponCode, discount: result.discount_amount });
            } else {
                setCouponError(result.message || 'Mã giảm giá không hợp lệ');
                setAppliedCoupon(null);
            }

        } catch (error) {
            console.error("Error validating coupon:", error);
            setCouponError("Có lỗi xảy ra khi kiểm tra mã giảm giá");
        } finally {
            setIsValidatingCoupon(false);
        }
    }, [couponCode, warehouseId, rentalType, selectedRowIds, selectedAddons, selectedDurationId]);

    // Handle addon toggle
    const toggleAddon = useCallback((addonId: string) => {
        setSelectedAddons(prev =>
            prev.includes(addonId)
                ? prev.filter(id => id !== addonId)
                : [...prev, addonId]
        );
    }, []);

    // Handle row toggle (for partial rental)
    const toggleRow = useCallback((rowId: string) => {
        setSelectedRowIds(prev =>
            prev.includes(rowId)
                ? prev.filter(id => id !== rowId)
                : [...prev, rowId]
        );
    }, []);

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="sticky top-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a202c] shadow-xl shadow-slate-200/50 overflow-hidden p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }

    return (
        <div className="sticky top-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a202c] shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Error notification */}
            {dataError && (
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2 text-xs text-amber-700">
                    <ExclamationCircleIcon className="w-4 h-4" />
                    {dataError}
                </div>
            )}

            {/* Header / Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-700">
                <button
                    onClick={() => setRentalType("whole")}
                    className={cn(
                        "flex-1 py-4 text-sm font-bold transition-colors relative",
                        rentalType === "whole"
                            ? "text-[#0F766E] bg-teal-50/50"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    )}
                >
                    Thuê nguyên kho
                    {rentalType === "whole" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
                    )}
                </button>
                <button
                    onClick={() => setRentalType("row")}
                    className={cn(
                        "flex-1 py-4 text-sm font-bold transition-colors relative",
                        rentalType === "row"
                            ? "text-[#0F766E] bg-teal-50/50"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    )}
                >
                    Thuê theo dãy/kệ
                    {rentalType === "row" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
                    )}
                </button>
            </div>

            <div className="p-6 space-y-6">
                {/* Price Display */}
                <div>
                    <div className="flex items-baseline gap-1 mb-1">
                        {isCalculatingQuotation ? (
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-9 w-40" />
                                <span className="text-xs text-slate-400 animate-pulse">Đang tính...</span>
                            </div>
                        ) : (
                            <>
                                <span className="text-3xl font-black text-[#0F766E] tracking-tight">
                                    {quotation.grandTotal >= 1000000000
                                        ? `${(quotation.grandTotal / 1000000000).toFixed(2).replace('.', ',')} Tỷ`
                                        : `${Math.round(quotation.grandTotal).toLocaleString('vi-VN')}₫`
                                    }
                                </span>
                                <span className="text-slate-500 font-medium">/ tổng</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-slate-500">
                            ~{Math.round(quotation.grandTotal / durationMonths).toLocaleString('vi-VN')}₫/{unit}
                        </span>
                        {(selectedTier?.discount_percent || 0) > 0 && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">
                                Giảm {selectedTier?.discount_percent}% cho {selectedTier?.name}
                            </Badge>
                        )}
                        {selectedTier?.gift_insurance && (
                            <Badge variant="secondary" className="bg-teal-100 text-teal-700 hover:bg-teal-100 border-none">
                                + Tặng Bảo hiểm
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Date Picker */}
                    <div className="space-y-2">
                        <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Ngày bắt đầu thuê</Label>
                        <DatePicker
                            date={date}
                            onDateChange={setDate}
                            placeholder="Chọn ngày"
                            disabled={(date) => {
                                const today = new Date()
                                today.setHours(0, 0, 0, 0)
                                return date < today
                            }}
                        />
                    </div>

                    {/* Duration Select */}
                    <div className="space-y-2">
                        <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Kỳ hạn thuê</Label>
                        <Select value={selectedDurationId} onValueChange={setSelectedDurationId}>
                            <SelectTrigger className="w-full h-12 rounded-xl border-slate-200">
                                <SelectValue placeholder="Chọn kỳ hạn" />
                            </SelectTrigger>
                            <SelectContent>
                                {durationTiers.map((tier) => (
                                    <SelectItem key={tier.id} value={tier.id}>
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <span>{tier.name}</span>
                                            {(tier.discount_percent || 0) > 0 && (
                                                <Badge variant="outline" className="text-xs text-orange-600 border-orange-200 ml-2">
                                                    -{tier.discount_percent}%
                                                </Badge>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedTier?.description && (
                            <p className="text-xs text-slate-500">{selectedTier.description}</p>
                        )}
                    </div>

                    {/* Row Selection (for partial rental) */}
                    {rentalType === "row" && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Chọn Dãy/Kệ</Label>
                            <div className="space-y-2">
                                {rows.map((row) => (
                                    <div
                                        key={row.id}
                                        onClick={() => row.is_available && toggleRow(row.id)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border transition-all",
                                            !row.is_available && "opacity-50 cursor-not-allowed",
                                            row.is_available && "cursor-pointer",
                                            selectedRowIds.includes(row.id)
                                                ? "border-[#0F766E] bg-teal-50/50"
                                                : "border-slate-200 hover:bg-slate-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={selectedRowIds.includes(row.id)}
                                                disabled={!row.is_available}
                                                className="data-[state=checked]:bg-[#0F766E] data-[state=checked]:border-[#0F766E]"
                                            />
                                            <div>
                                                <p className="font-semibold text-slate-700">{row.name}</p>
                                                <p className="text-xs text-slate-500">{row.description}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-[#0F766E]">
                                                {row.price_per_month.toLocaleString('vi-VN')}₫
                                            </p>
                                            <p className="text-xs text-slate-500">/tháng</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {selectedRowIds.length === 0 && (
                                <p className="text-xs text-amber-600">Vui lòng chọn ít nhất 1 dãy để tiếp tục</p>
                            )}
                        </div>
                    )}

                    {/* Insurance Selection */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Gói Bảo Hiểm</Label>
                            <span className="text-xs text-[#0F766E] font-medium cursor-pointer hover:underline">Chi tiết quyền lợi</span>
                        </div>

                        <RadioGroup value={selectedInsuranceId} onValueChange={setSelectedInsuranceId} className="grid grid-cols-1 gap-2">
                            {insurances.map((ins) => {
                                const insPrice = parseFloat(ins.price);
                                const isSelected = selectedInsuranceId === ins.id;

                                return (
                                    <div
                                        key={ins.id}
                                        className={cn(
                                            "flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                                            isSelected ? "border-[#0F766E] bg-teal-50/30" : "border-slate-100 hover:bg-slate-50"
                                        )}
                                        onClick={() => setSelectedInsuranceId(ins.id)}
                                    >
                                        <RadioGroupItem value={ins.id} id={`ins-${ins.id}`} className="mt-1" />
                                        <div className="grid gap-0.5 leading-none flex-1">
                                            <Label htmlFor={`ins-${ins.id}`} className="font-semibold text-slate-700 cursor-pointer">
                                                {ins.name}
                                            </Label>
                                            <div className="flex justify-between items-center w-full gap-4">
                                                <p className="text-xs text-slate-500">{ins.description}</p>
                                                {insPrice > 0 && (
                                                    <div className="text-right shrink-0">
                                                        <span className="text-xs font-bold text-[#0F766E]">
                                                            +{insPrice.toLocaleString('vi-VN')}đ/tháng
                                                        </span>
                                                        {ins.use_management_fee && (
                                                            <span className="text-[10px] text-slate-400 block">
                                                                (Phí QL: {ins.management_fee_type === 'PERCENT'
                                                                    ? `${ins.management_fee_value}%`
                                                                    : `${parseFloat(ins.management_fee_value).toLocaleString('vi-VN')}đ`
                                                                })
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </RadioGroup>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Addons Section */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Dịch vụ cộng thêm</Label>
                            <span className="text-xs text-[#0F766E] font-medium cursor-pointer hover:underline">Xem chi tiết</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {addons.map((addon) => {
                                const isSelected = selectedAddons.includes(addon.id);

                                return (
                                    <div
                                        key={addon.id}
                                        className={cn(
                                            "flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                                            isSelected ? "border-[#0F766E] bg-teal-50/30" : "border-slate-100 hover:bg-slate-50"
                                        )}
                                        onClick={() => toggleAddon(addon.id)}
                                    >
                                        <Checkbox
                                            id={`addon-${addon.id}`}
                                            checked={isSelected}
                                            onCheckedChange={() => toggleAddon(addon.id)}
                                            className="data-[state=checked]:bg-[#0F766E] data-[state=checked]:border-[#0F766E]"
                                        />
                                        <div className="grid gap-1.5 leading-none flex-1">
                                            <Label htmlFor={`addon-${addon.id}`} className="font-semibold text-slate-700 cursor-pointer">
                                                {addon.name}
                                            </Label>
                                            <p className="text-xs text-slate-500">
                                                +{addon.price.toLocaleString('vi-VN')}đ/{addon.is_monthly_payment ? 'tháng' : 'lần'}
                                                {addon.description && ` • ${addon.description}`}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Coupon Input */}
                <div className="space-y-3 pt-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Mã giảm giá (VD: TET2025)"
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0F766E]"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            disabled={!!appliedCoupon}
                        />
                        <Button
                            variant="outline"
                            className="text-[#0F766E] border-[#0F766E] hover:bg-teal-50"
                            onClick={handleApplyCoupon}
                            disabled={!couponCode || !!appliedCoupon || isValidatingCoupon}
                        >
                            {isValidatingCoupon ? "..." : appliedCoupon ? "Đã áp dụng" : "Áp dụng"}
                        </Button>
                    </div>
                    {couponError && (
                        couponError === "LOGIN_REQUIRED" ? (
                            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                                <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                                <span>
                                    Vui lòng{' '}
                                    <Link
                                        href="/login"
                                        className="font-semibold text-[#0F766E] hover:underline"
                                    >
                                        đăng nhập
                                    </Link>
                                    {' '}để sử dụng mã giảm giá
                                </span>
                            </div>
                        ) : (
                            <p className="text-xs text-red-500">{couponError}</p>
                        )
                    )}
                    {appliedCoupon && (
                        <div className="flex justify-between items-center bg-teal-50 p-2 rounded text-xs text-[#0F766E]">
                            <span>Mã {appliedCoupon.code}</span>
                            <span className="font-bold">-{appliedCoupon.discount.toLocaleString()}₫</span>
                            <button
                                onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                                className="text-red-500 ml-2 hover:underline"
                            >
                                Xóa
                            </button>
                        </div>
                    )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm pt-2">
                    <div className="flex justify-between text-slate-600">
                        <span>Giá thuê ({quotation.basePrice.toLocaleString('vi-VN')}₫ x {durationMonths} tháng)</span>
                        <span className="font-medium text-slate-900">
                            {(quotation.basePrice * durationMonths).toLocaleString('vi-VN')}₫
                        </span>
                    </div>
                    {quotation.durationDiscountAmount > 0 && (
                        <div className="flex justify-between text-orange-600">
                            <span>Giảm giá kỳ hạn ({quotation.durationDiscountPercent}%)</span>
                            <span className="font-medium">
                                -{quotation.durationDiscountAmount.toLocaleString('vi-VN')}₫
                            </span>
                        </div>
                    )}
                    {quotation.addonsCost > 0 && (
                        <div className="flex justify-between text-slate-600">
                            <span>Dịch vụ cộng thêm</span>
                            <span className="font-medium text-slate-900">
                                +{quotation.addonsCost.toLocaleString('vi-VN')}₫
                            </span>
                        </div>
                    )}
                    {quotation.insuranceCost > 0 && (
                        <div className="flex justify-between text-slate-600">
                            <span>Bảo hiểm</span>
                            <span className="font-medium text-slate-900">
                                +{quotation.insuranceCost.toLocaleString('vi-VN')}₫
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                        <span>Phí dịch vụ (10%)</span>
                        <span className="font-medium text-slate-900">
                            {quotation.serviceFee.toLocaleString('vi-VN')}₫
                        </span>
                    </div>
                    {appliedCoupon && (
                        <div className="flex justify-between text-[#0F766E]">
                            <span>Giảm giá coupon</span>
                            <span className="font-medium">
                                -{quotation.couponDiscount.toLocaleString('vi-VN')}₫
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center text-base pt-2 font-bold text-slate-900 border-t border-slate-100 mt-2">
                        <span>Tổng cộng</span>
                        <span className="text-[#0F766E]">
                            {Math.round(quotation.grandTotal).toLocaleString('vi-VN')}₫
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                    <Button
                        className="w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0D655D] text-white text-base font-bold shadow-lg shadow-teal-500/20 transition-all"
                        disabled={rentalType === 'row' && selectedRowIds.length === 0}
                        onClick={handleBooking}
                    >
                        Yêu cầu Thuê
                    </Button>
                    <div className="flex gap-3">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="flex-1 h-10 rounded-xl border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
                                    <DocumentTextIcon className="w-3.5 h-3.5 mr-1.5" />
                                    Hợp đồng mẫu
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>Hợp đồng Dịch vụ Kho bãi (Mẫu)</DialogTitle>
                                    <DialogDescription>
                                        Điều khoản chung áp dụng cho tất cả khách hàng sử dụng dịch vụ tại GenHub.
                                    </DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="flex-1 p-4 border rounded-md">
                                    <div className="space-y-6 text-sm text-slate-700">
                                        <section>
                                            <h4 className="font-bold text-slate-900 mb-2">ĐIỀU 1: PHẠM VI DỊCH VỤ</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li><strong>Gói Thuê Kho Riêng Biệt:</strong> Thuê trọn gói diện tích, Bên B tự vận hành.</li>
                                                <li><strong>Gói Thuê Vị trí Cố Định:</strong> Thuê theo dãy/kệ, Bên A chịu trách nhiệm vận hành và quản lý.</li>
                                                <li><strong>Khu vực chung:</strong> Miễn phí sử dụng cho tiếp nhận, kiểm hàng, phân loại (không lưu kho qua đêm).</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h4 className="font-bold text-slate-900 mb-2">ĐIỀU 2: THANH TOÁN & THỜI HẠN</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>Thanh toán <strong>100% một lần</strong> trong vòng 07 ngày ký HĐ và trước khi bàn giao.</li>
                                                <li>Giá trị hợp đồng chưa bao gồm VAT (10%).</li>
                                                <li>Phạt chậm trả: <strong>0.05%/ngày</strong> trên tổng số tiền chậm thanh toán.</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h4 className="font-bold text-slate-900 mb-2">ĐIỀU 3: QUY TRÌNH VẬN HÀNH</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li><strong>Tiếp nhận:</strong> Xe tải vào bãi đệm - Hạ hàng khu vực chung - Kiểm tra ngoại quan 100%.</li>
                                                <li><strong>Lưu kho:</strong> Hàng đạt chuẩn được đưa vào vị trí thuê. Trách nhiệm tính từ thời điểm này.</li>
                                                <li><strong>Định mức hao hụt:</strong> Cho phép 0.1% - 0.5% tùy loại hàng. GenHub bồi thường nếu vượt định mức.</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h4 className="font-bold text-slate-900 mb-2">ĐIỀU 4: TRÁCH NHIỆM BÊN THUÊ</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>Đảm bảo tính pháp lý của hàng hóa lưu kho.</li>
                                                <li>Không lưu trữ hàng cấm, chất cháy nổ, hàng hóa nguy hiểm.</li>
                                                <li>Tuân thủ quy định PCCC và An toàn lao động tại kho.</li>
                                            </ul>
                                        </section>

                                        <div className="pt-4 text-center italic text-slate-500">
                                            (Đây là bạn tóm tắt, vui lòng liên hệ nhân viên tư vấn để nhận bản Hợp đồng đầy đủ)
                                        </div>
                                    </div>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>

                        <Button
                            variant="outline"
                            className="flex-1 h-10 rounded-xl border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                            onClick={() => alert("Tính năng Chat đang được phát triển. Vui lòng liên hệ Hotline: 1900 1234")}
                        >
                            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 mr-1.5" />
                            Chat tư vấn
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <CheckIcon className="w-3 h-3" />
                    <span>Không trừ tiền cho đến khi ký hợp đồng</span>
                </div>
            </div>
        </div>
    );
}
