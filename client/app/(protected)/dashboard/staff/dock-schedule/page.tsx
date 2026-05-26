"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { warehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { DockScheduleService } from "@/services/dock-schedule/dock-schedule.service";
import type { DockSchedule, DockScheduleStatus, DockSlotsResult } from "@/services/dock-schedule/dock-schedule.types";
import { DOCK_STATUS_LABELS } from "@/services/dock-schedule/dock-schedule.types";
import { DockScheduleStatusBadge } from "@/components/dashboard/shared/dock-schedule/DockScheduleStatusBadge";
import { DockTimelineView } from "@/components/dashboard/shared/dock-schedule/DockTimelineView";
import { DockScheduleForm } from "@/components/dashboard/shared/dock-schedule/DockScheduleForm";
import { useToast } from "@/contexts/ToastContext";

const dockService = new DockScheduleService();

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 pt-2.5 first:pt-0">
      <span className="text-gray-500 shrink-0 w-28">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

const PURPOSE_LABELS: Record<string, string> = {
  INBOUND: "Nhập hàng",
  OUTBOUND: "Xuất hàng",
  VISIT: "Thăm kho",
  DELIVERY: "Giao hàng",
  OTHER: "Khác",
};

interface WarehouseOption {
  id: string;
  name: string;
}

type ViewMode = "timeline" | "list";

