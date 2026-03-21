import React from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ChevronDownIcon,
    CheckCircleIcon,
    XCircleIcon,
    TrashIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

interface CouponFloatingActionBarProps {
    selectedCouponIds: string[];
    setSelectedCouponIds: (ids: string[]) => void;
    openBulkActionDialog: (action: 'activate' | 'deactivate' | 'delete') => void;
}

export function CouponFloatingActionBar({
    selectedCouponIds,
    setSelectedCouponIds,
    openBulkActionDialog,
}: CouponFloatingActionBarProps) {
    if (selectedCouponIds.length === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 rounded-3xl">
                <span className="text-muted-foreground font-medium text-[13px]">
                    {selectedCouponIds.length} đã chọn
                </span>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 rounded-xl">
                            Hành động
                            <ChevronDownIcon className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 rounded-xl">
                        <DropdownMenuItem
                            onClick={() => openBulkActionDialog('activate')}
                            className="cursor-pointer"
                        >
                            <span className="flex items-center gap-2">
                                <CheckCircleIcon className="w-4 h-4 text-green-600 shrink-0" />
                                <span>Bật mã giảm giá</span>
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => openBulkActionDialog('deactivate')}
                            className="cursor-pointer"
                        >
                            <span className="flex items-center gap-2">
                                <XCircleIcon className="w-4 h-4 text-gray-500 shrink-0" />
                                <span>Tắt mã giảm giá</span>
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => openBulkActionDialog('delete')}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                            <span className="flex items-center gap-2">
                                <TrashIcon className="w-4 h-4 shrink-0" />
                                <span>Xóa mã giảm giá</span>
                            </span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCouponIds([])}
                    className="text-muted-foreground hover:text-foreground rounded-xl"
                >
                    <XMarkIcon className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
