import React from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    BellAlertIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { NotificationType, UserNotification } from "@/types/notification/notification.type";
import { formatRelativeTime } from "@/lib/format-time";

interface SentNotification extends UserNotification {
    recipient_name: string;
    recipient_count?: number;
    sender_name: string;
    status: 'sent' | 'failed';
    creator?: { name: string; email: string };
}

interface NotificationTableProps {
    isLoading: boolean;
    notifications: SentNotification[];
    selectedIds: string[];
    toggleSelectAll: () => void;
    toggleSelection: (id: string) => void;
    typeBadgeConfig: Record<NotificationType, { label: string; className: string; icon: any }>;
    searchKeyword: string;
    setIsComposeOpen: (val: boolean) => void;
    setSelectedNotification: (val: SentNotification | null) => void;
    page: number;
    totalPages: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
}

export function NotificationTable({
    isLoading,
    notifications,
    selectedIds,
    toggleSelectAll,
    toggleSelection,
    typeBadgeConfig,
    searchKeyword,
    setIsComposeOpen,
    setSelectedNotification,
    page,
    totalPages,
    setPage,
}: NotificationTableProps) {
    return (
        <div className="bg-card rounded-2xl border overflow-hidden shadow-sm">
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
                            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Nội dung</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-[130px]">Loại</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-[140px]">Đối tượng</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-[140px]">Thời gian gửi</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-[160px]">Người gửi</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground w-[100px]">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                                <tr key={idx} className="border-b">
                                    <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
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
                        ) : notifications.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-16 text-center">
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
                                                className="mt-2 gap-2 transition-all duration-200 active:scale-[0.97] rounded-xl"
                                                onClick={() => setIsComposeOpen(true)}
                                            >
                                                Tạo thông báo đầu tiên
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            notifications.map((notification) => {
                                const typeConfig = typeBadgeConfig[notification.type];
                                const TypeIcon = typeConfig.icon;
                                return (
                                    <tr
                                        key={notification.id}
                                        className={cn(
                                            "hover:bg-muted/30 transition-colors cursor-pointer group",
                                            selectedIds.includes(notification.id) && "bg-muted/30"
                                        )}
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                                            setSelectedNotification(notification);
                                        }}
                                    >
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                checked={selectedIds.includes(notification.id)}
                                                onChange={() => toggleSelection(notification.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="max-w-md">
                                                <p className="font-medium text-sm text-foreground truncate">{notification.title}</p>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{notification.content}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge variant="outline" className={cn("gap-1 font-normal rounded-full", typeConfig.className)}>
                                                <TypeIcon className="w-3 h-3" />
                                                {typeConfig.label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-foreground">{notification.recipient_name}</span>
                                            {notification.recipient_count && <span className="text-xs text-muted-foreground ml-1">({notification.recipient_count})</span>}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-muted-foreground">{formatRelativeTime(notification.created_at)}</span>
                                        </td>
                                        <td className="px-4 py-4 font-medium text-sm">{notification.creator?.name || "Hệ thống"}</td>
                                        <td className="px-4 py-4">
                                            <Badge variant="outline" className={cn("font-normal rounded-full", notification.status === 'sent' ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200")}>
                                                {notification.status === 'sent' ? 'Đã gửi' : 'Thất bại'}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                    <span className="text-sm text-muted-foreground">Trang {page} / {totalPages}</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-xl">
                            <ChevronLeftIcon className="w-4 h-4 mr-1" /> Trước
                        </Button>
                        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="rounded-xl">
                            Sau <ChevronRightIcon className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
