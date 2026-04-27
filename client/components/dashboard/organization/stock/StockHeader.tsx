import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Warehouse {
    id: string;
    name: string;
}

interface StockHeaderProps {
    totalItems: number;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedWarehouseId: string;
    onWarehouseChange: (value: string) => void;
    warehouses: Warehouse[];
    onExportClick?: () => void;
    isExporting?: boolean;
}

export function StockHeader({
    totalItems,
    searchTerm,
    onSearchChange,
    selectedWarehouseId,
    onWarehouseChange,
    warehouses,
    onExportClick,
    isExporting = false,
}: StockHeaderProps) {
    return (
        <div className="space-y-6">
            {/* ── Tiêu đề ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-[32px] font-bold tracking-tight leading-[130%]">
                        Tồn kho
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {totalItems > 0
                            ? `Đang theo dõi ${totalItems} dòng tồn kho`
                            : "Theo dõi hàng hóa trong từng kho của tổ chức"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={onExportClick}
                        disabled={isExporting}
                    >
                        {isExporting ? "Đang xuất..." : "Xuất Excel"}
                    </Button>
                </div>
            </div>

            {/* ── Thanh lọc ── */}
            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Tìm kiếm */}
                        <div className="relative flex-1 min-w-62.5">
                            <Input
                                placeholder="Tìm theo tên hoặc mã sản phẩm..."
                                className="rounded-xl"
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                aria-label="Tìm kiếm sản phẩm"
                            />
                        </div>

                        {/* Bộ lọc kho */}
                        <div className="w-56">
                            <Select
                                value={selectedWarehouseId || "ALL"}
                                onValueChange={(v) =>
                                    onWarehouseChange(v === "ALL" ? "" : v)
                                }
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Tất cả kho" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả kho</SelectItem>
                                    {warehouses.map((wh) => (
                                        <SelectItem key={wh.id} value={wh.id}>
                                            {wh.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
