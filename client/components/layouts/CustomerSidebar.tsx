"use client";

import {
    Squares2X2Icon,
    HomeModernIcon,
    DocumentTextIcon,
    ClockIcon,
    CreditCardIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar, AppSidebarContent, SidebarGroup } from "./AppSidebar";

const customerNavGroups: SidebarGroup[] = [
    {
        title: "Quản lý",
        items: [
            { href: "/dashboard/customer", icon: Squares2X2Icon, label: "Tổng quan", exactMatch: true },
            { href: "/dashboard/customer/warehouses", icon: HomeModernIcon, label: "Tìm & Đặt kho" },
            { href: "/dashboard/customer/contracts", icon: DocumentTextIcon, label: "Hợp đồng" },
        ]
    },
    {
        title: "Hoạt động",
        items: [
            { href: "/dashboard/customer/bookings", icon: ClockIcon, label: "Yêu cầu thuê" },
        ]
    },
    {
        title: "Tài chính",
        items: [
            { href: "/dashboard/customer/payment", icon: CreditCardIcon, label: "Tài chính " },
        ]
    }
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
