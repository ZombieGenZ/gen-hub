import React from "react";
import { DashboardSidebar } from "@/components/layouts/DashboardSidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <DashboardSidebar />

            <main className="ml-0 md:ml-72 flex-1 flex flex-col min-h-screen transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
