import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { ScanLine } from "lucide-react";
import type { ProductQuickFilter } from "@/types/product-inventory";

interface ProductHeaderProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    quickFilter: ProductQuickFilter;
    onQuickFilterChange: (value: ProductQuickFilter) => void;
    onScannerOpen: () => void;
    onCreateClick: () => void;
    onImportOpen: () => void;
    onExportClick: () => void;
}

export function ProductHeader({
    searchTerm,
    onSearchChange,
    quickFilter,
    onQuickFilterChange,
    onScannerOpen,
    onCreateClick,
    onImportOpen,
    onExportClick,
}: ProductHeaderProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quản lý Hàng Hoá</h1>
                    <p className="text-slate-500 mt-1">
                        Danh sách tổng hợp tất cả hàng hóa trong hệ thống kho
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button
                        variant="outline"
                        className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                        onClick={onImportOpen}
                    >
                        <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                        Nhập Excel
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                        onClick={onExportClick}
                    >
                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                        Xuất Excel
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-xl border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E]/5"
                        onClick={onScannerOpen}
                    >
                        <ScanLine className="w-4 h-4 mr-2" />
                        Quét để thêm
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={onCreateClick}
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Thêm sản phẩm
                    </Button>
                </div>
            </div>

            <Card className="shadow-premium rounded-3xl border-0">
                <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Tìm kiếm theo tên, SKU hoặc quét mã vạch..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-10 pr-10 h-10 rounded-xl"
                                aria-label="Tìm kiếm sản phẩm"
                            />
                            <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => onQuickFilterChange("all")}
                                className={`rounded-lg border ${quickFilter === "all"
                                    ? "bg-[#0F766E] text-white border-[#0F766E] hover:bg-[#0F766E]/90"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                Tất cả
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => onQuickFilterChange("low_stock")}
                                className={`rounded-lg border flex items-center gap-1.5 ${quickFilter === "low_stock"
                                    ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-500/90"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                Sắp hết hàng
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => onQuickFilterChange("expiring_soon")}
                                className={`rounded-lg border flex items-center gap-1.5 ${quickFilter === "expiring_soon"
                                    ? "bg-red-500 text-white border-red-500 hover:bg-red-500/90"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                <ClockIcon className="w-3.5 h-3.5" />
                                Lô sắp hết hạn
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
