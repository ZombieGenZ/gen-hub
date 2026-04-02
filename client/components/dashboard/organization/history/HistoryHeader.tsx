import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    FunnelIcon,
} from "@heroicons/react/24/outline";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { TransactionType } from "@/services/inventory/inventory.types";

interface HistoryHeaderProps {
    totalItems: number;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    activeType: TransactionType | "ALL";
    onTypeChange: (type: TransactionType | "ALL") => void;
    onExportClick: () => void;
    isExporting: boolean;
}

export const HistoryHeader = ({
    totalItems,
    searchTerm,
    onSearchChange,
    activeType,
    onTypeChange,
    onExportClick,
    isExporting,
}: HistoryHeaderProps) => {
    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Lịch sử biến động kho</h2>
                    <p className="text-sm text-muted-foreground">
                        Tổng cộng {totalItems} giao dịch tìm thấy
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onExportClick}
                        disabled={isExporting}
                        className="gap-2"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Xuất Excel
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm theo mã tham chiếu, SKU..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 h-10 w-full"
                        aria-label="Tìm kiếm lịch sử"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Select value={activeType} onValueChange={(v) => onTypeChange(v as any)}>
                        <SelectTrigger className="w-[180px] h-10">
                            <FunnelIcon className="w-4 h-4 mr-2 opacity-50" />
                            <SelectValue placeholder="Loại giao dịch" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả loại</SelectItem>
                            <SelectItem value="INBOUND">Nhập kho</SelectItem>
                            <SelectItem value="OUTBOUND">Xuất kho</SelectItem>
                            <SelectItem value="TRANSFER">Điều chuyển</SelectItem>
                            <SelectItem value="ADJUSTMENT">Điều chỉnh</SelectItem>
                            <SelectItem value="RETURN">Trả hàng</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};
