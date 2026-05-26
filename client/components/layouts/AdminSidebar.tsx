"use client";

import {
    Squares2X2Icon,
    HomeModernIcon,
    DocumentTextIcon,
    UsersIcon,
    UserGroupIcon,
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
    ClipboardDocumentCheckIcon,
    CalendarDaysIcon,
    ArrowUturnLeftIcon,
    ExclamationTriangleIcon,
    NewspaperIcon,
    RectangleGroupIcon,
    CpuChipIcon,
    StarIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar, AppSidebarContent, SidebarGroup } from "./AppSidebar";

const adminNavGroups: SidebarGroup[] = [
    {
        title: "Tổng quan",
        items: [
            { href: "/dashboard/admin", icon: Squares2X2Icon, label: "Dashboard", exactMatch: true },
            { href: "/dashboard/admin/revenue", icon: ChartBarIcon, label: "Doanh thu" },
            { href: "/dashboard/admin/ai-analytics", icon: CpuChipIcon, label: "AI Insights Kho" },
        ]
    },
    {
        title: "Vận hành",
        items: [
            { href: "/dashboard/admin/warehouses", icon: HomeModernIcon, label: "Kho bãi" },
            { href: "/dashboard/admin/warehouse-verification", icon: StarIcon, label: "Xác minh kho" },
            { href: "/dashboard/admin/approval", icon: ClipboardDocumentCheckIcon, label: "Duyệt phiếu PO/Xuất" },
            { href: "/dashboard/admin/contracts", icon: DocumentTextIcon, label: "Hợp đồng" },
            { href: "/dashboard/admin/coupons", icon: TicketIcon, label: "Mã giảm giá" },
        ]
    },
    {
        title: "Tài chính",
        items: [
            { href: "/dashboard/admin/refund-requests", icon: ArrowUturnLeftIcon, label: "Yêu cầu hoàn tiền" },
            { href: "/dashboard/admin/settings/warning-penalties", icon: ExclamationTriangleIcon, label: "Cảnh cáo & Phạt" },
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
            { href: "/dashboard/admin/organization", icon: UserGroupIcon, label: "Tổ chức", exactMatch: true },
            { href: "/dashboard/admin/organization/update-requests", icon: ClipboardDocumentCheckIcon, label: "Yêu cầu cập nhật" },
            { href: "/dashboard/admin/users", icon: UserCircleIcon, label: "Nhân viên" },
        ]
    },
    {
        title: "Hệ thống",
        items: [
            { href: "/dashboard/admin/notifications", icon: BellIcon, label: "Thông báo" },
            { href: "/dashboard/admin/contacts", icon: LifebuoyIcon, label: "Liên hệ & Hỗ trợ" },
            { href: "/dashboard/admin/settings", icon: Cog6ToothIcon, label: "Cài đặt", exactMatch: true },
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

