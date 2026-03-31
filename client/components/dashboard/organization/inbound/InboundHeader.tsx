import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownTrayIcon, PlusIcon, MagnifyingGlassIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
import type { ReceiptStatus } from "@/services/inventory/inventory.types";

const FILTER_TABS: { label: string; value: ReceiptStatus | "ALL" }[] = [
    { label: "Tất cả", value: "ALL" },
    { label: "Chờ xử lý", value: "PENDING" },
    { label: "Đã duyệt", value: "APPROVED" },
    { label: "Đang kiểm đếm", value: "RECEIVING" },
    { label: "Đang nhập kho", value: "PROCESSING" },
    { label: "Đang cất hàng", value: "PUTAWAY" },
];

interface InboundHeaderProps {
    totalItems: number;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    activeTab: ReceiptStatus | "ALL";
    onTabChange: (value: ReceiptStatus | "ALL") => void;
    onCreateClick: () => void;
    onImportClick?: () => void;
    onExportClick?: () => void;
    isExporting?: boolean;
}

export function InboundHeader({
    totalItems,
    searchTerm,
    onSearchChange,
    activeTab,
    onTabChange,
    onCreateClick,
    onImportClick,
    onExportClick,
    isExporting = false,
}: InboundHeaderProps) {
    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-[32px] font-bold tracking-tight leading-[130%]">
                        Phiếu nhập kho
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý và theo dõi {totalItems} phiếu nhập kho
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        className="gap-2 rounded-xl"
                        onClick={onImportClick}
                    >
                        <CloudArrowUpIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Nhập Excel</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="gap-2 rounded-xl"
                        onClick={onExportClick}
                        disabled={isExporting}
                    >
                        <ArrowDownTrayIcon className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                        <span className="hidden sm:inline">
                            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
                        </span>
                    </Button>
                    <Button
                        onClick={onCreateClick}
                        className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Tạo phiếu nhập
                    </Button>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-62.5">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo mã phiếu, mã PO..."
                                className="pl-9 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                        </div>

                        {/* Tab Filters */}
                        <div className="flex items-center gap-2">
                            {FILTER_TABS.map((tab) => (
                                <Button
                                    key={tab.value}
                                    variant={activeTab === tab.value ? "secondary" : "ghost"}
                                    onClick={() => onTabChange(tab.value)}
                                    size="sm"
                                    className="rounded-full"
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
