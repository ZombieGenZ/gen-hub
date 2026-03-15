"use client";

import {
    Squares2X2Icon,
    Cog6ToothIcon,
    ShieldCheckIcon,
    UserGroupIcon,
    BellIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar, AppSidebarContent, SidebarGroup } from "./AppSidebar";

const ownerNavGroups: SidebarGroup[] = [
    {
        title: "Tổng quan",
        items: [
            { href: "/dashboard/owner", icon: Squares2X2Icon, label: "Tổng quan", exactMatch: true },
        ],
    },
    {
        title: "Tổ chức",
        items: [
            { href: "/dashboard/owner/organization-settings", icon: Cog6ToothIcon, label: "Cài đặt tổ chức" },
            { href: "/dashboard/owner/roles", icon: ShieldCheckIcon, label: "Vai trò nội bộ kho" },
            { href: "/dashboard/owner/members", icon: UserGroupIcon, label: "Thành viên", disabled: true, badge: "Sắp có" },
        ],
    },
    {
        title: "Khác",
        items: [
            { href: "/dashboard/owner/notifications", icon: BellIcon, label: "Thông báo", disabled: true, badge: "Sắp có" },
        ],
    },
];

const sidebarConfig = {
    defaultUserInitials: "OW",
    defaultUserName: "Owner",
    defaultUserEmail: "owner@example.com",
    walletHref: "/dashboard/owner/payment",
};

export function OwnerSidebar() {
    return <AppSidebar groups={ownerNavGroups} {...sidebarConfig} />;
}

export function OwnerSidebarNav() {
    return (
        <div className="h-full w-full bg-sidebar">
            <AppSidebarContent groups={ownerNavGroups} {...sidebarConfig} isCollapsed={false} />
        </div>
    );
}
