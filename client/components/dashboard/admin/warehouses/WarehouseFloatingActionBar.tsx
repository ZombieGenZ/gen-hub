import React from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface WarehouseFloatingActionBarProps {
    selectedIds: string[];
    setSelectedIds: (val: string[]) => void;
    setIsBulkDeleteDialogOpen: (val: boolean) => void;
}

export function WarehouseFloatingActionBar({
    selectedIds,
    setSelectedIds,
    setIsBulkDeleteDialogOpen,
}: WarehouseFloatingActionBarProps) {
    if (selectedIds.length === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in rounded-3xl"
            >
                <span className="text-muted-foreground text-sm font-medium">
                    {selectedIds.length} đã chọn
                </span>
                <div className="h-4 w-px bg-border" />
                <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2 rounded-xl"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                    <TrashIcon className="w-4 h-4" /> Xóa
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedIds([])}
                    className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8"
                >
                    <XMarkIcon className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
