"use client";

import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { PanelLeft } from "lucide-react";
import { MemberSidebarNav } from "./MemberSidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/providers/sidebar-provider";

interface MemberHeaderProps {
    children?: React.ReactNode;
}

export function MemberHeader({ children }: MemberHeaderProps) {
    const pathname = usePathname();
    const { toggle } = useSidebar();
    const segments = pathname.split("/").filter(Boolean);
    const relevantSegments = segments.filter((s) => !["dashboard", "member"].includes(s));

    const breadcrumbs = relevantSegments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 3).join("/")}`;
        const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
        return { title, href };
    });

    return (
        <header className="p-4 bg-background sticky top-0 z-20 h-16 flex items-center">
            <div className="flex items-center w-full py-0 px-0 gap-2">
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <button className="p-2 -ml-2 text-muted-foreground hover:bg-secondary rounded-md outline-none" aria-label="Open Member Menu" title="Open Member Menu">
                                <PanelLeft className="w-5 h-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <MemberSidebarNav />
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="hidden lg:flex items-center text-muted-foreground">
                    <button onClick={toggle} className="p-2 -ml-2 hover:bg-secondary hover:text-foreground rounded-md outline-none cursor-pointer transition-colors" aria-label="Toggle Sidebar">
                        <PanelLeft className="w-5 h-5" />
                    </button>
                    <div className="h-4 w-px bg-border mx-2" />
                </div>

                <nav aria-label="Breadcrumb" className="flex-1 overflow-hidden">
                    {children ? (
                        children
                    ) : (
                        <ol className="flex items-center whitespace-nowrap overflow-x-auto no-scrollbar">
                            {breadcrumbs.length === 0 && (
                                <li className="flex items-center">
                                    <span className="text-sm font-medium text-foreground">Member Dashboard</span>
                                </li>
                            )}

                            {breadcrumbs.map((crumb, index) => {
                                const isLast = index === breadcrumbs.length - 1;
                                return (
                                    <li key={crumb.href} className="flex items-center">
                                        {index > 0 && <ChevronRightIcon className="w-4 h-4 text-muted-foreground mx-2 shrink-0" />}
                                        <Link href={crumb.href} className={cn("text-sm transition-colors", isLast ? "font-medium text-foreground pointer-events-none" : "text-muted-foreground hover:text-foreground")} aria-current={isLast ? "page" : undefined}>
                                            {crumb.title}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </nav>
            </div>
        </header>
    );
}
