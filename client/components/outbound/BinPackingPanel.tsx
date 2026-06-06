"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { authStorage } from "@/services/auth/auth-storage.service";
import { BinPackingService } from "@/services/bin-packing/bin-packing.service";
import { FleetService } from "@/services/fleet/fleet.service";
import { RoutePlanningPanel } from "./RoutePlanningPanel";
import type {
    BinPackingResult,
    VehiclePackingResult,
    LayoutJson,
    ExportSummary,
} from "@/services/bin-packing/bin-packing.types";
import type { FleetVehicle } from "@/services/fleet/fleet.types";
import { FLEET_VEHICLE_TYPE_LABELS } from "@/services/fleet/fleet.types";

const BinPackingViewer = dynamic(
    () => import("./BinPackingViewer").then((m) => m.BinPackingViewer),
    { ssr: false, loading: () => <div className="h-80 flex items-center justify-center text-muted-foreground text-sm">Đang tải trình xem 3D...</div> }
);

const binPackingService = new BinPackingService();
const fleetService = new FleetService();

type ViewMode = "single" | "vehicle";

interface BinPackingPanelProps {
    exportId: string;
    warehouseId: string;
    productNames?: Record<string, string>;
    onApplied?: () => void;
}

export function BinPackingPanel({ exportId, warehouseId, productNames = {}, onApplied }: BinPackingPanelProps) {
    const [result, setResult] = useState<BinPackingResult | null>(null);
    const [vehicleResult, setVehicleResult] = useState<VehiclePackingResult | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("single");
    const [loading, setLoading] = useState(false);
    const [computing, setComputing] = useState(false);
    const [computingVehicle, setComputingVehicle] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    // Export IDs actually assigned to the vehicle (ground truth from fleet endpoint)
    const [vehicleAssignedExportIds, setVehicleAssignedExportIds] = useState<string[]>([]);

    const loadData = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token || !warehouseId) return;

        setLoading(true);
        try {
            const [existingResult, vehicles] = await Promise.allSettled([
                binPackingService.getByExportId(token, exportId),
                fleetService.listAvailable(token, warehouseId),
            ]);

            if (existingResult.status === "fulfilled") {
                setResult(existingResult.value);
                const vehicleId = existingResult.value.fleet_vehicle_id;
                if (vehicleId) {
                    Promise.all([
                        binPackingService.getByVehicleId(token, vehicleId).catch(() => null),
                        fleetService.getById(token, vehicleId).catch(() => null),
                    ]).then(([vr, vehicle]) => {
                        if (vr) setVehicleResult(vr);
                        if (vehicle?.exports && vehicle.exports.length > 0) {
                            setVehicleAssignedExportIds(vehicle.exports.map((e) => e.id));
                        }
                    });
                }
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

    useEffect(() => { void loadData(); }, [loadData]);

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
            const vehicleId = res.fleet_vehicle_id ?? res.vehicle?.id;
            if (vehicleId) {
                Promise.all([
                    binPackingService.getByVehicleId(token, vehicleId).catch(() => null),
                    fleetService.getById(token, vehicleId).catch(() => null),
                ]).then(([vr, vehicle]) => {
                    if (vr) setVehicleResult(vr);
                    if (vehicle?.exports && vehicle.exports.length > 0) {
                        setVehicleAssignedExportIds(vehicle.exports.map((e) => e.id));
                    }
                });
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Không thể tính toán";
            try { setError((JSON.parse(msg) as { message?: string }).message ?? msg); }
            catch { setError(msg); }
        } finally {
            setComputing(false);
        }
    };

    const handleComputeVehicle = async () => {
        const token = authStorage.getAccessToken();
        if (!token || !result) return;

        const vehicleId = result.fleet_vehicle_id ?? (result.vehicle as any)?.id;
        if (!vehicleId) {
            setError("Chưa xác định được xe. Vui lòng tính toán đơn lẻ trước.");
            return;
        }

        setComputingVehicle(true);
        setError(null);
        try {
            // Use ground-truth export list from fleet vehicle (fetched via fleet API)
            // Falls back to vehicleResult.export_ids if fleet data not yet loaded
            const assignedIds = vehicleAssignedExportIds.length > 0
                ? vehicleAssignedExportIds
                : (vehicleResult?.export_ids ?? []);
            const allExportIds = Array.from(new Set([...assignedIds, exportId]));

            const res = await binPackingService.computeVehicle(token, {
                fleet_vehicle_id: vehicleId,
                export_ids: allExportIds,
            });
            setVehicleResult(res);
            setViewMode("vehicle");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Không thể tính toán xe";
            try { setError((JSON.parse(msg) as { message?: string }).message ?? msg); }
            catch { setError(msg); }
        } finally {
            setComputingVehicle(false);
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
            setError(err instanceof Error ? err.message : "Không thể áp dụng");
        } finally {
            setApplying(false);
        }
    };

    // ── View mode & data derivation ───────────────────────────────────────────

    // Stats & info are controlled by view mode toggle
    const activeResult = viewMode === "vehicle" ? vehicleResult : result;
    const layoutJson = activeResult?.layout_json as LayoutJson | undefined;
    const utilization = activeResult ? Number(activeResult.space_utilization).toFixed(1) : null;
    const totalWeight = activeResult ? Number(activeResult.total_weight_kg).toFixed(1) : null;
    const vehicleInfo = result?.vehicle ?? result?.fleet_vehicle;
    const isAi = activeResult?.algorithm_used?.includes("+ai");
    const exportSummary: ExportSummary[] = viewMode === "vehicle"
        ? (vehicleResult?.layout_json?.export_summary ?? [])
        : [];

    // 3D viewer ALWAYS shows the vehicle layout when available + the current export is included
    // This gives full truck context: current export highlighted, others grayed
    const vehicleIncludesCurrentExport = vehicleResult?.export_ids?.includes(exportId) ?? false;
    const viewerLayoutJson: LayoutJson | undefined =
        vehicleResult && vehicleIncludesCurrentExport
            ? (vehicleResult.layout_json as LayoutJson)
            : (result?.layout_json as LayoutJson | undefined);
    const viewerCurrentExportId =
        vehicleResult && vehicleIncludesCurrentExport ? exportId : undefined;

    // Other exports on same vehicle: prefer ground-truth fleet data over stored vehicleResult
    const assignedCount = vehicleAssignedExportIds.length > 0
        ? vehicleAssignedExportIds.length
        : (vehicleResult?.export_ids.length ?? 0);
    const otherExportCount = vehicleResult && vehicleIncludesCurrentExport
        ? Math.max(0, assignedCount - 1)
        : Math.max(0, assignedCount - 1);

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
                            {isAi ? "Extreme Point + AI Model" : "Thuật toán Extreme Point"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isAi && (
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
                {/* Vehicle selector + compute */}
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
                            <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang tính...</>
                        ) : (
                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Tính toán đơn này</>
                        )}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
                )}

                {loading && <div className="text-center py-8 text-muted-foreground text-sm">Đang tải...</div>}

                {/* Result section */}
                {result && layoutJson && (
                    <>
                        {/* View mode toggle — controls stats, NOT the 3D view */}
                        <div className="flex items-center gap-2 bg-muted/30 rounded-xl p-1 w-fit">
                            <button
                                onClick={() => setViewMode("single")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    viewMode === "single"
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Đơn này
                            </button>
                            <button
                                onClick={() => {
                                    if (!vehicleResult) handleComputeVehicle();
                                    else setViewMode("vehicle");
                                }}
                                disabled={computingVehicle}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                                    viewMode === "vehicle"
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {computingVehicle
                                    ? <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang tổng hợp...</>
                                    : <>🚛 Toàn bộ xe {assignedCount > 0 ? `(${assignedCount} đơn)` : ""}</>
                                }
                            </button>
                        </div>

                        {/* Export summary (vehicle mode) */}
                        {viewMode === "vehicle" && exportSummary.length > 0 && (
                            <div className="border rounded-xl overflow-hidden">
                                <div className="bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Phiếu xuất trên xe
                                </div>
                                <div className="divide-y">
                                    {exportSummary.map((s) => {
                                        const isCurrent = s.export_id === exportId;
                                        return (
                                            <div key={s.export_id} className={`flex items-center justify-between px-3 py-2 text-xs ${isCurrent ? "bg-primary/5" : ""}`}>
                                                <div className="flex items-center gap-2">
                                                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                                    <span className={`font-mono font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                                                        {s.export_code}
                                                    </span>
                                                    {isCurrent && <span className="text-[10px] text-primary">(đang xem)</span>}
                                                </div>
                                                <div className="flex items-center gap-3 text-muted-foreground">
                                                    <span className="text-green-600 font-medium">{s.packed} xếp được</span>
                                                    {s.unpacked > 0 && <span className="text-red-500">{s.unpacked} không xếp</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

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
                                    {activeResult?.packed_items}<span className="text-sm font-normal text-muted-foreground">/{activeResult?.total_items}</span>
                                </p>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Không xếp được</p>
                                <p className={`text-xl font-bold mt-0.5 ${(activeResult?.unpacked_items ?? 0) > 0 ? "text-red-500" : "text-green-600"}`}>
                                    {activeResult?.unpacked_items}
                                </p>
                            </div>
                        </div>

                        {/* Algorithm chip */}
                        {activeResult?.algorithm_used && (
                            <div className={`text-xs rounded-xl px-3 py-2 flex items-center gap-2 ${
                                activeResult.algorithm_used.includes("+ai")
                                    ? "bg-violet-50 border border-violet-200 text-violet-700"
                                    : "bg-muted/30 text-muted-foreground"
                            }`}>
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="font-mono">{activeResult.algorithm_used}</span>
                            </div>
                        )}

                        {/* Vehicle info */}
                        {vehicleInfo && (
                            <div className="text-sm bg-blue-50 rounded-xl p-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                                </svg>
                                <span className="text-blue-700">
                                    <strong>{(vehicleInfo as any).name}</strong>
                                    {" — "}
                                    <span className="font-mono text-xs">{(vehicleInfo as any).license_plate}</span>
                                </span>
                            </div>
                        )}

                        {/* Compute vehicle button: show when vehicle has multiple exports and no vehicle result yet */}
                        {viewMode === "single" && !vehicleResult && otherExportCount > 0 && (
                            <button
                                onClick={handleComputeVehicle}
                                disabled={computingVehicle}
                                className="w-full border-2 border-dashed border-amber-300 rounded-xl py-2.5 text-xs text-amber-700 hover:border-amber-500 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {computingVehicle
                                    ? "Đang tổng hợp..."
                                    : `🚛 Xe này đang có ${otherExportCount + 1} phiếu xuất — Tính toán & xem tất cả trên 3D`}
                            </button>
                        )}

                        {/* 3D viewer context banner */}
                        {otherExportCount > 0 && (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                                <svg className="w-3.5 h-3.5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                    Mô hình 3D hiển thị toàn bộ {assignedCount} phiếu xuất trên xe.
                                    {" "}<span className="font-semibold text-amber-900">Màu = đơn này</span> · Xám = {otherExportCount} phiếu khác.
                                </span>
                            </div>
                        )}

                        {/* 3D Viewer — always shows vehicle layout if available */}
                        <div className="rounded-xl overflow-hidden border">
                            <BinPackingViewer
                                layoutJson={viewerLayoutJson!}
                                productNames={productNames}
                                algorithmUsed={activeResult?.algorithm_used}
                                currentExportId={viewerCurrentExportId}
                                className="h-96 w-full"
                            />
                        </div>

                        {/* Unpacked warning */}
                        {(activeResult?.unpacked_items ?? 0) > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                                <p className="font-medium mb-1">Có {activeResult?.unpacked_items} mặt hàng không thể xếp vào xe này.</p>
                                <p className="text-xs text-yellow-600">Cân nhắc chọn xe lớn hơn hoặc tách phiếu xuất.</p>
                            </div>
                        )}

                        {/* Route Planning — show when vehicle has assigned exports */}
                        {vehicleAssignedExportIds.length > 0 && result.fleet_vehicle_id && (
                            <RoutePlanningPanel
                                fleetVehicleId={result.fleet_vehicle_id}
                                exportIds={vehicleAssignedExportIds}
                            />
                        )}

                        {/* Apply button */}
                        {result.status !== "APPLIED" && viewMode === "single" && (
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
                        <p className="text-xs mt-1">Nhấn &quot;Tính toán đơn này&quot; để bắt đầu tối ưu.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
