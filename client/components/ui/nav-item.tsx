"use client";

import Link from "next/link";
import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface NavItemProps {
    href: string;
    icon: any;
    label: string;
    isActive?: boolean;
    isCollapsed?: boolean;
    badge?: string;
    disabled?: boolean;
}

export function NavItem({ href, icon: Icon, label, isActive, isCollapsed, badge, disabled }: NavItemProps) {
    const inner = (
        <>
            <Icon className={cn(
                "w-5 h-5 transition-colors flex-shrink-0",
                disabled
                    ? "text-sidebar-foreground/30"
                    : isActive ? "text-brand" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
            )} />
            <span className={cn(
                "whitespace-nowrap transition-all duration-300 overflow-hidden text-[13px] font-medium leading-none",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block",
                disabled && "text-sidebar-foreground/40"
            )}>
                {label}
            </span>
            {badge && !isCollapsed && (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 leading-none">
                    {badge}
                </span>
            )}
        </>
    );

    const baseClass = cn(
        "flex items-center gap-3 py-2.5 rounded-full transition-all group outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isCollapsed ? "justify-center px-0 w-full" : "px-4",
        disabled
            ? "opacity-50 cursor-not-allowed pointer-events-none"
            : isActive
                ? "bg-brand/10 text-brand font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );

    const linkContent = disabled ? (
        <span className={baseClass} role="link" aria-disabled="true" tabIndex={-1}>{inner}</span>
    ) : (
        <Link href={href} className={baseClass}>{inner}</Link>
    );

    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-full flex justify-center outline-none bg-transparent border-none p-0 cursor-pointer">
                        {linkContent}
                    </div>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    sideOffset={20}
                    showArrow={true}
                    className="bg-teal-700 text-white border-none rounded-full px-6 py-2 font-bold text-xs shadow-xl"
                >
                    {label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return linkContent;
}
