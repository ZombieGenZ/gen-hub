"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { authStorage } from "@/services/auth/auth-storage.service";
import { BinPackingService } from "@/services/bin-packing/bin-packing.service";
import { FleetService } from "@/services/fleet/fleet.service";
import type { BinPackingResult, LayoutJson } from "@/services/bin-packing/bin-packing.types";
import type { FleetVehicle } from "@/services/fleet/fleet.types";
import { FLEET_VEHICLE_TYPE_LABELS } from "@/services/fleet/fleet.types";

// Dynamic import to avoid SSR issues with Three.js
const BinPackingViewer = dynamic(
    () => import("./BinPackingViewer").then((m) => m.BinPackingViewer),
    { ssr: false, loading: () => <div className="h-80 flex items-center justify-center text-muted-foreground text-sm">Đang tải trình xem 3D...</div> }
);

const binPackingService = new BinPackingService();
const fleetService = new FleetService();

interface BinPackingPanelProps {
    exportId: string;
    warehouseId: string;
    productNames?: Record<string, string>; // product_id -> name
    onApplied?: () => void;
}

export function BinPackingPanel({ exportId, warehouseId, productNames = {}, onApplied }: BinPackingPanelProps) {
    const [result, setResult] = useState<BinPackingResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [computing, setComputing] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState("");

    // Load existing result and fleet vehicles
    const loadData = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        // warehouseId is required to fetch fleet vehicles
        if (!warehouseId) return;

        setLoading(true);
        try {
            const [existingResult, vehicles] = await Promise.allSettled([
                binPackingService.getByExportId(token, exportId),
                fleetService.listAvailable(token, warehouseId),
            ]);

            if (existingResult.status === "fulfilled") {
                setResult(existingResult.value);
            }
            if (vehicles.status === "fulfilled") {
                setFleetVehicles(vehicles.value);
            } else {
                console.warn("[BinPackingPanel] Fleet vehicles fetch failed:", vehicles.reason);
            }
        } catch {
            // non-critical on first load
        } finally {
            setLoading(false);
        }
    }, [exportId, warehouseId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleCompute = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        setComputing(true);
        setError(null);
        try {
            const res = await binPackingService.compute(token, {
                export_id: exportId,
                fleet_vehicle_id: selectedVehicleId || undefined,
            });
            setResult(res);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Không thể tính toán";
            try {
                const parsed = JSON.parse(msg) as { message?: string };
                setError(parsed.message ?? msg);
            } catch {
                setError(msg);
            }
        } finally {
            setComputing(false);
        }
    };

    const handleApply = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        setApplying(true);
        try {
            const res = await binPackingService.apply(token, exportId);
            setResult(res);
            onApplied?.();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Không thể áp dụng";
            setError(msg);
        } finally {
            setApplying(false);
        }
    };

    const utilization = result ? Number(result.space_utilization).toFixed(1) : null;
    const totalWeight = result ? Number(result.total_weight_kg).toFixed(1) : null;
    const layoutJson = result?.layout_json as LayoutJson | undefined;

    return (
        <div className="border rounded-2xl overflow-hidden bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Xếp hàng 3D thông minh</p>
                        <p className="text-xs text-muted-foreground">
                            {result?.algorithm_used?.includes("+ai")
                                ? "Extreme Point + AI Model (vehicle selector & packing optimizer)"
                                : "Thuật toán Extreme Point — tối ưu không gian khoang xe"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {result?.algorithm_used?.includes("+ai") && (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold bg-violet-100 text-violet-700">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Optimized
                        </span>
                    )}
                    {result && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            result.status === "APPLIED" ? "bg-green-100 text-green-700" :
                            result.status === "COMPUTED" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                        }`}>
                            {result.status === "APPLIED" ? "Đã áp dụng" :
                             result.status === "COMPUTED" ? "Đã tính" : result.status}
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-4">
                {/* Vehicle selector */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Chọn xe (để trống = tự động chọn xe phù hợp)
                        </label>
                        <select
                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                            value={selectedVehicleId}
                            onChange={(e) => setSelectedVehicleId(e.target.value)}
                        >
                                <option value="">-- Tự động chọn xe phù hợp --</option>
                            {fleetVehicles.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.name} ({v.license_plate}) — {FLEET_VEHICLE_TYPE_LABELS[v.vehicle_type]} · {Number(v.max_weight_kg)}kg
                                </option>
                            ))}
                        </select>
                        {!loading && fleetVehicles.length === 0 && warehouseId && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Kho này chưa có xe nào. Liên hệ Admin để thêm xe vào đội.
                            </p>
                        )}
                        {!warehouseId && (
                            <p className="text-xs text-red-500 mt-1">Phiếu xuất chưa gắn kho — không thể tải danh sách xe.</p>
                        )}
                    </div>
                    <button
                        onClick={handleCompute}
                        disabled={computing}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
                    >
                        {computing ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Đang tính...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Tính toán xếp hàng
                            </>
                        )}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="text-center py-8 text-muted-foreground text-sm">Đang tải...</div>
                )}

                {/* Result */}
                {result && layoutJson && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Sử dụng không gian</p>
                                <p className="text-xl font-bold text-primary mt-0.5">{utilization}%</p>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Tổng khối lượng</p>
                                <p className="text-xl font-bold mt-0.5">{totalWeight} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Đã xếp</p>
                                <p className="text-xl font-bold text-green-600 mt-0.5">
                                    {result.packed_items}<span className="text-sm font-normal text-muted-foreground">/{result.total_items}</span>
                                </p>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Không xếp được</p>
                                <p className={`text-xl font-bold mt-0.5 ${result.unpacked_items > 0 ? "text-red-500" : "text-green-600"}`}>
                                    {result.unpacked_items}
                                </p>
                            </div>
                        </div>

                        {/* AI algorithm info */}
                        {result.algorithm_used && (
                            <div className={`text-xs rounded-xl px-3 py-2 flex items-center gap-2 ${
                                result.algorithm_used.includes("+ai")
                                    ? "bg-violet-50 border border-violet-200 text-violet-700"
                                    : "bg-muted/30 text-muted-foreground"
                            }`}>
                                {result.algorithm_used.includes("+ai") ? (
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                ) : (
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                    </svg>
                                )}
                                <span className="font-mono">{result.algorithm_used}</span>
                            </div>
                        )}

                        {/* Vehicle info */}
                        {(result.vehicle || result.fleet_vehicle) && (
                            <div className="text-sm bg-blue-50 rounded-xl p-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                                </svg>
                                <span className="text-blue-700">
                                    <strong>{(result.vehicle ?? result.fleet_vehicle)?.name}</strong>
                                    {" — "}
                                    <span className="font-mono text-xs">{(result.vehicle ?? result.fleet_vehicle)?.license_plate}</span>
                                </span>
                            </div>
                        )}

                        {/* 3D Viewer */}
                        <div className="rounded-xl overflow-hidden border">
                            <BinPackingViewer
                                layoutJson={layoutJson}
                                productNames={productNames}
                                algorithmUsed={result.algorithm_used}
                                className="h-96 w-full"
                            />
                        </div>

                        {/* Unpacked items warning */}
                        {result.unpacked_items > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                                <p className="font-medium mb-1">Có {result.unpacked_items} mặt hàng không thể xếp vào xe này:</p>
                                <ul className="list-disc list-inside text-xs space-y-0.5">
                                    {layoutJson.unpacked.map((itemId) => (
                                        <li key={itemId} className="font-mono text-yellow-700">{itemId.slice(0, 8)}...</li>
                                    ))}
                                </ul>
                                <p className="text-xs mt-2 text-yellow-600">Cân nhắc chọn xe lớn hơn hoặc tách phiếu xuất.</p>
                            </div>
                        )}

                        {/* Apply button */}
                        {result.status !== "APPLIED" && (
                            <div className="flex justify-end">
                                <button
                                    onClick={handleApply}
                                    disabled={applying}
                                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                                >
                                    {applying ? "Đang áp dụng..." : "Xác nhận phương án xếp hàng"}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Empty state */}
                {!result && !loading && !error && (
                    <div className="text-center py-10 text-muted-foreground">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                            <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                            </svg>
                        </div>
                        <p className="text-sm">Chưa có kết quả xếp hàng.</p>
                        <p className="text-xs mt-1">Nhấn &quot;Tính toán xếp hàng&quot; để bắt đầu tối ưu.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
