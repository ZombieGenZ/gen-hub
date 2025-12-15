"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardSidebarNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

    return (
        <div className="flex flex-col h-full bg-slate-100">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                    <i className="fas fa-box text-white text-sm"></i>
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-teal-800">
                    GenHub
                </span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Menu</div>
                <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${isActive('/dashboard') && pathname === '/dashboard' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}>
                    <i className={`fas fa-chart-pie w-5 ${isActive('/dashboard') && pathname === '/dashboard' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'} transition-colors`}></i>
                    <span className="font-medium">Tổng quan</span>
                </Link>
                <Link href="/dashboard/warehouse_template" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${isActive('/dashboard/warehouse_template') ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}>
                    <i className={`fas fa-warehouse w-5 ${isActive('/dashboard/warehouse_template') ? 'text-primary' : 'text-slate-400 group-hover:text-primary'} transition-colors`}></i>
                    <span className="font-medium">Kho</span>
                </Link>
                <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all group">
                    <i className="fas fa-file-contract w-5 text-slate-400 group-hover:text-primary transition-colors"></i>
                    <span className="font-medium">Hợp đồng</span>
                </Link>
                <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all group">
                    <i className="fas fa-users w-5 text-slate-400 group-hover:text-primary transition-colors"></i>
                    <span className="font-medium">Khách hàng</span>
                </Link>

                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-6 mb-2 px-2">Khu vực</div>
                <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all group">
                    <i className="fas fa-map-marker-alt w-5 text-slate-400 group-hover:text-primary transition-colors"></i>
                    <span className="font-medium">Bản đồ kho</span>
                </Link>
                <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all group">
                    <i className="fas fa-globe-asia w-5 text-slate-400 group-hover:text-primary transition-colors"></i>
                    <span className="font-medium">Vùng địa lý</span>
                </Link>
            </nav>
        </div>
    );
}

export function DashboardSidebar() {
    return (
        <aside className="hidden md:flex w-64 bg-slate-100 border-r border-slate-200 flex-col fixed h-full z-10 transition-all duration-300">
            <DashboardSidebarNav />
        </aside>
    );
}
