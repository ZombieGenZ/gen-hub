"use client";

import {
    Squares2X2Icon,
    HomeModernIcon,
    DocumentTextIcon,
    ClockIcon,
    CreditCardIcon,
    BellIcon,
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
        title: "Tài chính",
        items: [
            { href: "/dashboard/customer/payment", icon: CreditCardIcon, label: "Tài chính & Thanh toán" },
        ]
    },
    {
        title: "Khác",
        items: [
            { href: "/dashboard/customer/notifications", icon: BellIcon, label: "Thông báo" },
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
