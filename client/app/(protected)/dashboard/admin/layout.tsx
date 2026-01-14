"use client";

import React from "react";
import { AdminSidebar } from "@/components/layouts/AdminSidebar";
import { AdminHeader } from "@/components/layouts/AdminHeader";
import { SidebarProvider, useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <AdminSidebar />

            <main className={cn(
                "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ml-0",
                isOpen ? "lg:ml-72" : "lg:ml-20"
            )}>
                <AdminHeader />
                <div className="pt-0 pb-4 px-4 max-w-full mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <LayoutContent>{children}</LayoutContent>
        </SidebarProvider>
    );
}
