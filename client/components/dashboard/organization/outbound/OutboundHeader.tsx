import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpTrayIcon, PlusIcon, MagnifyingGlassIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
import type { ExportStatus } from "@/services/inventory/inventory.types";

const FILTER_TABS: { label: string; value: ExportStatus | "ALL" }[] = [
    { label: "Tất cả", value: "ALL" },
    { label: "Chờ xử lý", value: "PENDING" },
    { label: "Đang lấy hàng", value: "PICKING" },
    { label: "Đang kiểm tra", value: "CHECKING" },
    { label: "Đã đóng gói", value: "PACKED" },
];

interface OutboundHeaderProps {
    totalItems: number;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    activeTab: ExportStatus | "ALL";
    onTabChange: (val: ExportStatus | "ALL") => void;
    onCreateClick: () => void;
    onImportClick?: () => void;
    onExportClick?: () => void;
    isExporting?: boolean;
}

export function OutboundHeader({
    totalItems,
    searchTerm,
    onSearchChange,
    activeTab,
    onTabChange,
    onCreateClick,
    onImportClick,
    onExportClick,
    isExporting = false,
}: OutboundHeaderProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-[32px] font-bold tracking-tight leading-[130%]">
                        Phiếu xuất kho
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý và theo dõi {totalItems} phiếu xuất kho
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
                        <ArrowUpTrayIcon className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                        <span className="hidden sm:inline">
                            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
                        </span>
                    </Button>
                    <Button
                        onClick={onCreateClick}
                        className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Tạo phiếu xuất
                    </Button>
                </div>
            </div>

            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[250px]">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo mã phiếu, mã SO..."
                                className="pl-9 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                aria-label="Tìm kiếm phiếu xuất"
                            />
                        </div>
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
