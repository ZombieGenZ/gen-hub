"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { VehicleLogService } from "@/services/vehicle-log/vehicle-log.service";
import { GpsService } from "@/services/gps/gps.service";
import type { GpsSessionCreated } from "@/services/gps/gps.service";
import { warehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { useWarehouseRealtime } from "@/hooks/useWarehouseRealtime";
import { useToast } from "@/contexts/ToastContext";
import { GpsLiveMap } from "@/components/dashboard/staff/vehicle-log/GpsLiveMap";
import type { VehiclePosition } from "@/components/dashboard/staff/vehicle-log/GpsLiveMap";
import { LicensePlateScannerModal } from "@/components/dashboard/shared/vehicle-log/LicensePlateScannerModal";
import type {
    VehicleLog,
    VehicleStats,
    CreateVehicleLogPayload,
    VehicleType,
    VehiclePurpose,
    VehicleLogStatus,
} from "@/services/vehicle-log/vehicle-log.types";
import { VEHICLE_TYPE_LABELS, VEHICLE_PURPOSE_LABELS } from "@/services/vehicle-log/vehicle-log.types";

const vehicleLogService = new VehicleLogService();
const gpsService = new GpsService();

const STATUS_COLORS: Record<VehicleLogStatus, string> = {
    INSIDE: "bg-green-100 text-green-800",
    EXITED: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<VehicleLogStatus, string> = {
    INSIDE: "Trong kho",
    EXITED: "Đã ra",
};

interface WarehouseOption {
    id: string;
    name: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
}

type TabKey = "active" | "all";

export default function VehicleLogPage() {
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<TabKey>("active");
    const [activeLogs, setActiveLogs] = useState<VehicleLog[]>([]);
    const [allLogs, setAllLogs] = useState<VehicleLog[]>([]);
    const [stats, setStats] = useState<VehicleStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [exitingId, setExitingId] = useState<string | null>(null);

    // ── Warehouse templates ──
    const [warehouseTemplates, setWarehouseTemplates] = useState<WarehouseOption[]>([]);
    const [filterWarehouseId, setFilterWarehouseId] = useState("");

    // ── Form tạo mới ──
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<Partial<CreateVehicleLogPayload>>({
        vehicle_type: "TRUCK",
        purpose: "INBOUND",
    });

    // ── Lookup biển số ──
    const [lookupPlate, setLookupPlate] = useState("");
    const [lookupResult, setLookupResult] = useState<{ active_log: VehicleLog | null } | null>(null);
    const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Scanner modal ──
    const [scannerOpen, setScannerOpen] = useState(false);
    const [plateImageUrl, setPlateImageUrl] = useState<string | null>(null);

    // ── GPS Session form ──
    const [showGpsForm, setShowGpsForm] = useState(false);
    const [gpsForm, setGpsForm] = useState({ license_plate: "", driver_phone: "", receipt_id: "", export_id: "" });
    const [gpsSubmitting, setGpsSubmitting] = useState(false);
    const [gpsCreated, setGpsCreated] = useState<GpsSessionCreated | null>(null);

    // ── GPS Live Map state ──
    const [vehiclePositions, setVehiclePositions] = useState<Map<string, VehiclePosition>>(new Map());
    const [warehouseCoords, setWarehouseCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [showMap, setShowMap] = useState(false);

    // ── Filters history tab ──
    const [filterDate, setFilterDate] = useState("");
    const [filterStatus, setFilterStatus] = useState<VehicleLogStatus | "">("");
    const [filterPurpose, setFilterPurpose] = useState<VehiclePurpose | "">("");
    const [historyView, setHistoryView] = useState<"table" | "timeline">("table");

    // ── Fetch warehouse templates on mount ──
    useEffect(() => {
        void (async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const raw = await warehouseTemplateService.getWarehouseTemplates(token, { is_active: true, limit: 100 });
                const items = (Array.isArray(raw) ? raw : (raw?.items ?? [])) as WarehouseOption[];
                setWarehouseTemplates(items.map((w) => ({
                    id: w.id,
                    name: w.name,
                    latitude: w.latitude,
                    longitude: w.longitude,
                })));
            } catch { /* non-critical */ }
        })();
    }, []);

    // ── Extract warehouse coords when filter changes ──
    useEffect(() => {
        if (!filterWarehouseId) {
            setWarehouseCoords(null);
            setVehiclePositions(new Map());
            return;
        }
        const wt = warehouseTemplates.find((w) => w.id === filterWarehouseId);
        if (wt?.latitude && wt?.longitude) {
            setWarehouseCoords({ lat: Number(wt.latitude), lng: Number(wt.longitude) });
        } else {
            setWarehouseCoords(null);
        }
    }, [filterWarehouseId, warehouseTemplates]);

    // ── Fetch active GPS sessions to seed map positions ──
    const fetchGpsSessions = useCallback(async () => {
        if (!filterWarehouseId) return;
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const sessions = await gpsService.listActiveSessions(token, filterWarehouseId);
            const positions = new Map<string, VehiclePosition>();
            sessions.forEach((s) => {
                const track = s.tracks?.[0];
                if (track) {
                    positions.set(s.id, {
                        sessionId: s.id,
                        licensePlate: s.license_plate,
                        lat: Number(track.latitude),
                        lng: Number(track.longitude),
                        distanceM: null,
                        geofence: null,
                        speedKmh: track.speed != null ? Math.round(Number(track.speed) * 3.6) : null,
                    });
                }
            });
            setVehiclePositions(positions);
        } catch { /* non-critical */ }
    }, [filterWarehouseId]);

    useEffect(() => { void fetchGpsSessions(); }, [fetchGpsSessions]);

    // Pre-fill form warehouse when filter changes
    useEffect(() => {
        if (filterWarehouseId) {
            setForm((f) => ({ ...f, warehouse_template_id: filterWarehouseId }));
        }
    }, [filterWarehouseId]);

    const fetchActive = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const [logs, vehicleStats] = await Promise.all([
                vehicleLogService.listActive(token, filterWarehouseId || undefined),
                vehicleLogService.getStats(token, filterWarehouseId || undefined),
            ]);
            setActiveLogs(logs);
            setStats(vehicleStats);
        } catch {
            showToast("Không thể tải danh sách xe đang trong kho.", "error");
        } finally {
            setLoading(false);
        }
    }, [filterWarehouseId, showToast]);

    const fetchAll = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await vehicleLogService.list(token, {
                warehouse_template_id: filterWarehouseId || undefined,
                date: filterDate || undefined,
                status: filterStatus || undefined,
                purpose: filterPurpose || undefined,
                limit: 50,
            });
            setAllLogs(res.items);
        } catch {
            showToast("Không thể tải lịch sử xe.", "error");
        }
    }, [filterWarehouseId, filterDate, filterStatus, filterPurpose, showToast]);

    useEffect(() => { void fetchActive(); }, [fetchActive]);
    useEffect(() => { if (activeTab === "all") void fetchAll(); }, [activeTab, fetchAll]);

    // ── Real-time WebSocket — subscribe vehicle-approaching + entered/exited ──
    const realtimeEvents = useMemo(
        () => filterWarehouseId
            ? [
                `warehouse:${filterWarehouseId}:vehicle-entered`,
                `warehouse:${filterWarehouseId}:vehicle-exited`,
                `warehouse:${filterWarehouseId}:vehicle-approaching`,
              ]
            : [],
        [filterWarehouseId]
    );

    const selectedWarehouseName = useMemo(
        () => warehouseTemplates.find((w) => w.id === filterWarehouseId)?.name ?? "",
        [filterWarehouseId, warehouseTemplates]
    );

    const { connected: wsConnected } = useWarehouseRealtime({
        warehouseTemplateId: filterWarehouseId || null,
        events: realtimeEvents,
        enabled: !!filterWarehouseId,
        onEvent: (eventName, payload) => {
            if (eventName.includes("vehicle-approaching")) {
                const p = payload as {
                    session_id: string;
                    license_plate: string;
                    latitude: number;
                    longitude: number;
                    distance_m: number;
                    speed_kmh: number | null;
                    event: "APPROACHING" | "ARRIVED";
                };

                setVehiclePositions((prev) => {
                    const next = new Map(prev);
                    next.set(p.session_id, {
                        sessionId: p.session_id,
                        licensePlate: p.license_plate,
                        lat: p.latitude,
                        lng: p.longitude,
                        distanceM: p.distance_m,
                        geofence: p.event,
                        speedKmh: p.speed_kmh ?? null,
                    });
                    return next;
                });

                const speedText = p.speed_kmh ? ` • ${p.speed_kmh} km/h` : "";
                if (p.event === "ARRIVED") {
                    showToast(
                        `✅ Xe ${p.license_plate} đã đến khu vực kho (${p.distance_m}m)${speedText}`,
                        "success",
                    );
                    void fetchActive();
                } else {
                    showToast(
                        `🚚 Xe ${p.license_plate} đang tiến đến kho — còn ${p.distance_m}m${speedText}`,
                        "info",
                    );
                }
            } else {
                void fetchActive();
            }
        },
    });

    // ── Lookup biển số với debounce 600ms ──
    useEffect(() => {
        if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
        if (!lookupPlate.trim()) { setLookupResult(null); return; }

        lookupTimerRef.current = setTimeout(async () => {
            try {
                const token = authStorage.getAccessToken();
                const wtId = form.warehouse_template_id ?? "";
                if (!token || !wtId) return;
                const result = await vehicleLogService.lookup(token, lookupPlate, wtId);
                setLookupResult(result);
            } catch {
                setLookupResult(null);
            }
        }, 600);
    }, [lookupPlate, form.warehouse_template_id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.license_plate || !form.warehouse_template_id) {
            showToast("Vui lòng nhập biển số và chọn kho.", "error");
            return;
        }
        try {
            setSubmitting(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            await vehicleLogService.create(token, { ...(form as CreateVehicleLogPayload), plate_image_url: plateImageUrl ?? undefined });
            showToast("Ghi nhận xe vào kho thành công!", "success");
            setShowForm(false);
            setForm({ vehicle_type: "TRUCK", purpose: "INBOUND", warehouse_template_id: filterWarehouseId || undefined });
            setPlateImageUrl(null);
            void fetchActive();
        } catch {
            showToast("Không thể ghi nhận xe. Vui lòng thử lại.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateGpsSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gpsForm.license_plate || !filterWarehouseId) {
            showToast("Vui lòng nhập biển số và chọn kho.", "error");
            return;
        }
        try {
            setGpsSubmitting(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            const result = await gpsService.createSession(token, {
                license_plate: gpsForm.license_plate,
                warehouse_template_id: filterWarehouseId,
                driver_phone: gpsForm.driver_phone || undefined,
                receipt_id: gpsForm.receipt_id || undefined,
                export_id: gpsForm.export_id || undefined,
            });
            setGpsCreated(result);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Lỗi không xác định";
            showToast(`Không thể tạo link GPS: ${msg}`, "error");
        } finally {
            setGpsSubmitting(false);
        }
    };

    const handleExit = async (id: string, plate: string) => {
        try {
            setExitingId(id);
            const token = authStorage.getAccessToken();
            if (!token) return;
            await vehicleLogService.recordExit(token, id);
            showToast(`Xe ${plate} đã ra khỏi kho.`, "success");
            void fetchActive();
        } catch {
            showToast("Không thể ghi nhận xe ra. Vui lòng thử lại.", "error");
        } finally {
            setExitingId(null);
        }
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
    };

    const calcDuration = (entry: string, exit?: string) => {
        const ms = new Date(exit ?? new Date()).getTime() - new Date(entry).getTime();
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}g ${m}p` : `${m}p`;
    };

    const vehiclePositionsList = useMemo(
        () => Array.from(vehiclePositions.values()),
        [vehiclePositions]
    );

    // Thống kê từ allLogs (hiển thị trong banner)
    const historyStats = useMemo(() => {
        if (allLogs.length === 0) return null;
        const byPurpose: Partial<Record<VehiclePurpose, number>> = {};
        let totalDurMs = 0;
        let exitedCount = 0;
        for (const log of allLogs) {
            byPurpose[log.purpose] = (byPurpose[log.purpose] ?? 0) + 1;
            if (log.exit_time) {
                totalDurMs += new Date(log.exit_time).getTime() - new Date(log.entry_time).getTime();
                exitedCount++;
            }
        }
        const avgMs = exitedCount > 0 ? totalDurMs / exitedCount : 0;
        const avgH = Math.floor(avgMs / 3_600_000);
        const avgM = Math.floor((avgMs % 3_600_000) / 60_000);
        const avgStr = avgH > 0 ? `${avgH}g ${avgM}p` : `${avgM}p`;
        return { total: allLogs.length, byPurpose, avgDuration: exitedCount > 0 ? avgStr : null };
    }, [allLogs]);

    // Timeline: nhóm allLogs theo ngày entry_time
    const timelineByDate = useMemo(() => {
        const map = new Map<string, VehicleLog[]>();
        for (const log of allLogs) {
            const day = log.entry_time.slice(0, 10);
            if (!map.has(day)) map.set(day, []);
            map.get(day)!.push(log);
        }
        return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
    }, [allLogs]);

    return (
        <>
        <LicensePlateScannerModal
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onResult={(plate, imgUrl, vehicleInfo) => {
                const vtRemap: Record<string, string> = { MOTORCYCLE: 'MOTORBIKE', CONTAINER: 'OTHER' };
                const vt = vehicleInfo?.vehicle_type
                    ? (vtRemap[vehicleInfo.vehicle_type] ?? vehicleInfo.vehicle_type)
                    : undefined;
                setForm((f) => ({
                    ...f,
                    license_plate: plate,
                    ...(vt ? { vehicle_type: vt as 'TRUCK' | 'VAN' | 'MOTORBIKE' | 'CAR' | 'OTHER' } : {}),
                }));
                setLookupPlate(plate);
                setPlateImageUrl(imgUrl);
                setScannerOpen(false);
            }}
        />
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold">Logistics xe ra vào</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">Quản lý phương tiện ra vào kho bãi</p>
                </div>
                <div className="flex items-center gap-3">
                    {stats && (
                        <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm">
                            <span className="text-green-700 font-semibold">{stats.inside_count}</span>
                            <span className="text-green-600 ml-1">xe trong kho</span>
                        </div>
                    )}
                    <button
                        onClick={() => { setShowGpsForm(true); setGpsCreated(null); setGpsForm({ license_plate: "", driver_phone: "", receipt_id: "", export_id: "" }); }}
                        className="px-4 py-2 border border-input bg-background rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
                        title="Tạo link GPS gửi cho tài xế"
                    >
                        📍 Link GPS
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        + Xe vào
                    </button>
                </div>
            </div>

            {/* Warehouse filter toàn trang + real-time indicator */}
            <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm font-medium text-muted-foreground">Lọc kho:</label>
                <select
                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    value={filterWarehouseId}
                    onChange={(e) => setFilterWarehouseId(e.target.value)}
                >
                    <option value="">Tất cả kho</option>
                    {warehouseTemplates.map((wt) => (
                        <option key={wt.id} value={wt.id}>{wt.name}</option>
                    ))}
                </select>
                {filterWarehouseId && (
                    <>
                        <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
                            <span className={`w-2 h-2 rounded-full inline-block ${wsConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                            {wsConnected ? "Real-time" : "Đang kết nối..."}
                        </span>
                        <button
                            onClick={() => setShowMap((v) => !v)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                showMap
                                    ? "bg-teal-50 border-teal-200 text-teal-700"
                                    : "border-input text-muted-foreground hover:bg-muted/50"
                            }`}
                        >
                            🗺️ {showMap ? "Ẩn bản đồ" : "GPS Live"}
                            {vehiclePositionsList.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-teal-500 text-white text-[10px] rounded-full">
                                    {vehiclePositionsList.length}
                                </span>
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* GPS Live Map */}
            {showMap && filterWarehouseId && (
                <div className="-mx-6">
                    <div className="px-6 py-2.5 flex items-center justify-between border-y bg-muted/20">
                        <p className="text-sm font-medium">
                            🗺️ GPS Live
                            {vehiclePositionsList.length > 0
                                ? ` — ${vehiclePositionsList.length} xe đang theo dõi`
                                : " — Chưa có xe nào đang tracking"}
                        </p>
                        <button
                            onClick={() => void fetchGpsSessions()}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ↻ Làm mới
                        </button>
                    </div>
                    <GpsLiveMap
                        warehouseCoords={warehouseCoords}
                        warehouseName={selectedWarehouseName}
                        vehiclePositions={vehiclePositionsList}
                        className="h-[60vh] min-h-[440px] rounded-none border-b"
                    />
                </div>
            )}

            {/* Form ghi nhận xe vào */}
            {showForm && (
                <div className="border rounded-xl p-5 bg-card shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">Ghi nhận xe vào kho</h2>
                        <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
                    </div>

                    {/* Lookup */}
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Kiểm tra biển số</label>
                        <input
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="Nhập biển số để kiểm tra..."
                            value={lookupPlate}
                            onChange={(e) => {
                                setLookupPlate(e.target.value);
                                setForm((f) => ({ ...f, license_plate: e.target.value }));
                            }}
                        />
                        {lookupResult?.active_log && (
                            <p className="text-xs text-orange-600 mt-1">
                                Xe này đang trong kho từ {formatTime(lookupResult.active_log.entry_time)}
                            </p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1">Biển số *</label>
                            <div className="flex gap-1.5">
                                <input
                                    required
                                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase"
                                    placeholder="51A-12345"
                                    value={form.license_plate ?? ""}
                                    onChange={(e) => setForm((f) => ({ ...f, license_plate: e.target.value }))}
                                />
                                <button
                                    type="button"
                                    onClick={() => setScannerOpen(true)}
                                    title="Quét biển số bằng camera"
                                    className="px-2.5 border rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>
                            {plateImageUrl && (
                                <p className="text-xs text-green-600 mt-1">Ảnh biển số đã chụp</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1">Kho *</label>
                            <select
                                required
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                                value={form.warehouse_template_id ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, warehouse_template_id: e.target.value }))}
                            >
                                <option value="">-- Chọn kho --</option>
                                {warehouseTemplates.map((wt) => (
                                    <option key={wt.id} value={wt.id}>{wt.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1">Loại xe</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                                value={form.vehicle_type ?? "TRUCK"}
                                onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value as VehicleType }))}
                            >
                                {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1">Mục đích</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                                value={form.purpose ?? "INBOUND"}
                                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value as VehiclePurpose }))}
                            >
                                {Object.entries(VEHICLE_PURPOSE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1">Tài xế</label>
                            <input
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                placeholder="Họ tên tài xế"
                                value={form.driver_name ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, driver_name: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1">SĐT tài xế</label>
                            <input
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                placeholder="0909..."
                                value={form.driver_phone ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, driver_phone: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1">Đơn vị vận chuyển</label>
                            <input
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                placeholder="GHN, GHTK, Nội bộ..."
                                value={form.carrier_name ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, carrier_name: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1">Ghi chú</label>
                            <input
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                placeholder="Ghi chú thêm..."
                                value={form.notes ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            />
                        </div>

                        <div className="sm:col-span-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                            >
                                {submitting ? "Đang lưu..." : "Ghi nhận vào"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit">
                {[{ key: "active" as const, label: "Đang trong kho" }, { key: "all" as const, label: "Lịch sử" }].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.key
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {tab.label}
                        {tab.key === "active" && stats && stats.inside_count > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full">{stats.inside_count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab: Xe đang trong kho */}
            {activeTab === "active" && (
                <div>
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
                    ) : activeLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="text-4xl mb-3">🚛</p>
                            <p>Không có xe nào đang trong kho</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeLogs.map((log) => (
                                <div key={log.id} className="border rounded-xl p-4 bg-card flex items-center gap-4 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono font-bold text-base">{log.license_plate}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status]}`}>
                                                {STATUS_LABELS[log.status]}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                                                {VEHICLE_TYPE_LABELS[log.vehicle_type]}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                                                {VEHICLE_PURPOSE_LABELS[log.purpose]}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                                            <span>Vào: <strong>{formatTime(log.entry_time)}</strong></span>
                                            <span>Thời gian: <strong>{calcDuration(log.entry_time)}</strong></span>
                                            {log.driver_name && <span>Tài xế: {log.driver_name}</span>}
                                            {log.carrier_name && <span>DVận: {log.carrier_name}</span>}
                                            {log.warehouse_template && <span>Kho: {log.warehouse_template.name}</span>}
                                        </div>
                                    </div>
                                    <button
                                        disabled={exitingId === log.id}
                                        onClick={() => handleExit(log.id, log.license_plate)}
                                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-40 whitespace-nowrap"
                                    >
                                        {exitingId === log.id ? "Đang lưu..." : "Ghi nhận ra"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Lịch sử */}
            {activeTab === "all" && (
                <div className="space-y-4">
                    {/* Filters + view toggle */}
                    <div className="flex gap-3 flex-wrap items-center">
                        <input
                            type="date"
                            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                        <select
                            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as VehicleLogStatus | "")}
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="INSIDE">Trong kho</option>
                            <option value="EXITED">Đã ra</option>
                        </select>
                        <select
                            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                            value={filterPurpose}
                            onChange={(e) => setFilterPurpose(e.target.value as VehiclePurpose | "")}
                        >
                            <option value="">Tất cả mục đích</option>
                            {Object.entries(VEHICLE_PURPOSE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                        <div className="ml-auto flex rounded-lg border overflow-hidden text-sm">
                            <button
                                onClick={() => setHistoryView("table")}
                                className={`px-3 py-1.5 transition-colors ${historyView === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"}`}
                            >
                                📋 Bảng
                            </button>
                            <button
                                onClick={() => setHistoryView("timeline")}
                                className={`px-3 py-1.5 border-l transition-colors ${historyView === "timeline" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"}`}
                            >
                                📅 Timeline
                            </button>
                        </div>
                    </div>

                    {/* Stats banner */}
                    {historyStats && (
                        <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-xl border text-sm">
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">Tổng:</span>
                                <span className="font-bold">{historyStats.total} lượt</span>
                            </div>
                            {(Object.entries(historyStats.byPurpose) as [VehiclePurpose, number][]).map(([p, cnt]) => (
                                <div key={p} className="flex items-center gap-1">
                                    <span className="text-muted-foreground text-xs">{VEHICLE_PURPOSE_LABELS[p]}:</span>
                                    <span className="font-semibold text-xs">{cnt}</span>
                                </div>
                            ))}
                            {historyStats.avgDuration && (
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <span className="text-muted-foreground text-xs">TB trong kho:</span>
                                    <span className="font-semibold text-xs">{historyStats.avgDuration}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {allLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">Không có dữ liệu lịch sử</div>
                    ) : historyView === "table" ? (
                        /* ── Table view ── */
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 border-b">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Biển số</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loại / Mục đích</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tài xế</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vào</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ra</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Thời gian</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {allLogs.map((log) => {
                                        const durMs = new Date(log.exit_time ?? new Date()).getTime() - new Date(log.entry_time).getTime();
                                        const isLong = log.exit_time && durMs > 8 * 3_600_000;
                                        return (
                                            <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-mono font-semibold">{log.license_plate}</span>
                                                        {log.plate_image_url && (
                                                            <a href={log.plate_image_url} target="_blank" rel="noopener noreferrer">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={log.plate_image_url} alt="biển số" className="h-5 w-8 object-cover rounded border" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs">{VEHICLE_TYPE_LABELS[log.vehicle_type]}</span>
                                                        <span className="text-xs text-muted-foreground">{VEHICLE_PURPOSE_LABELS[log.purpose]}</span>
                                                        {(log.linked_receipt_id || log.linked_export_id) && (
                                                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded w-fit font-mono">
                                                                {log.linked_receipt_id ? "📥 Phiếu NK" : "📤 Phiếu XK"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs">{log.driver_name ?? "—"}</td>
                                                <td className="px-4 py-3 text-xs">{formatTime(log.entry_time)}</td>
                                                <td className="px-4 py-3 text-xs">{log.exit_time ? formatTime(log.exit_time) : "—"}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span className={isLong ? "text-red-600 font-semibold" : ""}>
                                                        {calcDuration(log.entry_time, log.exit_time)}
                                                    </span>
                                                    {isLong && <span className="ml-1 text-[10px] text-red-500">⚠️ Lâu</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status]}`}>
                                                        {STATUS_LABELS[log.status]}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* ── Timeline view ── */
                        <div className="space-y-6">
                            {timelineByDate.map(([date, logs]) => (
                                <div key={date}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            {new Date(date + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                                        </span>
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{logs.length} lượt</span>
                                        <div className="flex-1 border-t border-dashed border-muted-foreground/20" />
                                    </div>
                                    <div className="space-y-1.5 pl-3 border-l-2 border-muted/60">
                                        {logs.map((log) => {
                                            const durMs = log.exit_time
                                                ? new Date(log.exit_time).getTime() - new Date(log.entry_time).getTime()
                                                : null;
                                            const isLong = durMs !== null && durMs > 8 * 3_600_000;
                                            const purposeColors: Record<VehiclePurpose, string> = {
                                                INBOUND: "bg-blue-100 text-blue-700",
                                                OUTBOUND: "bg-orange-100 text-orange-700",
                                                DELIVERY: "bg-green-100 text-green-700",
                                                VISIT: "bg-purple-100 text-purple-700",
                                                OTHER: "bg-gray-100 text-gray-600",
                                            };
                                            return (
                                                <div key={log.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors -ml-3">
                                                    <div className="text-xs text-muted-foreground w-10 shrink-0 pt-0.5 font-mono">
                                                        {new Date(log.entry_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                    </div>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-mono font-semibold text-sm">{log.license_plate}</span>
                                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${purposeColors[log.purpose]}`}>
                                                                {VEHICLE_PURPOSE_LABELS[log.purpose]}
                                                            </span>
                                                            {log.exit_time && (
                                                                <span className={`text-xs ${isLong ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                                                                    · {calcDuration(log.entry_time, log.exit_time)}
                                                                    {isLong && " ⚠️"}
                                                                </span>
                                                            )}
                                                            {!log.exit_time && (
                                                                <span className="text-xs text-green-600 font-medium">· Đang trong kho</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            {log.driver_name && (
                                                                <span className="text-xs text-muted-foreground">{log.driver_name}</span>
                                                            )}
                                                            {log.exit_time && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    → Ra {new Date(log.exit_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                                </span>
                                                            )}
                                                            {(log.linked_receipt_id || log.linked_export_id) && (
                                                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                                                                    {log.linked_receipt_id ? "📥 NK" : "📤 XK"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* ── GPS Session Modal ── */}
        {showGpsForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-background rounded-2xl shadow-xl w-full max-w-md">
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <div>
                            <h2 className="font-semibold text-base">📍 Tạo link GPS cho tài xế</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Tài xế mở link → browser gửi vị trí tự động mỗi 30 giây</p>
                        </div>
                        <button onClick={() => { setShowGpsForm(false); setGpsCreated(null); }} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
                    </div>

                    {gpsCreated ? (
                        <div className="px-6 py-5 space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                                <p className="text-sm font-medium text-green-800">Link GPS đã tạo thành công!</p>
                                <div className="space-y-1">
                                    <p className="text-xs text-green-700">Biển số: <strong>{gpsCreated.license_plate}</strong></p>
                                    <p className="text-xs text-green-700">Hết hạn: {new Date(gpsCreated.expires_at).toLocaleString("vi-VN")}</p>
                                </div>
                                <div className="bg-white rounded-lg border border-green-200 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Link gửi cho tài xế:</p>
                                    <p className="text-xs font-mono break-all text-gray-700">{gpsCreated.tracking_url}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { void navigator.clipboard.writeText(gpsCreated.tracking_url); showToast("Đã copy link!", "success"); }}
                                        className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                    >
                                        Copy link
                                    </button>
                                    <button
                                        onClick={() => { setGpsCreated(null); setGpsForm({ license_plate: "", driver_phone: "", receipt_id: "", export_id: "" }); }}
                                        className="flex-1 px-3 py-2 text-xs border border-input rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        Tạo link khác
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowGpsForm(false)}
                                className="w-full px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateGpsSession} className="px-6 py-5 space-y-4">
                            {!filterWarehouseId && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
                                    Vui lòng chọn kho ở phần lọc trước khi tạo link GPS.
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Biển số xe <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="VD: 51A-12345"
                                    value={gpsForm.license_plate}
                                    onChange={(e) => setGpsForm((f) => ({ ...f, license_plate: e.target.value }))}
                                    required
                                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono uppercase"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">SĐT tài xế</label>
                                <input
                                    type="tel"
                                    placeholder="VD: 0901234567"
                                    value={gpsForm.driver_phone}
                                    onChange={(e) => setGpsForm((f) => ({ ...f, driver_phone: e.target.value }))}
                                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                <p className="text-xs text-muted-foreground">Dùng để gửi link qua SMS (nếu tích hợp Twilio)</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Mã phiếu nhập</label>
                                    <input
                                        type="text"
                                        placeholder="Receipt ID (tùy chọn)"
                                        value={gpsForm.receipt_id}
                                        onChange={(e) => setGpsForm((f) => ({ ...f, receipt_id: e.target.value }))}
                                        className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Mã phiếu xuất</label>
                                    <input
                                        type="text"
                                        placeholder="Export ID (tùy chọn)"
                                        value={gpsForm.export_id}
                                        onChange={(e) => setGpsForm((f) => ({ ...f, export_id: e.target.value }))}
                                        className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                                Link có hiệu lực <strong>24 giờ</strong>. Tài xế mở link trên điện thoại → click đồng ý cấp quyền vị trí → hệ thống tự động theo dõi.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowGpsForm(false)}
                                    className="flex-1 px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={gpsSubmitting || !filterWarehouseId}
                                    className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
                                >
                                    {gpsSubmitting ? "Đang tạo..." : "Tạo link GPS"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )}
        </>
    );
}
