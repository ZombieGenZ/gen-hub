"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import * as React from "react";
import {
    Squares2X2Icon,
    HomeModernIcon,
    DocumentTextIcon,
    ClockIcon,
    CreditCardIcon,
    EllipsisVerticalIcon,
    UserIcon,
    Cog6ToothIcon,
    BellIcon,
    ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Tooltip } from '@base-ui/react/tooltip';
import { authStorage } from "@/services/auth/auth-storage.service";
import { useSidebar } from "@/components/providers/sidebar-provider";

import { createPortal } from "react-dom";

interface NavItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    isCollapsed?: boolean;
}

function ArrowSvg(props: React.ComponentProps<'svg'>) {
    return (
        <svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
            <path d="M0 10L10 0L20 10H0Z" className="fill-teal-700" />
        </svg>
    );
}

function NavItem({ href, icon: Icon, label, isActive, isCollapsed }: NavItemProps) {
    const linkContent = (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 py-2.5 rounded-lg transition-all group outline-none",
                isCollapsed ? "justify-center px-0 w-full" : "px-3",
                isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
        >
            <Icon className={cn(
                "w-5 h-5 transition-colors flex-shrink-0",
                isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
            )} />
            <span className={cn(
                "whitespace-nowrap transition-all duration-300 overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"
            )}>
                {label}
            </span>
        </Link>
    );

    if (isCollapsed) {
        return (
            <Tooltip.Root>
                <Tooltip.Trigger className="w-full flex justify-center outline-none bg-transparent border-none p-0 cursor-pointer" render={linkContent} />
                <Tooltip.Portal>
                    <Tooltip.Positioner sideOffset={20} side="right">
                        <Tooltip.Popup className="flex origin-[var(--transform-origin)] flex-col rounded-full bg-teal-700 px-6 py-2 text-xs font-bold text-white shadow-xl outline-none transition-[transform,scale,opacity] data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[instant]:duration-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 z-[100]">
                            <Tooltip.Arrow className="data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=left]:rotate-90 data-[side=right]:left-[-9px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-8px] data-[side=top]:rotate-180">
                                <ArrowSvg />
                            </Tooltip.Arrow>
                            {label}
                        </Tooltip.Popup>
                    </Tooltip.Positioner>
                </Tooltip.Portal>
            </Tooltip.Root>
        );
    }

    return linkContent;
}

