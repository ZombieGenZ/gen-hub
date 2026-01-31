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
}

export function NavItem({ href, icon: Icon, label, isActive, isCollapsed }: NavItemProps) {
    const linkContent = (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 py-2.5 rounded-full transition-all group outline-none",
                isCollapsed ? "justify-center px-0 w-full" : "px-4",
                isActive
                    ? "bg-brand/10 text-brand font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
        >
            <Icon className={cn(
                "w-5 h-5 transition-colors flex-shrink-0",
                isActive ? "text-brand" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
            )} />
            <span className={cn(
                "whitespace-nowrap transition-all duration-300 overflow-hidden text-[13px] font-medium leading-none",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"
            )}>
                {label}
            </span>
        </Link>
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
