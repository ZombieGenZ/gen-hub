"use client";

import React from "react";
import type { Product } from "@/services/product/product.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Weight,
    Ruler,
    Box,
    ArrowUpDown,
    DollarSign,
    Maximize2,
} from "lucide-react";

// ────────────────────────────────────────────────
// 2D Box Visualization — Sơ đồ 2D kích thước sản phẩm
// ────────────────────────────────────────────────
function ProductDimensionViz({
    length,
    width,
    height,
}: {
    length: number | null;
    width: number | null;
    height: number | null;
}) {
    const l = length || 0;
    const w = width || 0;
    const h = height || 0;

    if (!l && !w && !h) {
        return (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                Chưa có thông số kích thước
            </div>
        );
    }

    // Normalize for visualization (max 180px)
    const maxDim = Math.max(l, w, h, 1);
    const scale = 140 / maxDim;

    const vL = Math.max(l * scale, 20);
    const vW = Math.max(w * scale, 20);
    const vH = Math.max(h * scale, 20);

    // Isometric projection offsets
    const isoAngle = 30;
    const cos30 = Math.cos((isoAngle * Math.PI) / 180);
    const sin30 = Math.sin((isoAngle * Math.PI) / 180);

    // Calculate SVG viewBox size
    const svgW = vL * cos30 + vW * cos30 + 80;
    const svgH = vH + vL * sin30 + vW * sin30 + 60;

    // Origin point (bottom-center of front face)
    const ox = vW * cos30 + 30;
    const oy = svgH - 30;

    // Front face (bottom-left)
    const frontFace = [
        [ox, oy],
        [ox + vL * cos30, oy - vL * sin30],
        [ox + vL * cos30, oy - vL * sin30 - vH],
        [ox, oy - vH],
    ];

    // Right face (bottom-right)
    const rightFace = [
        [ox + vL * cos30, oy - vL * sin30],
        [ox + vL * cos30 + vW * cos30, oy - vL * sin30 + vW * sin30 - vW],
        [ox + vL * cos30 + vW * cos30, oy - vL * sin30 + vW * sin30 - vW - vH],
        [ox + vL * cos30, oy - vL * sin30 - vH],
    ];

    // Top face
    const topFace = [
        [ox, oy - vH],
        [ox + vL * cos30, oy - vL * sin30 - vH],
        [ox + vL * cos30 + vW * cos30, oy - vL * sin30 + vW * sin30 - vW - vH],
        [ox + vW * cos30, oy + vW * sin30 - vW - vH],
    ];

    const toPoints = (points: number[][]) =>
        points.map((p) => p.join(",")).join(" ");

    return (
        <div className="flex flex-col items-center">
            <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full max-w-70 h-auto"
            >
                {/* Front face */}
                <polygon
                    points={toPoints(frontFace)}
                    fill="#0F766E"
                    fillOpacity="0.15"
                    stroke="#0F766E"
                    strokeWidth="1.5"
                />
                {/* Right face */}
                <polygon
                    points={toPoints(rightFace)}
                    fill="#0F766E"
                    fillOpacity="0.08"
                    stroke="#0F766E"
                    strokeWidth="1.5"
                />
                {/* Top face */}
                <polygon
                    points={toPoints(topFace)}
                    fill="#0F766E"
                    fillOpacity="0.22"
                    stroke="#0F766E"
                    strokeWidth="1.5"
                />

                {/* Dimension labels */}
                {/* Length (front bottom edge) */}
                <text
                    x={(frontFace[0][0] + frontFace[1][0]) / 2}
                    y={(frontFace[0][1] + frontFace[1][1]) / 2 + 16}
                    textAnchor="middle"
                    className="fill-slate-600 text-[11px] font-medium"
                >
                    {l} cm
                </text>

                {/* Height (front left edge) */}
                <text
                    x={frontFace[0][0] - 14}
                    y={(frontFace[0][1] + frontFace[3][1]) / 2}
                    textAnchor="middle"
                    className="fill-slate-600 text-[11px] font-medium"
                    transform={`rotate(-90, ${frontFace[0][0] - 14}, ${(frontFace[0][1] + frontFace[3][1]) / 2})`}
                >
                    {h} cm
                </text>

                {/* Width (right bottom edge) */}
                <text
                    x={(rightFace[0][0] + rightFace[1][0]) / 2 + 14}
                    y={(rightFace[0][1] + rightFace[1][1]) / 2 + 4}
                    textAnchor="middle"
                    className="fill-slate-600 text-[11px] font-medium"
                >
                    {w} cm
                </text>
            </svg>
        </div>
    );
}

