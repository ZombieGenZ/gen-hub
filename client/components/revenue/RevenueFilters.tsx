"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import { Download, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import type { RevenueFilters as RevenueFiltersType } from "@/services/revenue-analytics/revenue-analytics.types";
import type { Province } from "@/types/location/provinces.type";

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

type Preset = NonNullable<RevenueFiltersType["preset"]>;

interface WarehouseOption {
    id: string;
    name: string;
}

export interface RevenueFiltersProps {
    filters: RevenueFiltersType;
    onChange: (next: RevenueFiltersType) => void;
    onRefresh?: () => void;
    onExport?: () => void;
    provinces: Province[];
    warehouses: WarehouseOption[];
    isExporting?: boolean;
    isRefreshing?: boolean;
}

// ────────────────────────────────────────────────
// Preset configuration
// ────────────────────────────────────────────────

const PRESETS: { value: Preset; label: string }[] = [
    { value: "TODAY", label: "Hôm nay" },
    { value: "THIS_WEEK", label: "Tuần này" },
    { value: "THIS_MONTH", label: "Tháng này" },
    { value: "THIS_QUARTER", label: "Quý này" },
    { value: "CUSTOM", label: "Tùy chỉnh" },
];

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

function toDate(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    try {
        return parseISO(value);
    } catch {
        return undefined;
    }
}

function toISODate(date: Date | undefined): string | undefined {
    if (!date) return undefined;
    return format(date, "dd/MM/yyyy");
}

// ════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════

export default function RevenueFilters({
    filters,
    onChange,
    onRefresh,
    onExport,
    provinces,
    warehouses,
    isExporting = false,
    isRefreshing = false,
}: RevenueFiltersProps) {
    const activePreset = filters.preset ?? "THIS_MONTH";
    const isCustom = activePreset === "CUSTOM";

    // ── Handlers ──

    const handlePresetChange = (preset: Preset) => {
        const next: RevenueFiltersType = { ...filters, preset };
        // Clear custom dates when switching away from CUSTOM
        if (preset !== "CUSTOM") {
            delete next.from_date;
            delete next.to_date;
        }
        onChange(next);
    };

    const handleFromDateChange = (date: Date | undefined) => {
        onChange({ ...filters, from_date: toISODate(date) });
    };

    const handleToDateChange = (date: Date | undefined) => {
        onChange({ ...filters, to_date: toISODate(date) });
    };

    const handleProvinceChange = (value: string) => {
        const next = { ...filters };
        if (value === "all") {
            delete next.province_id;
        } else {
            next.province_id = value;
        }
        onChange(next);
    };

    const handleWarehouseChange = (value: string) => {
        const next = { ...filters };
        if (value === "all") {
            delete next.warehouse_template_id;
        } else {
            next.warehouse_template_id = value;
        }
        onChange(next);
    };

    // ── Render ──

    return (
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="px-6 py-5 space-y-4">
                {/* ── Title row ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Báo cáo Doanh thu & Dòng tiền
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Tổng quan tình hình doanh thu, công nợ và dòng tiền của hệ thống
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onExport}
                            loading={isExporting}
                            leftIcon={<Download className="w-4 h-4" />}
                            className="rounded-full px-4 h-9 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
                        >
                            Xuất báo cáo
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            loading={isRefreshing}
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                            className="rounded-full px-4 h-9 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
                        >
                            Tải lại
                        </Button>
                    </div>
                </div>

                {/* ── Preset row ── */}
                <div className="flex flex-wrap items-center gap-2">
                    {PRESETS.map(({ value, label }) => (
                        <Button
                            key={value}
                            variant={activePreset === value ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePresetChange(value)}
                            className={cn(
                                "rounded-full transition-all",
                                activePreset === value &&
                                "bg-[#0F766E] hover:bg-[#0F766E]/90 text-white shadow-sm"
                            )}
                        >
                            {label}
                        </Button>
                    ))}
                </div>

                {/* ── Custom dates + dropdowns row ── */}
                <div className="flex flex-wrap items-end gap-3">
                    {/* Custom date pickers (shown only when CUSTOM is active) */}
                    {isCustom && (
                        <>
                            <div className="w-[180px]">
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                    Từ ngày
                                </label>
                                <DatePicker
                                    date={toDate(filters.from_date)}
                                    onDateChange={handleFromDateChange}
                                    placeholder="Chọn ngày bắt đầu"
                                    toDate={toDate(filters.to_date)}
                                    className="h-9 rounded-xl text-sm"
                                />
                            </div>
                            <div className="w-[180px]">
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                    Đến ngày
                                </label>
                                <DatePicker
                                    date={toDate(filters.to_date)}
                                    onDateChange={handleToDateChange}
                                    placeholder="Chọn ngày kết thúc"
                                    fromDate={toDate(filters.from_date)}
                                    className="h-9 rounded-xl text-sm"
                                />
                            </div>
                        </>
                    )}

                    {/* Province dropdown */}
                    <div className="w-[200px]">
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                            Khu vực
                        </label>
                        <Select
                            value={filters.province_id ?? "all"}
                            onValueChange={handleProvinceChange}
                        >
                            <SelectTrigger className="h-9 rounded-xl text-sm">
                                <SelectValue placeholder="Tất cả khu vực" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả khu vực</SelectItem>
                                {provinces.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Warehouse dropdown */}
                    <div className="w-[220px]">
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                            Kho hàng
                        </label>
                        <Select
                            value={filters.warehouse_template_id ?? "all"}
                            onValueChange={handleWarehouseChange}
                        >
                            <SelectTrigger className="h-9 rounded-xl text-sm">
                                <SelectValue placeholder="Tất cả kho hàng" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả kho hàng</SelectItem>
                                {warehouses.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
}
