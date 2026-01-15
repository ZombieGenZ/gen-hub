"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Bell,
    GitMerge,
    FileText,
    ClipboardCheck,
    Mail,
    MessageSquareQuote,
    AlertCircle,
    AlertTriangle,
    Info,
    LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
    id: number;
    user: string;
    action: string;
    target: string;
    timestamp: string;
    unread: boolean;
    icon: LucideIcon;
    alertType?: 'warning' | 'danger' | 'info';
}

const initialNotifications: Notification[] = [
    {
        id: 1,
        user: "Alicia Keys",
        action: "merged",
        target: "PR #105: Dark mode support",
        timestamp: "10 minutes ago",
        unread: true,
        icon: GitMerge,
    },
    {
        id: 2,
        user: "Daniel Green",
        action: "shared file",
        target: "Quarterly Report.pdf",
        timestamp: "30 minutes ago",
        unread: true,
        icon: FileText,
    },
    {
        id: 3,
        user: "Sophia Turner",
        action: "assigned you a task",
        target: "Marketing campaign brief",
        timestamp: "2 hours ago",
        unread: false,
        icon: ClipboardCheck,
    },
    {
        id: 4,
        user: "Michael Ross",
        action: "sent you a message",
        target: "Project feedback discussion",
        timestamp: "5 hours ago",
        unread: false,
        icon: Mail,
    },
    {
        id: 5,
        user: "Priya Sharma",
        action: "added a comment",
        target: "UX Review Notes",
        timestamp: "1 day ago",
        unread: false,
        icon: MessageSquareQuote,
    },
    {
        id: 6,
        user: "System",
        action: "alert",
        target: "Server downtime scheduled",
        timestamp: "3 days ago",
        unread: true,
        icon: AlertCircle,
        alertType: 'danger'
    },
    {
        id: 7,
        user: "Security",
        action: "alert",
        target: "Unusual login attempt detected",
        timestamp: "5 hours ago",
        unread: true,
        icon: AlertTriangle,
        alertType: 'warning'
    },
    {
        id: 8,
        user: "Maintenance",
        action: "alert",
        target: "System update completed",
        timestamp: "1 day ago",
        unread: false,
        icon: Info,
        alertType: 'info'
    },
];

export function useNotifications() {
    const [notifications, setNotifications] = useState(initialNotifications);
    const unreadCount = notifications.filter((n) => n.unread).length;

    const markAsRead = (id: number) => {
        setNotifications(
            notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)),
        );
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map((n) => ({ ...n, unread: false })));
    };

    return { notifications, unreadCount, markAsRead, markAllAsRead };
}

interface NotificationListProps {
    className?: string;
    isFullPage?: boolean;
}

export function NotificationList({ className, isFullPage = false }: NotificationListProps) {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [tab, setTab] = useState("all");
    const pathname = usePathname();

    // Determine link base on current path
    const isCustomer = pathname?.includes("/dashboard/customer");
    const notificationsLink = isCustomer
        ? "/dashboard/customer/notifications"
        : "/dashboard/admin/notifications";

    const filtered =
        tab === "unread" ? notifications.filter((n) => n.unread) :
            tab === "alert" ? notifications.filter((n) => n.action === "alert") :
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
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Không có thông báo
                        </div>
                    ) : (
                        filtered.map((n) => {
                            const Icon = n.icon;

                            // Helper to get color styles based on action and alert type
                            const getIconStyles = (n: Notification) => {
                                if (n.action === 'alert') {
                                    switch (n.alertType) {
                                        case 'danger': return "bg-red-100 text-red-600";
                                        case 'warning': return "bg-yellow-100 text-yellow-600";
                                        case 'info': return "bg-blue-100 text-blue-600";
                                        default: return "bg-red-100 text-red-600";
                                    }
                                }

                                switch (n.action) {
                                    case 'merged': return "bg-purple-100 text-purple-600";
                                    case 'assigned you a task': return "bg-green-100 text-green-600";
                                    case 'shared file': return "bg-orange-100 text-orange-600";
                                    default: return "bg-gray-100 text-gray-600";
                                }
                            };

                            return (
                                <button
                                    key={n.id}
                                    onClick={() => markAsRead(n.id)}
                                    className="flex w-full items-start gap-3 border-b px-3 py-3 text-left hover:bg-accent transition-colors"
                                >
                                    <div className={cn("mt-1 p-2 rounded-full shrink-0", getIconStyles(n))}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p
                                            className={`text-sm ${n.unread ? "font-semibold text-foreground" : "text-foreground/80"
                                                }`}
                                        >
                                            {n.user} {n.action}{" "}
                                            <span className="font-medium">{n.target}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">{n.timestamp}</p>
                                    </div>
                                    {n.unread && (
                                        <span className="mt-1 inline-block size-2 rounded-full bg-primary" />
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

function NotificationInboxPopover({ trigger, side = "bottom", align = "center", sideOffset = 4, className }: NotificationInboxPopoverProps) {
    const { unreadCount } = useNotifications();
    const triggerNode = typeof trigger === "function" ? trigger(unreadCount) : trigger;

    return (
        <Popover>
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
            <PopoverContent side={side} align={align} sideOffset={sideOffset} className={cn("p-2", className)}>
                <NotificationList className="w-[380px] h-full" />
            </PopoverContent>
        </Popover>
    );
}

export { NotificationInboxPopover, type NotificationInboxPopoverProps };