// ────────────────────────────────────────────────
// Stat item
// ────────────────────────────────────────────────
function StatItem({
    icon: Icon,
    label,
    value,
    unit,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number | null;
    unit?: string;
}) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-9 h-9 rounded-lg bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#0F766E]" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {value != null ? (
                        <>
                            {typeof value === "number"
                                ? new Intl.NumberFormat("vi-VN").format(value)
                                : value}
                            {unit && (
                                <span className="text-xs text-slate-500 font-normal ml-1">
                                    {unit}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-slate-400">—</span>
                    )}
                </p>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════
// Tab 1: General Info
// ════════════════════════════════════════════════
interface GeneralInfoTabProps {
    product: Product;
}

export function GeneralInfoTab({ product }: GeneralInfoTabProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Physical dimensions + 3D viz */}
            <Card className="shadow-premium rounded-3xl border-0">
                <CardContent className="p-6">
                    <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Box className="w-4.5 h-4.5 text-[#0F766E]" />
                        Kích thước & Trọng lượng
                    </h3>

                    {/* 2D Box visualization */}
                    <div className="mb-6 p-4 bg-linear-to-br from-slate-50 to-white rounded-2xl border border-slate-100">
                        <ProductDimensionViz
                            length={product.length}
                            width={product.width}
                            height={product.height}
                        />
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatItem
                            icon={Ruler}
                            label="Chiều dài"
                            value={product.length}
                            unit="cm"
                        />
                        <StatItem
                            icon={Ruler}
                            label="Chiều rộng"
                            value={product.width}
                            unit="cm"
                        />
                        <StatItem
                            icon={ArrowUpDown}
                            label="Chiều cao"
                            value={product.height}
                            unit="cm"
                        />
                        <StatItem
                            icon={Weight}
                            label="Trọng lượng"
                            value={product.weight}
                            unit="kg"
                        />
                        <div className="col-span-2">
                            <StatItem
                                icon={Maximize2}
                                label="Tải trọng tối đa"
                                value={product.max_weight_capacity}
                                unit="kg"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Right: General info */}
            <Card className="shadow-premium rounded-3xl border-0">
                <CardContent className="p-6">
                    <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <DollarSign className="w-4.5 h-4.5 text-[#0F766E]" />
                        Thông tin chung
                    </h3>

                    <div className="space-y-4">
                        {/* Cost price */}
                        <div className="p-4 rounded-2xl bg-linear-to-r from-[#0F766E]/5 to-[#0F766E]/10 border border-[#0F766E]/10">
                            <p className="text-xs text-[#0F766E]/70 mb-1">
                                Giá vốn tiêu chuẩn
                            </p>
                            <p className="text-2xl font-bold text-[#0F766E]">
                                {product.cost_price != null
                                    ? new Intl.NumberFormat("vi-VN").format(
                                        product.cost_price
                                    ) + " ₫"
                                    : "Chưa thiết lập"}
                            </p>
                        </div>

                        {/* Base unit */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-sm text-slate-500">
                                Đơn vị cơ bản
                            </span>
                            <Badge
                                variant="outline"
                                className="rounded-md font-medium bg-white"
                            >
                                {product.base_unit?.name || "—"}
                            </Badge>
                        </div>

                        {/* Barcode */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-sm text-slate-500">Mã vạch</span>
                            <span className="text-sm font-mono text-slate-700">
                                {product.barcode || "—"}
                            </span>
                        </div>

                        {/* SKU */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-sm text-slate-500">SKU</span>
                            <span className="text-sm font-mono text-slate-700">
                                {product.sku}
                            </span>
                        </div>

                        {/* Unit conversions count */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-sm text-slate-500">
                                Số đơn vị quy đổi
                            </span>
                            <span className="text-sm font-semibold text-slate-700">
                                {product.units?.length || 0}
                            </span>
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-xs text-slate-500 mb-1">Mô tả</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                    {product.description}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
