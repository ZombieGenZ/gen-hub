"use client";

import { StaffSidebar } from "@/components/layouts/StaffSidebar";
import { StaffHeader } from "@/components/layouts/StaffHeader";
import { SidebarProvider, useSidebar } from "@/components/providers/sidebar-provider";
import { BreadcrumbProvider } from "@/components/providers/breadcrumb-provider";
import { cn } from "@/lib/utils";

interface StaffLayoutProps {
    children: React.ReactNode;
}

function LayoutContent({ children }: StaffLayoutProps) {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <StaffSidebar />

            <main
                id="main-content"
                className={cn(
                    "flex-1 flex flex-col h-screen transition-all duration-300 ease-in-out ml-0",
                    isOpen ? "lg:ml-72" : "lg:ml-20"
                )}
            >
                <StaffHeader />
                <div data-lenis-prevent className="flex-1 overflow-y-auto pt-0 pb-4 px-4 max-w-full mx-auto w-full">{children}</div>
            </main>
        </div>
    );
}

export default function StaffDashboardLayout({ children }: StaffLayoutProps) {
    return (
        <SidebarProvider>
            <BreadcrumbProvider>
                <LayoutContent>{children}</LayoutContent>
            </BreadcrumbProvider>
        </SidebarProvider>
    );
}