"use client";

import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { PanelLeft } from "lucide-react";
import { CustomerSidebarNav } from "./CustomerSidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/providers/sidebar-provider";

interface CustomerHeaderProps {
    children?: React.ReactNode;
}

export function CustomerHeader({ children }: CustomerHeaderProps) {
    const pathname = usePathname();
    const { toggle } = useSidebar();
    const segments = pathname.split('/').filter(Boolean);

    // Filter out 'dashboard' and 'customer' from breadcrumbs to keep it clean like "Orders > All"
    // Assuming /dashboard/customer/orders/all maps to Orders > All
    // Adjust logic as needed.
    const relevantSegments = segments.filter(s => !['dashboard', 'customer'].includes(s));

    const breadcrumbs = relevantSegments.map((segment, index) => {
        // We need to reconstruct the full path for href
        // This is tricky if we filter segments. We'll reconstruct based on original index.
        // A simpler way: find the index in original segments
        const originalIndex = segments.indexOf(segment);
        const href = `/${segments.slice(0, originalIndex + 1).join('/')}`;

        const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        return { title, href };
    });

    return (
        <header className="p-4 bg-background sticky top-0 z-20 h-16 flex items-center">
            <div className="flex items-center w-full py-0 px-0 gap-2">
                {/* Mobile Menu Toggle */}
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <button className="p-2 -ml-2 text-muted-foreground hover:bg-secondary rounded-md outline-none">
                                <PanelLeft className="w-5 h-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <CustomerSidebarNav />
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Desktop Toggle */}
                <div className="hidden lg:flex items-center text-muted-foreground">
                    <button
                        onClick={toggle}
                        className="p-2 -ml-2 hover:bg-secondary hover:text-foreground rounded-md outline-none cursor-pointer transition-colors"
                        aria-label="Toggle Sidebar"
                    >
                        <PanelLeft className="w-5 h-5" />
                    </button>
                    <div className="h-4 w-px bg-border mx-2" />
                </div>

                {/* Breadcrumbs */}
                <nav aria-label="Breadcrumb" className="flex-1 overflow-hidden">
                    {children ? children : (
                        <ol className="flex items-center whitespace-nowrap overflow-x-auto no-scrollbar">
                            {/* Add 'Home' or 'Dashboard' root? Screenshot starts with 'Orders' implies current section root */}
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
            </div>
        </header>
    );
}
