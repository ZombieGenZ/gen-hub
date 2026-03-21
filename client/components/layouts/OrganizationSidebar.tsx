"use client";

import {
    Squares2X2Icon,
    HomeModernIcon,
    DocumentTextIcon,
    ClockIcon,
    CreditCardIcon,
    BellIcon,
    BuildingStorefrontIcon,
    CubeIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BanknotesIcon,
    ArrowUturnLeftIcon,
    ExclamationTriangleIcon,
    Cog6ToothIcon,
    ScaleIcon,
    UserGroupIcon,
    ShieldCheckIcon,
    ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar, AppSidebarContent, SidebarGroup } from "./AppSidebar";

const organizationNavGroups: SidebarGroup[] = [
    {
        title: "Tổng quan",
        items: [
            { href: "/dashboard/organization", icon: Squares2X2Icon, label: "Tổng quan", exactMatch: true },
        ]
    },
    {
        title: "Kho bãi",
        items: [
            { href: "/kho-bai", icon: HomeModernIcon, label: "Tìm kiếm kho bãi" },
        ]
    },
    {
        title: "Quản lý",
        items: [
            { href: "/dashboard/organization/bookings", icon: ClockIcon, label: "Yêu cầu thuê" },
            { href: "/dashboard/organization/contracts", icon: DocumentTextIcon, label: "Hợp đồng" },
        ]
    },
    {
        title: "Nội bộ kho",
        items: [
            { href: "/dashboard/organization/warehouses", icon: BuildingStorefrontIcon, label: "Kho của tôi" },
            { href: "/dashboard/organization/partners", icon: UserGroupIcon, label: "Đối tác" },
            { href: "/dashboard/organization/roles", icon: ShieldCheckIcon, label: "Vai trò" },
            { href: "/dashboard/organization/units", icon: ScaleIcon, label: "Đơn vị tính" },
            { href: "/dashboard/organization/products", icon: CubeIcon, label: "Hàng hóa" },
            { href: "/dashboard/organization/inbound", icon: ArrowDownTrayIcon, label: "Phiếu nhập" },
            { href: "/dashboard/organization/outbound", icon: ArrowUpTrayIcon, label: "Phiếu xuất" },
        ]
    },
    {
        title: "Kiểm soát kho thực",
        items: [
            { href: "/warehouse-3d", icon: ClipboardDocumentCheckIcon, label: "Kiểm soát kho" },
        ]
    },
    {
        title: "Tài chính",
        items: [
            { href: "/dashboard/organization/payment", icon: CreditCardIcon, label: "Thanh toán" },
            { href: "/dashboard/organization/refund-requests", icon: ArrowUturnLeftIcon, label: "Yêu cầu hoàn tiền", disabled: true, badge: "Sắp có" },
        ]
    },
    {
        title: "Khác",
        items: [
            { href: "/dashboard/organization/notifications", icon: BellIcon, label: "Thông báo" },
            { href: "/dashboard/organization/warnings", icon: ExclamationTriangleIcon, label: "Cảnh cáo", disabled: true, badge: "Sắp có" },
            { href: "/dashboard/organization/organization-settings", icon: Cog6ToothIcon, label: "Cài đặt tổ chức" },
        ]
    },
];

const sidebarConfig = {
    defaultUserInitials: "TC",
    defaultUserName: "Tổ chức",
    defaultUserEmail: "org@example.com",
};

export function OrganizationSidebar() {
    return (
        <AppSidebar
            groups={organizationNavGroups}
            {...sidebarConfig}
        />
    );
}

// Export for usage in Mobile/Header (Sheet)
export function OrganizationSidebarNav() {
    return (
        <div className="h-full w-full bg-sidebar">
            <AppSidebarContent
                groups={organizationNavGroups}
                {...sidebarConfig}
                // Force expanded state in mobile drawer usually
                isCollapsed={false}
            />
        </div>
    );
}
