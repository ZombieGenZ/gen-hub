"use client";

import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { PanelLeft } from "lucide-react";
import { AdminSidebarNav } from "./AdminSidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { useBreadcrumb } from "@/components/providers/breadcrumb-provider";
import { NotificationInboxPopover } from "@/components/ui/notification-inbox-popover";

interface AdminHeaderProps {
    children?: React.ReactNode;
}

export function AdminHeader({ children }: AdminHeaderProps) {
    const pathname = usePathname();
    const { toggle } = useSidebar();
    const { label } = useBreadcrumb();
    const segments = pathname.split('/').filter(Boolean);

    const relevantSegments = segments.filter(s => !['dashboard', 'admin'].includes(s));

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const breadcrumbs = relevantSegments.map((segment, index) => {
        const originalIndex = segments.indexOf(segment);
        const href = `/${segments.slice(0, originalIndex + 1).join('/')}`;

        const title = UUID_REGEX.test(segment)
            ? (label ?? 'Chi tiết')
            : segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        return { title, href };
    });

    return (
        <header className="p-4 bg-background sticky top-0 z-20 h-16 flex items-center">
            <div className="flex items-center w-full py-0 px-4 gap-2">
                {/* Mobile Menu Toggle */}
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <button
                                className="p-2 -ml-2 text-muted-foreground hover:bg-secondary rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                aria-label="Mở menu điều hướng"
                            >
                                <PanelLeft className="w-5 h-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <AdminSidebarNav />
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Desktop Toggle */}
                <div className="hidden lg:flex items-center text-muted-foreground">
                    <button
                        onClick={toggle}
                        className="p-2 -ml-2 hover:bg-secondary hover:text-foreground rounded-md outline-none cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Thu gọn/mở rộng thanh điều hướng"
                    >
                        <PanelLeft className="w-5 h-5" />
                    </button>
                    <div className="h-4 w-px bg-border mx-2" />
                </div>

                {/* Breadcrumbs */}
                <nav aria-label="Breadcrumb" className="flex-1 overflow-hidden">
                    {children ? children : (
                        <ol className="flex items-center whitespace-nowrap overflow-x-auto no-scrollbar">
                            {breadcrumbs.length === 0 && (
                                <li className="flex items-center">
                                    <span className="text-sm font-medium text-foreground">Dashboard</span>
                                </li>
                            )}

                            {breadcrumbs.map((crumb, index) => {
                                const isLast = index === breadcrumbs.length - 1;
                                return (
                                    <li key={crumb.href} className="flex items-center">
                                        {index > 0 && <ChevronRightIcon className="w-4 h-4 text-muted-foreground mx-2 flex-shrink-0" />}
                                        <Link
                                            href={crumb.href}
                                            className={cn(
                                                "text-sm transition-colors",
                                                isLast
                                                    ? "font-medium text-foreground pointer-events-none"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                            aria-current={isLast ? 'page' : undefined}
                                        >
                                            {crumb.title}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ol>
                    )}
                </nav>

                {/* Account Actions */}
                <div className="flex items-center gap-3 ml-auto">
                    <NotificationInboxPopover />
                </div>
            </div>
        </header>
    );
}
