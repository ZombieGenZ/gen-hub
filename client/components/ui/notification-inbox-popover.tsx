"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Bell,
    AlertCircle,
    AlertTriangle,
    Info,
    CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authStorage } from "@/services/auth/auth-storage.service";
import { NotificationService } from "@/services/notification/notification.service";
import { UserService } from "@/services/user/user.service";
import { UserNotification, NotificationType } from "@/types/notification/notification.type";
import { formatRelativeTime } from "@/lib/format-time";
import { NotificationSkeleton } from "@/components/notifications/notification-skeleton";
import { NotificationEmptyState } from "@/components/notifications/notification-empty-state";

const notificationService = new NotificationService();
const userService = new UserService();

// Icon and style mapping for notification types
const getNotificationConfig = (type: NotificationType) => {
    switch (type) {
        case 'SUCCESS':
            return {
                icon: CheckCircle2,
                bgColor: "bg-green-100",
                textColor: "text-green-600",
            };
        case 'WARNING':
            return {
                icon: AlertTriangle,
                bgColor: "bg-yellow-100",
                textColor: "text-yellow-600",
            };
        case 'ERROR':
            return {
                icon: AlertCircle,
                bgColor: "bg-red-100",
                textColor: "text-red-600",
            };
        case 'INFO':
        default:
            return {
                icon: Info,
                bgColor: "bg-blue-100",
                textColor: "text-blue-600",
            };
    }
};

export function useNotifications() {
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const [response, count] = await Promise.all([
                notificationService.getNotifications(token, { limit: 20 }),
                notificationService.getUnreadCount(token),
            ]);

            setNotifications(response.items);
            setUnreadCount(count);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
            console.error('Failed to fetch notifications:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async (id: string) => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        try {
            await notificationService.markAsRead(token, id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        try {
            await notificationService.markAllAsRead(token);
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }, []);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    };
}

interface NotificationListProps {
    className?: string;
    isFullPage?: boolean;
}

export function NotificationList({ className, isFullPage = false }: NotificationListProps) {
    const {
        notifications,
        unreadCount,
        isLoading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    } = useNotifications();
    const [tab, setTab] = useState("all");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const pathname = usePathname();

    // Fetch user for variable substitution
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = authStorage.getAccessToken();
                const refreshToken = authStorage.getRefreshToken();
                if (token && refreshToken) {
                    const userData = await userService.getUser(token, refreshToken);
                    setCurrentUser(userData.user);
                }
            } catch (error) {
                console.error("Failed to fetch user for notifications", error);
            }
        };
        fetchUser();
    }, []);

    const formatContent = (content: string) => {
        if (!content || !currentUser) return content;

        const name = currentUser.full_name || currentUser.name || "Người dùng";
        const email = currentUser.email || "";

        let formatted = content.replace(/\{\{full_name\}\}/g, name);
        formatted = formatted.replace(/\{\{email\}\}/g, email);
        return formatted;
    };

    // Fetch notifications on mount
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Determine link based on current path
    const isCustomer = pathname?.includes("/dashboard/organization");
    const notificationsLink = isCustomer
        ? "/dashboard/organization/notifications"
        : "/dashboard/admin/notifications";

    // Filter notifications based on selected tab
    const filtered =
        tab === "unread" ? notifications.filter((n) => !n.is_read) :
            tab === "alert" ? notifications.filter((n) => n.type === 'WARNING' || n.type === 'ERROR') :
                notifications;

    return (
        <div className={cn("flex flex-col p-0 bg-popover text-popover-foreground", className)}>
            {/* Header with Tabs + Mark All */}
            <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 h-full">
                <div className="flex items-center justify-between border-b px-3 py-2 shrink-0">
                    <TabsList className="bg-transparent">
                        <TabsTrigger value="all" className="text-sm">Tất cả</TabsTrigger>
                        <TabsTrigger value="alert" className="text-sm">Cảnh báo</TabsTrigger>
                        <TabsTrigger value="unread" className="text-sm">
                            Chưa đọc {unreadCount > 0 && <Badge className="ml-1">{unreadCount}</Badge>}
                        </TabsTrigger>
                    </TabsList>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs font-medium text-muted-foreground hover:underline"
                        >
                            Đánh dấu đã đọc
                        </button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto max-h-[400px]">
                    {/* Loading State - Skeleton */}
                    {isLoading && <NotificationSkeleton count={5} />}

                    {/* Error State */}
                    {!isLoading && error && (
                        <div className="px-3 py-6 text-center text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !error && filtered.length === 0 && (
                        <NotificationEmptyState />
                    )}

                    {/* Notification Items */}
                    {!isLoading && !error && filtered.length > 0 && (
                        filtered.map((n) => {
                            const config = getNotificationConfig(n.type);
                            const Icon = config.icon;

                            return (
                                <button
                                    key={n.id}
                                    onClick={() => !n.is_read && markAsRead(n.id)}
                                    className="flex w-full items-start gap-3 border-b px-3 py-3 text-left hover:bg-accent transition-colors"
                                >
                                    <div className={cn(
                                        "mt-1 p-2 rounded-full shrink-0",
                                        config.bgColor,
                                        config.textColor
                                    )}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex-1 space-y-1 min-w-0">
                                        <p className={cn(
                                            "text-sm truncate",
                                            !n.is_read ? "font-semibold text-foreground" : "text-foreground/80"
                                        )}>
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {formatContent(n.content)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatRelativeTime(n.created_at)}
                                        </p>
                                    </div>
                                    {!n.is_read && (
                                        <span className="mt-1 inline-block size-2 rounded-full bg-primary shrink-0" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </Tabs>

            {/* Footer */}
            {!isFullPage && (
                <div className="px-3 py-2 text-center border-t">
                    <Link href={notificationsLink} passHref>
                        <Button variant="ghost" size="sm" className="w-full">
                            Xem tất cả
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}

interface NotificationInboxPopoverProps {
    trigger?: React.ReactNode | ((unreadCount: number) => React.ReactNode);
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
    className?: string;
}

function NotificationInboxPopover({
    trigger,
    side = "bottom",
    align = "center",
    sideOffset = 4,
    className
}: NotificationInboxPopoverProps) {
    const [open, setOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread count on mount and when popover opens
    useEffect(() => {
        const fetchUnreadCount = async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;

            try {
                const count = await notificationService.getUnreadCount(token);
                setUnreadCount(count);
            } catch (err) {
                console.error('Failed to fetch unread count:', err);
            }
        };

        fetchUnreadCount();

        // Refresh count periodically (every 30 seconds)
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const triggerNode = typeof trigger === "function" ? trigger(unreadCount) : trigger;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {triggerNode ? (
                    triggerNode
                ) : (
                    <Button size="icon" variant="outline" className="relative" aria-label="Open notifications">
                        <Bell size={16} strokeWidth={2} aria-hidden="true" />
                        {unreadCount > 0 && (
                            <Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 px-1">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </Badge>
                        )}
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent
                side={side}
                align={align}
                sideOffset={sideOffset}
                className={cn("p-0", className)}
            >
                <NotificationList className="w-[380px] h-full" />
            </PopoverContent>
        </Popover>
    );
}

export { NotificationInboxPopover, type NotificationInboxPopoverProps };
