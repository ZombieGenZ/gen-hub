import React from "react";
import { LucideIcon, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardVariant = "default" | "blue" | "green" | "emerald" | "brand";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    description?: string;
    className?: string;
    variant?: StatCardVariant;
}

const variantStyles: Record<StatCardVariant, {
    bg: string;
    iconBg: string;
    iconColor: string;
    textColor: string;
    borderColor: string;
}> = {
    default: {
        bg: "bg-bg-elevated",
        iconBg: "bg-brand/10",
        iconColor: "text-brand",
        textColor: "text-text",
        borderColor: "border-border"
    },
    emerald: {
        bg: "bg-success/5",
        iconBg: "bg-success",
        iconColor: "text-white",
        textColor: "text-success",
        borderColor: "border-success/10"
    },
    green: {
        bg: "bg-success/5",
        iconBg: "bg-success",
        iconColor: "text-white",
        textColor: "text-success",
        borderColor: "border-success/10"
    },
    blue: {
        bg: "bg-info/5",
        iconBg: "bg-info",
        iconColor: "text-white",
        textColor: "text-info",
        borderColor: "border-info/10"
    },
    brand: {
        bg: "bg-brand/5",
        iconBg: "bg-brand",
        iconColor: "text-white",
        textColor: "text-brand",
        borderColor: "border-brand/10"
    }
};

export function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    className,
    variant = "default",
}: StatCardProps) {
    const styles = variantStyles[variant] || variantStyles.default;

    return (
        <div className={cn(
            "p-6 rounded-lg shadow-premium hover:shadow-2xl transition-all duration-300 border-0 bg-white",
            styles.bg,
            styles.borderColor,
            className
        )}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className={cn("text-sm font-medium mb-1", variant === 'default' ? "text-slate-500" : styles.textColor, "opacity-80")}>
                        {title}
                    </p>
                    <h3 className={cn("text-3xl font-bold", styles.textColor)}>{value}</h3>
                </div>
                <div className={cn("p-3 rounded-full shadow-sm", styles.iconBg)}>
                    <Icon className={cn("w-6 h-6", styles.iconColor)} />
                </div>
            </div>

            {/* Footer with Trend or Description */}
            <div className="flex items-center gap-2">
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-sm font-bold",
                        trend.isPositive
                            ? "text-chart-1" // Teal
                            : "text-chart-2" // Rose/Coral
                    )}>
                        {trend.isPositive ? '+' : ''}{Math.abs(trend.value)}%
                        <span className={cn("text-xs font-normal ml-1", variant === 'default' ? "text-slate-500" : styles.textColor, "opacity-70")}>
                            {description || "từ tháng trước"}
                        </span>
                    </div>
                )}
                {!trend && description && (
                    <p className={cn("text-xs", variant === 'default' ? "text-slate-400" : styles.textColor, "opacity-70")}>
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}
