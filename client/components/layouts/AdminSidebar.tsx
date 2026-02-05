"use client";

import {
    Squares2X2Icon,
    HomeModernIcon,
    DocumentTextIcon,
    UsersIcon,
    BuildingOffice2Icon,
    UserCircleIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    TicketIcon,
    PuzzlePieceIcon,
    SparklesIcon,
    ShieldCheckIcon,
    ListBulletIcon,
    BellIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar, AppSidebarContent, SidebarGroup } from "./AppSidebar";

const adminNavGroups: SidebarGroup[] = [
    {
        title: "Quản trị",
        items: [
            { href: "/dashboard/admin", icon: Squares2X2Icon, label: "Tổng quan", exactMatch: true },
            { href: "/dashboard/admin/warehouses", icon: HomeModernIcon, label: "Kho bãi" },
            { href: "/dashboard/admin/contracts", icon: DocumentTextIcon, label: "Hợp đồng" },
            { href: "/dashboard/admin/notifications", icon: BellIcon, label: "Quản lý thông báo" },
        ]
    },
    {
        title: "Dịch vụ & Tiện ích",
        items: [
            { href: "/dashboard/admin/amenities", icon: SparklesIcon, label: "Tiện ích" },
            { href: "/dashboard/admin/addons", icon: PuzzlePieceIcon, label: "Dịch vụ" },
            { href: "/dashboard/admin/insurances", icon: ShieldCheckIcon, label: "Bảo hiểm" },
            { href: "/dashboard/admin/coupons", icon: TicketIcon, label: "Mã giảm giá" },
        ]
    },
    {
        title: "Đối tác & Nhân sự",
        items: [
            { href: "/dashboard/admin/customers", icon: UsersIcon, label: "Khách hàng" },
            { href: "/dashboard/admin/organization", icon: BuildingOffice2Icon, label: "Đối tác" },
            { href: "/dashboard/admin/users", icon: UserCircleIcon, label: "Nhân viên" },
        ]
    },
    {
        title: "Tài chính",
        items: [
            { href: "/dashboard/admin/revenue", icon: ChartBarIcon, label: "Doanh thu" },
        ]
    }
];

const sidebarConfig = {
    defaultUserInitials: "AD",
    defaultUserName: "Admin User",
    defaultUserEmail: "admin@example.com",
};

export function AdminSidebar() {
    return (
        <AppSidebar
            groups={adminNavGroups}
            {...sidebarConfig}
        />
    );
}

export function AdminSidebarNav() {
    return (
        <div className="h-full w-full bg-sidebar">
            <AppSidebarContent
                groups={adminNavGroups}
                {...sidebarConfig}
                isCollapsed={false}
            />
        </div>
    );
}
