"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Warehouse,
    FileText,
    Users,
    Map,
    Globe,
    LogOut,
    ChevronUp,
    Settings,
    UserCog,
    Building2,
    BarChart4,
    FileInput,
    MoreVertical,
    User
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
}

function NavItem({ href, icon: Icon, label, isActive }: NavItemProps) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                isActive
                    ? "bg-brand/10 text-brand font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
        >
            <Icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-brand" : "text-slate-400 group-hover:text-slate-600"
            )} />
            <span>{label}</span>
        </Link>
    );
}

export function DashboardSidebarNav() {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

    return (
        <div className="flex flex-col h-full bg-white text-slate-900">
            {/* Logo Section */}
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shadow-lg shadow-brand/20">
                        <Warehouse className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand to-brand-active">
                        GenHub
                    </span>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 space-y-6 overflow-y-auto py-4">
                {/* ADMIN MENU */}
                <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Quản trị</div>
                    <div className="space-y-1">
                        <NavItem
                            href="/dashboard/admin"
                            icon={LayoutDashboard}
                            label="Tổng quan"
                            isActive={pathname === '/dashboard/admin'}
                        />
                        <NavItem
                            href="/dashboard/admin/warehouses"
                            icon={Warehouse}
                            label="Kho bãi"
                            isActive={isActive('/dashboard/admin/warehouses')}
                        />
                        <NavItem
                            href="/dashboard/admin/contracts"
                            icon={FileText}
                            label="Hợp đồng"
                            isActive={isActive('/dashboard/admin/contracts')}
                        />
                    </div>
                </div>

                <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Đối tác & Nhân sự</div>
                    <div className="space-y-1">
                        <NavItem
                            href="/dashboard/admin/customers"
                            icon={Users}
                            label="Khách hàng"
                            isActive={isActive('/dashboard/admin/customers')}
                        />
                        <NavItem
                            href="/dashboard/admin/organization"
                            icon={Building2}
                            label="Đối tác"
                            isActive={isActive('/dashboard/admin/organization')}
                        />
                        <NavItem
                            href="/dashboard/admin/users"
                            icon={UserCog}
                            label="Nhân viên"
                            isActive={isActive('/dashboard/admin/users')}
                        />
                    </div>
                </div>

                <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Hệ thống</div>
                    <div className="space-y-1">
                        <NavItem
                            href="/dashboard/admin/revenue"
                            icon={BarChart4}
                            label="Doanh thu"
                            isActive={isActive('/dashboard/admin/revenue')}
                        />
                        <NavItem
                            href="/dashboard/admin/settings"
                            icon={Settings}
                            label="Cài đặt"
                            isActive={isActive('/dashboard/admin/settings')}
                        />
                    </div>
                </div>
            </nav>

            {/* User Profile Section */}
            <div className="p-4 border-t border-slate-100">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group outline-none">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand to-brand-hover flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white group-hover:ring-brand/20">
                                AD
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">Admin User</p>
                                <p className="text-xs text-slate-500 truncate">admin@example.com</p>
                            </div>
                            <MoreVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
                        <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Hồ sơ cá nhân</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Cài đặt tài khoản</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Đăng xuất</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export function DashboardSidebar() {
    return (
        <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col fixed h-full z-10 transition-all duration-300 shadow-sm">
            <DashboardSidebarNav />
        </aside>
    );
}
