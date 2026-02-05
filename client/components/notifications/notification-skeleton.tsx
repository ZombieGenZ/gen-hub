"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface NotificationSkeletonProps {
    count?: number;
}

/**
 * Skeleton loading component for notification items
 */
export function NotificationSkeleton({ count = 5 }: NotificationSkeletonProps) {
    return (
        <div className="notification-skeleton">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="notification-skeleton__item flex items-start gap-3 border-b px-3 py-3"
                >
                    {/* Icon skeleton */}
                    <Skeleton className="notification-skeleton__icon mt-1 h-9 w-9 rounded-full shrink-0" />

                    {/* Content skeleton */}
                    <div className="notification-skeleton__content flex-1 space-y-2">
                        {/* Title line */}
                        <Skeleton className="notification-skeleton__title h-4 w-4/5" />

                        {/* Content line */}
                        <Skeleton className="notification-skeleton__text h-3 w-full" />

                        {/* Time line */}
                        <Skeleton className="notification-skeleton__time h-3 w-20" />
                    </div>

                    {/* Unread dot skeleton */}
                    <Skeleton className="notification-skeleton__dot mt-1 h-2 w-2 rounded-full" />
                </div>
            ))}
        </div>
    );
}

/**
 * Single notification item skeleton
 */
export function NotificationItemSkeleton() {
    return (
        <div className="notification-item-skeleton flex items-start gap-3 border-b px-3 py-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
    );
}
