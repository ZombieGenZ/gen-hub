import { Badge } from "@/components/ui/badge";
import type { ReceiptStatus } from "@/services/inventory/inventory.types";

const STATUS_CONFIG: Record<ReceiptStatus, { label: string; className: string }> = {
    PENDING: { label: "Chờ xử lý", className: "inbound-status--pending bg-amber-50 text-amber-600 border-amber-200" },
    APPROVED: { label: "Đã duyệt", className: "inbound-status--approved bg-blue-50 text-blue-600 border-blue-200" },
    RECEIVING: { label: "Đang kiểm đếm", className: "inbound-status--receiving bg-purple-50 text-purple-600 border-purple-200" },
    PROCESSING: { label: "Đang nhập kho", className: "inbound-status--processing bg-indigo-50 text-indigo-600 border-indigo-200" },
    PUTAWAY: { label: "Đang cất hàng", className: "inbound-status--putaway bg-teal-50 text-teal-600 border-teal-200" },
    COMPLETED: { label: "Hoàn thành", className: "inbound-status--completed bg-green-50 text-green-600 border-green-200" },
    CANCELLED: { label: "Đã hủy", className: "inbound-status--cancelled bg-red-50 text-red-600 border-red-200" },
};

export function InboundStatusBadge({ status }: { status: ReceiptStatus }) {
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
