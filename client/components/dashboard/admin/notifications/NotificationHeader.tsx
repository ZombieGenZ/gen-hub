import React from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@heroicons/react/24/outline";

interface NotificationHeaderProps {
    setIsComposeOpen: (val: boolean) => void;
}

export function NotificationHeader({ setIsComposeOpen }: NotificationHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Quản lý thông báo</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Gửi và quản lý thông báo đến người dùng
                </p>
            </div>
            <Button
                onClick={() => setIsComposeOpen(true)}
                className="bg-[#0F766E] hover:bg-[#0D655D] transition-all duration-200 active:scale-[0.97] hover:shadow-md rounded-xl"
            >
                <PlusIcon className="w-4 h-4 mr-2" />
                Tạo thông báo mới
            </Button>
        </div>
    );
}
