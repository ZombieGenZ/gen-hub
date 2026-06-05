"use client";

import React, { useEffect, useState, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { FleetService } from "@/services/fleet/fleet.service";
import { useToast } from "@/contexts/ToastContext";
import type {
    FleetVehicle,
    FleetVehicleStatus,
    FleetVehicleType,
    CreateFleetVehiclePayload,
    UpdateFleetVehiclePayload,
} from "@/services/fleet/fleet.types";
import {
    FLEET_VEHICLE_TYPE_LABELS,
    FLEET_STATUS_LABELS,
    FLEET_STATUS_COLORS,
} from "@/services/fleet/fleet.types";

const fleetService = new FleetService();

const VEHICLE_TYPES: FleetVehicleType[] = [
    "MOTORBIKE",
    "VAN",
    "TRUCK_SMALL",
    "TRUCK_MEDIUM",
    "TRUCK_LARGE",
    "CONTAINER",
];

type TabStatus = "ALL" | FleetVehicleStatus;

const STATUS_TABS: { key: TabStatus; label: string }[] = [
    { key: "ALL", label: "Tất cả" },
    { key: "AVAILABLE", label: "Sẵn sàng" },
    { key: "IN_USE", label: "Đang sử dụng" },
    { key: "MAINTENANCE", label: "Bảo dưỡng" },
    { key: "INACTIVE", label: "Ngừng hoạt động" },
];

interface WarehouseOption {
    id: string;
    name: string;
    organization_id: string;
    organization?: { name: string };
}

interface FleetFormState {
    warehouse_id: string;
    name: string;
    license_plate: string;
    vehicle_type: FleetVehicleType;
    cargo_length: string;
    cargo_width: string;
    cargo_height: string;
    max_weight_kg: string;
    notes: string;
}

const emptyForm = (warehouseId = ""): FleetFormState => ({
    warehouse_id: warehouseId,
    name: "",
    license_plate: "",
    vehicle_type: "VAN",
    cargo_length: "",
    cargo_width: "",
    cargo_height: "",
    max_weight_kg: "",
    notes: "",
});

export default function FleetPage() {
    const { showToast } = useToast();

    const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
    const [filterWarehouseId, setFilterWarehouseId] = useState("");
    const [activeTab, setActiveTab] = useState<TabStatus>("ALL");

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
    const [form, setForm] = useState<FleetFormState>(emptyForm());
    const [submitting, setSubmitting] = useState(false);

    // Delete confirm
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // ── Fetch warehouses (admin: lấy tất cả kho hệ thống) ──
    useEffect(() => {
        void (async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const whs = await fleetService.listAllWarehouses(token);
                setWarehouses(whs);
                if (whs.length > 0 && !filterWarehouseId) {
                    setFilterWarehouseId(whs[0].id);
                }
            } catch { /* non-critical */ }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Fetch vehicles ──
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
            showToast("Không thể tải danh sách xe.", "error");
        } finally {
            setLoading(false);
        }
    }, [filterWarehouseId, activeTab, showToast]);

    useEffect(() => {
        void fetchVehicles();
    }, [fetchVehicles]);

    const openAddModal = () => {
        setEditingVehicle(null);
        setForm(emptyForm(filterWarehouseId));
        setModalOpen(true);
    };

    const openEditModal = (vehicle: FleetVehicle) => {
        setEditingVehicle(vehicle);
        setForm({
            warehouse_id: vehicle.warehouse_id,
            name: vehicle.name,
            license_plate: vehicle.license_plate,
            vehicle_type: vehicle.vehicle_type,
            cargo_length: String(vehicle.cargo_length),
            cargo_width: String(vehicle.cargo_width),
            cargo_height: String(vehicle.cargo_height),
            max_weight_kg: String(vehicle.max_weight_kg),
            notes: vehicle.notes ?? "",
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingVehicle(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.warehouse_id) {
            showToast("Vui lòng chọn kho.", "error");
            return;
        }
        try {
            setSubmitting(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const payload: CreateFleetVehiclePayload | UpdateFleetVehiclePayload = {
                ...(!editingVehicle ? { warehouse_id: form.warehouse_id } : {}),
                name: form.name,
                license_plate: form.license_plate,
                vehicle_type: form.vehicle_type,
                cargo_length: Number(form.cargo_length),
                cargo_width: Number(form.cargo_width),
                cargo_height: Number(form.cargo_height),
                max_weight_kg: Number(form.max_weight_kg),
                notes: form.notes || undefined,
            } as CreateFleetVehiclePayload;

            if (editingVehicle) {
                await fleetService.update(token, editingVehicle.id, payload as UpdateFleetVehiclePayload);
                showToast("Cập nhật xe thành công!", "success");
            } else {
                await fleetService.create(token, payload as CreateFleetVehiclePayload);
                showToast("Thêm xe thành công!", "success");
            }

            closeModal();
            void fetchVehicles();
        } catch {
            showToast("Không thể lưu thông tin xe. Vui lòng thử lại.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (id: string, status: FleetVehicleStatus) => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await fleetService.updateStatus(token, id, status);
            showToast("Đã cập nhật trạng thái.", "success");
            void fetchVehicles();
        } catch {
            showToast("Không thể cập nhật trạng thái.", "error");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            const token = authStorage.getAccessToken();
            if (!token) return;
            await fleetService.delete(token, id);
            showToast("Đã xóa xe.", "success");
            void fetchVehicles();
        } catch {
            showToast("Không thể xóa xe.", "error");
        } finally {
            setDeletingId(null);
        }
    };

    const fmtDim = (v: number | string) => `${Number(v).toFixed(0)} cm`;
    const fmtKg = (v: number | string) => `${Number(v).toFixed(0)} kg`;

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold">Quản lý đội xe</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Toàn bộ xe vận chuyển trong hệ thống — tổng {total} xe
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
                            <option key={w.id} value={w.id}>
                                {w.name}{w.organization?.name ? ` — ${w.organization.name}` : ""}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={openAddModal}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        + Thêm xe
                    </button>
                </div>
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

            {/* Table */}
            {loading ? (
                <div className="text-center py-16 text-muted-foreground">Đang tải...</div>
            ) : vehicles.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="text-4xl mb-3">🚛</p>
                    <p>Chưa có xe nào trong danh sách.</p>
                    <button
                        onClick={openAddModal}
                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                    >
                        Thêm xe đầu tiên
                    </button>
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
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Thao tác</th>
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
                                        <select
                                            className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${FLEET_STATUS_COLORS[v.status]}`}
                                            value={v.status}
                                            onChange={(e) => handleStatusChange(v.id, e.target.value as FleetVehicleStatus)}
                                        >
                                            {(Object.keys(FLEET_STATUS_LABELS) as FleetVehicleStatus[]).map((s) => (
                                                <option key={s} value={s} className="bg-background text-foreground">
                                                    {FLEET_STATUS_LABELS[s]}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditModal(v)}
                                                className="px-2 py-1 text-xs border rounded-lg hover:bg-muted/40 transition-colors"
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                disabled={deletingId === v.id}
                                                onClick={() => handleDelete(v.id)}
                                                className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                                            >
                                                {deletingId === v.id ? "..." : "Xóa"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="font-semibold text-base">
                                {editingVehicle ? "Cập nhật xe" : "Thêm xe mới"}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            {/* Warehouse (only for new) */}
                            {!editingVehicle && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Kho <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                                        value={form.warehouse_id}
                                        onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
                                    >
                                        <option value="">-- Chọn kho --</option>
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name}{w.organization?.name ? ` — ${w.organization.name}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tên xe <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        placeholder="VD: Xe tải Hino"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Biển số <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase"
                                        placeholder="51C-12345"
                                        value={form.license_plate}
                                        onChange={(e) => setForm((f) => ({ ...f, license_plate: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Loại xe</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                                    value={form.vehicle_type}
                                    onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value as FleetVehicleType }))}
                                >
                                    {VEHICLE_TYPES.map((t) => (
                                        <option key={t} value={t}>{FLEET_VEHICLE_TYPE_LABELS[t]}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Kích thước khoang hàng (cm)</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">Dài</label>
                                        <input
                                            required
                                            type="number"
                                            min={1}
                                            step="0.01"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            placeholder="400"
                                            value={form.cargo_length}
                                            onChange={(e) => setForm((f) => ({ ...f, cargo_length: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">Rộng</label>
                                        <input
                                            required
                                            type="number"
                                            min={1}
                                            step="0.01"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            placeholder="200"
                                            value={form.cargo_width}
                                            onChange={(e) => setForm((f) => ({ ...f, cargo_width: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">Cao</label>
                                        <input
                                            required
                                            type="number"
                                            min={1}
                                            step="0.01"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            placeholder="200"
                                            value={form.cargo_height}
                                            onChange={(e) => setForm((f) => ({ ...f, cargo_height: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Tải trọng tối đa (kg) <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="number"
                                    min={1}
                                    step="0.01"
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    placeholder="3500"
                                    value={form.max_weight_kg}
                                    onChange={(e) => setForm((f) => ({ ...f, max_weight_kg: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                                <textarea
                                    rows={2}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                    placeholder="Ghi chú thêm về xe..."
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 border border-input rounded-lg text-sm hover:bg-muted/50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                                >
                                    {submitting ? "Đang lưu..." : editingVehicle ? "Cập nhật" : "Thêm xe"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
