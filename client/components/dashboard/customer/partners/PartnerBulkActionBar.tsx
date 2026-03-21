import React from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@heroicons/react/24/outline";

interface PartnerBulkActionBarProps {
    selectedIdsCount: number;
    onDeleteClick: () => void;
    onClearSelection: () => void;
}

export function PartnerBulkActionBar({
    selectedIdsCount,
    onDeleteClick,
    onClearSelection,
}: PartnerBulkActionBarProps) {
    if (selectedIdsCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl">
                <span className="text-sm">
                    Đã chọn <strong>{selectedIdsCount}</strong> đối tác
                </span>
                <div className="w-px h-5 bg-slate-600" />
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    onClick={onDeleteClick}
                >
                    <TrashIcon className="w-4 h-4 mr-1.5" />
                    Xóa
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-300 hover:text-white"
                    onClick={onClearSelection}
                >
                    Bỏ chọn
                </Button>
            </div>
        </div>
    );
}
