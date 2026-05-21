"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { VehicleLogService } from "@/services/vehicle-log/vehicle-log.service";
import { warehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { useWarehouseRealtime } from "@/hooks/useWarehouseRealtime";
import { useToast } from "@/contexts/ToastContext";
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

    // ── Filters history tab ──
    const [filterDate, setFilterDate] = useState("");
    const [filterStatus, setFilterStatus] = useState<VehicleLogStatus | "">("");
    const [filterPurpose, setFilterPurpose] = useState<VehiclePurpose | "">("");

    // ── Fetch warehouse templates on mount ──
    useEffect(() => {
        void (async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const raw = await warehouseTemplateService.getWarehouseTemplates(token, { is_active: true, limit: 100 });
                // API may return array or {items: [...]}
                const items = (Array.isArray(raw) ? raw : (raw?.items ?? [])) as WarehouseOption[];
                setWarehouseTemplates(items.map((w) => ({ id: w.id, name: w.name })));
            } catch { /* non-critical */ }
        })();
    }, []);

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

    // ── Real-time WebSocket — subscribe khi chọn cụ thể một kho ──
    const realtimeEvents = useMemo(
        () => filterWarehouseId
            ? [
                `warehouse:${filterWarehouseId}:vehicle-entered`,
                `warehouse:${filterWarehouseId}:vehicle-exited`,
              ]
            : [],
        [filterWarehouseId]
    );

    const { connected: wsConnected } = useWarehouseRealtime({
        warehouseTemplateId: filterWarehouseId || null,
        events: realtimeEvents,
        enabled: !!filterWarehouseId,
        onEvent: () => { void fetchActive(); },
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
            await vehicleLogService.create(token, form as CreateVehicleLogPayload);
            showToast("Ghi nhận xe vào kho thành công!", "success");
            setShowForm(false);
            setForm({ vehicle_type: "TRUCK", purpose: "INBOUND", warehouse_template_id: filterWarehouseId || undefined });
            void fetchActive();
        } catch {
            showToast("Không thể ghi nhận xe. Vui lòng thử lại.", "error");
        } finally {
            setSubmitting(false);
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

    return (
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
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
                        <span className={`w-2 h-2 rounded-full inline-block ${wsConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                        {wsConnected ? "Real-time" : "Đang kết nối..."}
                    </span>
                )}
            </div>

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
                            <input
                                required
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase"
                                placeholder="51A-12345"
                                value={form.license_plate ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, license_plate: e.target.value }))}
                            />
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
                    {/* Filters */}
                    <div className="flex gap-3 flex-wrap">
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
                    </div>

                    {allLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">Không có dữ liệu lịch sử</div>
                    ) : (
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
                                    {allLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3 font-mono font-semibold">{log.license_plate}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs">{VEHICLE_TYPE_LABELS[log.vehicle_type]}</span>
                                                    <span className="text-xs text-muted-foreground">{VEHICLE_PURPOSE_LABELS[log.purpose]}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{log.driver_name ?? "—"}</td>
                                            <td className="px-4 py-3 text-xs">{formatTime(log.entry_time)}</td>
                                            <td className="px-4 py-3 text-xs">{log.exit_time ? formatTime(log.exit_time) : "—"}</td>
                                            <td className="px-4 py-3 text-xs">{calcDuration(log.entry_time, log.exit_time)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status]}`}>
                                                    {STATUS_LABELS[log.status]}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
