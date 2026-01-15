"use client";

import { CustomerSidebar } from "@/components/layouts/CustomerSidebar";
import { CustomerHeader } from "@/components/layouts/CustomerHeader";
import { SidebarProvider, useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";

interface CustomerLayoutProps {
    children: React.ReactNode;
}

function LayoutContent({ children }: CustomerLayoutProps) {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <CustomerSidebar />

            <main className={cn(
                "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ml-0",
                isOpen ? "lg:ml-72" : "lg:ml-20"
            )}>
                <CustomerHeader />
                <div className="pt-0 pb-4 px-4 max-w-full mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function CustomerDashboardLayout({ children }: CustomerLayoutProps) {
    return (
        <SidebarProvider>
            <LayoutContent>{children}</LayoutContent>
        </SidebarProvider>
    );
}
