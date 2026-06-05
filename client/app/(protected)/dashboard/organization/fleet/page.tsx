"use client";

import React, { useEffect, useState, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { FleetService } from "@/services/fleet/fleet.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import type { FleetVehicle, FleetVehicleStatus } from "@/services/fleet/fleet.types";
import {
    FLEET_VEHICLE_TYPE_LABELS,
    FLEET_STATUS_LABELS,
    FLEET_STATUS_COLORS,
    EXPORT_STATUS_LABELS,
    EXPORT_STATUS_COLORS,
} from "@/services/fleet/fleet.types";

const fleetService = new FleetService();
const inventoryService = new InventoryService();

type TabStatus = "ALL" | FleetVehicleStatus;

const STATUS_TABS: { key: TabStatus; label: string }[] = [
    { key: "ALL", label: "Tất cả" },
    { key: "AVAILABLE", label: "Sẵn sàng" },
    { key: "IN_USE", label: "Đang sử dụng" },
    { key: "MAINTENANCE", label: "Bảo dưỡng" },
    { key: "INACTIVE", label: "Ngừng hoạt động" },
];

export default function OrgFleetPage() {
    const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
    const [filterWarehouseId, setFilterWarehouseId] = useState("");
    const [activeTab, setActiveTab] = useState<TabStatus>("ALL");

    useEffect(() => {
        void (async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const whs = await inventoryService.listWarehouses(token);
                setWarehouses(whs);
                if (whs.length > 0) setFilterWarehouseId(whs[0].id);
            } catch { /* non-critical */ }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchVehicles = useCallback(async () => {
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await fleetService.list(token, {
                warehouse_id: filterWarehouseId || undefined,
                status: activeTab !== "ALL" ? activeTab : undefined,
                limit: 100,
            });
            setVehicles(res.items);
            setTotal(res.total);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [filterWarehouseId, activeTab]);

    useEffect(() => { void fetchVehicles(); }, [fetchVehicles]);

    const fmtDim = (v: number | string) => `${Number(v).toFixed(0)} cm`;
    const fmtKg  = (v: number | string) => `${Number(v).toFixed(0)} kg`;

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold">Đội xe vận chuyển</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Danh sách xe của kho — tổng {total} xe
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                        value={filterWarehouseId}
                        onChange={(e) => setFilterWarehouseId(e.target.value)}
                    >
                        <option value="">Tất cả kho</option>
                        {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Info banner — read-only notice */}
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-blue-700">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Bạn đang xem danh sách xe ở chế độ chỉ đọc. Liên hệ Admin để thêm hoặc chỉnh sửa xe.
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit overflow-x-auto">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                            activeTab === tab.key
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table — no action column */}
            {loading ? (
                <div className="text-center py-16 text-muted-foreground">Đang tải...</div>
            ) : vehicles.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="text-4xl mb-3">🚛</p>
                    <p>Chưa có xe nào trong kho này.</p>
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tên xe / Biển số</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loại xe</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kích thước khoang (DxRxC cm)</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tải trọng</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phiếu xuất đang giao</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {vehicles.map((v) => (
                                <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold">{v.name}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{v.license_plate}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-muted rounded-full text-xs">
                                            {FLEET_VEHICLE_TYPE_LABELS[v.vehicle_type]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                                        {fmtDim(v.cargo_length)} × {fmtDim(v.cargo_width)} × {fmtDim(v.cargo_height)}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-medium">
                                        {fmtKg(v.max_weight_kg)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${FLEET_STATUS_COLORS[v.status]}`}>
                                            {FLEET_STATUS_LABELS[v.status]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {v.exports && v.exports.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {v.exports.map((exp) => (
                                                    <div key={exp.id} className="flex items-center gap-1.5">
                                                        <span className="font-mono text-xs font-semibold">{exp.code}</span>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${EXPORT_STATUS_COLORS[exp.status]}`}>
                                                            {EXPORT_STATUS_LABELS[exp.status]}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">
                                        {v.notes || "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
