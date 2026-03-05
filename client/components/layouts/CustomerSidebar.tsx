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
        ]
    },
    {
        title: "Quản lý",
        items: [
            { href: "/dashboard/customer/bookings", icon: ClockIcon, label: "Yêu cầu thuê" },
            { href: "/dashboard/customer/contracts", icon: DocumentTextIcon, label: "Hợp đồng" },
        ]
    },
    {
        title: "Nội bộ kho",
        items: [
            { href: "/dashboard/customer/warehouses", icon: BuildingStorefrontIcon, label: "Kho của tôi" },
            { href: "/dashboard/customer/partners", icon: UserGroupIcon, label: "Đối tác" },
            { href: "/dashboard/customer/roles", icon: ShieldCheckIcon, label: "Vai trò" },
            { href: "/dashboard/customer/units", icon: ScaleIcon, label: "Đơn vị tính" },
            { href: "/dashboard/customer/products", icon: CubeIcon, label: "Hàng hóa" },
            { href: "/dashboard/customer/inbound", icon: ArrowDownTrayIcon, label: "Phiếu nhập" },
            { href: "/dashboard/customer/outbound", icon: ArrowUpTrayIcon, label: "Phiếu xuất" },
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
            { href: "/dashboard/customer/payment", icon: CreditCardIcon, label: "Thanh toán" },
            { href: "/dashboard/customer/balance", icon: BanknotesIcon, label: "Số dư tài khoản", disabled: true, badge: "Sắp có" },
            { href: "/dashboard/customer/refund-requests", icon: ArrowUturnLeftIcon, label: "Yêu cầu hoàn tiền", disabled: true, badge: "Sắp có" },
        ]
    },
    {
        title: "Khác",
        items: [
            { href: "/dashboard/customer/notifications", icon: BellIcon, label: "Thông báo" },
            { href: "/dashboard/customer/warnings", icon: ExclamationTriangleIcon, label: "Cảnh cáo", disabled: true, badge: "Sắp có" },
            { href: "/dashboard/customer/settings", icon: Cog6ToothIcon, label: "Cài đặt tổ chức", disabled: true, badge: "Sắp có" },
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

// Export for usage in Mobile/Header (Sheet)
export function CustomerSidebarNav() {
    return (
        <div className="h-full w-full bg-sidebar">
            <AppSidebarContent
                groups={customerNavGroups}
                {...sidebarConfig}
                // Force expanded state in mobile drawer usually
                isCollapsed={false}
            />
        </div>
    );
}
