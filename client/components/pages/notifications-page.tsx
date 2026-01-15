"use client";

import React from "react";
import { NotificationList } from "@/components/ui/notification-inbox-popover";
import { BellIcon } from "@heroicons/react/24/outline";

export function NotificationsPage() {
    return (
        <div className="container mx-auto max-w-full py-4">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-sidebar-accent rounded-lg">
                    <BellIcon className="w-8 h-8 text-sidebar-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Thông báo</h1>
                    <p className="text-muted-foreground">Quản lý tất cả thông báo và cập nhật của bạn.</p>
                </div>
            </div>

            <div className="bg-card border rounded-xl shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                <NotificationList
                    className="w-full flex-1 border-none shadow-none bg-card"
                    isFullPage={true}
                />
            </div>
        </div>
    );
}
