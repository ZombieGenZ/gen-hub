"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    CheckIcon,
    ExclamationCircleIcon,
    ChatBubbleLeftRightIcon,
    XMarkIcon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
} from '@/types/booking/booking.type';
import { DurationUnit, RentalDurationTier } from '@/types/rental-duration-tier/rental-duration-tier.type';
import { AddonResponse } from '@/types/addon/addon.type';
import { Insurance } from '@/types/insurance/Insurance.types';
import { authStorage } from '@/services/auth/auth-storage.service';
import { publicQuotationService, QuotationApiResponse } from '@/services/public-quotation/public-quotation.service';

interface WarehouseBookingPanelProps {
    warehouseId?: string;
    warehouseName?: string;
    price: number;
    unit?: string;
    rows?: {
        id: string;
        name: string;
        code: string;
        description?: string;
        is_rented: boolean;
        price_per_month: number;
        total_weight_capacity?: number;
        is_active: boolean;
    }[];
}

// Extended types with discount info (from API or mock)
interface DurationTierWithDiscount extends Partial<RentalDurationTier> {
    id: string;
    name: string;
    duration_value: number;
    duration_unit: DurationUnit;
    description?: string;
    discount_percent?: number;
    gift_insurance?: boolean;
}



export function WarehouseBookingPanel({
    warehouseId,
    warehouseName,
    price,
    unit = "tháng",
    rows: rowsProp,
}: WarehouseBookingPanelProps) {
    const router = useRouter();


    // ========== QUOTATION TAB STATE ==========
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

    // API Quotation State
    const [apiQuotation, setApiQuotation] = useState<QuotationApiResponse | null>(null);
    const [isCalculatingQuotation, setIsCalculatingQuotation] = useState(false);
    const [quotationError, setQuotationError] = useState<string | null>(null);
    const quotationDebounceRef = useRef<NodeJS.Timeout | null>(null);


    // ========== QUOTATION LOGIC ==========
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
        // Coupon will be applied in checkout page

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
                console.log('[WarehouseBookingPanel] API URL:', API);

                const [tiersRes, addonsRes, insuranceRes] = await Promise.allSettled([
                    fetch(`${API}/public/rental-duration-tiers/active`),
                    fetch(`${API}/public/addons/active`),
                    fetch(`${API}/public/insurances/active`),
                ]);

                // Debug: Duration Tiers
                if (tiersRes.status === 'fulfilled' && tiersRes.value.ok) {
                    const tiersData = await tiersRes.value.json();
                    console.log('[WarehouseBookingPanel] Duration Tiers from API:', tiersData);
                    const tiersArray = Array.isArray(tiersData.data) ? tiersData.data : (Array.isArray(tiersData) ? tiersData : []);
                    setDurationTiers(tiersArray);
                } else {
                    console.warn('[WarehouseBookingPanel] Duration Tiers API failed:',
                        tiersRes.status === 'rejected' ? tiersRes.reason : `Status: ${tiersRes.value?.status}`);
                    setDurationTiers([]);
                }

                // Debug: Addons
                if (addonsRes.status === 'fulfilled' && addonsRes.value.ok) {
                    const addonsData = await addonsRes.value.json();
                    console.log('[WarehouseBookingPanel] Addons from API:', addonsData);
                    const addonsArray = Array.isArray(addonsData.data?.items) ? addonsData.data.items 
                        : (Array.isArray(addonsData.data) ? addonsData.data 
                        : (Array.isArray(addonsData) ? addonsData : []));
                    setAddons(addonsArray);
                } else {
                    console.warn('[WarehouseBookingPanel] Addons API failed:',
                        addonsRes.status === 'rejected' ? addonsRes.reason : `Status: ${addonsRes.value?.status}`);
                    setAddons([]);
                }

                // Debug: Insurances
                if (insuranceRes.status === 'fulfilled' && insuranceRes.value.ok) {
                    const insuranceData = await insuranceRes.value.json();
                    console.log('[WarehouseBookingPanel] Insurances from API:', insuranceData);
                    const insuranceArray = Array.isArray(insuranceData.data?.items) ? insuranceData.data.items 
                        : (Array.isArray(insuranceData.data) ? insuranceData.data 
                        : (Array.isArray(insuranceData) ? insuranceData : []));
                    setInsurances(insuranceArray);
                } else {
                    console.warn('[WarehouseBookingPanel] Insurances API failed:',
                        insuranceRes.status === 'rejected' ? insuranceRes.reason : `Status: ${insuranceRes.value?.status}`);
                    setInsurances([]);
                }

                // Use rows from prop (fetched from warehouse detail API)
                const mappedRows: RowTemplate[] = (rowsProp || []).map(r => ({
                    id: r.id,
                    name: r.name,
                    description: r.description,
                    price_per_month: r.price_per_month,
                    area_sqm: undefined,
                    is_available: r.is_active && !r.is_rented,
                    position: r.code,
                }));
                setRows(mappedRows);

            } catch (error) {
                console.error('[WarehouseBookingPanel] Error fetching booking data:', error);
                setDataError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
                setDurationTiers([]);
                setAddons([]);
                setInsurances([]);
                const mappedRows: RowTemplate[] = (rowsProp || []).map(r => ({
                    id: r.id,
                    name: r.name,
                    description: r.description,
                    price_per_month: r.price_per_month,
                    area_sqm: undefined,
                    is_available: r.is_active && !r.is_rented,
                    position: r.code,
                }));
                setRows(mappedRows);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [warehouseId]);

    // Set default selections after data loads
    useEffect(() => {
        if (!isLoading && durationTiers.length > 0 && !selectedDurationId) {
            const defaultTier = durationTiers.find(t => t.duration_value === 6) || durationTiers[0];
            setSelectedDurationId(defaultTier.id);
        }
        if (!isLoading && insurances.length > 0 && !selectedInsuranceId) {
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

    // Client-side quotation calculation (fallback)
    const clientSideQuotation = useMemo((): QuotationBreakdown => {
        let basePrice = rentalType === "whole" ? price : 0;
        if (rentalType === "row" && selectedRowIds.length > 0) {
            basePrice = selectedRowIds.reduce((sum, rowId) => {
                const row = rows.find(r => r.id === rowId);
                return sum + (row?.price_per_month || 0);
            }, 0);
        }

        const discountPercent = selectedTier?.discount_percent || 0;
        const baseTotalBeforeDiscount = basePrice * durationMonths;
        const durationDiscountAmount = baseTotalBeforeDiscount * (discountPercent / 100);

        const addonsCost = selectedAddons.reduce((sum, addonId) => {
            const addon = addons.find(a => a.id === addonId);
            if (!addon) return sum;
            return addon.is_monthly_payment
                ? sum + addon.price * durationMonths
                : sum + addon.price;
        }, 0);

        const insurancePrice = selectedInsurance ? parseFloat(selectedInsurance.price) : 0;
        const insuranceCost = insurancePrice * durationMonths;

        let managementFee = 0;
        if (selectedInsurance?.use_management_fee) {
            if (selectedInsurance.management_fee_type === 'PERCENT') {
                managementFee = insuranceCost * (parseFloat(selectedInsurance.management_fee_value) / 100);
            } else {
                managementFee = parseFloat(selectedInsurance.management_fee_value) * durationMonths;
            }
        }

        const subtotal = baseTotalBeforeDiscount - durationDiscountAmount + addonsCost + insuranceCost + managementFee;
        const serviceFee = subtotal * 0.1;
        const couponDiscount = 0;
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
    }, [price, rentalType, selectedRowIds, rows, selectedTier, durationMonths, selectedAddons, addons, selectedInsurance]);

    // API quotation call (debounced)
    useEffect(() => {
        if (quotationDebounceRef.current) {
            clearTimeout(quotationDebounceRef.current);
        }

        if (!warehouseId || !selectedDurationId || !date) {
            return;
        }

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
                    duration_tier_id: selectedDurationId,
                    start_date: date.toISOString().split('T')[0],
                    row_template_ids: rentalType === 'row' ? selectedRowIds : undefined,
                    addon_ids: selectedAddons.length > 0 ? selectedAddons : undefined,
                    insurance_id: selectedInsuranceId || undefined,
                    // coupon_code will be handled in checkout
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
    }, [warehouseId, rentalType, durationMonths, date, selectedRowIds, selectedAddons, selectedInsuranceId, selectedDurationId]);

    // Final quotation (API or fallback)
    const quotation = useMemo((): QuotationBreakdown => {
        if (apiQuotation) {
            return {
                basePrice: apiQuotation.base_price_per_month,
                durationMonths: apiQuotation.duration_months,
                durationDiscountPercent: apiQuotation.duration_discount_percent,
                durationDiscountAmount: (apiQuotation.base_price_per_month * apiQuotation.duration_months) * (apiQuotation.duration_discount_percent / 100),
                addonsCost: 0,
                insuranceCost: 0,
                managementFee: 0,
                serviceFee: apiQuotation.service_fee,
                couponDiscount: apiQuotation.coupon_discount,
                subtotal: apiQuotation.subtotal,
                grandTotal: apiQuotation.grand_total,
            };
        }
        return clientSideQuotation;
    }, [apiQuotation, clientSideQuotation]);

    const toggleAddon = useCallback((addonId: string) => {
        setSelectedAddons(prev =>
            prev.includes(addonId)
                ? prev.filter(id => id !== addonId)
                : [...prev, addonId]
        );
    }, []);

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

            <div className="bg-teal-50/50 border-b border-slate-100 dark:border-slate-700 py-4 px-6">
                <h3 className="text-sm font-bold text-[#0F766E] uppercase tracking-wide">Báo giá thuê kho</h3>
            </div>

            <div className="p-6 space-y-6">
                {/* Rental Type Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => setRentalType("whole")}
                        className={cn(
                            "flex-1 py-3 text-xs font-semibold transition-colors relative",
                            rentalType === "whole"
                                ? "text-[#0F766E] bg-teal-50/30"
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
                            "flex-1 py-3 text-xs font-semibold transition-colors relative",
                            rentalType === "row"
                                ? "text-[#0F766E] bg-teal-50/30"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        )}
                    >
                        Thuê theo dãy/kệ
                        {rentalType === "row" && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
                        )}
                    </button>
                </div>

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
                                Giảm {selectedTier?.discount_percent}%
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
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                            }}
                        />
                    </div>

                    {/* Duration Select */}
                    <div className="space-y-2">
                        <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Kỳ hạn thuê</Label>
                        {durationTiers.length > 0 ? (
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
                        ) : (
                            <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg">Chưa có kỳ hạn thuê. Vui lòng liên hệ để được tư vấn.</p>
                        )}
                    </div>

                    {/* Row Selection (for partial rental) */}
                    {rentalType === "row" && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Chọn Dãy/Kệ</Label>
                            {rows.length > 0 ? (
                                <>
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
                                </>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Kho này chưa có dãy/kệ để cho thuê riêng.</p>
                            )}
                        </div>
                    )}

                    {/* Insurance Selection */}
                    {insurances.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 rounded-md bg-teal-50 dark:bg-teal-900/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#0F766E]">
                                      <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <Label className="text-slate-900 dark:text-white font-bold text-sm tracking-wide">Gói Bảo Hiểm Toàn Diện</Label>
                            </div>
                            <RadioGroup value={selectedInsuranceId} onValueChange={setSelectedInsuranceId} className="grid grid-cols-1 gap-3">
                                {insurances.map((ins) => {
                                    const insPrice = parseFloat(ins.price);
                                    const isSelected = selectedInsuranceId === ins.id;

                                    return (
                                        <div
                                            key={ins.id}
                                            className={cn(
                                                "relative flex items-start space-x-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden group",
                                                isSelected 
                                                    ? "border-[#0F766E] bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-900/20 dark:to-slate-900 shadow-md shadow-teal-500/10" 
                                                    : "border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800 bg-white dark:bg-slate-900 hover:shadow-sm"
                                            )}
                                            onClick={() => setSelectedInsuranceId(ins.id)}
                                        >
                                            <RadioGroupItem value={ins.id} id={`ins-${ins.id}`} className="mt-1" />
                                            <div className="grid gap-1.5 leading-none flex-1">
                                                <Label htmlFor={`ins-${ins.id}`} className={cn("font-bold cursor-pointer text-base", isSelected ? "text-[#0F766E]" : "text-slate-800 dark:text-slate-200")}>
                                                    {ins.name}
                                                </Label>
                                                <div className="flex justify-between items-center w-full gap-4 mt-1">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pr-2">{ins.description}</p>
                                                    {insPrice > 0 ? (
                                                        <span className="text-sm font-black text-[#0F766E] shrink-0 bg-teal-50 dark:bg-teal-900/40 px-2.5 py-1 rounded-md">
                                                            +{insPrice.toLocaleString('vi-VN')}đ<span className="text-[10px] font-medium text-slate-500">/tháng</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md shrink-0 uppercase">Miễn phí</span>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                                                    <div className="absolute top-[-24px] right-[-24px] w-12 h-12 bg-teal-100 dark:bg-teal-800/30 rounded-full blur-xl opacity-60"></div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </RadioGroup>
                        </div>
                    )}

                    <Separator className="bg-slate-100" />

                    {/* Addons Section - Dropdown Style */}
                    {addons.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-900/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-600">
                                      <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <Label className="text-slate-900 dark:text-white font-bold text-sm tracking-wide">Dịch Vụ Bổ Sung</Label>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Chọn dịch vụ từ menu để thêm vào danh sách:</p>

                            {/* Dropdown select */}
                            <select
                                value=""
                                onChange={(e) => {
                                    const addonId = e.target.value;
                                    if (addonId && !selectedAddons.includes(addonId)) {
                                        setSelectedAddons(prev => [...prev, addonId]);
                                    }
                                    e.currentTarget.value = "";
                                }}
                                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
                            >
                                <option value="">-- Nhấn để chọn dịch vụ --</option>
                                {addons
                                    .filter(addon => !selectedAddons.includes(addon.id))
                                    .map(addon => (
                                        <option key={addon.id} value={addon.id}>
                                            {addon.name} — +{Number(addon.price).toLocaleString('vi-VN')}đ/{addon.is_monthly_payment ? 'tháng' : 'lần'}
                                        </option>
                                    ))
                                }
                            </select>

                            {/* Selected addons list */}
                            {selectedAddons.length > 0 && (
                                <div className="space-y-2 mt-1">
                                    {selectedAddons.map(addonId => {
                                        const addon = addons.find(a => a.id === addonId);
                                        if (!addon) return null;
                                        return (
                                            <div
                                                key={addonId}
                                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
                                            >
                                                <div>
                                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{addon.name}</span>
                                                    <span className="ml-2 text-xs text-blue-500 dark:text-blue-400">
                                                        +{Number(addon.price).toLocaleString('vi-VN')}đ/{addon.is_monthly_payment ? 'tháng' : 'lần'}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAddon(addonId)}
                                                    className="ml-3 text-red-400 hover:text-red-600 transition-colors"
                                                    aria-label={`Xóa ${addon.name}`}
                                                >
                                                    <XMarkIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
                    <div className="flex justify-between text-slate-600">
                        <span>Phí dịch vụ (10%)</span>
                        <span className="font-medium text-slate-900">
                            {quotation.serviceFee.toLocaleString('vi-VN')}₫
                        </span>
                    </div>
                    {/* Coupon discount will be shown in checkout */}
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
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <CheckIcon className="w-3 h-3" />
                    <span>Không trừ tiền cho đến khi ký hợp đồng</span>
                </div>
            </div>
        </div>
    );
}