export default function StaffDockSchedulePage() {
  const { showToast } = useToast();

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  // "" = tất cả kho
  const [filterWarehouseId, setFilterWarehouseId] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState<DockScheduleStatus | "">("");
  const [filterPlate, setFilterPlate] = useState("");

  const [schedules, setSchedules] = useState<DockSchedule[]>([]);
  const [slots, setSlots] = useState<DockSlotsResult | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Timeline chỉ khả dụng khi đã chọn 1 kho cụ thể
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<DockSchedule | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const token = authStorage.getAccessToken() ?? "";

  // Load warehouses
  useEffect(() => {
    if (!token) return;
    warehouseTemplateService
      .getWarehouseTemplates(token, { is_active: true, limit: 100 })
      .then((raw: unknown) => {
        const list: { id: string; name: string }[] = Array.isArray(raw)
          ? (raw as { id: string; name: string }[])
          : ((raw as { items?: { id: string; name: string }[] })?.items ?? []);
        setWarehouses(list.map((w) => ({ id: w.id, name: w.name })));
        // Không auto-chọn — mặc định "Tất cả kho"
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Khi đổi sang "Tất cả" thì force về list view
  const handleWarehouseChange = (id: string) => {
    setFilterWarehouseId(id);
    if (!id) setViewMode("list");
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const listPromise = dockService.list(token, {
        warehouse_template_id: filterWarehouseId || undefined,
        date: filterDate || undefined,
        status: filterStatus || undefined,
        license_plate: filterPlate || undefined,
        limit: 200,
      });

      // Slots chỉ fetch khi đã chọn 1 kho cụ thể
      const slotsPromise =
        filterWarehouseId && filterDate
          ? dockService.getSlots(token, filterWarehouseId, filterDate)
          : Promise.resolve(null);

      const [listRes, slotsRes] = await Promise.all([listPromise, slotsPromise]);
      setSchedules(listRes.items);
      setTotal(listRes.total);
      setSlots(slotsRes);
    } catch {
      showToast("Không thể tải danh sách lịch dock", "error");
    } finally {
      setLoading(false);
    }
  }, [token, filterWarehouseId, filterDate, filterStatus, filterPlate, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (action: "confirm" | "cancel" | "arrive" | "complete" | "no-show", id: string) => {
    setActionLoading(id);
    try {
      if (action === "confirm") await dockService.confirm(token, id);
      else if (action === "cancel") await dockService.cancel(token, id);
      else if (action === "arrive") await dockService.markArrived(token, id);
      else if (action === "complete") await dockService.markCompleted(token, id);
      else if (action === "no-show") await dockService.markNoShow(token, id);
      showToast("Cập nhật thành công", "success");
      setSelected(null);
      await fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi cập nhật", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const statusOptions: Array<{ value: DockScheduleStatus | ""; label: string }> = [
    { value: "", label: "Tất cả trạng thái" },
    ...(Object.keys(DOCK_STATUS_LABELS) as DockScheduleStatus[]).map((k) => ({
      value: k,
      label: DOCK_STATUS_LABELS[k],
    })),
  ];

  const stats = useMemo(() => {
    const pending = schedules.filter((s) => s.status === "PENDING").length;
    const confirmed = schedules.filter((s) => s.status === "CONFIRMED").length;
    const arrived = schedules.filter((s) => s.status === "ARRIVED").length;
    return { pending, confirmed, arrived, total: schedules.length };
  }, [schedules]);

  const canUseTimeline = !!filterWarehouseId;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Lịch Đặt Dock</h1>
            <p className="text-sm text-gray-500 mt-0.5">Quản lý lịch xe ra vào theo từng dock</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <span>+</span> Tạo lịch
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Tổng kết quả", value: stats.total, color: "text-gray-900" },
            { label: "Chờ duyệt", value: stats.pending, color: "text-yellow-700" },
            { label: "Đã xác nhận", value: stats.confirmed, color: "text-teal-700" },
            { label: "Xe đang đến", value: stats.arrived, color: "text-green-700" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
          {/* Kho */}
          <div className="flex-1 min-w-36">
            <label className="block text-xs font-medium text-gray-700 mb-1">Kho</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={filterWarehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {/* Ngày */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ngày</label>
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {/* Trạng thái */}
          <div className="min-w-36">
            <label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as DockScheduleStatus | "")}
            >
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Biển số */}
          <div className="flex-1 min-w-36">
            <label className="block text-xs font-medium text-gray-700 mb-1">Biển số</label>
            <input
              type="text"
              placeholder="Tìm biển số..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring uppercase"
              value={filterPlate}
              onChange={(e) => setFilterPlate(e.target.value.toUpperCase())}
            />
          </div>

          {/* Toggle view — timeline chỉ khả dụng khi chọn 1 kho */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              onClick={() => canUseTimeline && setViewMode("timeline")}
              title={!canUseTimeline ? "Chọn 1 kho cụ thể để dùng Timeline" : undefined}
              className={`px-3 py-2 transition-colors ${
                viewMode === "timeline"
                  ? "bg-primary text-primary-foreground"
                  : canUseTimeline
                  ? "bg-white text-gray-700 hover:bg-gray-50"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              Danh sách
            </button>
          </div>
        </div>

        {/* Gợi ý khi đang xem tất cả */}
        {!filterWarehouseId && !loading && viewMode === "timeline" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
            Chọn 1 kho cụ thể để xem sơ đồ Timeline.
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === "timeline" && canUseTimeline && slots ? (
          <DockTimelineView
            dockCount={slots.dock_count}
            schedules={schedules}
            onSelect={setSelected}
          />
        ) : viewMode === "timeline" && canUseTimeline && !slots ? (
          <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-16 text-sm text-gray-400">
            Không có dữ liệu slot cho ngày này
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Mã lịch", "Kho", "Dock", "Ngày hẹn", "Biển số", "Giờ hẹn", "Mục đích", "Trạng thái", "Thao tác"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                      Không có lịch dock nào
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(s)}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.code}</td>
                      <td className="px-4 py-3 text-gray-700">{s.warehouse_template?.name ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">Dock {s.dock_number}</td>
                      <td className="px-4 py-3 text-gray-700">{new Date(s.scheduled_date).toLocaleDateString("vi-VN")}</td>
                      <td className="px-4 py-3 font-semibold text-teal-700">{s.license_plate}</td>
                      <td className="px-4 py-3 text-gray-700">{s.scheduled_time_start}–{s.scheduled_time_end}</td>
                      <td className="px-4 py-3 text-gray-700">{PURPOSE_LABELS[s.purpose] ?? s.purpose}</td>
                      <td className="px-4 py-3"><DockScheduleStatusBadge status={s.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {s.status === "PENDING" && (
                            <button
                              disabled={actionLoading === s.id}
                              onClick={() => handleAction("confirm", s.id)}
                              className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 disabled:opacity-50"
                            >Duyệt</button>
                          )}
                          {s.status === "CONFIRMED" && (
                            <>
                              <button
                                disabled={actionLoading === s.id}
                                onClick={() => handleAction("arrive", s.id)}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >Đến</button>
                              <button
                                disabled={actionLoading === s.id}
                                onClick={() => handleAction("no-show", s.id)}
                                className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50"
                              >No-show</button>
                            </>
                          )}
                          {s.status === "ARRIVED" && (
                            <button
                              disabled={actionLoading === s.id}
                              onClick={() => handleAction("complete", s.id)}
                              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50"
                            >Xong</button>
                          )}
                          {["PENDING", "CONFIRMED"].includes(s.status) && (
                            <button
                              disabled={actionLoading === s.id}
                              onClick={() => handleAction("cancel", s.id)}
                              className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 disabled:opacity-50"
                            >Huỷ</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {total > 0 && (
              <div className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100">
                Hiển thị {schedules.length} / {total} lịch
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: tạo lịch */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tạo lịch dock mới</h2>
            <DockScheduleForm
              token={token}
              warehouses={warehouses}
              onSuccess={() => { setShowForm(false); fetchData(); showToast("Tạo lịch thành công", "success"); }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Modal: chi tiết lịch */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-900">Chi tiết lịch dock</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
            </div>

            <div className="space-y-2.5 text-sm divide-y divide-gray-50">
              <Row label="Mã lịch"><span className="font-mono text-xs text-gray-700">{selected.code}</span></Row>
              <Row label="Kho"><span className="font-medium text-gray-900">{selected.warehouse_template?.name ?? "—"}</span></Row>
              <Row label="Dock"><span className="font-bold text-gray-900">Dock {selected.dock_number}</span></Row>
              <Row label="Biển số"><span className="font-bold text-teal-700">{selected.license_plate}</span></Row>
              <Row label="Ngày hẹn"><span className="text-gray-800">{new Date(selected.scheduled_date).toLocaleDateString("vi-VN")}</span></Row>
              <Row label="Giờ hẹn"><span className="font-medium text-gray-800">{selected.scheduled_time_start} – {selected.scheduled_time_end}</span></Row>
              <Row label="Mục đích"><span className="text-gray-800">{PURPOSE_LABELS[selected.purpose] ?? selected.purpose}</span></Row>
              {selected.driver_name && <Row label="Tài xế"><span className="text-gray-800">{selected.driver_name}{selected.driver_phone ? ` · ${selected.driver_phone}` : ""}</span></Row>}
              {selected.carrier_name && <Row label="Hãng VC"><span className="text-gray-800">{selected.carrier_name}</span></Row>}
              <Row label="Trạng thái"><DockScheduleStatusBadge status={selected.status} /></Row>
              {selected.vehicle_log_id && <Row label="Vehicle Log"><span className="font-mono text-xs text-green-700">{selected.vehicle_log_id.slice(0, 8)}…</span></Row>}
              {selected.notes && <Row label="Ghi chú"><span className="text-gray-800">{selected.notes}</span></Row>}
            </div>

            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100">
              {selected.status === "PENDING" && (
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAction("confirm", selected.id)}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >Xác nhận</button>
              )}
              {selected.status === "CONFIRMED" && (
                <>
                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleAction("arrive", selected.id)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >Ghi nhận xe đến</button>
                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleAction("no-show", selected.id)}
                    className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >No-show</button>
                </>
              )}
              {selected.status === "ARRIVED" && (
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAction("complete", selected.id)}
                  className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >Hoàn thành</button>
              )}
              {["PENDING", "CONFIRMED"].includes(selected.status) && (
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAction("cancel", selected.id)}
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm rounded-lg hover:bg-red-100 disabled:opacity-50"
                >Huỷ lịch</button>
              )}
              <button onClick={() => setSelected(null)} className="ml-auto px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
