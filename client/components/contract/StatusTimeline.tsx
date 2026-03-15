"use client";

import { cn } from "@/lib/utils";
import {
    FileText,
    CreditCard,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Lock,
    Archive,
    RefreshCw,
    Pen,
} from "lucide-react";

export interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    description?: string;
    type: "created" | "payment" | "activated" | "renewed" | "cancelled" | "overdue" | "sealed" | "liquidated" | "completed" | "updated" | "signed";
    actor?: string;
}

const TYPE_CONFIG: Record<TimelineEvent["type"], { icon: typeof FileText; color: string; bgColor: string }> = {
    created: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/40" },
    payment: { icon: CreditCard, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/40" },
    activated: { icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/40" },
    renewed: { icon: RefreshCw, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/40" },
    cancelled: { icon: XCircle, color: "text-rose-600", bgColor: "bg-rose-100 dark:bg-rose-900/40" },
    overdue: { icon: AlertTriangle, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/40" },
    sealed: { icon: Lock, color: "text-slate-600", bgColor: "bg-slate-200 dark:bg-slate-700/40" },
    liquidated: { icon: Archive, color: "text-gray-600", bgColor: "bg-gray-200 dark:bg-gray-700/40" },
    completed: { icon: CheckCircle2, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/40" },
    updated: { icon: Pen, color: "text-violet-600", bgColor: "bg-violet-100 dark:bg-violet-900/40" },
    signed: { icon: Pen, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/40" },
};

interface StatusTimelineProps {
    events: TimelineEvent[];
    className?: string;
}

export function StatusTimeline({ events, className }: StatusTimelineProps) {
    if (events.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Chưa có lịch sử hoạt động
            </div>
        );
    }

    return (
        <div className={cn("relative", className)}>
            {events.map((event, index) => {
                const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.created;
                const Icon = config.icon;
                const isLast = index === events.length - 1;

                return (
                    <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                        {/* Vertical line */}
                        {!isLast && (
                            <div className="absolute left-4.25 top-10 bottom-0 w-px bg-border" />
                        )}

                        {/* Icon circle */}
                        <div
                            className={cn(
                                "relative z-10 flex items-center justify-center w-9 h-9 rounded-full shrink-0",
                                config.bgColor,
                            )}
                        >
                            <Icon className={cn("w-4 h-4", config.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1">
                            <p className="text-sm font-medium text-foreground leading-tight">
                                {event.title}
                            </p>
                            {event.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {event.description}
                                </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                                <time className="text-[11px] text-muted-foreground/70">
                                    {formatTimelineDate(event.date)}
                                </time>
                                {event.actor && (
                                    <>
                                        <span className="text-muted-foreground/40">·</span>
                                        <span className="text-[11px] text-muted-foreground/70">
                                            {event.actor}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function formatTimelineDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateStr;
    }
}
