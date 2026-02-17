"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AddonsService } from "@/services/addons/addons.service";
import { IsuranceService } from "@/services/Insurance/Insurance.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    PlusIcon,
    TrashIcon,
    GiftIcon,
    ShieldCheckIcon,
    WrenchScrewdriverIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
    RentalDurationTier,
    RentalDurationTierRequest,
    TierAddonGift,
    TierInsuranceGift,
    DurationUnit,
} from "@/types/rental-duration-tier/rental-duration-tier.type";
import { AddonResponse } from "@/types/addon/addon.type";
import { Insurance } from "@/types/insurance/Insurance.types";

const addonsService = new AddonsService();
const insuranceService = new IsuranceService();

interface TierFormProps {
    initialData?: RentalDurationTier | null;
    onSubmit: (data: RentalDurationTierRequest) => Promise<void>;
    onCancel: () => void;
    isEdit?: boolean;
    loading?: boolean;
}

// ─── Helper: Default gift objects ────────────────────────────────────────────
function defaultAddonGift(addon_id: string): Omit<TierAddonGift, "addon"> {
    return {
        addon_id,
        require_min_order_amount: false,
        min_order_amount: null,
        require_min_warehouses: false,
        min_warehouses: null,
        require_min_rows: false,
        min_rows: null,
        is_until_service_end: true,
        gift_duration_value: null,
        gift_duration_unit: null,
        is_active: true,
    };
}

function defaultInsuranceGift(insurance_id: string): Omit<TierInsuranceGift, "insurance"> {
    return {
        insurance_id,
        require_min_order_amount: false,
        min_order_amount: null,
        require_min_warehouses: false,
        min_warehouses: null,
        require_min_rows: false,
        min_rows: null,
        is_until_service_end: true,
        gift_duration_value: null,
        gift_duration_unit: null,
        is_active: true,
    };
}

