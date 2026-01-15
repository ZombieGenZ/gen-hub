"use client";

import Link from "next/link";
import * as React from "react";
import { Tooltip } from '@base-ui/react/tooltip';
import { cn } from "@/lib/utils";

export interface NavItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    isCollapsed?: boolean;
}

function ArrowSvg(props: React.ComponentProps<'svg'>) {
    return (
        <svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
            <path d="M0 10L10 0L20 10H0Z" className="fill-teal-700" />
        </svg>
    );
}

export function NavItem({ href, icon: Icon, label, isActive, isCollapsed }: NavItemProps) {
    const linkContent = (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 py-2.5 rounded-lg transition-all group outline-none",
                isCollapsed ? "justify-center px-0 w-full" : "px-3",
                isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium hover:bg-sidebar-border"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
        >
            <Icon className={cn(
                "w-5 h-5 transition-colors flex-shrink-0",
                isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
            )} />
            <span className={cn(
                "whitespace-nowrap transition-all duration-300 overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"
            )}>
                {label}
            </span>
        </Link>
    );

    if (isCollapsed) {
        return (
            <Tooltip.Root>
                <Tooltip.Trigger className="w-full flex justify-center outline-none bg-transparent border-none p-0 cursor-pointer" render={linkContent} />
                <Tooltip.Portal>
                    <Tooltip.Positioner sideOffset={20} side="right">
                        <Tooltip.Popup className="flex origin-[var(--transform-origin)] flex-col rounded-full bg-teal-700 px-6 py-2 text-xs font-bold text-white shadow-xl outline-none transition-[transform,scale,opacity] data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[instant]:duration-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 z-[100]">
                            <Tooltip.Arrow className="data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=left]:rotate-90 data-[side=right]:left-[-9px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-8px] data-[side=top]:rotate-180">
                                <ArrowSvg />
                            </Tooltip.Arrow>
                            {label}
                        </Tooltip.Popup>
                    </Tooltip.Positioner>
                </Tooltip.Portal>
            </Tooltip.Root>
        );
    }

    return linkContent;
}
