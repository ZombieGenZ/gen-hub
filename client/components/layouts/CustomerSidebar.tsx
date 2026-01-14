"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
    Squares2X2Icon,
    HomeModernIcon,
    DocumentTextIcon,
    ClockIcon,
    CreditCardIcon,
    EllipsisVerticalIcon,
    UserIcon,
    Cog6ToothIcon,
    ArrowLeftOnRectangleIcon
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

export function CustomerSidebarNav() {
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
        : "KH";

    return (
        <div className="flex flex-col h-full bg-white text-slate-900">
            {/* Logo Section */}
            <div className="p-6">
                <Link href="/" className="flex items-center gap-3 pl-2">
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
                <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Quản lý</div>
                    <div className="space-y-1">
                        <NavItem
                            href="/dashboard/customer"
                            icon={Squares2X2Icon}
                            label="Tổng quan"
                            isActive={pathname === '/dashboard/customer'}
                        />
                        <NavItem
                            href="/dashboard/customer/warehouses"
                            icon={HomeModernIcon}
                            label="Tìm & Đặt kho"
                            isActive={isActive('/dashboard/customer/warehouses')}
                        />
                        <NavItem
                            href="/dashboard/customer/contracts"
                            icon={DocumentTextIcon}
                            label="Hợp đồng"
                            isActive={isActive('/dashboard/customer/contracts')}
                        />
                    </div>
                </div>

                <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Hoạt động</div>
                    <div className="space-y-1">
                        <NavItem
                            href="/dashboard/customer/bookings"
                            icon={ClockIcon}
                            label="Yêu cầu thuê"
                            isActive={isActive('/dashboard/customer/bookings')}
                        />
                    </div>
                </div>

                <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Tài chính</div>
                    <div className="space-y-1">
                        <NavItem
                            href="/dashboard/customer/payment"
                            icon={CreditCardIcon}
                            label="Tài chính "
                            isActive={isActive('/dashboard/customer/payment')}
                        />
                    </div>
                </div>
            </nav>

            {/* User Profile Section */}
            <div className="p-4 border-t border-slate-100">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group outline-none ring-0 focus:ring-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand to-brand-hover flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white group-hover:ring-brand/20">
                                {userInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                    {user?.name || "Khách hàng"}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {user?.email || "customer@example.com"}
                                </p>
                            </div>
                            <EllipsisVerticalIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="w-56 mb-2 p-2 bg-white border-slate-100 shadow-xl rounded-xl">
                        <DropdownMenuItem className="cursor-pointer rounded-lg p-2.5 focus:bg-white focus:shadow-[0_2px_10px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-0 my-1 border-none" asChild>
                            <Link href="/user/profile" className="flex items-center w-full">
                                <UserIcon className="mr-3 h-4 w-4 text-slate-500" />
                                <span className="font-medium text-slate-700">Hồ sơ cá nhân</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer rounded-lg p-2.5 focus:bg-white focus:shadow-[0_2px_10px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-0 my-1 border-none" asChild>
                            <Link href="#" className="flex items-center w-full">
                                <Cog6ToothIcon className="mr-3 h-4 w-4 text-slate-500" />
                                <span className="font-medium text-slate-700">Cài đặt tài khoản</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-slate-100" />
                        <DropdownMenuItem className="cursor-pointer rounded-lg p-2.5 focus:bg-red-50 focus:text-red-600 focus:shadow-none focus:outline-none focus:ring-0 my-1 border-none text-red-600">
                            <ArrowLeftOnRectangleIcon className="mr-3 h-4 w-4" />
                            <span className="font-medium">Đăng xuất</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export function CustomerSidebar() {
    return (
        <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col fixed h-full z-10 transition-all duration-300 shadow-sm">
            <CustomerSidebarNav />
        </aside>
    );
}
