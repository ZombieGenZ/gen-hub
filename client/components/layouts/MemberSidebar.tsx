"use client";

import {
    Squares2X2Icon,
    ShieldCheckIcon,
    CubeIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BellIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar, AppSidebarContent, SidebarGroup } from "./AppSidebar";

const memberNavGroups: SidebarGroup[] = [
    {
        title: "Tổng quan",
        items: [
            { href: "/dashboard/member", icon: Squares2X2Icon, label: "Tổng quan", exactMatch: true },
        ],
    },
    {
        title: "Nghiệp vụ",
        items: [
            { href: "/dashboard/member/roles", icon: ShieldCheckIcon, label: "Vai trò nội bộ kho" },
            { href: "/dashboard/member/products", icon: CubeIcon, label: "Hàng hóa" },
            { href: "/dashboard/member/inbound", icon: ArrowDownTrayIcon, label: "Phiếu nhập" },
            { href: "/dashboard/member/outbound", icon: ArrowUpTrayIcon, label: "Phiếu xuất" },
        ],
    },
    {
        title: "Khác",
        items: [
            { href: "/dashboard/member/notifications", icon: BellIcon, label: "Thông báo", disabled: true, badge: "Sắp có" },
        ],
    },
];

const sidebarConfig = {
    defaultUserInitials: "MB",
    defaultUserName: "Member",
    defaultUserEmail: "member@example.com",
    walletHref: "/dashboard/member/payment",
};

export function MemberSidebar() {
    return <AppSidebar groups={memberNavGroups} {...sidebarConfig} />;
}

export function MemberSidebarNav() {
    return (
        <div className="h-full w-full bg-sidebar">
            <AppSidebarContent groups={memberNavGroups} {...sidebarConfig} isCollapsed={false} />
        </div>
    );
}
