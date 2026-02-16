"use client";

import React from "react";
import {
    PlusIcon,
    TrashIcon,
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

interface WarehouseGiftsTabProps {
    data: Record<string, any>;
    onChange: (updates: Record<string, any>) => void;
}

export function WarehouseGiftsTab({ data, onChange }: WarehouseGiftsTabProps) {
    const addonGifts = data.addon_gifts || [];
    const insuranceGifts = data.insurance_gifts || [];

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
