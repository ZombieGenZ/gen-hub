"use client";

import {
    Squares2X2Icon,
    HomeModernIcon,
    ClockIcon,
    BellIcon,
    Cog6ToothIcon,
    UserCircleIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar, AppSidebarContent, SidebarGroup } from "./AppSidebar";

const customerNavGroups: SidebarGroup[] = [
    {
        title: "Tổng quan",
        items: [
            { href: "/dashboard/customer", icon: Squares2X2Icon, label: "Tổng quan", exactMatch: true },
        ]
    },
    {
        title: "Kho bãi",
        items: [
            { href: "/kho-bai", icon: HomeModernIcon, label: "Tìm kiếm kho bãi" },
            { href: "/dashboard/customer/bookings", icon: ClockIcon, label: "Yêu cầu thuê" },
        ]
    },
    {
        title: "Tài khoản",
        items: [
            { href: "/dashboard/customer/settings", icon: UserCircleIcon, label: "Cài đặt tài khoản" },
        ]
    },
    {
        title: "Hệ thống",
        items: [
            { href: "/dashboard/customer/notifications", icon: BellIcon, label: "Thông báo" },
            { href: "/dashboard/customer/organization-settings", icon: Cog6ToothIcon, label: "Cài đặt tổ chức" },
        ]
    },
];

const sidebarConfig = {
    defaultUserInitials: "KH",
    defaultUserName: "Khách hàng",
    defaultUserEmail: "customer@example.com",
};

export function CustomerSidebar() {
    return (
        <AppSidebar
            groups={customerNavGroups}
            {...sidebarConfig}
        />
    );
}

export function CustomerSidebarNav() {
    return (
        <div className="h-full w-full bg-sidebar">
            <AppSidebarContent
                groups={customerNavGroups}
                {...sidebarConfig}
                isCollapsed={false}
            />
        </div>
    );
}
