"use client";

import { MemberSidebar } from "@/components/layouts/MemberSidebar";
import { MemberHeader } from "@/components/layouts/MemberHeader";
import { SidebarProvider, useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";

interface MemberLayoutProps {
    children: React.ReactNode;
}

function LayoutContent({ children }: MemberLayoutProps) {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <MemberSidebar />
            <main className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ml-0", isOpen ? "lg:ml-72" : "lg:ml-20")}>
                <MemberHeader />
                <div className="pt-0 pb-4 px-4 max-w-full mx-auto w-full">{children}</div>
            </main>
        </div>
    );
}

export default function MemberDashboardLayout({ children }: MemberLayoutProps) {
    return (
        <SidebarProvider>
            <LayoutContent>{children}</LayoutContent>
        </SidebarProvider>
    );
}
