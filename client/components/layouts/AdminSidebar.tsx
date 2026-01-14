"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
    Squares2X2Icon,
    HomeModernIcon,
    DocumentTextIcon,
    UsersIcon,
    MapIcon,
    GlobeAltIcon,
    ArrowLeftOnRectangleIcon,
    ChevronUpIcon,
    Cog6ToothIcon,
    UserCircleIcon,
    BuildingOffice2Icon,
    ChartBarIcon,
    ArrowDownTrayIcon,
    EllipsisVerticalIcon,
    UserIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authStorage } from "@/services/auth/auth-storage.service";

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

export function AdminSidebarNav() {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = authStorage.getUser();
        if (userData) {
            setUser(userData);
        }
    }, []);

    const userInitials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : "AD";

    return (
        <div className="flex flex-col h-full bg-white text-slate-900">
            {/* Logo Section */}
            <div className="p-6">
                <Link href="/" className="flex items-center gap-3">
                    <div className="relative w-32 h-10">
                        <Image
                            src="/assets/Genhubv2.svg"
                            alt="GenHub Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </Link>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 space-y-6 overflow-y-auto py-4">
                {/* ADMIN MENU */}
                <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Quản trị</div>
                    <div className="space-y-1">
                        <NavItem
                            href="/dashboard/admin"
                            icon={Squares2X2Icon}
                            label="Tổng quan"
                            isActive={pathname === '/dashboard/admin'}
                        />
                        <NavItem
                            href="/dashboard/admin/warehouses"
                            icon={HomeModernIcon}
                            label="Kho bãi"
                            isActive={isActive('/dashboard/admin/warehouses')}
                        />
                        <NavItem
                            href="/dashboard/admin/contracts"
                            icon={DocumentTextIcon}
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
                            icon={UsersIcon}
                            label="Khách hàng"
                            isActive={isActive('/dashboard/admin/customers')}
                        />
                        <NavItem
                            href="/dashboard/admin/organization"
                            icon={BuildingOffice2Icon}
                            label="Đối tác"
                            isActive={isActive('/dashboard/admin/organization')}
                        />
                        <NavItem
                            href="/dashboard/admin/users"
                            icon={UserCircleIcon}
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
                            icon={ChartBarIcon}
                            label="Doanh thu"
                            isActive={isActive('/dashboard/admin/revenue')}
                        />
                        <NavItem
                            href="/dashboard/admin/settings"
                            icon={Cog6ToothIcon}
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
                                {userInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                    {user?.name || "Admin User"}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {user?.email || "admin@example.com"}
                                </p>
                            </div>
                            <EllipsisVerticalIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
                        <DropdownMenuItem className="cursor-pointer" asChild>
                            <Link href="/user/profile" className="flex items-center w-full">
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Hồ sơ cá nhân</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                            <Cog6ToothIcon className="mr-2 h-4 w-4" />
                            <span>Cài đặt tài khoản</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                            <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                            <span>Đăng xuất</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export function AdminSidebar() {
    return (
        <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col fixed h-full z-10 transition-all duration-300 shadow-sm">
            <AdminSidebarNav />
        </aside>
    );
}
