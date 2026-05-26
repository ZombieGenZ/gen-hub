"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { orgHelper } from "@/lib/organization.utils";
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import { DockScheduleService } from "@/services/dock-schedule/dock-schedule.service";
import type {
  DockSchedule,
  DockScheduleStatus,
  DockSlotsResult,
} from "@/services/dock-schedule/dock-schedule.types";
import { DOCK_STATUS_LABELS } from "@/services/dock-schedule/dock-schedule.types";
import { DockScheduleStatusBadge } from "@/components/dashboard/shared/dock-schedule/DockScheduleStatusBadge";
import { DockTimelineView } from "@/components/dashboard/shared/dock-schedule/DockTimelineView";
import { DockScheduleForm } from "@/components/dashboard/shared/dock-schedule/DockScheduleForm";
import { useToast } from "@/contexts/ToastContext";

const dockService = new DockScheduleService();

interface WarehouseOption {
  id: string;
  name: string;
}

type ViewMode = "timeline" | "list";

const PURPOSE_LABELS: Record<string, string> = {
  INBOUND: "Nhập hàng",
  OUTBOUND: "Xuất hàng",
  VISIT: "Thăm kho",
  DELIVERY: "Giao hàng",
  OTHER: "Khác",
};

export default function OrgDockSchedulePage() {
  const { showToast } = useToast();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [schedules, setSchedules] = useState<DockSchedule[]>([]);
  const [timelineSchedules, setTimelineSchedules] = useState<DockSchedule[]>([]);
  const [slots, setSlots] = useState<DockSlotsResult | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState<DockScheduleStatus | "">("");
  const [filterWarehouseId, setFilterWarehouseId] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<DockSchedule | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<DockSchedule | null>(null);

  const token = authStorage.getAccessToken() ?? "";

  // Init: get orgId + warehouses from active contracts
  useEffect(() => {
    (async () => {
      const id = await orgHelper.getOrgId(token);
      if (!id) return;
      setOrgId(id);

      try {
        const res = await rentalContractService.getOrgRentalContracts(token, id, {
          status: "ACTIVE",
          limit: 100,
        });

        const items: Array<{
          details?: Array<{
            warehouse_template?: { id: string; name: string } | null;
          }>;
        }> = res?.items ?? [];

        const warehouseMap = new Map<string, string>();
        for (const contract of items) {
          for (const detail of contract.details ?? []) {
            const wt = detail.warehouse_template;
            if (wt?.id) warehouseMap.set(wt.id, wt.name);
          }
        }

        const list = Array.from(warehouseMap.entries()).map(([wId, name]) => ({
          id: wId,
          name,
        }));
        setWarehouses(list);
        // Không auto-chọn — mặc định "Tất cả kho"
      } catch {
        // fallback
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchSchedules = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // Always fetch org's own schedules (for list view + cancel)
      const listPromise = dockService.list(token, {
        organization_id: orgId,
        date: filterDate || undefined,
        status: filterStatus || undefined,
        warehouse_template_id: filterWarehouseId || undefined,
        limit: 200,
      });

      // Fetch slots for timeline view (all schedules by dock for selected warehouse+date)
      const slotsPromise =
        filterWarehouseId && filterDate
          ? dockService.getSlots(token, filterWarehouseId, filterDate)
          : Promise.resolve(null);

      const [listRes, slotsRes] = await Promise.all([listPromise, slotsPromise]);

      setSchedules(listRes.items);
      setTotal(listRes.total);

      if (slotsRes) {
        setSlots(slotsRes);
        setTimelineSchedules(Object.values(slotsRes.slots).flat());
      } else {
        setSlots(null);
        setTimelineSchedules([]);
      }
    } catch {
      showToast("Không thể tải danh sách lịch dock", "error");
    } finally {
      setLoading(false);
    }
  }, [orgId, token, filterDate, filterStatus, filterWarehouseId, showToast]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(cancelTarget.id);
    try {
      await dockService.cancel(token, cancelTarget.id, cancelReason || undefined);
      showToast("Đã huỷ lịch dock", "success");
      setCancelTarget(null);
      setCancelReason("");
      await fetchSchedules();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi huỷ lịch", "error");
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

  const selectedWarehouseName =
    warehouses.find((w) => w.id === filterWarehouseId)?.name ?? "";

  // Khi "Tất cả kho": nhóm schedules theo warehouse để render nhiều timeline
  const warehouseGroups = useMemo(() => {
    if (filterWarehouseId) return null;
    const map = new Map<string, { id: string; name: string; dockCount: number; schedules: DockSchedule[] }>();
    for (const s of schedules) {
      const wId = s.warehouse_template_id;
      if (!map.has(wId)) {
        map.set(wId, {
          id: wId,
          name: s.warehouse_template?.name ?? wId,
          dockCount: s.warehouse_template?.dock_count ?? Math.max(s.dock_number, 1),
          schedules: [],
        });
      }
      const g = map.get(wId)!;
      if (s.warehouse_template?.dock_count) {
        g.dockCount = s.warehouse_template.dock_count;
      } else {
        g.dockCount = Math.max(g.dockCount, s.dock_number);
      }
      g.schedules.push(s);
    }
    return Array.from(map.values());
  }, [schedules, filterWarehouseId]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Lịch Đặt Dock</h1>
            <p className="text-sm text-gray-500 mt-0.5">Đặt lịch xe ra vào kho và xem trạng thái theo thời gian thực</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            disabled={warehouses.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <span>+</span> Đặt lịch mới
          </button>
        </div>

        {warehouses.length === 0 && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
            Bạn chưa có hợp đồng thuê kho nào đang hoạt động. Vui lòng ký hợp đồng để đặt lịch dock.
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
          {/* Warehouse selector */}
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-700 mb-1">Kho</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={filterWarehouseId}
              onChange={(e) => setFilterWarehouseId(e.target.value)}
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ngày</label>
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {/* Status (list only) */}
          {viewMode === "list" && (
            <div className="min-w-40">
              <label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as DockScheduleStatus | "")
                }
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm ml-auto">
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-4 py-2 transition-colors font-medium ${viewMode === "timeline" ? "bg-primary text-primary-foreground" : "bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              Sơ đồ dock
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 transition-colors font-medium ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              Lịch của tôi
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === "timeline" ? (
          /* ── Timeline view ── */
          filterWarehouseId ? (
            /* 1 kho cụ thể: dùng slots từ API, hiển thị tất cả org */
            <div className="space-y-3">
              {filterWarehouseId && filterDate && slots && (
                <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm">
                  <span className="font-semibold text-gray-800">{selectedWarehouseName}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-700">
                    {new Date(filterDate + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-700"><span className="font-semibold text-gray-800">{slots.dock_count}</span> dock</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-700">
                    <span className="font-semibold text-teal-700">{timelineSchedules.filter((s) => s.organization_id === orgId).length}</span> lịch của bạn
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-700">
                    Tổng <span className="font-semibold text-gray-800">{timelineSchedules.filter((s) => !["CANCELLED", "NO_SHOW"].includes(s.status)).length}</span> lịch hôm nay
                  </span>
                </div>
              )}
              {!slots ? (
                <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-16 text-sm text-gray-600">
                  Không có dữ liệu dock cho ngày này
                </div>
              ) : (
                <DockTimelineView
                  dockCount={slots.dock_count}
                  schedules={timelineSchedules}
                  onSelect={setSelectedSchedule}
                  variant="detailed"
                  currentOrgId={orgId ?? undefined}
                  date={filterDate}
                />
              )}
            </div>
          ) : (
            /* Tất cả kho: nhóm theo warehouse */
            warehouseGroups && warehouseGroups.length > 0 ? (
              <div className="space-y-6">
                {warehouseGroups.map((g) => (
                  <div key={g.id}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-sm font-semibold text-gray-800">{g.name}</span>
                      <span className="text-xs text-gray-600">{g.schedules.length} lịch của bạn · {g.dockCount} dock</span>
                    </div>
                    <DockTimelineView
                      dockCount={g.dockCount}
                      schedules={g.schedules}
                      onSelect={setSelectedSchedule}
                      variant="detailed"
                      currentOrgId={orgId ?? undefined}
                      date={filterDate}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center py-16 text-sm text-gray-600">
                <div className="text-center">
                  <div className="text-4xl mb-3">📅</div>
                  Chưa có lịch dock nào
                </div>
              </div>
            )
          )
        ) : (
          /* ── List view (own schedules) ── */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {schedules.length === 0 ? (
              <div className="text-center py-16 text-gray-600 text-sm">
                <div className="text-4xl mb-3">📅</div>
                Chưa có lịch dock nào
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {[
                        "Mã lịch",
                        "Kho",
                        "Dock",
                        "Ngày hẹn",
                        "Giờ",
                        "Biển số",
                        "Tài xế",
                        "Mục đích",
                        "Trạng thái",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schedules.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedSchedule(s)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{s.code}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {s.warehouse_template?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          Dock {s.dock_number}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {new Date(s.scheduled_date).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {s.scheduled_time_start}–{s.scheduled_time_end}
                        </td>
                        <td className="px-4 py-3 font-semibold text-teal-700">
                          {s.license_plate}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {s.driver_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {PURPOSE_LABELS[s.purpose] ?? s.purpose}
                        </td>
                        <td className="px-4 py-3">
                          <DockScheduleStatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {["PENDING", "CONFIRMED"].includes(s.status) && (
                            <button
                              onClick={() => {
                                setCancelTarget(s);
                                setCancelReason("");
                              }}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Huỷ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {total > schedules.length && (
                  <div className="px-4 py-3 text-xs text-gray-600 border-t border-gray-100">
                    Hiển thị {schedules.length}/{total} lịch
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal: tạo lịch */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Đặt lịch dock mới</h2>
            <DockScheduleForm
              token={token}
              warehouses={warehouses}
              organizationId={orgId ?? undefined}
              onSuccess={() => {
                setShowForm(false);
                fetchSchedules();
                showToast("Đặt lịch thành công. Vui lòng chờ staff xác nhận.", "success");
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Modal: xác nhận huỷ */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-2">Huỷ lịch dock?</h2>
            <p className="text-sm text-gray-700 mb-4">
              Bạn chắc chắn muốn huỷ lịch{" "}
              <span className="font-semibold">{cancelTarget.code}</span>?
            </p>
            <textarea
              rows={2}
              placeholder="Lý do huỷ (không bắt buộc)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Không
              </button>
              <button
                disabled={!!actionLoading}
                onClick={handleCancel}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Huỷ lịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: chi tiết lịch (từ click timeline) */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-mono text-xs text-gray-500">{selectedSchedule.code}</p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                  Dock {selectedSchedule.dock_number}
                </h2>
              </div>
              <DockScheduleStatusBadge status={selectedSchedule.status} />
            </div>

            <div className="space-y-2 text-sm">
              {[
                ["Kho", selectedSchedule.warehouse_template?.name ?? (selectedWarehouseName || "—")],
                [
                  "Ngày hẹn",
                  new Date(selectedSchedule.scheduled_date).toLocaleDateString("vi-VN", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                ],
                [
                  "Giờ",
                  `${selectedSchedule.scheduled_time_start} – ${selectedSchedule.scheduled_time_end}`,
                ],
                ["Biển số", selectedSchedule.license_plate],
                ["Tài xế", selectedSchedule.driver_name ?? "—"],
                ["SĐT tài xế", selectedSchedule.driver_phone ?? "—"],
                ["Hãng vận chuyển", selectedSchedule.carrier_name ?? "—"],
                ["Mục đích", PURPOSE_LABELS[selectedSchedule.purpose] ?? selectedSchedule.purpose],
                selectedSchedule.notes ? ["Ghi chú", selectedSchedule.notes] : null,
                selectedSchedule.cancellation_reason
                  ? ["Lý do huỷ", selectedSchedule.cancellation_reason]
                  : null,
              ]
                .filter((row): row is [string, string] => row !== null)
                .map(([label, value]) => (
                  <div key={label} className="flex items-start gap-4">
                    <span className="text-gray-500 w-36 shrink-0">{label}</span>
                    <span className="text-gray-900 font-medium">{value}</span>
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
              {["PENDING", "CONFIRMED"].includes(selectedSchedule.status) &&
                selectedSchedule.organization_id === orgId && (
                  <button
                    onClick={() => {
                      setSelectedSchedule(null);
                      setCancelTarget(selectedSchedule);
                      setCancelReason("");
                    }}
                    className="px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
                  >
                    Huỷ lịch
                  </button>
                )}
              <button
                onClick={() => setSelectedSchedule(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
