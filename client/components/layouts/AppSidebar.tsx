"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    EllipsisVerticalIcon,
    UserIcon,
    BellIcon,
    Cog6ToothIcon,
    ArrowLeftOnRectangleIcon,
    WalletIcon,
    PlusIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { NotificationList, useNotifications } from "@/components/ui/notification-inbox-popover";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AuthService } from "@/services/auth/auth.service";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavItem } from "@/components/ui/nav-item";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useProfileModal } from "@/contexts/ProfileModalContext";
import { UserService } from "@/services/user/user.service";
import { UserData } from "@/types/user/user.type";

// --- Types ---
export interface SidebarLinkItem {
    label: string;
    href: string;
    icon: React.ElementType;
    exactMatch?: boolean;
    badge?: string;
    disabled?: boolean;
}

export interface SidebarGroup {
    title: string;
    items: SidebarLinkItem[];
}

export interface AppSidebarProps {
    groups: SidebarGroup[];
    defaultUserInitials?: string;
    defaultUserName?: string;
    defaultUserEmail?: string;
    logoCollapsedSrc?: string;
    logoExpandedSrc?: string;
    logoLink?: string;
}

const userService = new UserService();
const authService = new AuthService();

export function AppSidebarContent({
    groups,
    defaultUserInitials,
    defaultUserName,
    defaultUserEmail,
    logoCollapsedSrc = "/assets/icongenhub.svg",
    logoExpandedSrc = "/assets/Genhubv2.svg",
    logoLink,
    isCollapsed = false,
    onToggleCollapse, // Optional override
}: AppSidebarProps & { isCollapsed?: boolean; onToggleCollapse?: () => void }) {
    const pathname = usePathname();
    const [showNotifications, setShowNotifications] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);
    const { unreadCount } = useNotifications();
    const { openModal } = useProfileModal();
    const { opendepositModal } = useProfileModal();
    const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

    // Load persisted state
    useEffect(() => {
        const stored = localStorage.getItem("sidebar:groups-state");
        if (stored) {
            try {
                // setExpandedGroups(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse sidebar groups state", e);
            }
        }
    }, []);

    const toggleGroup = (index: number) => {
        setExpandedGroups(prev => {
            const next = {
                ...prev,
                [index]: !prev[index]
            };
            localStorage.setItem("sidebar:groups-state", JSON.stringify(next));
            return next;
        });
    };

    // Load User Data
    useEffect(() => {
        const loadUserData = async () => {
            const token = authStorage.getAccessToken()
            const refreshToken = authStorage.getRefreshToken()

            if (!token || !refreshToken) return;

            try {
                const data = await userService.getUser(token, refreshToken)
                if (data) {
                    setUser(data)
                }
            } catch (error) {
                console.error("Failed to load user data:", error);
            }
        }
        loadUserData();
    }, []);

    const userInitials = user?.user.name
        ? user.user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : defaultUserInitials || "U";

    const handleLogout = async () => {
        const token = authStorage.getAccessToken();
        const refresh_token = authStorage.getRefreshToken();
        if (token && refresh_token) {
            try {
                await authService.logout(token, refresh_token);
            } catch (error) {
                console.error("Logout error:", error);
            }
        }
        authStorage.clearTokens();
        window.location.href = "/login";
    };

    // Helper to determine active link
    const isActive = (path: string, exact?: boolean) => {
        if (exact) return pathname === path;
        return pathname === path || pathname.startsWith(`${path}/`);
    };

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300">
                {/* Logo Section */}
                <div className={cn("h-18 flex items-center py-2 transition-all", isCollapsed ? "justify-center px-2" : "px-2")}>
                    <Link href={logoLink || "/"} className={cn("flex items-center gap-2 overflow-hidden", isCollapsed ? "w-8 h-8 justify-center" : "pl-2")}>
                        <div className={cn("relative transition-all duration-300", isCollapsed ? "w-8 h-8" : "w-32 h-8")}>
                            <Image
                                src={isCollapsed ? (logoCollapsedSrc || "") : (logoExpandedSrc || "")}
                                alt="Logo"
                                fill
                                className={cn("object-contain", isCollapsed ? "object-center" : "object-left")}
                                priority
                            />
                        </div>
                    </Link>
                </div>

                {/* Navigation Links */}
                <nav className={cn(
                    "flex-1 px-4 overflow-y-auto overflow-x-hidden py-4 transition-all duration-300 min-h-0 scrollbar-hide",
                    isCollapsed ? "space-y-2" : "space-y-6"
                )}>
                    {groups.map((group, groupIndex) => {
                        const isGroupExpanded = expandedGroups[groupIndex]; // Default is undefined (false/collapsed)
                        return (
                            <div key={groupIndex}>
                                <button
                                    onClick={() => !isCollapsed && toggleGroup(groupIndex)}
                                    className={cn(
                                        "w-full flex items-center justify-between text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 whitespace-nowrap transition-all duration-300 hover:text-sidebar-foreground group outline-none",
                                        isCollapsed ? "opacity-0 w-0 h-0 overflow-hidden mb-0" : "opacity-100 mb-2 cursor-pointer"
                                    )}
                                >
                                    <span>{group.title}</span>
                                    <ChevronRightIcon className={cn(
                                        "w-3 h-3 transition-transform duration-200",
                                        isGroupExpanded ? "rotate-90" : ""
                                    )} />
                                </button>
                                <div className={cn(
                                    "space-y-1 transition-all duration-300 overflow-hidden",
                                    !isCollapsed && !isGroupExpanded ? "max-h-0 opacity-0" : "max-h-125 opacity-100" // Simple collapse
                                )}>
                                    {group.items.map((item, itemIndex) => (
                                        <NavItem
                                            key={itemIndex}
                                            href={item.href}
                                            icon={item.icon}
                                            label={item.label}
                                            isActive={isActive(item.href, item.exactMatch)}
                                            isCollapsed={isCollapsed}
                                            badge={item.badge}
                                            disabled={item.disabled}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Notifications Section */}
                    <div>
                        <div className={cn(
                            "text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 whitespace-nowrap transition-all duration-300",
                            isCollapsed ? "opacity-0 w-0 h-0 overflow-hidden mb-0" : "opacity-100 mb-2"
                        )}>
                            Thông báo
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={cn(
                                    "w-full flex items-center gap-2 py-2 rounded-sm transition-all group outline-none cursor-pointer border-none text-left relative",
                                    isCollapsed ? "justify-center px-0" : "px-4",
                                    showNotifications
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium hover:bg-sidebar-border"
                                        : "bg-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                            >
                                <div className="relative shrink-0">
                                    <BellIcon className={cn(
                                        "w-5 h-5 transition-colors",
                                        showNotifications ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                                    )} />
                                    {isCollapsed && unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-600 border border-sidebar text-[8px] font-bold text-white z-10" />
                                    )}
                                </div>
                                <span className={cn(
                                    "whitespace-nowrap transition-all duration-300 overflow-hidden",
                                    isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"
                                )}>
                                    Thông báo
                                </span>
                                {!isCollapsed && unreadCount > 0 && (
                                    <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px] min-w-5 justify-center">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </Badge>
                                )}
                            </button>
                        </div>
                    </div>
                </nav>

                {/* User Profile Section */}
                <div className={cn("p-4 border-t border-sidebar-border transition-all", isCollapsed && "px-2")}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className={cn(
                                "flex items-center gap-2 p-2 rounded-2xl hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all cursor-pointer group outline-none ring-0 focus:ring-0",
                                isCollapsed ? "justify-center px-0 py-2" : ""
                            )}>
                                <div className="w-8 h-8 shrink-0 rounded-full bg-secondary flex items-center justify-center text-foreground text-xs font-semibold shadow-sm ring-2 ring-sidebar-ring group-hover:ring-sidebar-ring/80">
                                    {userInitials}
                                </div>

                                <div className={cn(
                                    "flex-1 min-w-0 transition-opacity duration-300",
                                    isCollapsed ? "hidden opacity-0 w-0" : "flex flex-col gap-0.5"
                                )}>
                                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                                        {user?.user.name || defaultUserName}
                                    </p>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs text-sidebar-foreground/70 truncate">
                                            {user?.user.email || defaultUserEmail}
                                        </p>
                                        {/* <div className="flex items-center gap-2 ">
                                            <WalletIcon className="w-3.5 h-3.5 text-primary/80" />
                                            <span className="text-xs font-semibold text-primary/90">
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user?.balance || 0)}
                                            </span>
                                        </div> */}
                                    </div>
                                </div>

                                {!isCollapsed && (
                                    <EllipsisVerticalIcon className="w-4 h-4 text-sidebar-foreground/50 group-hover:text-sidebar-foreground shrink-0" />
                                )}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isCollapsed ? "start" : "end"} side="right" className="w-56 mb-2 p-2 bg-sidebar border-sidebar-border shadow-md rounded-lg">
                            <DropdownMenuItem className="group flex flex-col items-stretch gap-2 p-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:shadow-none focus:outline-none focus:ring-0 my-1 border-none cursor-pointer" asChild>
                                <Link href="/dashboard/customer/payment" className="flex flex-col items-stretch gap-2 w-full no-underline relative">
                                    <div className="flex items-center w-full">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/60 ml-0.5">Số dư khả dụng</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <WalletIcon className="w-4 h-4 text-primary" />
                                        <span className="font-bold text-sm text-primary">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((user as any)?.balance || 0)}
                                        </span>
                                    </div>
                                    <div
                                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-primary/10 hover:bg-primary/20 text-primary rounded-full p-1 cursor-pointer absolute top-0 right-0"
                                        title="Nạp tiền"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); opendepositModal(); }}
                                    >
                                        <PlusIcon className="w-3 h-3" />
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                            {/* <DropdownMenuItem className="group flex flex-col items-start gap-2 p-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:shadow-none focus:outline-none focus:ring-0 my-1 border-none cursor-pointer">
                                <div className="flex items-center justify-between w-full">
                                    <p className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/60 ml-0.5">Số dư khả dụng</p>
                                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-primary/10 hover:bg-primary/20 text-primary rounded-full p-1" title="Nạp tiền">
                                        <PlusIcon className="w-3 h-3" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <WalletIcon className="w-4 h-4 text-primary" />
                                    <span className="font-bold text-sm text-primary">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user?.balance || 0)}
                                    </span>
                                </div>
                            </DropdownMenuItem> */}
                            <DropdownMenuItem
                                className="cursor-pointer rounded-sm p-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:shadow-none focus:outline-none focus:ring-0 my-1 border-none group"
                                onClick={openModal}
                            >
                                <div className="flex items-center w-full">
                                    <UserIcon className="mr-3 h-4 w-4 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground" />
                                    <span className="font-medium text-sidebar-foreground group-hover:text-sidebar-accent-foreground">Hồ sơ cá nhân</span>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer rounded-sm p-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:shadow-none focus:outline-none focus:ring-0 my-1 border-none group" asChild>
                                <Link href="#" className="flex items-center w-full">
                                    <Cog6ToothIcon className="mr-3 h-4 w-4 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground" />
                                    <span className="font-medium text-sidebar-foreground group-hover:text-sidebar-accent-foreground">Cài đặt tài khoản</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-sidebar-border" />
                            <DropdownMenuItem
                                className="cursor-pointer rounded-sm p-2 focus:bg-sidebar-foreground/10 hover:bg-sidebar-foreground/10 focus:text-sidebar-foreground hover:text-sidebar-foreground focus:shadow-none focus:outline-none focus:ring-0 my-1 border-none text-sidebar-foreground group"
                                onClick={handleLogout}
                            >
                                <div className="flex items-center w-full">
                                    <ArrowLeftOnRectangleIcon className="mr-3 h-4 w-4 text-sidebar-foreground/70 group-hover:text-sidebar-foreground" />
                                    <span className="font-medium">Đăng xuất</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Notification Side Panel Portal */}
                {/* 
                    Only render portal if showNotifications is true.
                    We might want to DISABLE this portal behavior if 'isCollapsed' is explicitly passed from a Mobile Sheet,
                    but for now, we'll assume mobile sheets don't toggle this notification state or if they do,
                    maybe a portal is fine (though might be behind sheet).
                    Mobile sheets usually have their own context.
                */}
                {showNotifications && createPortal(
                    <>
                        <div
                            className="fixed inset-0 z-49 bg-transparent"
                            onClick={() => setShowNotifications(false)}
                        />
                        <div
                            className={cn(
                                "fixed top-5 bottom-5 z-50 w-112.5 bg-background border-l shadow-2xl transition-all duration-300 rounded-3xl overflow-hidden",
                                isCollapsed ? "left-18" : "left-72"
                            )}
                            style={{
                                left: isCollapsed ? '72px' : '288px'
                            }}
                        >
                            <NotificationList className="w-full h-full border-none shadow-none" />
                        </div>
                    </>,
                    document.body
                )}
            </div>
        </TooltipProvider>
    );
}

export function AppSidebar(props: AppSidebarProps) {
    const { isOpen, toggle } = useSidebar();
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

    const isCollapsed = !isOpen;

    // Refs for hover tooltip
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const coordsRef = useRef<{ x: number; y: number } | null>(null);

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
            isOpen ? "w-72" : "w-18"
        )}>

            <AppSidebarContent {...props} isCollapsed={isCollapsed} />

            {/* Collapse/Expand Handle */}
            <div
                className="absolute -right-3 top-0 z-20 h-full w-6 cursor-w-resize flex items-center justify-center group outline-none"
                onClick={toggle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="absolute inset-y-0 left-1/2 -translate-x-[0.5px] w-0.5 h-full bg-transparent group-hover:bg-sidebar-primary/18 transition-colors duration-200" />
            </div>

            {/* Hover Tooltip for Sidebar Handle */}
            {mousePos && createPortal(
                <div
                    className="fixed z-9999 overflow-hidden rounded-md border bg-popover-foreground px-3 py-1.5 text-sm text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none"
                    style={{
                        left: isOpen ? 300 : 84,
                        top: mousePos.y + 20,
                    }}
                >
                    <p>{isOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}</p>
                </div>,
                document.body
            )}
        </aside>
    );
}
