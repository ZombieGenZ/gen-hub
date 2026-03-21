import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownTrayIcon, PlusIcon } from "@heroicons/react/24/outline";

interface WarehouseHeaderProps {
    totalItems: number;
    setCreateDialogOpen: (val: boolean) => void;
}

export function WarehouseHeader({ totalItems, setCreateDialogOpen }: WarehouseHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-[32px] leading-[130%]">
                    Quản lý kho
                </h1>
                <p className="text-muted-foreground mt-1">
                    Quản lý và theo dõi {totalItems} kho hàng trên toàn hệ thống
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2 rounded-xl">
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Xuất Excel</span>
                </Button>
                <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl"
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm kho mới
                </Button>
            </div>
        </div>
    );
}
