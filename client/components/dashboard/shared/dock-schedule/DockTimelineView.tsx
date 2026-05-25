"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { DockSchedule } from "@/services/dock-schedule/dock-schedule.types";
import { DOCK_STATUS_COLORS, DOCK_STATUS_DOT, DOCK_STATUS_LABELS } from "@/services/dock-schedule/dock-schedule.types";

const HOUR_START = 6;
const HOUR_END = 20;
const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60;

const STATUS_BORDER: Record<string, string> = {
  PENDING: "border-l-yellow-400",
  CONFIRMED: "border-l-teal-600",
  ARRIVED: "border-l-green-500",
  COMPLETED: "border-l-gray-400",
  CANCELLED: "border-l-red-400",
  NO_SHOW: "border-l-orange-400",
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fmtTime(h: number, m = 0) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Dark tooltip that floats above an element */
function Tooltip({ text }: { text: string }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 invisible group-hover:visible pointer-events-none z-40 transition-opacity">
      <div className="bg-gray-900 text-white text-[11px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap">
        {text}
      </div>
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </div>
  );
}

interface Props {
  dockCount: number;
  schedules: DockSchedule[];
  onSelect?: (schedule: DockSchedule) => void;
  /** "compact" = staff default (56px rows); "detailed" = org view (96px rows, more info) */
  variant?: "compact" | "detailed";
  /** Highlight schedules owned by this org */
  currentOrgId?: string;
  /** ISO date string YYYY-MM-DD — enables "now" indicator when date = today */
  date?: string;
}

