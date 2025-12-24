import React from "react";
import { LucideIcon, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardVariant = "default" | "blue" | "green" | "emerald" | "orange" | "amber";

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
        bg: "bg-white",
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        textColor: "text-slate-900",
        borderColor: "border-slate-200"
    },
    emerald: {
        bg: "bg-emerald-50",
        iconBg: "bg-emerald-500",
        iconColor: "text-white",
        textColor: "text-emerald-900",
        borderColor: "border-emerald-100"
    },
    green: { // Alias for emerald if needed, or slightly different
        bg: "bg-emerald-50",
        iconBg: "bg-emerald-500",
        iconColor: "text-white",
        textColor: "text-emerald-900",
        borderColor: "border-emerald-100"
    },
    blue: {
        bg: "bg-sky-50",
        iconBg: "bg-sky-500",
        iconColor: "text-white",
        textColor: "text-sky-900",
        borderColor: "border-sky-100"
    },
    orange: {
        bg: "bg-orange-50",
        iconBg: "bg-orange-500",
        iconColor: "text-white",
        textColor: "text-orange-900",
        borderColor: "border-orange-100"
    },
    amber: {
        bg: "bg-amber-50",
        iconBg: "bg-amber-500",
        iconColor: "text-white",
        textColor: "text-amber-900",
        borderColor: "border-amber-100"
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
            "p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border",
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
                <div className={cn("p-2.5 rounded-xl shadow-sm", styles.iconBg)}>
                    <Icon className={cn("w-6 h-6", styles.iconColor)} />
                </div>
            </div>

            {/* Footer with Trend or Description */}
            <div className="flex items-center gap-2">
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-sm font-bold",
                        trend.isPositive
                            ? (variant === 'default' ? "text-emerald-600" : "text-emerald-600")
                            : "text-rose-600"
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
