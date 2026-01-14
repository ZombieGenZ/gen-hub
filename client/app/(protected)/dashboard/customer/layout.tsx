"use client";

import { CustomerSidebar } from "@/components/layouts/CustomerSidebar";
import { CustomerHeader } from "@/components/layouts/CustomerHeader";

interface CustomerLayoutProps {
    children: React.ReactNode;
}


export default function CustomerDashboardLayout({ children }: CustomerLayoutProps) {
    return (
        <div className="flex min-h-screen bg-white text-slate-900 font-sans">
            <CustomerSidebar />

            <main className="ml-0 md:ml-72 flex-1 flex flex-col min-h-screen transition-all duration-300">
                <CustomerHeader />
                <div className="p-4 md:p-8 max-w-full mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
