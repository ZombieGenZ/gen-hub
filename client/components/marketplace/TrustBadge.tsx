"use client";

import { ShieldCheckIcon, StarIcon } from "@heroicons/react/24/solid";
import type { TrustBadgeLevel } from "@/services/warehouse-trust/warehouse-trust.types";

interface TrustBadgeProps {
    level: TrustBadgeLevel;
    size?: "sm" | "md";
    showLabel?: boolean;
}

export function TrustBadge({ level, size = "sm", showLabel = true }: TrustBadgeProps) {
    if (level === "NONE") return null;

    const isPremium = level === "PREMIUM";
    const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    const textSize = size === "sm" ? "text-xs" : "text-sm";

    if (isPremium) {
        return (
            <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium
                    bg-amber-50 text-amber-700 border border-amber-200 ${textSize}`}
                title="Đối tác uy tín - đã xác minh và có thành tích xuất sắc"
            >
                <StarIcon className={`${iconSize} text-amber-500`} />
                {showLabel && "Đối tác uy tín"}
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium
                bg-blue-50 text-blue-700 border border-blue-200 ${textSize}`}
            title="Kho đã được xác minh tài liệu pháp lý"
        >
            <ShieldCheckIcon className={`${iconSize} text-blue-500`} />
            {showLabel && "Đã xác minh"}
        </span>
    );
}