export function CustomerSidebarNav({ collapsed = false }: { collapsed?: boolean }) {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
    const [user, setUser] = useState<any>(null);

    // Explicitly use the prop passed from parent
    const isCollapsed = collapsed;

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
        <Tooltip.Provider>
            <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300">
                {/* Logo Section */}
                <div className={cn("h-16 flex items-center py-2.5 transition-all", isCollapsed ? "justify-center px-2" : "px-2.5")}>
                    <Link href="/" className={cn("flex items-center gap-3 overflow-hidden", isCollapsed ? "w-8 h-8 justify-center" : "pl-2")}>
                        <div className={cn("relative transition-all duration-300", isCollapsed ? "w-8 h-8" : "w-32 h-10")}>
                            <Image
                                src={isCollapsed ? "/assets/icongenhub.svg" : "/assets/Genhubv2.svg"}
                                alt="GenHub Logo"
                                fill
                                className={cn("object-contain", isCollapsed ? "object-center" : "object-left")}
                                priority
                            />
                        </div>
                    </Link>
                </div>

                {/* Navigation Links */}
                <nav className={cn(
                    "flex-1 px-3 overflow-visible py-4 transition-all duration-300",
                    isCollapsed ? "space-y-2" : "space-y-6"
                )}>
                    <div>
                        <div className={cn(
                            "text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 whitespace-nowrap transition-all duration-300",
                            isCollapsed ? "opacity-0 w-0 h-0 overflow-hidden mb-0" : "opacity-100 mb-2"
                        )}>
                            Quản lý
                        </div>
                        <div className="space-y-1">
                            <NavItem
                                href="/dashboard/customer"
                                icon={Squares2X2Icon}
                                label="Tổng quan"
                                isActive={pathname === '/dashboard/customer'}
                                isCollapsed={isCollapsed}
                            />
                            <NavItem
                                href="/dashboard/customer/warehouses"
                                icon={HomeModernIcon}
                                label="Tìm & Đặt kho"
                                isActive={isActive('/dashboard/customer/warehouses')}
                                isCollapsed={isCollapsed}
                            />
                            <NavItem
                                href="/dashboard/customer/contracts"
                                icon={DocumentTextIcon}
                                label="Hợp đồng"
                                isActive={isActive('/dashboard/customer/contracts')}
                                isCollapsed={isCollapsed}
                            />
                        </div>
                    </div>

                    <div>
                        <div className={cn(
                            "text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 whitespace-nowrap transition-all duration-300",
                            isCollapsed ? "opacity-0 w-0 h-0 overflow-hidden mb-0" : "opacity-100 mb-2"
                        )}>
                            Hoạt động
                        </div>
                        <div className="space-y-1">
                            <NavItem
                                href="/dashboard/customer/bookings"
                                icon={ClockIcon}
                                label="Yêu cầu thuê"
                                isActive={isActive('/dashboard/customer/bookings')}
                                isCollapsed={isCollapsed}
                            />
                        </div>
                    </div>

                    <div>
                        <div className={cn(
                            "text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 whitespace-nowrap transition-all duration-300",
                            isCollapsed ? "opacity-0 w-0 h-0 overflow-hidden mb-0" : "opacity-100 mb-2"
                        )}>
                            Tài chính
                        </div>
                        <div className="space-y-1">
                            <NavItem
                                href="/dashboard/customer/payment"
                                icon={CreditCardIcon}
                                label="Tài chính "
                                isActive={isActive('/dashboard/customer/payment')}
                                isCollapsed={isCollapsed}
                            />
                        </div>
                    </div>
                </nav>

                {/* User Profile Section */}
                <div className={cn("p-4 border-t border-sidebar-border transition-all", isCollapsed && "px-2")}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className={cn(
                                "flex items-center gap-3 p-3 rounded-xl hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all cursor-pointer group outline-none ring-0 focus:ring-0",
                                isCollapsed ? "justify-center px-0 py-2" : ""
                            )}>
                                <div className="w-9 h-9 flex-shrink-0 rounded-full bg-secondary flex items-center justify-center text-foreground text-xs font-semibold shadow-sm ring-2 ring-sidebar-ring group-hover:ring-sidebar-ring/80">
                                    {userInitials}
                                </div>

                                <div className={cn(
                                    "flex-1 min-w-0 transition-opacity duration-300",
                                    isCollapsed ? "hidden opacity-0 w-0" : "flex flex-col"
                                )}>
                                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                                        {user?.name || "Khách hàng"}
                                    </p>
                                    <p className="text-xs text-sidebar-foreground/70 truncate">
                                        {user?.email || "customer@example.com"}
                                    </p>
                                </div>

                                {!isCollapsed && (
                                    <EllipsisVerticalIcon className="w-4 h-4 text-sidebar-foreground/50 group-hover:text-sidebar-foreground flex-shrink-0" />
                                )}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isCollapsed ? "start" : "end"} side="right" className="w-56 mb-2 p-2 bg-sidebar border-sidebar-border shadow-md rounded-xl">
                            <DropdownMenuItem className="cursor-pointer rounded-lg p-2.5 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:shadow-none focus:outline-none focus:ring-0 my-1 border-none group" asChild>
                                <Link href="/user/profile" className="flex items-center w-full">
                                    <UserIcon className="mr-3 h-4 w-4 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground" />
                                    <span className="font-medium text-sidebar-foreground group-hover:text-sidebar-accent-foreground">Hồ sơ cá nhân</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer rounded-lg p-2.5 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:shadow-none focus:outline-none focus:ring-0 my-1 border-none group" asChild>
                                <Link href="#" className="flex items-center w-full">
                                    <BellIcon className="mr-3 h-4 w-4 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground" />
                                    <span className="font-medium text-sidebar-foreground group-hover:text-sidebar-accent-foreground">Thông báo</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer rounded-lg p-2.5 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:shadow-none focus:outline-none focus:ring-0 my-1 border-none group" asChild>
                                <Link href="#" className="flex items-center w-full">
                                    <Cog6ToothIcon className="mr-3 h-4 w-4 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground" />
                                    <span className="font-medium text-sidebar-foreground group-hover:text-sidebar-accent-foreground">Cài đặt tài khoản</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-sidebar-border" />
                            <DropdownMenuItem className="cursor-pointer rounded-lg p-2.5 focus:bg-sidebar-foreground/10 hover:bg-sidebar-foreground/10 focus:text-sidebar-foreground hover:text-sidebar-foreground focus:shadow-none focus:outline-none focus:ring-0 my-1 border-none text-sidebar-foreground">
                                <ArrowLeftOnRectangleIcon className="mr-3 h-4 w-4" />
                                <span className="font-medium">Đăng xuất</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </Tooltip.Provider>
    );
}

export function CustomerSidebar() {
    const { isOpen, toggle } = useSidebar();
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const coordsRef = React.useRef<{ x: number; y: number } | null>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        const coords = { x: e.clientX, y: e.clientY };
        coordsRef.current = coords;
        if (mousePos) {
            setMousePos(coords);
        }
    };

    const handleMouseEnter = (e: React.MouseEvent) => {
        coordsRef.current = { x: e.clientX, y: e.clientY };
        timeoutRef.current = setTimeout(() => {
            if (coordsRef.current) {
                setMousePos(coordsRef.current);
            }
        }, 550);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setMousePos(null);
        coordsRef.current = null;
    };

    return (
        <aside className={cn(
            "hidden lg:flex bg-sidebar border-r border-sidebar-border flex-col fixed h-full z-10 transition-all duration-300 ease-in-out shadow-sm",
            isOpen ? "w-72" : "w-20"
        )}>
            <CustomerSidebarNav collapsed={!isOpen} />

            <div
                className="absolute -right-3 top-0 z-20 h-full w-6 cursor-w-resize flex items-center justify-center group outline-none"
                onClick={toggle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="absolute inset-y-0 left-1/2 -translate-x-[0.5px] w-[2px] h-full bg-transparent group-hover:bg-sidebar-primary/18 transition-colors duration-200" />
            </div>

            {mousePos && createPortal(
                <div
                    className="fixed z-[9999] overflow-hidden rounded-md border bg-popover-foreground px-3 py-1.5 text-sm text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none"
                    style={{
                        left: isOpen ? 300 : 92,
                        top: mousePos.y + 20,
                    }}
                >
                    <p>{isOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}</p>
                </div>,
                document.body
            )
            }
        </aside >
    );
}
