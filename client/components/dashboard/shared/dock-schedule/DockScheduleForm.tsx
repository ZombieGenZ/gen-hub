"use client";

import React, { useEffect, useState } from "react";
import type { CreateDockSchedulePayload, DockSlotsResult } from "@/services/dock-schedule/dock-schedule.types";
import { DockScheduleService } from "@/services/dock-schedule/dock-schedule.service";
import { VEHICLE_TYPE_LABELS, VEHICLE_PURPOSE_LABELS } from "@/services/vehicle-log/vehicle-log.types";
import type { VehicleType, VehiclePurpose } from "@/services/vehicle-log/vehicle-log.types";

const dockService = new DockScheduleService();

interface WarehouseOption {
  id: string;
  name: string;
}

interface Props {
  token: string;
  warehouses: WarehouseOption[];
  organizationId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const TIME_SLOTS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00",
];

export function DockScheduleForm({ token, warehouses, organizationId, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<Partial<CreateDockSchedulePayload>>({
    vehicle_type: "TRUCK",
    purpose: "INBOUND",
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_time_start: "08:00",
    scheduled_time_end: "09:00",
    dock_number: 1,
  });
  const [slots, setSlots] = useState<DockSlotsResult | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load slot availability khi chọn kho + ngày
  useEffect(() => {
    if (!form.warehouse_template_id || !form.scheduled_date) return;
    setLoadingSlots(true);
    dockService
      .getSlots(token, form.warehouse_template_id, form.scheduled_date)
      .then(setSlots)
      .catch(() => setSlots(null))
      .finally(() => setLoadingSlots(false));
  }, [token, form.warehouse_template_id, form.scheduled_date]);

  const isSlotBusy = (dock: number, start: string, end: string) => {
    if (!slots) return false;
    const dockSchedules = slots.slots[dock] ?? [];
    return dockSchedules.some(
      (s) => s.scheduled_time_start < end && s.scheduled_time_end > start
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.warehouse_template_id ||
      !form.license_plate ||
      !form.scheduled_date ||
      !form.scheduled_time_start ||
      !form.scheduled_time_end ||
      !form.dock_number
    ) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }
    if (form.scheduled_time_start >= form.scheduled_time_end) {
      setError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await dockService.create(token, {
        ...(form as CreateDockSchedulePayload),
        organization_id: organizationId,
        license_plate: form.license_plate.toUpperCase().replace(/\s+/g, ""),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: keyof CreateDockSchedulePayload, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Kho */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Kho *</label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={form.warehouse_template_id ?? ""}
          onChange={(e) => set("warehouse_template_id", e.target.value)}
          required
        >
          <option value="">-- Chọn kho --</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Ngày & giờ */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ngày hẹn *</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.scheduled_date ?? ""}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => set("scheduled_date", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Giờ vào *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.scheduled_time_start ?? "08:00"}
            onChange={(e) => set("scheduled_time_start", e.target.value)}
          >
            {TIME_SLOTS.slice(0, -1).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Giờ ra (dự kiến) *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.scheduled_time_end ?? "09:00"}
            onChange={(e) => set("scheduled_time_end", e.target.value)}
          >
            {TIME_SLOTS.slice(1).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chọn dock */}
      {slots && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Chọn dock *
            {loadingSlots && <span className="ml-2 text-gray-400">Đang tải...</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: slots.dock_count }, (_, i) => i + 1).map((dock) => {
              const busy = isSlotBusy(dock, form.scheduled_time_start ?? "00:00", form.scheduled_time_end ?? "23:59");
              const selected = form.dock_number === dock;
              return (
                <button
                  key={dock}
                  type="button"
                  disabled={busy}
                  onClick={() => set("dock_number", dock)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    busy
                      ? "bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
                      : selected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-white border-gray-300 text-gray-700 hover:border-primary/50"
                  }`}
                >
                  Dock {dock}
                  {busy && <span className="ml-1 text-xs">(bận)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!slots && form.warehouse_template_id && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Số dock *</label>
          <input
            type="number"
            min={1}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.dock_number ?? 1}
            onChange={(e) => set("dock_number", Number(e.target.value))}
            required
          />
        </div>
      )}

      {/* Thông tin xe */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Biển số xe *</label>
          <input
            type="text"
            placeholder="VD: 51A-12345"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring uppercase"
            value={form.license_plate ?? ""}
            onChange={(e) => set("license_plate", e.target.value.toUpperCase())}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Loại xe</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.vehicle_type ?? "TRUCK"}
            onChange={(e) => set("vehicle_type", e.target.value as VehicleType)}
          >
            {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((k) => (
              <option key={k} value={k}>{VEHICLE_TYPE_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tên tài xế</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.driver_name ?? ""}
            onChange={(e) => set("driver_name", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">SĐT tài xế</label>
          <input
            type="tel"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.driver_phone ?? ""}
            onChange={(e) => set("driver_phone", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mục đích</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.purpose ?? "INBOUND"}
            onChange={(e) => set("purpose", e.target.value as VehiclePurpose)}
          >
            {(Object.keys(VEHICLE_PURPOSE_LABELS) as VehiclePurpose[]).map((k) => (
              <option key={k} value={k}>{VEHICLE_PURPOSE_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hãng vận chuyển</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.carrier_name ?? ""}
            onChange={(e) => set("carrier_name", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
        <textarea
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Huỷ
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Đang tạo..." : "Đặt lịch"}
        </button>
      </div>
    </form>
  );
}
