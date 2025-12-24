import React from "react";
import { LucideIcon, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    className,
}: StatCardProps) {
    return (
        <div className={cn(
            "p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300",
            className
        )}>
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full",
                        trend.isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                    )}>
                        {trend.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
                {description && (
                    <p className="text-xs text-slate-400 mt-2">{description}</p>
                )}
            </div>
        </div>
    );
}
