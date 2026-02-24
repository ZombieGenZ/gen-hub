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
    LifebuoyIcon,
    CubeIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar, AppSidebarContent, SidebarGroup } from "./AppSidebar";

const adminNavGroups: SidebarGroup[] = [
    {
        title: "Tổng quan",
        items: [
            { href: "/dashboard/admin", icon: Squares2X2Icon, label: "Dashboard", exactMatch: true },
            { href: "/dashboard/admin/revenue", icon: ChartBarIcon, label: "Doanh thu" },
        ]
    },
    {
        title: "Vận hành",
        items: [
            { href: "/dashboard/admin/warehouses", icon: HomeModernIcon, label: "Kho bãi" },
            { href: "/dashboard/admin/products", icon: CubeIcon, label: "Sản phẩm" },
            { href: "/dashboard/admin/contracts", icon: DocumentTextIcon, label: "Hợp đồng" },
            { href: "/dashboard/admin/coupons", icon: TicketIcon, label: "Mã giảm giá" },
        ]
    },
    {
        title: "Danh mục dịch vụ",
        items: [
            { href: "/dashboard/admin/rental-duration-tiers", icon: ListBulletIcon, label: "Gói thuê" },
            { href: "/dashboard/admin/amenities", icon: SparklesIcon, label: "Tiện ích" },
            { href: "/dashboard/admin/addons", icon: PuzzlePieceIcon, label: "Dịch vụ thêm" },
            { href: "/dashboard/admin/insurances", icon: ShieldCheckIcon, label: "Bảo hiểm" },
        ]
    },
    {
        title: "Người dùng",
        items: [
            { href: "/dashboard/admin/customers", icon: UsersIcon, label: "Khách hàng" },
            { href: "/dashboard/admin/organization", icon: BuildingOffice2Icon, label: "Đối tác" },
            { href: "/dashboard/admin/users", icon: UserCircleIcon, label: "Nhân viên" },
        ]
    },
    {
        title: "Hệ thống",
        items: [
            { href: "/dashboard/admin/notifications", icon: BellIcon, label: "Thông báo" },
            { href: "/dashboard/admin/contacts", icon: LifebuoyIcon, label: "Liên hệ & Hỗ trợ" },
        ]
    },
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
