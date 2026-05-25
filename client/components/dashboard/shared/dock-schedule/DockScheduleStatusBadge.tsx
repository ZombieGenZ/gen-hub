"use client";

import { DOCK_STATUS_COLORS, DOCK_STATUS_DOT, DOCK_STATUS_LABELS } from "@/services/dock-schedule/dock-schedule.types";
import type { DockScheduleStatus } from "@/services/dock-schedule/dock-schedule.types";

interface Props {
  status: DockScheduleStatus;
}

export function DockScheduleStatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${DOCK_STATUS_COLORS[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOCK_STATUS_DOT[status]}`} />
      {DOCK_STATUS_LABELS[status]}
    </span>
  );
}
