import React from "react";
import { Button } from "@/components/ui/button";
import { NoSymbolIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ContractFloatingActionBarProps {
    someSelected: boolean;
    selectedIdsCount: number;
    handleBulkCancel: () => void;
    clearSelection: () => void;
}

export function ContractFloatingActionBar({
    someSelected,
    selectedIdsCount,
    handleBulkCancel,
    clearSelection,
}: ContractFloatingActionBarProps) {
    if (!someSelected) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div
                className="rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in"
            >
                <span className="text-sm font-medium text-brand-subtle-foreground">
                    {selectedIdsCount} hợp đồng đã chọn
                </span>
                <div className="h-4 w-px bg-border" />
                <Button variant="destructive" size="sm" className="h-7 gap-1.5 text-xs rounded-xl" onClick={handleBulkCancel}>
                    <NoSymbolIcon className="w-3.5 h-3.5" />
                    Hủy hàng loạt
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-foreground rounded-full"
                    onClick={clearSelection}
                >
                    <XMarkIcon className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}
