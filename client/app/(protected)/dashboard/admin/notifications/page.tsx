"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { NotificationService } from "@/services/notification/notification.service";
import { UserNotification, NotificationType } from "@/types/notification/notification.type";
import { useToast } from "@/contexts/ToastContext";
// Icons
import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Components
import { NotificationHeader } from "@/components/dashboard/admin/notifications/NotificationHeader";
import { NotificationFilterBar } from "@/components/dashboard/admin/notifications/NotificationFilterBar";
import { NotificationTable } from "@/components/dashboard/admin/notifications/NotificationTable";
import { NotificationFloatingActionBar } from "@/components/dashboard/admin/notifications/NotificationFloatingActionBar";
import { NotificationActionDialogs } from "@/components/dashboard/admin/notifications/NotificationActionDialogs";

const notificationService = new NotificationService();

// Type badge configuration
const typeBadgeConfig: Record<NotificationType, { label: string; className: string; icon: any }> = {
    INFO: {
        label: "Thông tin",
        className: "bg-blue-100 text-blue-700 border-blue-200",
        icon: InformationCircleIcon,
    },
    WARNING: {
        label: "Cảnh báo",
        className: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: ExclamationTriangleIcon,
    },
    SUCCESS: {
        label: "Thành công",
        className: "bg-green-100 text-green-700 border-green-200",
        icon: CheckCircleIcon,
    },
    ERROR: {
        label: "Lỗi",
        className: "bg-red-100 text-red-700 border-red-200",
        icon: ExclamationCircleIcon,
    },
};

interface SentNotification extends UserNotification {
    recipient_name: string;
    recipient_count?: number;
    sender_name: string;
    status: 'sent' | 'failed';
    creator?: { name: string; email: string };
}

export default function AdminNotificationsPage() {
    // State
    const { showToast } = useToast();
    const [notifications, setNotifications] = useState<SentNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<SentNotification | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    // Refresh trigger
    const [refreshKey, setRefreshKey] = useState(0);

    const limit = 10;

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            setIsLoading(true);
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;

                const response = await notificationService.getGlobalNotifications(token, {
                    limit,
                    offset: (page - 1) * limit,
                    keywords: searchKeyword,
                    type: typeFilter !== "all" ? typeFilter : undefined,
                });

                const mappedNotifications: SentNotification[] = (response.items || []).map((n: any) => ({
                    ...n,
                    recipient_name: "Toàn hệ thống",
                    sender_name: n.creator?.name || "Hệ thống",
                    status: 'sent',
                    user_id: 'GLOBAL',
                    is_read: true,
                    read_at: null
                }));

                setNotifications(mappedNotifications);
                setTotalPages(Math.ceil((response.total || 0) / limit));
            } catch (error) {
                console.error("Failed to fetch notifications", error);
                showToast("Không thể tải danh sách thông báo", "error");
                setNotifications([]);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(() => {
            fetchNotifications();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, typeFilter, searchKeyword, refreshKey]);

    // Handlers
    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === notifications.length && notifications.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n.id));
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await notificationService.deleteMultipleGlobalNotifications(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} thông báo thành công!`, "success");
            setSelectedIds([]);
            setIsBulkDeleteDialogOpen(false);
            setRefreshKey(prev => prev + 1);
        } catch (error: any) {
            console.error("Bulk delete failed", error);
            showToast(error.message || "Xóa thông báo thất bại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleComposeSuccess = () => {
        setIsComposeOpen(false);
        setRefreshKey(prev => prev + 1);
        setPage(1);
    };

    return (
        <div className="admin-notifications-page p-4 md:p-8 space-y-6">
            <NotificationHeader setIsComposeOpen={setIsComposeOpen} />

            <NotificationFilterBar
                searchKeyword={searchKeyword}
                setSearchKeyword={(val) => { setSearchKeyword(val); setPage(1); }}
                typeFilter={typeFilter}
                setTypeFilter={(val) => { setTypeFilter(val); setPage(1); }}
                typeBadgeConfig={typeBadgeConfig}
            />

            <NotificationTable
                isLoading={isLoading}
                notifications={notifications}
                selectedIds={selectedIds}
                toggleSelectAll={toggleSelectAll}
                toggleSelection={toggleSelection}
                typeBadgeConfig={typeBadgeConfig}
                searchKeyword={searchKeyword}
                setIsComposeOpen={setIsComposeOpen}
                setSelectedNotification={setSelectedNotification}
                page={page}
                totalPages={totalPages}
                setPage={setPage}
            />

            <NotificationFloatingActionBar
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                setIsBulkDeleteDialogOpen={setIsBulkDeleteDialogOpen}
            />

            <NotificationActionDialogs
                isBulkDeleteDialogOpen={isBulkDeleteDialogOpen}
                setIsBulkDeleteDialogOpen={setIsBulkDeleteDialogOpen}
                isBulkActionLoading={isBulkActionLoading}
                handleBulkDelete={handleBulkDelete}
                selectedIdsLength={selectedIds.length}
                isComposeOpen={isComposeOpen}
                setIsComposeOpen={setIsComposeOpen}
                handleComposeSuccess={handleComposeSuccess}
                selectedNotification={selectedNotification}
                setSelectedNotification={setSelectedNotification}
                typeBadgeConfig={typeBadgeConfig}
            />
        </div>
    );
}
