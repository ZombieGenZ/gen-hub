"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { NotificationService } from "@/services/notification/notification.service";
import { UserNotification, NotificationType } from "@/types/notification/notification.type";
import { formatDateTime, formatRelativeTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// Icons
import {
    PlusIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    BellAlertIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon,
    PaperAirplaneIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";

// Wizard Components
import { NotificationWizard } from "@/components/notifications/NotificationWizard";

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

// Mock data for sent notifications (replace with API when available)
interface SentNotification extends UserNotification {
    recipient_name: string;
    recipient_count?: number;
    sender_name: string;
    status: 'sent' | 'failed';
    creator?: { name: string; email: string };
}

export default function AdminNotificationsPage() {
    // State
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
    const { showToast } = useToast();

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

                // Fetch Global Notifications (Broadcasts) as "Sent History"
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
                setNotifications([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotifications();
    }, [page, typeFilter, searchKeyword, refreshKey]);

    // Toggle selection
    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // Toggle all
    const toggleSelectAll = () => {
        if (selectedIds.length === notifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n.id));
        }
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await notificationService.deleteMultipleGlobalNotifications(token, selectedIds);

            showToast(`Đã xóa ${selectedIds.length} thông báo thành công! 🗑️`, "success");
            setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
            setSelectedIds([]);
            setIsBulkDeleteDialogOpen(false);

            // Trigger refresh to ensure sync
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Bulk delete failed", error);
            showToast("Xóa thông báo thất bại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Handle compose success
    const handleComposeSuccess = () => {
        setIsComposeOpen(false);
        setRefreshKey(prev => prev + 1);
        setPage(1);
    };

    return (
        <div className="admin-notifications-page p-6 space-y-6">
            {/* Page Header */}
            <div className="admin-notifications-page__header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Quản lý thông báo</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Gửi và quản lý thông báo đến người dùng
                    </p>
                </div>
                <Button
                    onClick={() => setIsComposeOpen(true)}
                    className="bg-[#0F766E] hover:bg-[#0D655D] transition-all duration-200 active:scale-[0.97] hover:shadow-md"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Tạo thông báo mới
                </Button>
            </div>

            {/* Filters */}
            <div className="admin-notifications-page__filters flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm theo tiêu đề, nội dung..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Type Filter */}
                <div className="flex gap-2">
                    <Button
                        variant={typeFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTypeFilter("all")}
                    >
                        Tất cả
                    </Button>
                    {(Object.keys(typeBadgeConfig) as NotificationType[]).map((type) => {
                        const config = typeBadgeConfig[type];
                        const Icon = config.icon;
                        return (
                            <Button
                                key={type}
                                variant={typeFilter === type ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTypeFilter(type)}
                                className={typeFilter === type ? "" : ""}
                            >
                                <Icon className="w-4 h-4 mr-1" />
                                {config.label}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Data Table */}
            <div className="admin-notifications-page__table bg-card rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="w-12 px-4 py-3">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                        checked={selectedIds.length === notifications.length && notifications.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-auto">
                                    Nội dung
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-[130px]">
                                    Loại
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-[140px]">
                                    Đối tượng
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-[140px]">
                                    Thời gian gửi
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-[160px]">
                                    Người gửi
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-[100px]">
                                    Trạng thái
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Loading State */}
                            {isLoading && (
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <tr key={idx} className="border-b">
                                        <td className="px-4 py-4">
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-48" />
                                                <Skeleton className="h-3 w-64" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-4"><Skeleton className="h-6 w-20" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-28" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-6 w-16" /></td>
                                    </tr>
                                ))
                            )}

                            {/* Empty State */}
                            {!isLoading && notifications.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                <BellAlertIcon className="w-8 h-8 text-muted-foreground/50" />
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground font-medium">Chưa có thông báo nào</p>
                                                <p className="text-sm text-muted-foreground/70 mt-1">
                                                    {searchKeyword ? "Thử thay đổi từ khóa tìm kiếm" : "Bắt đầu bằng cách tạo thông báo mới"}
                                                </p>
                                            </div>
                                            {!searchKeyword && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-2 gap-2 transition-all duration-200 active:scale-[0.97]"
                                                    onClick={() => setIsComposeOpen(true)}
                                                    style={{ borderRadius: "12px" }}
                                                >
                                                    <PlusIcon className="w-4 h-4" />
                                                    Tạo thông báo đầu tiên
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Data Rows */}
                            {!isLoading && notifications.map((notification) => {
                                const typeConfig = typeBadgeConfig[notification.type];
                                const TypeIcon = typeConfig.icon;

                                return (
                                    <tr
                                        key={notification.id}
                                        className={cn(
                                            "border-b hover:bg-muted/30 transition-colors cursor-pointer group",
                                            selectedIds.includes(notification.id) && "bg-muted/30"
                                        )}
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                                            setSelectedNotification(notification);
                                        }}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                checked={selectedIds.includes(notification.id)}
                                                onChange={() => toggleSelection(notification.id)}
                                            />
                                        </td>
                                        {/* Content */}
                                        <td className="px-4 py-4">
                                            <div className="max-w-md">
                                                <p className="font-medium text-sm text-foreground truncate" title={notification.title}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1" title={notification.content}>
                                                    {notification.content}
                                                </p>
                                            </div>
                                        </td>

                                        {/* Type */}
                                        <td className="px-4 py-4">
                                            <Badge
                                                variant="outline"
                                                className={cn("gap-1 font-normal", typeConfig.className)}
                                            >
                                                <TypeIcon className="w-3 h-3" />
                                                {typeConfig.label}
                                            </Badge>
                                        </td>

                                        {/* Recipient */}
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-foreground">
                                                {notification.recipient_name}
                                            </span>
                                            {notification.recipient_count && (
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    ({notification.recipient_count})
                                                </span>
                                            )}
                                        </td>

                                        {/* Time */}
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-muted-foreground">
                                                {formatRelativeTime(notification.created_at)}
                                            </span>
                                        </td>

                                        {/* Sender */}
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-foreground font-medium">
                                                {notification.creator?.name || "Hệ thống"}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-4">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "font-normal",
                                                    notification.status === 'sent'
                                                        ? "bg-green-100 text-green-700 border-green-200"
                                                        : "bg-red-100 text-red-700 border-red-200"
                                                )}
                                            >
                                                {notification.status === 'sent' ? 'Đã gửi' : 'Thất bại'}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                        <span className="text-sm text-muted-foreground">
                            Trang {page} / {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <div
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in"
                        style={{ borderRadius: "24px" }}
                    >
                        <span className="text-muted-foreground text-sm font-medium">
                            {selectedIds.length} đã chọn
                        </span>
                        <div className="h-4 w-px bg-border" />
                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2 rounded-xl"
                            onClick={() => setIsBulkDeleteDialogOpen(true)}
                        >
                            <BellAlertIcon className="w-4 h-4" /> Xóa
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedIds([])}
                            className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirm Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={(open) => { if (!isBulkActionLoading) setIsBulkDeleteDialogOpen(open); }}>
                <DialogContent style={{ borderRadius: "16px" }} className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xóa thông báo</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa <strong className="text-foreground">{selectedIds.length} thông báo</strong> đã chọn không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkActionLoading} style={{ borderRadius: "12px" }} className="transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionLoading} style={{ borderRadius: "12px" }} className="gap-2 min-w-[120px] transition-all duration-200">
                            {isBulkActionLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa {selectedIds.length}...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><BellAlertIcon className="w-4 h-4" /> Xóa {selectedIds.length} mục</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Compose Dialog (was Drawer) */}
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
                <DialogContent className="w-[95vw] max-w-3xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden" style={{ borderRadius: "16px" }}>
                    <DialogHeader className="p-6 pb-4 shrink-0 z-10 border-b bg-background">
                        <DialogTitle>Tạo thông báo mới</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6">
                        <NotificationWizard
                            onSuccess={handleComposeSuccess}
                            onCancel={() => setIsComposeOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Notification Detail Dialog */}
            <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedNotification?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 p-4 ">
                        <div>
                            <span className="text-sm font-medium text-muted-foreground">Nội dung:</span>
                            <p className="text-sm mt-1">{selectedNotification?.content}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Loại:</span>
                                <p className="text-sm mt-1">
                                    {selectedNotification && typeBadgeConfig[selectedNotification.type].label}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Đối tượng:</span>
                                <p className="text-sm mt-1">{selectedNotification?.recipient_name}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Thời gian:</span>
                                <p className="text-sm mt-1">
                                    {selectedNotification && formatDateTime(selectedNotification.created_at)}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Người gửi:</span>
                                <p className="text-sm mt-1">{selectedNotification?.sender_name}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedNotification(null)}>
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
