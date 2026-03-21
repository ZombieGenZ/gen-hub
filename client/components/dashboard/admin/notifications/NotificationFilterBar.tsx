import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { NotificationType } from "@/types/notification/notification.type";

interface NotificationFilterBarProps {
    searchKeyword: string;
    setSearchKeyword: (val: string) => void;
    typeFilter: NotificationType | "all";
    setTypeFilter: (val: NotificationType | "all") => void;
    typeBadgeConfig: Record<NotificationType, { label: string; className: string; icon: any }>;
}

export function NotificationFilterBar({
    searchKeyword,
    setSearchKeyword,
    typeFilter,
    setTypeFilter,
    typeBadgeConfig,
}: NotificationFilterBarProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm kiếm theo tiêu đề, nội dung..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-9 rounded-xl"
                />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <Button
                    variant={typeFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter("all")}
                    className="rounded-xl whitespace-nowrap"
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
                            className="gap-1.5 rounded-xl whitespace-nowrap"
                        >
                            <Icon className="w-4 h-4" />
                            {config.label}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
