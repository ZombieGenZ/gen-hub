import React from "react";
import { Badge } from "@/components/ui/badge";
import type { ExportStatus } from "@/services/inventory/inventory.types";

const STATUS_CONFIG: Record<ExportStatus, { label: string; className: string }> = {
    PENDING: { label: "Chờ xử lý", className: "outbound-status--pending bg-amber-50 text-amber-600 border-amber-200" },
    PICKING: { label: "Đang nhặt hàng", className: "outbound-status--picking bg-blue-50 text-blue-600 border-blue-200" },
    CHECKING: { label: "Đang kiểm tra", className: "outbound-status--checking bg-indigo-50 text-indigo-600 border-indigo-200" },
    PACKED: { label: "Đã đóng gói", className: "outbound-status--packed bg-purple-50 text-purple-600 border-purple-200" },
    SHIPPED: { label: "Đã xuất kho", className: "outbound-status--shipped bg-emerald-50 text-emerald-600 border-emerald-200" },
    CANCELLED: { label: "Đã hủy", className: "outbound-status--cancelled bg-slate-50 text-slate-600 border-slate-200" },
};

export function OutboundStatusBadge({ status }: { status: ExportStatus }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    return (
        <Badge
            variant="outline"
            className={`rounded-full font-normal px-3 py-0.5 text-xs border ${config.className}`}
        >
            {config.label}
        </Badge>
    );
}