// ─── Gift Config Card (Addon) ────────────────────────────────────────────────
function AddonGiftCard({
    gift,
    addonName,
    onUpdate,
    onRemove,
}: {
    gift: Omit<TierAddonGift, "addon">;
    addonName: string;
    onUpdate: (g: Omit<TierAddonGift, "addon">) => void;
    onRemove: () => void;
}) {
    return (
        <div className="border rounded-2xl p-4 space-y-4 bg-white dark:bg-slate-900 relative group">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <WrenchScrewdriverIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-semibold text-sm">{addonName}</span>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600"
                    onClick={onRemove}
                >
                    <TrashIcon className="w-4 h-4" />
                </Button>
            </div>

            {/* Conditions */}
            <div className="space-y-3">
                {/* Min Order Amount */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`addon-min-order-${gift.addon_id}`}
                            checked={gift.require_min_order_amount}
                            onCheckedChange={(checked) =>
                                onUpdate({
                                    ...gift,
                                    require_min_order_amount: !!checked,
                                    min_order_amount: checked ? gift.min_order_amount : null,
                                })
                            }
                        />
                        <Label htmlFor={`addon-min-order-${gift.addon_id}`} className="text-sm cursor-pointer">
                            Yêu cầu giá trị đơn hàng tối thiểu
                        </Label>
                    </div>
                    {gift.require_min_order_amount && (
                        <div className="ml-6">
                            <div className="relative max-w-xs">
                                <Input
                                    type="text"
                                    value={gift.min_order_amount ? new Intl.NumberFormat("vi-VN").format(gift.min_order_amount) : ""}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value.replace(/\./g, "").replace(/\D/g, "")) || 0;
                                        onUpdate({ ...gift, min_order_amount: val });
                                    }}
                                    placeholder="0"
                                    style={{ borderRadius: "10px" }}
                                    className="bg-muted/30 pr-10"
                                />
                                <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-muted-foreground">₫</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Min Warehouses */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`addon-min-wh-${gift.addon_id}`}
                            checked={gift.require_min_warehouses}
                            onCheckedChange={(checked) =>
                                onUpdate({
                                    ...gift,
                                    require_min_warehouses: !!checked,
                                    min_warehouses: checked ? gift.min_warehouses : null,
                                })
                            }
                        />
                        <Label htmlFor={`addon-min-wh-${gift.addon_id}`} className="text-sm cursor-pointer">
                            Yêu cầu số lượng kho tối thiểu
                        </Label>
                    </div>
                    {gift.require_min_warehouses && (
                        <div className="ml-6 max-w-[160px]">
                            <Input
                                type="number"
                                min={1}
                                value={gift.min_warehouses || ""}
                                onChange={(e) => onUpdate({ ...gift, min_warehouses: parseInt(e.target.value) || null })}
                                placeholder="1"
                                style={{ borderRadius: "10px" }}
                                className="bg-muted/30"
                            />
                        </div>
                    )}
                </div>

                {/* Min Rows */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`addon-min-rows-${gift.addon_id}`}
                            checked={gift.require_min_rows}
                            onCheckedChange={(checked) =>
                                onUpdate({
                                    ...gift,
                                    require_min_rows: !!checked,
                                    min_rows: checked ? gift.min_rows : null,
                                })
                            }
                        />
                        <Label htmlFor={`addon-min-rows-${gift.addon_id}`} className="text-sm cursor-pointer">
                            Yêu cầu số dãy kho tối thiểu
                        </Label>
                    </div>
                    {gift.require_min_rows && (
                        <div className="ml-6 max-w-[160px]">
                            <Input
                                type="number"
                                min={1}
                                value={gift.min_rows || ""}
                                onChange={(e) => onUpdate({ ...gift, min_rows: parseInt(e.target.value) || null })}
                                placeholder="1"
                                style={{ borderRadius: "10px" }}
                                className="bg-muted/30"
                            />
                        </div>
                    )}
                </div>

                {/* Duration */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Thời hạn tặng kèm</Label>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={gift.is_until_service_end}
                                onCheckedChange={(checked) =>
                                    onUpdate({
                                        ...gift,
                                        is_until_service_end: checked,
                                        gift_duration_value: checked ? null : gift.gift_duration_value,
                                        gift_duration_unit: checked ? null : gift.gift_duration_unit,
                                    })
                                }
                            />
                            <span className="text-sm">{gift.is_until_service_end ? "Suốt thời gian thuê" : "Tùy chỉnh"}</span>
                        </div>
                    </div>
                    {!gift.is_until_service_end && (
                        <div className="flex items-center gap-2 max-w-xs">
                            <Input
                                type="number"
                                min={1}
                                value={gift.gift_duration_value || ""}
                                onChange={(e) => onUpdate({ ...gift, gift_duration_value: parseInt(e.target.value) || null })}
                                placeholder="1"
                                style={{ borderRadius: "10px 0 0 10px" }}
                                className="bg-muted/30 w-20"
                            />
                            <Select
                                value={gift.gift_duration_unit || "MONTH"}
                                onValueChange={(val) => onUpdate({ ...gift, gift_duration_unit: val as DurationUnit })}
                            >
                                <SelectTrigger style={{ borderRadius: "0 10px 10px 0" }} className="w-28 -ml-[1px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MONTH">Tháng</SelectItem>
                                    <SelectItem value="YEAR">Năm</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Gift Config Card (Insurance) ─────────────────────────────────────────────
function InsuranceGiftCard({
    gift,
    insuranceName,
    onUpdate,
    onRemove,
}: {
    gift: Omit<TierInsuranceGift, "insurance">;
    insuranceName: string;
    onUpdate: (g: Omit<TierInsuranceGift, "insurance">) => void;
    onRemove: () => void;
}) {
    return (
        <div className="border rounded-2xl p-4 space-y-4 bg-white dark:bg-slate-900 relative group">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                        <ShieldCheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="font-semibold text-sm">{insuranceName}</span>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600"
                    onClick={onRemove}
                >
                    <TrashIcon className="w-4 h-4" />
                </Button>
            </div>

            {/* Conditions */}
            <div className="space-y-3">
                {/* Min Order Amount */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`ins-min-order-${gift.insurance_id}`}
                            checked={gift.require_min_order_amount}
                            onCheckedChange={(checked) =>
                                onUpdate({
                                    ...gift,
                                    require_min_order_amount: !!checked,
                                    min_order_amount: checked ? gift.min_order_amount : null,
                                })
                            }
                        />
                        <Label htmlFor={`ins-min-order-${gift.insurance_id}`} className="text-sm cursor-pointer">
                            Yêu cầu giá trị đơn hàng tối thiểu
                        </Label>
                    </div>
                    {gift.require_min_order_amount && (
                        <div className="ml-6">
                            <div className="relative max-w-xs">
                                <Input
                                    type="text"
                                    value={gift.min_order_amount ? new Intl.NumberFormat("vi-VN").format(Number(gift.min_order_amount)) : ""}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value.replace(/\./g, "").replace(/\D/g, "")) || 0;
                                        onUpdate({ ...gift, min_order_amount: val });
                                    }}
                                    placeholder="0"
                                    style={{ borderRadius: "10px" }}
                                    className="bg-muted/30 pr-10"
                                />
                                <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-muted-foreground">₫</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Min Warehouses */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`ins-min-wh-${gift.insurance_id}`}
                            checked={gift.require_min_warehouses}
                            onCheckedChange={(checked) =>
                                onUpdate({
                                    ...gift,
                                    require_min_warehouses: !!checked,
                                    min_warehouses: checked ? gift.min_warehouses : null,
                                })
                            }
                        />
                        <Label htmlFor={`ins-min-wh-${gift.insurance_id}`} className="text-sm cursor-pointer">
                            Yêu cầu số lượng kho tối thiểu
                        </Label>
                    </div>
                    {gift.require_min_warehouses && (
                        <div className="ml-6 max-w-[160px]">
                            <Input
                                type="number"
                                min={1}
                                value={gift.min_warehouses || ""}
                                onChange={(e) => onUpdate({ ...gift, min_warehouses: parseInt(e.target.value) || null })}
                                placeholder="1"
                                style={{ borderRadius: "10px" }}
                                className="bg-muted/30"
                            />
                        </div>
                    )}
                </div>

                {/* Min Rows */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`ins-min-rows-${gift.insurance_id}`}
                            checked={gift.require_min_rows}
                            onCheckedChange={(checked) =>
                                onUpdate({
                                    ...gift,
                                    require_min_rows: !!checked,
                                    min_rows: checked ? gift.min_rows : null,
                                })
                            }
                        />
                        <Label htmlFor={`ins-min-rows-${gift.insurance_id}`} className="text-sm cursor-pointer">
                            Yêu cầu số dãy kho tối thiểu
                        </Label>
                    </div>
                    {gift.require_min_rows && (
                        <div className="ml-6 max-w-[160px]">
                            <Input
                                type="number"
                                min={1}
                                value={gift.min_rows || ""}
                                onChange={(e) => onUpdate({ ...gift, min_rows: parseInt(e.target.value) || null })}
                                placeholder="1"
                                style={{ borderRadius: "10px" }}
                                className="bg-muted/30"
                            />
                        </div>
                    )}
                </div>

                {/* Duration */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Thời hạn tặng kèm</Label>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={gift.is_until_service_end}
                                onCheckedChange={(checked) =>
                                    onUpdate({
                                        ...gift,
                                        is_until_service_end: checked,
                                        gift_duration_value: checked ? null : gift.gift_duration_value,
                                        gift_duration_unit: checked ? null : gift.gift_duration_unit,
                                    })
                                }
                            />
                            <span className="text-sm">{gift.is_until_service_end ? "Suốt thời gian thuê" : "Tùy chỉnh"}</span>
                        </div>
                    </div>
                    {!gift.is_until_service_end && (
                        <div className="flex items-center gap-2 max-w-xs">
                            <Input
                                type="number"
                                min={1}
                                value={gift.gift_duration_value || ""}
                                onChange={(e) => onUpdate({ ...gift, gift_duration_value: parseInt(e.target.value) || null })}
                                placeholder="1"
                                style={{ borderRadius: "10px 0 0 10px" }}
                                className="bg-muted/30 w-20"
                            />
                            <Select
                                value={gift.gift_duration_unit || "MONTH"}
                                onValueChange={(val) => onUpdate({ ...gift, gift_duration_unit: val as DurationUnit })}
                            >
                                <SelectTrigger style={{ borderRadius: "0 10px 10px 0" }} className="w-28 -ml-[1px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MONTH">Tháng</SelectItem>
                                    <SelectItem value="YEAR">Năm</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FORM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function TierForm({ initialData, onSubmit, onCancel, isEdit = false, loading = false }: TierFormProps) {
    // ─── Form state ──────────────────────────────────────────────────────────────
    const [name, setName] = useState(initialData?.name || "");
    const [durationValue, setDurationValue] = useState<number>(initialData?.duration_value || 1);
    const [durationUnit, setDurationUnit] = useState<DurationUnit>(initialData?.duration_unit || "MONTH");
    const [description, setDescription] = useState(initialData?.description || "");
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

    // ─── Gift states ────────────────────────────────────────────────────────────
    const [addonGifts, setAddonGifts] = useState<Omit<TierAddonGift, "addon">[]>(() =>
        (initialData?.tier_addon_gifts || []).map((g) => ({
            id: g.id,
            addon_id: g.addon_id,
            require_min_order_amount: g.require_min_order_amount,
            min_order_amount: g.min_order_amount,
            require_min_warehouses: g.require_min_warehouses,
            min_warehouses: g.min_warehouses,
            require_min_rows: g.require_min_rows,
            min_rows: g.min_rows,
            is_until_service_end: g.is_until_service_end,
            gift_duration_value: g.gift_duration_value,
            gift_duration_unit: g.gift_duration_unit,
            is_active: g.is_active,
        }))
    );
    const [insuranceGifts, setInsuranceGifts] = useState<Omit<TierInsuranceGift, "insurance">[]>(() =>
        (initialData?.tier_insurance_gifts || []).map((g) => ({
            id: g.id,
            insurance_id: g.insurance_id,
            require_min_order_amount: g.require_min_order_amount,
            min_order_amount: g.min_order_amount,
            require_min_warehouses: g.require_min_warehouses,
            min_warehouses: g.min_warehouses,
            require_min_rows: g.require_min_rows,
            min_rows: g.min_rows,
            is_until_service_end: g.is_until_service_end,
            gift_duration_value: g.gift_duration_value,
            gift_duration_unit: g.gift_duration_unit,
            is_active: g.is_active,
        }))
    );

    // ─── Picker dialogs ─────────────────────────────────────────────────────────
    const [showAddonPicker, setShowAddonPicker] = useState(false);
    const [showInsurancePicker, setShowInsurancePicker] = useState(false);

    // ─── Available addons/insurances ────────────────────────────────────────────
    const [availableAddons, setAvailableAddons] = useState<AddonResponse[]>([]);
    const [availableInsurances, setAvailableInsurances] = useState<Insurance[]>([]);
    const [addonMap, setAddonMap] = useState<Record<string, string>>({});
    const [insuranceMap, setInsuranceMap] = useState<Record<string, string>>({});

    // ─── Active tab ──────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState("general");

    // ─── Load available addons and insurances ────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;

            try {
                const [addonsData, insurancesData] = await Promise.all([
                    addonsService.getAllAddons(token, { limit: 500, is_active: true }),
                    insuranceService.getAllInsurance(token, { limit: 500, is_active: true }),
                ]);

                let addonsList: AddonResponse[] = [];
                if (addonsData?.items) addonsList = addonsData.items;
                else if (addonsData?.data?.items) addonsList = addonsData.data.items;
                else if (Array.isArray(addonsData?.data)) addonsList = addonsData.data;
                else if (Array.isArray(addonsData)) addonsList = addonsData;

                let insurancesList: Insurance[] = [];
                if (insurancesData?.items) insurancesList = insurancesData.items;
                else if (insurancesData?.data?.items) insurancesList = insurancesData.data.items;
                else if (Array.isArray(insurancesData?.data)) insurancesList = insurancesData.data;
                else if (Array.isArray(insurancesData)) insurancesList = insurancesData;

                setAvailableAddons(addonsList);
                setAvailableInsurances(insurancesList);

                const aMap: Record<string, string> = {};
                addonsList.forEach((a) => (aMap[a.id] = a.name));
                setAddonMap(aMap);

                const iMap: Record<string, string> = {};
                insurancesList.forEach((i) => (iMap[i.id] = i.name));
                setInsuranceMap(iMap);
            } catch (e) {
                console.error("Failed to load addons/insurances", e);
            }
        };
        loadData();
    }, []);



    // ─── Gift management ─────────────────────────────────────────────────────────
    const addAddonGift = (addonId: string) => {
        if (addonGifts.find((g) => g.addon_id === addonId)) return;
        setAddonGifts([...addonGifts, defaultAddonGift(addonId)]);
        setShowAddonPicker(false);
    };

    const updateAddonGift = (index: number, gift: Omit<TierAddonGift, "addon">) => {
        const updated = [...addonGifts];
        updated[index] = gift;
        setAddonGifts(updated);
    };

    const removeAddonGift = (index: number) => {
        setAddonGifts(addonGifts.filter((_, i) => i !== index));
    };

    const addInsuranceGift = (insuranceId: string) => {
        if (insuranceGifts.find((g) => g.insurance_id === insuranceId)) return;
        setInsuranceGifts([...insuranceGifts, defaultInsuranceGift(insuranceId)]);
        setShowInsurancePicker(false);
    };

    const updateInsuranceGift = (index: number, gift: Omit<TierInsuranceGift, "insurance">) => {
        const updated = [...insuranceGifts];
        updated[index] = gift;
        setInsuranceGifts(updated);
    };

    const removeInsuranceGift = (index: number) => {
        setInsuranceGifts(insuranceGifts.filter((_, i) => i !== index));
    };

    // ─── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const payload: RentalDurationTierRequest = {
            name,
            duration_value: durationValue,
            duration_unit: durationUnit,
            description: description || undefined,
            is_active: isActive,
            addon_gifts: addonGifts.length > 0 ? addonGifts : undefined,
            insurance_gifts: insuranceGifts.length > 0 ? insuranceGifts : undefined,
        };
        await onSubmit(payload);
    };

    // ─── Filtered picker lists (exclude already-added) ──────────────────────────
    const pickableAddons = availableAddons.filter(
        (a) => !addonGifts.find((g) => g.addon_id === a.id)
    );
    const pickableInsurances = availableInsurances.filter(
        (i) => !insuranceGifts.find((g) => g.insurance_id === i.id)
    );

    const totalGifts = addonGifts.length + insuranceGifts.length;

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-6" style={{ borderRadius: "12px" }}>
                    <TabsTrigger value="general" className="gap-2" style={{ borderRadius: "10px" }}>
                        <InformationCircleIcon className="w-4 h-4" />
                        Thông tin chung
                    </TabsTrigger>
                    <TabsTrigger value="incentives" className="gap-2 relative" style={{ borderRadius: "10px" }}>
                        <GiftIcon className="w-4 h-4" />
                        Quà tặng kèm
                        {totalGifts > 0 && (
                            <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] bg-blue-600 hover:bg-blue-600 text-white rounded-full">
                                {totalGifts}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ═══ Tab 1: General Info ═══ */}
                <TabsContent value="general" className="flex-1 space-y-6 mt-0">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                            1. Định danh gói thuê
                        </h3>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="tier-name">
                                Tên gói <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="tier-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="VD: Gói Doanh Nghiệp - 1 Năm"
                                style={{ borderRadius: "12px" }}
                                className="bg-muted/30"
                            />
                        </div>

                        {/* Composite Duration Input */}
                        <div className="space-y-2">
                            <Label>
                                Thời hạn thuê <span className="text-red-500">*</span>
                            </Label>
                            <div className="flex items-center max-w-xs">
                                <Input
                                    type="number"
                                    min={1}
                                    value={durationValue}
                                    onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)}
                                    style={{ borderRadius: "12px 0 0 12px" }}
                                    className="bg-muted/30 w-24 font-semibold text-center"
                                />
                                <Select value={durationUnit} onValueChange={(val) => setDurationUnit(val as DurationUnit)}>
                                    <SelectTrigger
                                        style={{ borderRadius: "0 12px 12px 0" }}
                                        className="w-32 -ml-[1px] bg-muted/50 font-medium"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MONTH">Tháng</SelectItem>
                                        <SelectItem value="YEAR">Năm</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                            2. Mô tả & Trạng thái
                        </h3>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="tier-desc">Mô tả</Label>
                            <Textarea
                                id="tier-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Mô tả ngắn gọn về gói thuê này..."
                                rows={3}
                                style={{ borderRadius: "12px" }}
                                className="bg-muted/30 resize-none"
                            />
                        </div>

                        {/* Is Active */}
                        <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                            <div>
                                <p className="font-medium text-sm">Trạng thái hoạt động</p>
                                <p className="text-xs text-muted-foreground">
                                    {isActive ? "Gói đang hiển thị cho khách hàng" : "Gói đang ẩn"}
                                </p>
                            </div>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                    </div>
                </TabsContent>

                {/* ═══ Tab 2: Incentives & Gifts ═══ */}
                <TabsContent value="incentives" className="flex-1 space-y-6 mt-0 overflow-y-auto">
                    {/* Section: Addon Gifts */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <WrenchScrewdriverIcon className="w-4 h-4" />
                                Tặng kèm Dịch vụ (Addons)
                            </h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                style={{ borderRadius: "10px" }}
                                onClick={() => setShowAddonPicker(true)}
                                disabled={pickableAddons.length === 0}
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Thêm Dịch vụ
                            </Button>
                        </div>

                        {addonGifts.length === 0 ? (
                            <div className="border-2 border-dashed rounded-2xl p-8 text-center text-muted-foreground">
                                <WrenchScrewdriverIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">Chưa có dịch vụ tặng kèm</p>
                                <p className="text-xs mt-1">Nhấn &quot;Thêm Dịch vụ&quot; để thêm ưu đãi cho gói này</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {addonGifts.map((gift, index) => (
                                    <AddonGiftCard
                                        key={gift.addon_id}
                                        gift={gift}
                                        addonName={addonMap[gift.addon_id] || "Addon"}
                                        onUpdate={(g) => updateAddonGift(index, g)}
                                        onRemove={() => removeAddonGift(index)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t" />

                    {/* Section: Insurance Gifts */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheckIcon className="w-4 h-4" />
                                Tặng kèm Bảo hiểm (Insurance)
                            </h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                style={{ borderRadius: "10px" }}
                                onClick={() => setShowInsurancePicker(true)}
                                disabled={pickableInsurances.length === 0}
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Thêm Bảo hiểm
                            </Button>
                        </div>

                        {insuranceGifts.length === 0 ? (
                            <div className="border-2 border-dashed rounded-2xl p-8 text-center text-muted-foreground">
                                <ShieldCheckIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">Chưa có bảo hiểm tặng kèm</p>
                                <p className="text-xs mt-1">Nhấn &quot;Thêm Bảo hiểm&quot; để thêm ưu đãi cho gói này</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {insuranceGifts.map((gift, index) => (
                                    <InsuranceGiftCard
                                        key={gift.insurance_id}
                                        gift={gift}
                                        insuranceName={insuranceMap[gift.insurance_id] || "Insurance"}
                                        onUpdate={(g) => updateInsuranceGift(index, g)}
                                        onRemove={() => removeInsuranceGift(index)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                    style={{ borderRadius: "12px" }}
                >
                    Hủy
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !name.trim() || durationValue < 1}
                    className="gap-2 bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]"
                    style={{ borderRadius: "12px" }}
                >
                    {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo gói"}
                </Button>
            </div>

            {/* ═══ Addon Picker Dialog ═══ */}
            <Dialog open={showAddonPicker} onOpenChange={setShowAddonPicker}>
                <DialogContent style={{ borderRadius: "16px" }} className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <WrenchScrewdriverIcon className="w-5 h-5" />
                            Chọn Dịch vụ tặng kèm
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {pickableAddons.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Tất cả dịch vụ đã được thêm
                            </p>
                        ) : (
                            pickableAddons.map((addon) => (
                                <button
                                    key={addon.id}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors text-left"
                                    onClick={() => addAddonGift(addon.id)}
                                >
                                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                        <WrenchScrewdriverIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{addon.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Intl.NumberFormat("vi-VN").format(addon.price)}₫
                                            {addon.is_monthly_payment ? "/tháng" : ""}
                                            {addon.unit ? ` / ${addon.unit}` : ""}
                                        </p>
                                    </div>
                                    <PlusIcon className="w-4 h-4 text-muted-foreground" />
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══ Insurance Picker Dialog ═══ */}
            <Dialog open={showInsurancePicker} onOpenChange={setShowInsurancePicker}>
                <DialogContent style={{ borderRadius: "16px" }} className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheckIcon className="w-5 h-5" />
                            Chọn Bảo hiểm tặng kèm
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {pickableInsurances.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Tất cả bảo hiểm đã được thêm
                            </p>
                        ) : (
                            pickableInsurances.map((ins) => (
                                <button
                                    key={ins.id}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors text-left"
                                    onClick={() => addInsuranceGift(ins.id)}
                                >
                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                        <ShieldCheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{ins.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Intl.NumberFormat("vi-VN").format(Number(ins.price))}₫
                                        </p>
                                    </div>
                                    <PlusIcon className="w-4 h-4 text-muted-foreground" />
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
