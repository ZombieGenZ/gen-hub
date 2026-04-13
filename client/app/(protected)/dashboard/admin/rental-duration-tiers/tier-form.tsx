"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    RentalDurationTier,
    RentalDurationTierRequest,
    TierAddonGift,
    TierInsuranceGift,
    DurationUnit,
} from "@/types/rental-duration-tier/rental-duration-tier.type";
import { AddonsService } from "@/services/addons/addons.service";
import { IsuranceService } from "@/services/Insurance/Insurance.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import {
    WrenchScrewdriverIcon,
    ShieldCheckIcon,
    PlusIcon,
    TrashIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from "@heroicons/react/24/outline";

const addonsService = new AddonsService();
const insuranceService = new IsuranceService();

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(v: number | string) {
    const n = typeof v === "string" ? parseFloat(v) : v;
    return isNaN(n) ? "—" : n.toLocaleString("vi-VN") + "₫";
}

type AddonItem = { id: string; name: string; description?: string | null; price: number; is_monthly_payment: boolean; unit?: string | null };
type InsuranceItem = { id: string; name: string; description?: string | null; price: string };

// ── Gift row (addons) ─────────────────────────────────────────────────────────
function AddonGiftRow({
    gift,
    addonList,
    usedIds,
    onChange,
    onRemove,
}: {
    gift: Omit<TierAddonGift, "addon">;
    addonList: AddonItem[];
    usedIds: string[];
    onChange: (updated: Omit<TierAddonGift, "addon">) => void;
    onRemove: () => void;
}) {
    const [open, setOpen] = useState(false);
    const selected = addonList.find((a) => a.id === gift.addon_id);
    // Show current selection + items not used by other rows
    const options = addonList.filter((a) => a.id === gift.addon_id || !usedIds.includes(a.id));

    return (
        <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                    <Select value={gift.addon_id} onValueChange={(v) => onChange({ ...gift, addon_id: v })}>
                        <SelectTrigger className="h-8 text-sm rounded-lg bg-muted/30 border-0 w-full">
                            <SelectValue placeholder="Chọn dịch vụ..." />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                    <span className="font-medium">{a.name}</span>
                                    <span className="ml-2 text-muted-foreground text-xs">
                                        {fmtPrice(a.price)}{a.is_monthly_payment ? "/tháng" : ""}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selected && (
                        <p className="text-xs text-muted-foreground mt-1 ml-1">
                            {fmtPrice(selected.price)}{selected.is_monthly_payment ? "/tháng" : ""}
                            {selected.unit ? ` · ${selected.unit}` : ""}
                        </p>
                    )}
                </div>
                <Switch
                    checked={gift.is_active}
                    onCheckedChange={(v) => onChange({ ...gift, is_active: v })}
                    className="data-[state=checked]:bg-emerald-500 shrink-0"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 shrink-0"
                    onClick={onRemove}
                    type="button"
                >
                    <TrashIcon className="w-3.5 h-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted shrink-0"
                    onClick={() => setOpen((v) => !v)}
                    type="button"
                >
                    {open ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                </Button>
            </div>
            {open && (
                <div className="border-t px-4 py-3 bg-muted/10 space-y-3">
                    <GiftConditions
                        gift={gift}
                        onChange={(updated) => onChange({ ...gift, ...updated })}
                        unitLabel="dịch vụ"
                    />
                </div>
            )}
        </div>
    );
}