export function DockTimelineView({
  dockCount,
  schedules,
  onSelect,
  variant = "compact",
  currentOrgId,
  date,
}: Props) {
  const isDetailed = variant === "detailed";
  const ROW_HEIGHT = isDetailed ? 96 : 56;
  const MIN_WIDTH = isDetailed ? 1080 : 720;
  const LABEL_WIDTH = isDetailed ? 140 : 96;

  // Tick every minute so the now-line re-computes
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i),
    [],
  );

  const halfHourPercents = useMemo(() => {
    if (!isDetailed) return [];
    const result: number[] = [];
    for (let h = HOUR_START; h < HOUR_END; h++) {
      result.push(((h - HOUR_START + 0.5) * 60 / TOTAL_MINUTES) * 100);
    }
    return result;
  }, [isDetailed]);

  const byDock = useMemo(() => {
    const map: Record<number, DockSchedule[]> = {};
    for (let d = 1; d <= dockCount; d++) map[d] = [];
    for (const s of schedules) {
      if (!map[s.dock_number]) map[s.dock_number] = [];
      map[s.dock_number].push(s);
    }
    return map;
  }, [schedules, dockCount]);

  // Compute now position + label; re-evaluated every minute via tick
  const nowInfo = useMemo(() => {
    if (!date) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (date !== today) return null;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const totalMin = h * 60 + m - HOUR_START * 60;
    if (totalMin < 0 || totalMin > TOTAL_MINUTES) return null;
    return {
      percent: (totalMin / TOTAL_MINUTES) * 100,
      label: fmtTime(h, m),
    };
  }, [date, tick]);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* ── Header: hour labels ── */}
      <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        <div
          className="shrink-0 border-r border-gray-200 px-3 flex items-end pb-2"
          style={{ width: LABEL_WIDTH }}
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dock</span>
        </div>
        <div className="relative flex-1" style={{ minWidth: MIN_WIDTH }}>
          <div className="flex">
            {hours.map((h) => (
              <div
                key={h}
                className={`group relative flex-1 border-l border-gray-200 text-xs font-semibold text-gray-600 text-center cursor-default select-none ${isDetailed ? "py-3" : "py-2"}`}
              >
                {fmtTime(h)}
                {/* Hour tooltip */}
                <Tooltip
                  text={
                    h < HOUR_END
                      ? `${fmtTime(h)} – ${fmtTime(h + 1)}`
                      : fmtTime(h)
                  }
                />
              </div>
            ))}
          </div>

          {/* half-hour ticks */}
          {halfHourPercents.map((pct) => (
            <div
              key={pct}
              className="absolute bottom-0 h-2 border-l border-gray-300 pointer-events-none"
              style={{ left: `${pct}%` }}
            />
          ))}

          {/* "now" top label — shows actual HH:MM */}
          {nowInfo !== null && (
            <div
              className="absolute top-1 -translate-x-1/2 pointer-events-none z-20"
              style={{ left: `${nowInfo.percent}%` }}
            >
              <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1 whitespace-nowrap shadow-sm">
                {nowInfo.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Dock rows ── */}
      {Array.from({ length: dockCount }, (_, i) => i + 1).map((dock) => {
        const dockSchedules = byDock[dock] ?? [];
        const activeSchedules = dockSchedules.filter((s) =>
          ["CONFIRMED", "ARRIVED"].includes(s.status),
        );

        let dockBusy: boolean | null = null;
        if (nowInfo !== null) {
          const nowMin = (nowInfo.percent / 100) * TOTAL_MINUTES + HOUR_START * 60;
          dockBusy = activeSchedules.some((s) => {
            const start = toMinutes(s.scheduled_time_start);
            const end = toMinutes(s.scheduled_time_end);
            return nowMin >= start && nowMin < end;
          });
        }

        const validCount = dockSchedules.filter(
          (s) => !["CANCELLED", "NO_SHOW"].includes(s.status),
        ).length;

        return (
          <div
            key={dock}
            className="flex border-b border-gray-100 last:border-0 group"
          >
            {/* Dock label column */}
            <div
              className="shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col items-center justify-center py-3 gap-1 group-hover:bg-gray-100/60 transition-colors"
              style={{ width: LABEL_WIDTH }}
            >
              <span className={`font-bold text-gray-700 ${isDetailed ? "text-base" : "text-sm"}`}>
                Dock {dock}
              </span>
              {isDetailed && (
                <>
                  {dockBusy !== null && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        dockBusy
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {dockBusy ? "Đang bận" : "Trống"}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {validCount} lịch hôm nay
                  </span>
                </>
              )}
            </div>

            {/* Timeline row */}
            <div
              className="relative flex-1 group-hover:bg-primary/[0.02] transition-colors"
              style={{ minWidth: MIN_WIDTH, height: ROW_HEIGHT }}
            >
              {/* hour grid */}
              <div className="absolute inset-0 flex pointer-events-none">
                {hours.map((h) => (
                  <div key={h} className="flex-1 border-l border-gray-100" />
                ))}
              </div>

              {/* half-hour grid (detailed only) */}
              {halfHourPercents.map((pct) => (
                <div
                  key={pct}
                  className="absolute inset-y-0 border-l border-gray-50 pointer-events-none"
                  style={{ left: `${pct}%` }}
                />
              ))}

              {/* "now" vertical line + hover tooltip */}
              {nowInfo !== null && (
                <div
                  className="group/now absolute inset-y-0 z-10 cursor-default"
                  style={{ left: `${nowInfo.percent}%`, width: 16, marginLeft: -8 }}
                >
                  {/* visible line centred in the hit area */}
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-red-500/70" />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 invisible group-hover/now:visible pointer-events-none z-40">
                    <div className="bg-gray-900 text-white text-[11px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      ⏱ {nowInfo.label} — Hiện tại
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              )}

              {/* Schedule blocks */}
              {dockSchedules.map((s) => {
                const startMin = toMinutes(s.scheduled_time_start) - HOUR_START * 60;
                const endMin = toMinutes(s.scheduled_time_end) - HOUR_START * 60;
                const left = Math.max(0, (startMin / TOTAL_MINUTES) * 100);
                const width = Math.min(100 - left, ((endMin - startMin) / TOTAL_MINUTES) * 100);
                const colorClass =
                  DOCK_STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-700";
                const isOwn = !!currentOrgId && s.organization_id === currentOrgId;

                if (isDetailed) {
                  return (
                    <button
                      key={s.id}
                      className={[
                        "absolute top-2 bottom-2 rounded-lg px-2.5 py-1.5 text-left cursor-pointer",
                        "hover:opacity-90 hover:shadow-lg transition-all duration-150",
                        "border-l-4 overflow-hidden flex flex-col justify-between",
                        colorClass,
                        STATUS_BORDER[s.status] ?? "border-l-gray-400",
                        isOwn ? "ring-2 ring-offset-1 ring-primary shadow-md" : "shadow-sm",
                      ].join(" ")}
                      style={{ left: `${left}%`, width: `${width}%`, minWidth: 60 }}
                      onClick={() => onSelect?.(s)}
                      title={[
                        s.license_plate,
                        `${s.scheduled_time_start}–${s.scheduled_time_end}`,
                        DOCK_STATUS_LABELS[s.status],
                        s.driver_name ?? "",
                        s.carrier_name ?? "",
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    >
                      {/* Row 1: dot + plate + own badge */}
                      <div className="flex items-center gap-1 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${DOCK_STATUS_DOT[s.status]}`}
                        />
                        <span className="font-bold text-[11px] leading-tight truncate flex-1">
                          {s.license_plate}
                        </span>
                        {isOwn && (
                          <span className="text-[9px] font-semibold bg-primary text-primary-foreground px-1 rounded shrink-0">
                            Bạn
                          </span>
                        )}
                      </div>

                      {/* Row 2: time range */}
                      <div className="text-[10px] leading-tight truncate font-semibold">
                        {s.scheduled_time_start}–{s.scheduled_time_end}
                      </div>

                      {/* Row 3: status */}
                      <div className="text-[10px] leading-tight truncate font-medium">
                        {DOCK_STATUS_LABELS[s.status]}
                        {s.driver_name ? ` · ${s.driver_name}` : ""}
                      </div>
                    </button>
                  );
                }

                /* compact */
                return (
                  <button
                    key={s.id}
                    className={`absolute top-1.5 bottom-1.5 rounded-md px-2 text-xs font-medium truncate border flex items-center gap-1 cursor-pointer hover:opacity-90 transition-opacity ${colorClass}`}
                    style={{ left: `${left}%`, width: `${width}%`, minWidth: 48 }}
                    onClick={() => onSelect?.(s)}
                    title={`${s.license_plate} | ${s.scheduled_time_start}–${s.scheduled_time_end} | ${DOCK_STATUS_LABELS[s.status]}`}
                  >
                    <span className="truncate">{s.license_plate}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend (detailed only) */}
      {isDetailed && (
        <div className="border-t border-gray-100 px-4 py-2.5 flex flex-wrap gap-4 bg-gray-50">
          {(["PENDING", "CONFIRMED", "ARRIVED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const).map(
            (st) => (
              <div key={st} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${DOCK_STATUS_DOT[st]}`} />
                {DOCK_STATUS_LABELS[st]}
              </div>
            ),
          )}
          {nowInfo !== null && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
              <span className="w-3 border-t-2 border-red-500" />
              {nowInfo.label} — Hiện tại
            </div>
          )}
          {currentOrgId && (
            <div className="flex items-center gap-1.5 text-xs text-teal-700">
              <span className="w-3 h-3 border-2 border-teal-600 rounded-sm" />
              Lịch của bạn
            </div>
          )}
        </div>
      )}
    </div>
  );
}
