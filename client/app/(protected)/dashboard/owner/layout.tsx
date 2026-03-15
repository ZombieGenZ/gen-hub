"use client";

import { OwnerSidebar } from "@/components/layouts/OwnerSidebar";
import { OwnerHeader } from "@/components/layouts/OwnerHeader";
import { SidebarProvider, useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";

interface OwnerLayoutProps {
    children: React.ReactNode;
}

function LayoutContent({ children }: OwnerLayoutProps) {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <OwnerSidebar />
            <main className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ml-0", isOpen ? "lg:ml-72" : "lg:ml-20")}>
                <OwnerHeader />
                <div className="pt-0 pb-4 px-4 max-w-full mx-auto w-full">{children}</div>
            </main>
        </div>
    );
}

export default function OwnerDashboardLayout({ children }: OwnerLayoutProps) {
    return (
        <SidebarProvider>
            <LayoutContent>{children}</LayoutContent>
        </SidebarProvider>
    );
}
