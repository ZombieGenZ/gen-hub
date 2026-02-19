"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Clock,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Lock,
    Archive,
    Ban,
    CircleCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ContractStatus =
    | "PENDING"
    | "ACTIVE"
    | "OVERDUE_LEVEL_1"
    | "OVERDUE_LEVEL_2"
    | "OVERDUE_LEVEL_3"
    | "SEALED"
    | "LIQUIDATED"
    | "CANCELLED"
    | "COMPLETED";

interface StatusConfig {
    label: string;
    className: string;
    dotColor: string;
    icon: LucideIcon;
}

const STATUS_MAP: Record<ContractStatus, StatusConfig> = {
    PENDING: {
        label: "Chờ thanh toán",
        className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
        dotColor: "bg-amber-500",
        icon: Clock,
    },
    ACTIVE: {
        label: "Đang hoạt động",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
        dotColor: "bg-emerald-500",
        icon: CheckCircle2,
    },
    OVERDUE_LEVEL_1: {
        label: "Quá hạn (L1)",
        className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
        dotColor: "bg-orange-500",
        icon: AlertTriangle,
    },
    OVERDUE_LEVEL_2: {
        label: "Quá hạn (L2)",
        className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
        dotColor: "bg-red-500",
        icon: AlertTriangle,
    },
    OVERDUE_LEVEL_3: {
        label: "Quá hạn (L3)",
        className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-700",
        dotColor: "bg-red-700",
        icon: AlertTriangle,
    },
    SEALED: {
        label: "Niêm phong",
        className: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600",
        dotColor: "bg-slate-500",
        icon: Lock,
    },
    LIQUIDATED: {
        label: "Đã thanh lý",
        className: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600",
        dotColor: "bg-gray-500",
        icon: Archive,
    },
    CANCELLED: {
        label: "Đã hủy",
        className: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800",
        dotColor: "bg-rose-400",
        icon: Ban,
    },
    COMPLETED: {
        label: "Hoàn thành",
        className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
        dotColor: "bg-blue-500",
        icon: CircleCheck,
    },
};

const DEFAULT_CONFIG: StatusConfig = {
    label: "Không xác định",
    className: "bg-gray-50 text-gray-500 border-gray-200",
    dotColor: "bg-gray-400",
    icon: Clock,
};

interface ContractStatusBadgeProps {
    status: string;
    showIcon?: boolean;
    showDot?: boolean;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function ContractStatusBadge({
    status,
    showIcon = false,
    showDot = true,
    size = "md",
    className,
}: ContractStatusBadgeProps) {
    const config = STATUS_MAP[status as ContractStatus] || DEFAULT_CONFIG;
    const Icon = config.icon;

    const sizeClasses = {
        sm: "text-[10px] px-1.5 py-0",
        md: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
    };

    return (
        <Badge
            variant="outline"
            className={cn(
                "font-medium inline-flex items-center gap-1.5 whitespace-nowrap",
                sizeClasses[size],
                config.className,
                className,
            )}
        >
            {showDot && !showIcon && (
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotColor)} />
            )}
            {showIcon && <Icon className="w-3 h-3 shrink-0" />}
            {config.label}
        </Badge>
    );
}

/** Get the banner config for the detail page top bar */
export function getContractStatusBanner(status: string): {
    message: string;
    className: string;
} {
    switch (status) {
        case "PENDING":
            return {
                message: "Hợp đồng đang chờ thanh toán",
                className: "bg-amber-50 text-amber-800 border-b border-amber-200",
            };
        case "ACTIVE":
            return {
                message: "Hợp đồng đang hoạt động",
                className: "bg-emerald-50 text-emerald-800 border-b border-emerald-200",
            };
        case "OVERDUE_LEVEL_1":
        case "OVERDUE_LEVEL_2":
        case "OVERDUE_LEVEL_3":
            return {
                message: "Hợp đồng đã quá hạn thanh toán",
                className: "bg-red-50 text-red-800 border-b border-red-200",
            };
        case "SEALED":
            return {
                message: "Kho đã bị niêm phong do không thanh toán",
                className: "bg-slate-100 text-slate-800 border-b border-slate-300",
            };
        case "LIQUIDATED":
            return {
                message: "Kho đã bị thanh lý",
                className: "bg-gray-100 text-gray-800 border-b border-gray-300",
            };
        case "CANCELLED":
            return {
                message: "Hợp đồng đã bị hủy",
                className: "bg-rose-50 text-rose-800 border-b border-rose-200",
            };
        case "COMPLETED":
            return {
                message: "Hợp đồng đã hoàn thành",
                className: "bg-blue-50 text-blue-800 border-b border-blue-200",
            };
        default:
            return {
                message: "Trạng thái không xác định",
                className: "bg-gray-50 text-gray-600 border-b border-gray-200",
            };
    }
}

/** Helper to get the label only */
export function getContractStatusLabel(status: string): string {
    return (STATUS_MAP[status as ContractStatus] || DEFAULT_CONFIG).label;
}

export { STATUS_MAP };
