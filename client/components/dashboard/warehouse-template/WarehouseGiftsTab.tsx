"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    PlusIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    CheckIcon,
    XMarkIcon,
    CubeIcon,
} from "@heroicons/react/24/outline";

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { AmenitiesService } from "@/services/amenities/amenities.service";
import { AmenityResponse } from "@/types/amenities/amenities.type";
import { authStorage } from "@/services/auth/auth-storage.service";
import { getIconComponent } from "@/components/amenities/IconPicker";

const amenitiesService = new AmenitiesService();

interface WarehouseGiftsTabProps {
    data: Record<string, any>;
    onChange: (updates: Record<string, any>) => void;
}

export function WarehouseGiftsTab({ data, onChange }: WarehouseGiftsTabProps) {
    const addonGifts = data.addon_gifts || [];
    const insuranceGifts = data.insurance_gifts || [];

    // ── Amenities state ──
    const [allAmenities, setAllAmenities] = useState<AmenityResponse[]>([]);
    const [amenitySearch, setAmenitySearch] = useState("");
    const [loadingAmenities, setLoadingAmenities] = useState(false);

    // Derive selected amenity IDs from data
    const selectedAmenityIds: string[] = (data.amenity_ids as string[]) ||
        (data.amenities || []).map((a: any) => a.amenity_id || a.id) || [];

    // ── Fetch amenities ──
    const fetchAmenities = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoadingAmenities(true);
        try {
            const res = await amenitiesService.getAllAmenities(token, { limit: 200 });
            console.log('Amenities response:', res);
            const amenitiesArray = res?.data?.items || [];
            setAllAmenities(amenitiesArray);
        } catch (err) {
            console.error('Failed to fetch amenities:', err);
        } finally {
            setLoadingAmenities(false);
        }
    }, []);

    useEffect(() => { fetchAmenities(); }, [fetchAmenities]);

    const filteredAmenities = Array.isArray(allAmenities)
        ? allAmenities.filter((a) => a.name?.toLowerCase().includes(amenitySearch.toLowerCase()))
        : [];

    const toggleAmenity = (amenityId: string) => {
        const current = [...selectedAmenityIds];
        const idx = current.indexOf(amenityId);
        if (idx >= 0) {
            current.splice(idx, 1);
        } else {
            current.push(amenityId);
        }
        onChange({ amenity_ids: current });
    };

    const removeAmenity = (amenityId: string) => {
        onChange({ amenity_ids: selectedAmenityIds.filter((id) => id !== amenityId) });
    };

    // ── Addon Gifts ──
    const addAddonGift = () => {
        onChange({
            addon_gifts: [
                ...addonGifts,
                {
                    addon_id: "",
                    is_until_service_end: false,
                    gift_duration_value: 1,
                    gift_duration_unit: "MONTH",
                    is_active: true,
                },
            ],
        });
    };

    const updateAddonGift = (idx: number, field: string, value: any) => {
        const updated = addonGifts.map((g: any, i: number) =>
            i === idx ? { ...g, [field]: value } : g
        );
        onChange({ addon_gifts: updated });
    };

    const removeAddonGift = (idx: number) => {
        onChange({ addon_gifts: addonGifts.filter((_: any, i: number) => i !== idx) });
    };

    // ── Insurance Gifts ──
    const addInsuranceGift = () => {
        onChange({
            insurance_gifts: [
                ...insuranceGifts,
                {
                    insurance_id: "",
                    is_until_service_end: false,
                    gift_duration_value: 1,
                    gift_duration_unit: "MONTH",
                    is_active: true,
                },
            ],
        });
    };

    const updateInsuranceGift = (idx: number, field: string, value: any) => {
        const updated = insuranceGifts.map((g: any, i: number) =>
            i === idx ? { ...g, [field]: value } : g
        );
        onChange({ insurance_gifts: updated });
    };

    const removeInsuranceGift = (idx: number) => {
        onChange({ insurance_gifts: insuranceGifts.filter((_: any, i: number) => i !== idx) });
    };

    // ── Render gift card ──
    const renderGiftCard = (
        gift: any,
        idx: number,
        type: "addon" | "insurance",
        updateFn: (idx: number, field: string, value: any) => void,
        removeFn: (idx: number) => void,
    ) => {
        const idField = type === "addon" ? "addon_id" : "insurance_id";
        const label = type === "addon" ? "Addon" : "Insurance";

        return (
            <div key={idx} className="p-4 rounded-xl border bg-white space-y-4">
                <div className="flex items-center justify-between">
                    <Badge variant="outline" className="rounded-md font-normal">
                        {label} #{idx + 1}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                        onClick={() => removeFn(idx)}
                        aria-label={`Xóa ${label} #${idx + 1}`}
                    >
                        <TrashIcon className="w-4 h-4 text-destructive" />
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label>{label} ID</Label>
                    <Input
                        value={gift[idField] || ""}
                        onChange={(e) => updateFn(idx, idField, e.target.value)}
                        placeholder="UUID..."
                        style={{ borderRadius: "12px" }}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Thời gian tặng</Label>
                    <div className="flex gap-2">
                        <FormattedNumberInput
                            value={gift.gift_duration_value}
                            onChange={(v) => updateFn(idx, "gift_duration_value", v)}
                            className="max-w-[80px]"
                        />
                        <Select
                            value={gift.gift_duration_unit || "MONTH"}
                            onValueChange={(v) => updateFn(idx, "gift_duration_unit", v)}
                        >
                            <SelectTrigger className="w-[120px]" style={{ borderRadius: "12px" }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DAY">Ngày</SelectItem>
                                <SelectItem value="MONTH">Tháng</SelectItem>
                                <SelectItem value="YEAR">Năm</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <Label className="font-normal">Tặng đến hết dịch vụ</Label>
                    <Switch
                        checked={!!gift.is_until_service_end}
                        onCheckedChange={(v) => updateFn(idx, "is_until_service_end", v)}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Label className="font-normal">Kích hoạt</Label>
                    <Switch
                        checked={!!gift.is_active}
                        onCheckedChange={(v) => updateFn(idx, "is_active", v)}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* ── Amenities ── */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardHeader>
                    <CardTitle className="text-lg">Tiện ích ({selectedAmenityIds.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Selected amenities */}
                    {selectedAmenityIds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selectedAmenityIds.map((id) => {
                                const amenity = allAmenities.find((a) => a.id === id);
                                return (
                                    <Badge
                                        key={id}
                                        variant="secondary"
                                        className="gap-1.5 pr-1 pl-2.5 py-1.5 rounded-full text-sm font-normal"
                                    >
                                        {(() => {
                                            const IconComp = amenity?.icon ? getIconComponent(amenity.icon) : null;
                                            return IconComp ? (
                                                <IconComp className="w-4 h-4" />
                                            ) : (
                                                <CubeIcon className="w-4 h-4" />
                                            );
                                        })()}
                                        {amenity?.name || id.slice(0, 8) + "..."}
                                        <button
                                            onClick={() => removeAmenity(id)}
                                            className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                                            title="Bỏ chọn tiện ích"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                );
                            })}
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={amenitySearch}
                            onChange={(e) => setAmenitySearch(e.target.value)}
                            placeholder="Tìm tiện ích..."
                            className="pl-9"
                            style={{ borderRadius: "12px" }}
                        />
                    </div>

                    {/* Amenity list */}
                    <div className="max-h-[240px] overflow-y-auto rounded-xl border divide-y">
                        {loadingAmenities ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Đang tải tiện ích...
                            </div>
                        ) : filteredAmenities.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                {amenitySearch ? "Không tìm thấy tiện ích" : "Chưa có tiện ích nào"}
                            </div>
                        ) : (
                            filteredAmenities.map((amenity) => {
                                const isSelected = selectedAmenityIds.includes(amenity.id);
                                return (
                                    <button
                                        key={amenity.id}
                                        type="button"
                                        onClick={() => toggleAmenity(amenity.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${isSelected ? "bg-primary/5" : ""
                                            }`}
                                    >
                                        <div className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${isSelected
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : "border-muted-foreground/30"
                                            }`}>
                                            {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
                                        </div>
                                        {(() => {
                                            const IconComp = amenity.icon ? getIconComponent(amenity.icon) : null;
                                            return IconComp ? (
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <IconComp className="w-5 h-5 text-primary" />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
                                                    <CubeIcon className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                            );
                                        })()}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{amenity.name}</p>
                                            {amenity.description && (
                                                <p className="text-xs text-muted-foreground truncate">{amenity.description}</p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Addon Gifts ── */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardHeader>
                    <CardTitle className="text-lg">Addon tặng kèm ({addonGifts.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {addonGifts.map((g: any, i: number) =>
                        renderGiftCard(g, i, "addon", updateAddonGift, removeAddonGift)
                    )}
                    <Button
                        variant="outline"
                        onClick={addAddonGift}
                        className="w-full gap-1 border-dashed"
                        style={{ borderRadius: "12px" }}
                    >
                        <PlusIcon className="w-4 h-4" />
                        Thêm Addon Gift
                    </Button>
                </CardContent>
            </Card>

            {/* ── Insurance Gifts ── */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardHeader>
                    <CardTitle className="text-lg">Bảo hiểm tặng kèm ({insuranceGifts.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {insuranceGifts.map((g: any, i: number) =>
                        renderGiftCard(g, i, "insurance", updateInsuranceGift, removeInsuranceGift)
                    )}
                    <Button
                        variant="outline"
                        onClick={addInsuranceGift}
                        className="w-full gap-1 border-dashed"
                        style={{ borderRadius: "12px" }}
                    >
                        <PlusIcon className="w-4 h-4" />
                        Thêm Insurance Gift
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
