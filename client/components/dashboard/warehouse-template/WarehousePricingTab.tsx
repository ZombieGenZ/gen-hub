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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";

interface WarehousePricingTabProps {
    data: Record<string, any>;
    onChange: (updates: Record<string, any>) => void;
}

function formatVND(value: string | number): string {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "—";
    return num.toLocaleString("vi-VN") + " ₫";
}

export function WarehousePricingTab({ data, onChange }: WarehousePricingTabProps) {
    const pricePerMonth = parseFloat(data.price_per_month) || 0;
    const discountConfigs = data.discount_configs || [];

    const addDiscount = () => {
        onChange({
            discount_configs: [
                ...discountConfigs,
                { duration_tier_id: "", discount_percent: 0 },
            ],
        });
    };

    const updateDiscount = (idx: number, field: string, value: any) => {
        const updated = discountConfigs.map((d: any, i: number) =>
            i === idx ? { ...d, [field]: value } : d
        );
        onChange({ discount_configs: updated });
    };

    const removeDiscount = (idx: number) => {
        onChange({ discount_configs: discountConfigs.filter((_: any, i: number) => i !== idx) });
    };

    return (
        <div className="space-y-6">
            {/* ── Base Price ── */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardHeader>
                    <CardTitle className="text-lg">Giá cơ bản</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 max-w-sm">
                        <Label>Giá mỗi tháng (₫)</Label>
                        <FormattedNumberInput
                            value={data.price_per_month}
                            onChange={(v) => onChange({ price_per_month: v })}
                            suffix="đ"
                        />
                        {pricePerMonth > 0 && (
                            <p className="text-sm text-muted-foreground">
                                = <span className="font-semibold text-[#0F766E]">{formatVND(pricePerMonth)}</span>/tháng
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Discount Matrix ── */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Chiết khấu theo thời gian ({discountConfigs.length})</CardTitle>
                    <Button
                        onClick={addDiscount}
                        size="sm"
                        className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1"
                        style={{ borderRadius: "12px" }}
                    >
                        <PlusIcon className="w-4 h-4" />
                        Thêm mốc
                    </Button>
                </CardHeader>
                <CardContent>
                    {discountConfigs.length === 0 ? (
                        <div className="flex items-center justify-center h-[120px] rounded-2xl bg-muted/30 border border-dashed border-muted-foreground/30">
                            <p className="text-muted-foreground text-sm">Chưa có cấu hình chiết khấu nào.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Duration Tier ID</TableHead>
                                    <TableHead>Chiết khấu (%)</TableHead>
                                    <TableHead>Giá sau CK</TableHead>
                                    <TableHead className="w-12" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {discountConfigs.map((dc: any, idx: number) => {
                                    const discountPct = parseFloat(dc.discount_percent) || 0;
                                    const discountedPrice = pricePerMonth * (1 - discountPct / 100);
                                    const tierName = dc.duration_tier?.name || dc.duration_tier_id || "";

                                    return (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{idx + 1}</TableCell>
                                            <TableCell>
                                                <Input
                                                    value={tierName}
                                                    onChange={(e) => updateDiscount(idx, "duration_tier_id", e.target.value)}
                                                    placeholder="UUID tier..."
                                                    className="max-w-[200px]"
                                                    style={{ borderRadius: "12px" }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <FormattedNumberInput
                                                    value={dc.discount_percent}
                                                    onChange={(v) => updateDiscount(idx, "discount_percent", v)}
                                                    suffix="%"
                                                    className="max-w-[100px]"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="rounded-md font-normal bg-green-50 text-green-700 border-green-200">
                                                    {formatVND(discountedPrice)}/tháng
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-full"
                                                    onClick={() => removeDiscount(idx)}
                                                >
                                                    <TrashIcon className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
