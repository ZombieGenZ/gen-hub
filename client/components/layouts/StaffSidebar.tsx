"use client";

import {
    Squares2X2Icon,
    BuildingStorefrontIcon,
    CubeIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BellIcon,
    CreditCardIcon,
    TruckIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar, AppSidebarContent, SidebarGroup } from "./AppSidebar";

const staffNavGroups: SidebarGroup[] = [
    {
        title: "Tổng quan",
        items: [
            { href: "/dashboard/staff", icon: Squares2X2Icon, label: "Tổng quan", exactMatch: true },
        ],
    },
    {
        title: "Vận hành kho",
        items: [
            { href: "/dashboard/staff/warehouses", icon: BuildingStorefrontIcon, label: "Kho" },
            { href: "/dashboard/staff/products", icon: CubeIcon, label: "Hàng hóa" },
            { href: "/dashboard/staff/inbound", icon: ArrowDownTrayIcon, label: "Phiếu PO" },
            { href: "/dashboard/staff/outbound", icon: ArrowUpTrayIcon, label: "Phiếu xuất" },
            { href: "/dashboard/staff/vehicle-log", icon: TruckIcon, label: "Xe ra vào" },
        ],
    },
    {
        title: "Tài chính",
        items: [
            { href: "/dashboard/staff/payment", icon: CreditCardIcon, label: "Thanh toán & Số dư" },
        ],
    },
    {
        title: "Hệ thống",
        items: [
            { href: "/dashboard/staff/notifications", icon: BellIcon, label: "Thông báo" },
        ],
    },
];

const sidebarConfig = {
    defaultUserInitials: "NV",
    defaultUserName: "Nhân viên",
    defaultUserEmail: "staff@example.com",
    walletHref: "/dashboard/staff/payment",
};

export function StaffSidebar() {
    return <AppSidebar groups={staffNavGroups} {...sidebarConfig} />;
}

export function StaffSidebarNav() {
    return (
        <div className="h-full w-full bg-sidebar">
            <AppSidebarContent
                groups={staffNavGroups}
                {...sidebarConfig}
                isCollapsed={false}
            />
        </div>
    );
}
