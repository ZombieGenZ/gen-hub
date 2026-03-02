"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowLeft,
    MapPin,
    LayoutGrid,
    Package,
    FileText,
    ArrowUpRight,
    Building2,
    Ruler,
    Weight,
    Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
    MOCK_RENTED_WAREHOUSES,
    getOccupancyPct,
    occupancyColor,
    type ContractStatus,
} from "@/data/mockMyWarehouses";

import { FloorPlanTab } from "@/components/warehouse/tabs/FloorPlanTab";
import { InventoryTab } from "@/components/warehouse/tabs/InventoryTab";
import { ContractBillingTab } from "@/components/warehouse/tabs/ContractBillingTab";
import {
    CapacityForecastChart,
    ContractAlertBanner,
    OptimizeStorageCard,
} from "@/components/warehouse/SmartAlerts";

// ── Status badge config ──

const STATUS_CFG: Record<ContractStatus, { label: string; className: string }> = {
    ACTIVE: { label: "Đang hoạt động", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400" },
    PENDING: { label: "Chờ duyệt", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400" },
    EXPIRING: { label: "Sắp hết hạn", className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400" },
    OVERDUE_LEVEL_1: { label: "Quá hạn", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400" },
};

export default function WarehouseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const warehouseId = params.id as string;
    const [activeTab, setActiveTab] = useState("floor-plan");

    const warehouse = useMemo(
        () => MOCK_RENTED_WAREHOUSES.find((w) => w.id === warehouseId),
        [warehouseId]
    );

    if (!warehouse) {
        return (
            <div className="flex flex-col items-center justify-center min-h-100 gap-4">
                <p className="text-muted-foreground">Không tìm thấy kho.</p>
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/customer/warehouses")}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
                </Button>
            </div>
        );
    }

    const occupancy = getOccupancyPct(warehouse);
    const status = STATUS_CFG[warehouse.contract_status];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 mt-1"
                    onClick={() => router.push("/dashboard/customer/warehouses")}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-bold tracking-tight">{warehouse.name}</h1>
                        <Badge variant="outline" className={cn("text-[10px] font-normal", status.className)}>
                            {status.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{warehouse.type}</Badge>
                        <Badge variant="outline" className="text-[10px]">
                            {warehouse.is_whole_warehouse ? "Nguyên Kho" : "Thuê Một Phần"}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {warehouse.address}
                    </p>
                </div>

                <Link
                    href={`/dashboard/customer/contracts/${warehouse.contract_id}`}
                    className="shrink-0"
                >
                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <FileText className="w-3.5 h-3.5" /> Xem hợp đồng
                        <ArrowUpRight className="w-3 h-3" />
                    </Button>
                </Link>
            </div>

            {/* Contract alert banner */}
            <ContractAlertBanner warehouse={warehouse} />

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard
                    icon={<Building2 className="w-4 h-4" />}
                    label="Diện tích"
                    value={`${warehouse.area.toLocaleString("vi-VN")} m²`}
                />
                <SummaryCard
                    icon={<Ruler className="w-4 h-4" />}
                    label="Chiều cao trần"
                    value={`${warehouse.ceiling_height} m`}
                />
                <SummaryCard
                    icon={<Weight className="w-4 h-4" />}
                    label="Tải trọng sử dụng"
                    value={`${warehouse.current_weight.toLocaleString("vi-VN")} / ${warehouse.total_weight_capacity.toLocaleString("vi-VN")} kg`}
                />
                <SummaryCard
                    icon={<Thermometer className="w-4 h-4" />}
                    label="Công suất sử dụng"
                    value={`${occupancy}%`}
                    valueClassName={occupancyColor(occupancy)}
                />
            </div>

            {/* AI Forecast + Optimize */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <CapacityForecastChart warehouse={warehouse} />
                </div>
                <div>
                    <OptimizeStorageCard warehouse={warehouse} />
                </div>
            </div>

            {/* Main tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-9">
                    <TabsTrigger value="floor-plan" className="text-xs gap-1.5">
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Sơ đồ mặt bằng
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="text-xs gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Tồn kho ({warehouse.inventory.length})
                    </TabsTrigger>
                    <TabsTrigger value="contract" className="text-xs gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Hợp đồng & Thanh toán
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="floor-plan" className="mt-4">
                    <FloorPlanTab warehouse={warehouse} />
                </TabsContent>
                <TabsContent value="inventory" className="mt-4">
                    <InventoryTab warehouse={warehouse} />
                </TabsContent>
                <TabsContent value="contract" className="mt-4">
                    <ContractBillingTab warehouse={warehouse} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ── Summary card ──

function SummaryCard({
    icon,
    label,
    value,
    valueClassName,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <Card className="border">
            <CardContent className="p-3 flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 shrink-0 text-muted-foreground">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                    <p className={cn("text-sm font-semibold", valueClassName)}>{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
