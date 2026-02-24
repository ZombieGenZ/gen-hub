"use client";

import React from "react";
import type { Product, ProductUnit } from "@/services/product/product.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Repeat2 } from "lucide-react";

// ────────────────────────────────────────────────
// Unit Conversion Chain — Chuỗi quy đổi trực quan
// ────────────────────────────────────────────────
function ConversionChain({
    baseUnit,
    units,
}: {
    baseUnit: { id: string; name: string | null };
    units: ProductUnit[];
}) {
    if (!units || units.length === 0) {
        return (
            <div className="text-center py-12">
                <Repeat2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-medium text-slate-600">
                    Chưa có đơn vị quy đổi
                </p>
                <p className="text-sm text-slate-400 mt-1">
                    Sản phẩm chỉ sử dụng đơn vị cơ bản:{" "}
                    <span className="font-medium">{baseUnit.name}</span>
                </p>
            </div>
        );
    }

    // Sort by conversion_rate descending (largest unit first)
    const sortedUnits = [...units]
        .filter((u) => u.is_active)
        .sort((a, b) => b.conversion_rate - a.conversion_rate);

    return (
        <div className="space-y-6">
            {/* Visual chain */}
            <div className="flex flex-wrap items-center gap-2 p-4 bg-linear-to-r from-[#0F766E]/5 to-transparent rounded-2xl border border-[#0F766E]/10">
                {sortedUnits.map((unit, index) => (
                    <React.Fragment key={unit.id}>
                        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-200 shadow-sm">
                            <span className="text-lg font-bold text-[#0F766E]">1</span>
                            <span className="text-sm font-medium text-slate-700">
                                {unit.unit?.name || "—"}
                            </span>
                        </div>
                        <span className="text-slate-400 font-medium">=</span>
                        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-200 shadow-sm">
                            <span className="text-lg font-bold text-slate-900">
                                {new Intl.NumberFormat("vi-VN").format(
                                    unit.conversion_rate
                                )}
                            </span>
                            <span className="text-sm font-medium text-slate-700">
                                {baseUnit.name}
                            </span>
                        </div>
                        {index < sortedUnits.length - 1 && (
                            <div className="hidden sm:block w-px h-5 bg-slate-200 mx-1" />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Detailed table */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50/80">
                            <th className="text-left px-4 py-3 font-medium text-slate-600">
                                Đơn vị
                            </th>
                            <th className="text-right px-4 py-3 font-medium text-slate-600">
                                Tỷ lệ quy đổi
                            </th>
                            <th className="text-left px-4 py-3 font-medium text-slate-600">
                                Mã vạch
                            </th>
                            <th className="text-center px-4 py-3 font-medium text-slate-600">
                                Trạng thái
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Base unit row */}
                        <tr className="bg-[#0F766E]/5">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-900">
                                        {baseUnit.name}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 rounded bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20"
                                    >
                                        Cơ bản
                                    </Badge>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-700">
                                1
                            </td>
                            <td className="px-4 py-3 text-slate-500">—</td>
                            <td className="px-4 py-3 text-center">
                                <Badge
                                    variant="outline"
                                    className="rounded-md font-normal bg-emerald-50 text-emerald-700 border-emerald-200"
                                >
                                    Hoạt động
                                </Badge>
                            </td>
                        </tr>

                        {/* Conversion unit rows */}
                        {sortedUnits.map((unit) => (
                            <tr key={unit.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3">
                                    <span className="font-medium text-slate-900">
                                        {unit.unit?.name || "—"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span className="font-mono font-semibold text-slate-900">
                                            {new Intl.NumberFormat("vi-VN").format(
                                                unit.conversion_rate
                                            )}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {baseUnit.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {unit.barcode ? (
                                        <span className="font-mono text-xs text-slate-600">
                                            {unit.barcode}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {unit.is_active ? (
                                        <Badge
                                            variant="outline"
                                            className="rounded-md font-normal bg-emerald-50 text-emerald-700 border-emerald-200"
                                        >
                                            Hoạt động
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="rounded-md font-normal bg-gray-50 text-gray-500 border-gray-200"
                                        >
                                            Ngừng
                                        </Badge>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Conversion examples */}
            {sortedUnits.length > 0 && (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <p className="text-xs font-medium text-blue-700 mb-2">
                        Ví dụ quy đổi nhanh
                    </p>
                    <div className="space-y-1.5">
                        {sortedUnits.slice(0, 3).map((unit) => (
                            <div
                                key={unit.id}
                                className="flex items-center gap-2 text-sm text-blue-600"
                            >
                                <ArrowRight className="w-3 h-3 shrink-0" />
                                <span>
                                    1{" "}
                                    <span className="font-medium">
                                        {unit.unit?.name}
                                    </span>{" "}
                                    ={" "}
                                    <span className="font-bold">
                                        {new Intl.NumberFormat("vi-VN").format(
                                            unit.conversion_rate
                                        )}
                                    </span>{" "}
                                    <span className="font-medium">{baseUnit.name}</span>
                                </span>
                            </div>
                        ))}

                        {/* Cross-conversion if multiple units */}
                        {sortedUnits.length >= 2 && (
                            <div className="flex items-center gap-2 text-sm text-blue-600 pt-1 border-t border-blue-100 mt-2">
                                <ArrowRight className="w-3 h-3 shrink-0" />
                                <span>
                                    1{" "}
                                    <span className="font-medium">
                                        {sortedUnits[0].unit?.name}
                                    </span>{" "}
                                    ={" "}
                                    <span className="font-bold">
                                        {new Intl.NumberFormat("vi-VN", {
                                            maximumFractionDigits: 2,
                                        }).format(
                                            sortedUnits[0].conversion_rate /
                                            sortedUnits[1].conversion_rate
                                        )}
                                    </span>{" "}
                                    <span className="font-medium">
                                        {sortedUnits[1].unit?.name}
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════
// Tab 2: Unit Conversions
// ════════════════════════════════════════════════
interface UnitConversionsTabProps {
    product: Product;
}

export function UnitConversionsTab({ product }: UnitConversionsTabProps) {
    if (!product.base_unit) {
        return (
            <Card className="shadow-premium rounded-3xl border-0">
                <CardContent className="p-6 text-center py-12">
                    <p className="text-slate-500">
                        Không có thông tin đơn vị cơ bản
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-premium rounded-3xl border-0">
            <CardContent className="p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Repeat2 className="w-4.5 h-4.5 text-[#0F766E]" />
                    Quy đổi đơn vị
                </h3>

                <ConversionChain
                    baseUnit={product.base_unit as { id: string; name: string | null }}
                    units={product.units || []}
                />
            </CardContent>
        </Card>
    );
}
