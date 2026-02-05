"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface NotificationEmptyStateProps {
    className?: string;
    message?: string;
}

/**
 * Fun empty state component for when there are no notifications
 */
export function NotificationEmptyState({
    className,
    message = "Bạn đã cập nhật hết mọi tin tức!"
}: NotificationEmptyStateProps) {
    return (
        <div className={cn(
            "notification-empty-state flex flex-col items-center justify-center py-8 px-4",
            className
        )}>
            {/* Illustration */}
            <div className="notification-empty-state__illustration relative w-40 h-40 mb-4">
                <Image
                    src="/assets/empty-notification.png"
                    alt="No notifications"
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            {/* Message */}
            <p className="notification-empty-state__message text-sm text-muted-foreground text-center font-medium">
                {message}
            </p>

            {/* Decorative elements */}
            <div className="notification-empty-state__decoration mt-2 flex items-center gap-1">
                <span className="text-lg">🎉</span>
                <span className="text-xs text-muted-foreground">Tuyệt vời!</span>
            </div>
        </div>
    );
}