// ── Gift row (insurance) ──────────────────────────────────────────────────────
function InsuranceGiftRow({
    gift,
    insuranceList,
    usedIds,
    onChange,
    onRemove,
}: {
    gift: Omit<TierInsuranceGift, "insurance">;
    insuranceList: InsuranceItem[];
    usedIds: string[];
    onChange: (updated: Omit<TierInsuranceGift, "insurance">) => void;
    onRemove: () => void;
}) {
    const [open, setOpen] = useState(false);
    const selected = insuranceList.find((i) => i.id === gift.insurance_id);
    // Show current selection + items not used by other rows
    const options = insuranceList.filter((i) => i.id === gift.insurance_id || !usedIds.includes(i.id));

    return (
        <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                    <Select value={gift.insurance_id} onValueChange={(v) => onChange({ ...gift, insurance_id: v })}>
                        <SelectTrigger className="h-8 text-sm rounded-lg bg-muted/30 border-0 w-full">
                            <SelectValue placeholder="Chọn bảo hiểm..." />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((ins) => (
                                <SelectItem key={ins.id} value={ins.id}>
                                    <span className="font-medium">{ins.name}</span>
                                    <span className="ml-2 text-muted-foreground text-xs">{fmtPrice(ins.price)}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selected && (
                        <p className="text-xs text-muted-foreground mt-1 ml-1">{fmtPrice(selected.price)}</p>
                    )}
                </div>
                <Switch
                    checked={gift.is_active}
                    onCheckedChange={(v) => onChange({ ...gift, is_active: v })}
                    className="data-[state=checked]:bg-emerald-500 shrink-0"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 shrink-0"
                    onClick={onRemove}
                    type="button"
                >
                    <TrashIcon className="w-3.5 h-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted shrink-0"
                    onClick={() => setOpen((v) => !v)}
                    type="button"
                >
                    {open ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                </Button>
            </div>
            {open && (
                <div className="border-t px-4 py-3 bg-muted/10 space-y-3">
                    <GiftConditions
                        gift={gift}
                        onChange={(updated) => onChange({ ...gift, ...updated })}
                        unitLabel="bảo hiểm"
                    />
                </div>
            )}
        </div>
    );
}

// ── Shared conditions panel ───────────────────────────────────────────────────
type GiftBase = {
    require_min_order_amount: boolean;
    min_order_amount?: number | null;
    require_min_warehouses: boolean;
    min_warehouses?: number | null;
    require_min_rows: boolean;
    min_rows?: number | null;
    is_until_service_end: boolean;
    gift_duration_value?: number | null;
    gift_duration_unit?: DurationUnit | null;
};

function GiftConditions({
    gift,
    onChange,
    unitLabel,
}: {
    gift: GiftBase;
    onChange: (updated: Partial<GiftBase>) => void;
    unitLabel: string;
}) {
    return (
        <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Điều kiện nhận {unitLabel}</p>

            {/* Min order amount */}
            <div className="flex items-center gap-3">
                <Switch
                    checked={gift.require_min_order_amount}
                    onCheckedChange={(v) => onChange({ require_min_order_amount: v, min_order_amount: v ? (gift.min_order_amount ?? 0) : null })}
                    className="data-[state=checked]:bg-blue-500"
                />
                <span className="text-xs">Yêu cầu giá trị đơn tối thiểu</span>
                {gift.require_min_order_amount && (
                    <Input
                        type="number"
                        min={0}
                        value={gift.min_order_amount ?? ""}
                        onChange={(e) => onChange({ min_order_amount: parseFloat(e.target.value) || 0 })}
                        className="h-7 w-36 text-xs rounded-lg ml-auto"
                        placeholder="VNĐ"
                    />
                )}
            </div>

            {/* Min warehouses */}
            <div className="flex items-center gap-3">
                <Switch
                    checked={gift.require_min_warehouses}
                    onCheckedChange={(v) => onChange({ require_min_warehouses: v, min_warehouses: v ? (gift.min_warehouses ?? 1) : null })}
                    className="data-[state=checked]:bg-blue-500"
                />
                <span className="text-xs">Yêu cầu số kho tối thiểu</span>
                {gift.require_min_warehouses && (
                    <Input
                        type="number"
                        min={1}
                        value={gift.min_warehouses ?? ""}
                        onChange={(e) => onChange({ min_warehouses: parseInt(e.target.value) || 1 })}
                        className="h-7 w-24 text-xs rounded-lg ml-auto"
                        placeholder="Kho"
                    />
                )}
            </div>

            {/* Min rows */}
            <div className="flex items-center gap-3">
                <Switch
                    checked={gift.require_min_rows}
                    onCheckedChange={(v) => onChange({ require_min_rows: v, min_rows: v ? (gift.min_rows ?? 1) : null })}
                    className="data-[state=checked]:bg-blue-500"
                />
                <span className="text-xs">Yêu cầu số dãy tối thiểu</span>
                {gift.require_min_rows && (
                    <Input
                        type="number"
                        min={1}
                        value={gift.min_rows ?? ""}
                        onChange={(e) => onChange({ min_rows: parseInt(e.target.value) || 1 })}
                        className="h-7 w-24 text-xs rounded-lg ml-auto"
                        placeholder="Dãy"
                    />
                )}
            </div>

            <Separator />

            {/* Duration */}
            <div className="flex items-center gap-3">
                <Switch
                    checked={gift.is_until_service_end}
                    onCheckedChange={(v) => onChange({ is_until_service_end: v, gift_duration_value: v ? null : 1, gift_duration_unit: v ? null : "MONTH" })}
                    className="data-[state=checked]:bg-emerald-500"
                />
                <span className="text-xs">Hiệu lực đến hết hợp đồng</span>
            </div>
            {!gift.is_until_service_end && (
                <div className="flex items-center gap-2 ml-9">
                    <span className="text-xs text-muted-foreground">Thời hạn:</span>
                    <Input
                        type="number"
                        min={1}
                        value={gift.gift_duration_value ?? ""}
                        onChange={(e) => onChange({ gift_duration_value: parseInt(e.target.value) || 1 })}
                        className="h-7 w-16 text-xs rounded-lg"
                    />
                    <Select
                        value={gift.gift_duration_unit ?? "MONTH"}
                        onValueChange={(v) => onChange({ gift_duration_unit: v as DurationUnit })}
                    >
                        <SelectTrigger className="h-7 w-24 text-xs rounded-lg">
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
    );
}

// ── Default gift factories ─────────────────────────────────────────────────────
function newAddonGift(addonId: string): Omit<TierAddonGift, "addon"> {
    return {
        addon_id: addonId,
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

function newInsuranceGift(insuranceId: string): Omit<TierInsuranceGift, "insurance"> {
    return {
        insurance_id: insuranceId,
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

// ── Main form ─────────────────────────────────────────────────────────────────
interface TierFormProps {
    initialData?: RentalDurationTier | null;
    onSubmit: (data: RentalDurationTierRequest) => Promise<void>;
    onCancel: () => void;
    isEdit?: boolean;
    loading?: boolean;
}

export function TierForm({ initialData, onSubmit, onCancel, isEdit = false, loading = false }: TierFormProps) {
    // Basic fields
    const [name, setName] = useState(initialData?.name || "");
    const [durationValue, setDurationValue] = useState<number>(initialData?.duration_value || 1);
    const [durationUnit, setDurationUnit] = useState<DurationUnit>(initialData?.duration_unit || "MONTH");
    const [description, setDescription] = useState(initialData?.description || "");
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

    // Gift lists
    const [addonGifts, setAddonGifts] = useState<Omit<TierAddonGift, "addon">[]>(
        () => (initialData?.tier_addon_gifts ?? []).map((g) => ({
            ...(g.id ? { id: g.id } : {}),
            addon_id: g.addon_id,
            require_min_order_amount: g.require_min_order_amount,
            min_order_amount: g.min_order_amount ?? null,
            require_min_warehouses: g.require_min_warehouses,
            min_warehouses: g.min_warehouses ?? null,
            require_min_rows: g.require_min_rows,
            min_rows: g.min_rows ?? null,
            is_until_service_end: g.is_until_service_end,
            gift_duration_value: g.gift_duration_value ?? null,
            gift_duration_unit: g.gift_duration_unit ?? null,
            is_active: g.is_active,
        }))
    );
    const [insuranceGifts, setInsuranceGifts] = useState<Omit<TierInsuranceGift, "insurance">[]>(
        () => (initialData?.tier_insurance_gifts ?? []).map((g) => ({
            ...(g.id ? { id: g.id } : {}),
            insurance_id: g.insurance_id,
            require_min_order_amount: g.require_min_order_amount,
            min_order_amount: g.min_order_amount ?? null,
            require_min_warehouses: g.require_min_warehouses,
            min_warehouses: g.min_warehouses ?? null,
            require_min_rows: g.require_min_rows,
            min_rows: g.min_rows ?? null,
            is_until_service_end: g.is_until_service_end,
            gift_duration_value: g.gift_duration_value ?? null,
            gift_duration_unit: g.gift_duration_unit ?? null,
            is_active: g.is_active,
        }))
    );

    // Available options loaded from API
    const [addonList, setAddonList] = useState<AddonItem[]>([]);
    const [insuranceList, setInsuranceList] = useState<InsuranceItem[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const fetchOptions = useCallback(async () => {
        setLoadingOptions(true);
        const parseItems = (res: any): any[] => {
            if (Array.isArray(res?.data?.items)) return res.data.items;
            if (Array.isArray(res?.data)) return res.data;
            if (Array.isArray(res?.items)) return res.items;
            if (Array.isArray(res)) return res;
            return [];
        };
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const [addonsResult, insuranceResult] = await Promise.allSettled([
                addonsService.getAllAddons(token, { limit: 200, is_active: true }),
                insuranceService.getActiveInsurance(token),
            ]);

            if (addonsResult.status === "fulfilled") {
                setAddonList(parseItems(addonsResult.value));
            } else {
                console.error("Failed to load addons:", addonsResult.reason);
            }
            if (insuranceResult.status === "fulfilled") {
                setInsuranceList(parseItems(insuranceResult.value));
            } else {
                console.error("Failed to load insurances:", insuranceResult.reason);
            }
        } catch (e) {
            console.error("Failed to load addon/insurance options", e);
        } finally {
            setLoadingOptions(false);
        }
    }, []);

    useEffect(() => {
        fetchOptions();
    }, [fetchOptions]);

    // Addon gift handlers
    const addAddonGift = (id: string) => {
        setAddonGifts((prev) => [...prev, newAddonGift(id)]);
    };

    const updateAddonGift = (index: number, updated: Omit<TierAddonGift, "addon">) => {
        setAddonGifts((prev) => prev.map((g, i) => (i === index ? updated : g)));
    };

    const removeAddonGift = (index: number) => {
        setAddonGifts((prev) => prev.filter((_, i) => i !== index));
    };

    // Insurance gift handlers
    const addInsuranceGift = (id: string) => {
        setInsuranceGifts((prev) => [...prev, newInsuranceGift(id)]);
    };

    const updateInsuranceGift = (index: number, updated: Omit<TierInsuranceGift, "insurance">) => {
        setInsuranceGifts((prev) => prev.map((g, i) => (i === index ? updated : g)));
    };

    const removeInsuranceGift = (index: number) => {
        setInsuranceGifts((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        const sanitizeAddon = (g: Omit<TierAddonGift, "addon">) => ({
            ...(g.id ? { id: g.id } : {}),
            addon_id: g.addon_id,
            require_min_order_amount: g.require_min_order_amount,
            min_order_amount: g.min_order_amount ?? null,
            require_min_warehouses: g.require_min_warehouses,
            min_warehouses: g.min_warehouses ?? null,
            require_min_rows: g.require_min_rows,
            min_rows: g.min_rows ?? null,
            is_until_service_end: g.is_until_service_end,
            gift_duration_value: g.gift_duration_value ?? null,
            gift_duration_unit: g.gift_duration_unit ?? null,
            is_active: g.is_active,
        });
        const sanitizeInsurance = (g: Omit<TierInsuranceGift, "insurance">) => ({
            ...(g.id ? { id: g.id } : {}),
            insurance_id: g.insurance_id,
            require_min_order_amount: g.require_min_order_amount,
            min_order_amount: g.min_order_amount ?? null,
            require_min_warehouses: g.require_min_warehouses,
            min_warehouses: g.min_warehouses ?? null,
            require_min_rows: g.require_min_rows,
            min_rows: g.min_rows ?? null,
            is_until_service_end: g.is_until_service_end,
            gift_duration_value: g.gift_duration_value ?? null,
            gift_duration_unit: g.gift_duration_unit ?? null,
            is_active: g.is_active,
        });
        const payload: RentalDurationTierRequest = {
            name,
            duration_value: durationValue,
            duration_unit: durationUnit,
            description: description || undefined,
            is_active: isActive,
            addon_gifts: addonGifts.map(sanitizeAddon),
            insurance_gifts: insuranceGifts.map(sanitizeInsurance),
        };
        await onSubmit(payload);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-6">

                {/* ── Section 1: Định danh ─────────────────────────────────── */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        1. Định danh gói thuê
                    </h3>

                    <div className="space-y-2">
                        <Label htmlFor="tier-name">
                            Tên gói <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="tier-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="VD: Gói 6 tháng"
                            style={{ borderRadius: "12px" }}
                            className="bg-muted/30"
                        />
                    </div>

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
                                    className="w-32 -ml-px bg-muted/50 font-medium"
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

                {/* ── Section 2: Mô tả & Trạng thái ──────────────────────── */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        2. Mô tả & Trạng thái
                    </h3>

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

                {/* ── Section 3: Dịch vụ đi kèm (Addon Gifts) ────────────── */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <WrenchScrewdriverIcon className="w-4 h-4 text-blue-500" />
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                            3. Dịch vụ đi kèm
                        </h3>
                        {addonGifts.length > 0 && (
                            <Badge variant="secondary" className="rounded-full text-xs px-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {addonGifts.length}
                            </Badge>
                        )}
                    </div>

                    {loadingOptions ? (
                        <p className="text-xs text-muted-foreground italic px-1">Đang tải dịch vụ...</p>
                    ) : addonList.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-1">Chưa có dịch vụ nào. Tạo dịch vụ trước tại mục Addons.</p>
                    ) : (
                        <>
                            {addonGifts.length > 0 && (
                                <div className="space-y-2">
                                    {addonGifts.map((gift, idx) => (
                                        <AddonGiftRow
                                            key={gift.addon_id}
                                            gift={gift}
                                            addonList={addonList}
                                            usedIds={addonGifts.filter((_, i) => i !== idx).map((g) => g.addon_id)}
                                            onChange={(updated) => updateAddonGift(idx, updated)}
                                            onRemove={() => removeAddonGift(idx)}
                                        />
                                    ))}
                                </div>
                            )}
                            {addonGifts.length < addonList.length ? (
                                <div className="relative">
                                    <PlusIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500 pointer-events-none z-10" />
                                    <Select
                                        value=""
                                        onValueChange={(id) => addAddonGift(id)}
                                    >
                                        <SelectTrigger className="h-9 text-sm rounded-xl bg-muted/30 border-dashed border-blue-200 text-blue-600 w-full pl-8">
                                            <SelectValue placeholder="Chọn dịch vụ để thêm..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {addonList
                                                .filter((a) => !addonGifts.some((g) => g.addon_id === a.id))
                                                .map((a) => (
                                                    <SelectItem key={a.id} value={a.id}>
                                                        <span className="font-medium">{a.name}</span>
                                                        <span className="ml-2 text-muted-foreground text-xs">
                                                            {fmtPrice(a.price)}{a.is_monthly_payment ? "/tháng" : ""}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic px-1">Đã thêm tất cả dịch vụ hiện có.</p>
                            )}
                        </>
                    )}
                </div>

                {/* ── Section 4: Bảo hiểm đi kèm (Insurance Gifts) ────────── */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                            4. Bảo hiểm đi kèm
                        </h3>
                        {insuranceGifts.length > 0 && (
                            <Badge variant="secondary" className="rounded-full text-xs px-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                {insuranceGifts.length}
                            </Badge>
                        )}
                    </div>

                    {loadingOptions ? (
                        <p className="text-xs text-muted-foreground italic px-1">Đang tải bảo hiểm...</p>
                    ) : insuranceList.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-1">Chưa có bảo hiểm nào. Tạo bảo hiểm trước tại mục Bảo hiểm.</p>
                    ) : (
                        <>
                            {insuranceGifts.length > 0 && (
                                <div className="space-y-2">
                                    {insuranceGifts.map((gift, idx) => (
                                        <InsuranceGiftRow
                                            key={gift.insurance_id}
                                            gift={gift}
                                            insuranceList={insuranceList}
                                            usedIds={insuranceGifts.filter((_, i) => i !== idx).map((g) => g.insurance_id)}
                                            onChange={(updated) => updateInsuranceGift(idx, updated)}
                                            onRemove={() => removeInsuranceGift(idx)}
                                        />
                                    ))}
                                </div>
                            )}
                            {insuranceGifts.length < insuranceList.length ? (
                                <div className="relative">
                                    <PlusIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500 pointer-events-none z-10" />
                                    <Select
                                        value=""
                                        onValueChange={(id) => addInsuranceGift(id)}
                                    >
                                        <SelectTrigger className="h-9 text-sm rounded-xl bg-muted/30 border-dashed border-emerald-200 text-emerald-600 w-full pl-8">
                                            <SelectValue placeholder="Chọn bảo hiểm để thêm..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {insuranceList
                                                .filter((ins) => !insuranceGifts.some((g) => g.insurance_id === ins.id))
                                                .map((ins) => (
                                                    <SelectItem key={ins.id} value={ins.id}>
                                                        <span className="font-medium">{ins.name}</span>
                                                        <span className="ml-2 text-muted-foreground text-xs">{fmtPrice(ins.price)}</span>
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic px-1">Đã thêm tất cả bảo hiểm hiện có.</p>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-5 border-t">
                <div className="text-xs text-muted-foreground">
                    {addonGifts.length + insuranceGifts.length > 0 && (
                        <span>
                            {addonGifts.length > 0 && `${addonGifts.length} dịch vụ`}
                            {addonGifts.length > 0 && insuranceGifts.length > 0 && " · "}
                            {insuranceGifts.length > 0 && `${insuranceGifts.length} bảo hiểm`}
                            {" đi kèm"}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
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
                        className="gap-2 bg-slate-900 hover:bg-slate-800 text-white min-w-30"
                        style={{ borderRadius: "12px" }}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Đang lưu...
                            </>
                        ) : isEdit ? "Cập nhật" : "Tạo gói"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
