"use client";

import React from "react";
import {
    ExclamationTriangleIcon,
    ExclamationCircleIcon,
    MinusCircleIcon,
    ArrowDownCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

const priorityConfig: Record<Priority, {
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
}> = {
    URGENT: { label: "Khẩn cấp", icon: ExclamationTriangleIcon, color: "text-red-500" },
    HIGH: { label: "Cao", icon: ExclamationCircleIcon, color: "text-red-400" },
    MEDIUM: { label: "Trung bình", icon: MinusCircleIcon, color: "text-amber-500" },
    LOW: { label: "Thấp", icon: ArrowDownCircleIcon, color: "text-slate-400" },
};

interface TicketPriorityIconProps {
    priority: string;
    showLabel?: boolean;
    className?: string;
}

export function TicketPriorityIcon({ priority, showLabel = false, className }: TicketPriorityIconProps) {
    const config = priorityConfig[priority as Priority] || priorityConfig.LOW;
    const Icon = config.icon;

    return (
        <span className={cn("inline-flex items-center gap-1.5", className)}>
            <Icon className={cn("w-4 h-4", config.color)} />
            {showLabel && (
                <span className={cn("text-xs font-medium", config.color)}>
                    {config.label}
                </span>
            )}
        </span>
    );
}
