'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
    CheckCircle,
    AlertTriangle,
    Info,
    AlertCircle,
    Check,
    Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NotificationService } from "@/services/notification/notification.service";
import { UserService } from "@/services/user/user.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserNotification, NotificationType, NotificationQueryParams } from "@/types/notification/notification.type";
import { formatRelativeTime } from "@/lib/format-time";
import { NotificationSkeleton } from "./notification-skeleton";
import { NotificationEmptyState } from "./notification-empty-state";
import { useToast } from "@/contexts/ToastContext";

const notificationService = new NotificationService();
const userService = new UserService();

const getNotificationConfig = (type: NotificationType) => {
    switch (type) {
        case 'SUCCESS':
            return {
                icon: CheckCircle,
                bgColor: "bg-green-100 dark:bg-green-900/20",
                textColor: "text-green-600 dark:text-green-400",
            };
        case 'WARNING':
            return {
                icon: AlertTriangle,
                bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
                textColor: "text-yellow-600 dark:text-yellow-400",
            };
        case 'ERROR':
            return {
                icon: AlertCircle,
                bgColor: "bg-red-100 dark:bg-red-900/20",
                textColor: "text-red-600 dark:text-red-400",
            };
        case 'INFO':
        default:
            return {
                icon: Info,
                bgColor: "bg-blue-100 dark:bg-blue-900/20",
                textColor: "text-blue-600 dark:text-blue-400",
            };
    }
};

export interface NotificationListProps {
    className?: string;
}

export function NotificationList({ className }: NotificationListProps) {
    const { showToast } = useToast();
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [tab, setTab] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const LIMIT = 10;

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

    const fetchNotifications = useCallback(async (reset = false) => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        try {
            if (reset) {
                setIsLoading(true);
                setPage(1);
            } else {
                setIsLoadingMore(true);
            }

            const currentOffset = reset ? 0 : (page - 1) * LIMIT;

            const params: NotificationQueryParams = {
                limit: LIMIT,
                offset: currentOffset,
            };

            if (tab === 'unread') {
                params.is_read = false;
            } else if (tab === 'warning') {
                params.type = 'WARNING';
            }

            const [response, count] = await Promise.all([
                notificationService.getNotifications(token, params),
                notificationService.getUnreadCount(token)
            ]);

            if (reset) {
                setNotifications(response.items);
            } else {
                setNotifications(prev => [...prev, ...response.items]);
            }

            setHasMore(response.items.length === LIMIT);
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            showToast("Không thể tải thông báo", "error");
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [tab, page, showToast]);

    // Initial load and tab change
    useEffect(() => {
        fetchNotifications(true);
    }, [tab]);

    const handleLoadMore = () => {
        setPage(prev => prev + 1);
    };

    useEffect(() => {
        if (page > 1) {
            fetchNotifications(false);
        }
    }, [page]);

    useEffect(() => {
        const token = authStorage.getAccessToken();
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL;
        if (!token || !socketUrl) return;

        const socketInstance = io(socketUrl, {
            auth: { token: `Bearer ${token}` },
            transports: ["websocket", "polling"],
        });

        setSocket(socketInstance);

        const refreshNotifications = () => {
            void fetchNotifications(true);
        };

        const userEvents = [
            "userNotification:received",
            "userNotification:read",
            "userNotification:allRead",
        ];

        const orgEvents = [
            "orgNotification:created",
            "orgNotification:updated",
            "orgNotification:deleted",
            "orgNotification:deletedMany",
        ];

        userEvents.forEach((eventName) => {
            socketInstance.on(eventName, refreshNotifications);
        });

        orgEvents.forEach((eventName) => {
            socketInstance.on(eventName, refreshNotifications);
        });

        socketInstance.on("userNotification:received", () => {
            showToast("Bạn có thông báo mới", "success");
        });

        return () => {
            userEvents.forEach((eventName) => {
                socketInstance.off(eventName, refreshNotifications);
            });
            orgEvents.forEach((eventName) => {
                socketInstance.off(eventName, refreshNotifications);
            });
            socketInstance.off("userNotification:received");
            socketInstance.disconnect();
            setSocket(null);
        };
    }, [fetchNotifications, showToast]);


    const markAsRead = async (id: string) => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        try {
            await notificationService.markAsRead(token, id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        try {
            await notificationService.markAllAsRead(token);
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
            );
            setUnreadCount(0);
            showToast("Đã đánh dấu tất cả là đã đọc", "success");
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            showToast("Có lỗi xảy ra", "error");
        }
    };

    return (
        <div className={cn(
            "w-full bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden",
            className
        )}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Thông báo</h3>
                    <div className="flex items-center gap-3">
                        {socket?.connected && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Realtime
                            </span>
                        )}
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                                <Check className="w-4 h-4 mr-1" />
                                Đánh dấu tất cả đã đọc
                            </Button>
                        )}
                    </div>
                </div>

                <Tabs value={tab} onValueChange={setTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="all">Tất cả</TabsTrigger>
                        <TabsTrigger value="unread">
                            Chưa đọc
                            {unreadCount > 0 && (
                                <Badge variant="secondary" className="ml-2 h-5 px-1.5 min-w-[1.25rem]">{unreadCount}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="warning">Cảnh báo</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
                {isLoading ? (
                    <NotificationSkeleton count={5} />
                ) : notifications.length === 0 ? (
                    <NotificationEmptyState />
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {notifications.map((notification) => {
                            const config = getNotificationConfig(notification.type);
                            const Icon = config.icon;

                            return (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                                    className={cn(
                                        "p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer relative group",
                                        !notification.is_read ? "bg-blue-50/50 dark:bg-blue-900/10" : "bg-white dark:bg-slate-800"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "mt-0.5 p-2 rounded-full shrink-0",
                                            config.bgColor,
                                            config.textColor
                                        )}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className={cn(
                                                    "font-medium text-sm",
                                                    !notification.is_read ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"
                                                )}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                                                    {formatRelativeTime(notification.created_at)}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 [&_p]:inline [&_br]:content-[' ']">
                                                {/<[a-z][\s\S]*>/i.test(formatContent(notification.content) || '') ? (
                                                    <span dangerouslySetInnerHTML={{ __html: formatContent(notification.content) || '' }} />
                                                ) : (
                                                    formatContent(notification.content)
                                                )}
                                            </div>
                                        </div>

                                        {!notification.is_read && (
                                            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            </div>
                                        )}
                                        {!notification.is_read && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0 group-hover:opacity-0 transition-opacity" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {hasMore && (
                            <div className="p-4 text-center">
                                <Button
                                    variant="ghost"
                                    onClick={handleLoadMore}
                                    disabled={isLoadingMore}
                                    className="text-muted-foreground"
                                >
                                    {isLoadingMore ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Đang tải thêm...
                                        </>
                                    ) : (
                                        "Xem thêm"
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
