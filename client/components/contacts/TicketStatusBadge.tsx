"use client";

import React from "react";
import { cn } from "@/lib/utils";

type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';

const statusConfig: Record<TicketStatus, { label: string; bg: string; text: string; dot: string }> = {
    OPEN: { label: "Mở", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    PENDING: { label: "Chờ xử lý", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    RESOLVED: { label: "Đã xử lý", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    CLOSED: { label: "Đóng", bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
};

interface TicketStatusBadgeProps {
    status: string;
    isSkipped?: boolean;
    className?: string;
}

export function TicketStatusBadge({ status, isSkipped, className }: TicketStatusBadgeProps) {
    if (isSkipped) {
        return (
            <span
                className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-400 line-through",
                    className
                )}
                style={{ borderRadius: "12px" }}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                Spam
            </span>
        );
    }

    const config = statusConfig[status as TicketStatus] || statusConfig.OPEN;

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium",
                config.bg,
                config.text,
                className
            )}
            style={{ borderRadius: "12px" }}
        >
            <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
            {config.label}
        </span>
    );
}
