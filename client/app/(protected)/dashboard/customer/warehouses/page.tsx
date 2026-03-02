"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    BuildingStorefrontIcon,
    MagnifyingGlassIcon,
    MapPinIcon,
    CalendarDaysIcon,
    CubeIcon,
    ArrowTopRightOnSquareIcon,
    EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import {
    Warehouse,
    PackageCheck,
    ArrowUpFromLine,
    PackageSearch,
    RotateCcw,
    AlertTriangle,
    TrendingUp,
    Building2,
    Weight,
} from "lucide-react";
import {
    MOCK_RENTED_WAREHOUSES,
    getOccupancyPct,
    daysUntil,
    formatCurrency,
    occupancyColor,
    occupancyBarColor,
    type MockRentedWarehouse,
    type ContractStatus,
    type WarehouseType,
} from "@/data/mockMyWarehouses";

// ── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ContractStatus, { label: string; className: string }> = {
    ACTIVE: { label: "Đang hiệu lực", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" },
    PENDING: { label: "Chờ kích hoạt", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
    EXPIRING: { label: "Sắp hết hạn", className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800" },
    OVERDUE_LEVEL_1: { label: "Quá hạn", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
};

const TYPE_ICON: Record<WarehouseType, React.ReactNode> = {
    "Kho Thường": <Warehouse className="w-3.5 h-3.5" />,

    "Fulfillment": <PackageCheck className="w-3.5 h-3.5" />,
};

// ── Warehouse Card ──────────────────────────────────────────────────────────

function WarehouseCard({ wh }: { wh: MockRentedWarehouse }) {
    const statusCfg = STATUS_CONFIG[wh.contract_status];
    const days = daysUntil(wh.expired_at);
    const occupancy = getOccupancyPct(wh);

    return (
        <Link href={`/dashboard/customer/warehouses/${wh.id}`} className="block">
            <Card className="overflow-hidden border border-border hover:shadow-lg hover:border-brand/30 transition-all duration-200 group cursor-pointer h-full">
                {/* Image */}
                <div className="relative h-40 overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={wh.image}
                        alt={wh.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />

                    <div className="absolute top-2.5 left-2.5">
                        <Badge variant="outline" className={`text-xs backdrop-blur-sm ${statusCfg.className}`}>
                            {statusCfg.label}
                        </Badge>
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 backdrop-blur-sm">
                            {TYPE_ICON[wh.type]}
                            {wh.type}
                        </Badge>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5">
                        <Badge className={`text-xs ${wh.is_whole_warehouse
                            ? "bg-brand/90 hover:bg-brand text-white"
                            : "bg-purple-600/90 hover:bg-purple-600 text-white"
                            }`}>
                            {wh.is_whole_warehouse ? "Nguyên Kho" : "Thuê Một Phần"}
                        </Badge>
                    </div>
                    {!wh.auto_renew && days <= 60 && days > 0 && (
                        <div className="absolute bottom-2.5 right-2.5">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <AlertTriangle className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Sắp hết hạn trong {days} ngày – chưa bật gia hạn tự động</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}
                </div>

                <CardContent className="p-4 space-y-3">
                    <div>
                        <h3 className="font-semibold text-sm leading-tight group-hover:text-brand transition-colors">
                            {wh.name}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                            {wh.address}
                        </p>
                    </div>

                    {/* Utilization */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Weight className="w-3 h-3" />
                                Mức sử dụng
                            </span>
                            <span className={`font-bold ${occupancyColor(occupancy)}`}>{occupancy}%</span>
                        </div>
                        <Progress value={occupancy} className={`h-2 ${occupancyBarColor(occupancy)}`} />
                        <p className="text-[10px] text-muted-foreground">
                            {(wh.current_weight / 1000).toFixed(1)}T / {(wh.total_weight_capacity / 1000).toFixed(1)}T
                        </p>
                    </div>

                    {/* Contract info */}
                    <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Hợp đồng</span>
                            <span className="font-medium text-brand">{wh.contract_code}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <CalendarDaysIcon className="w-3.5 h-3.5" />
                                Hết hạn
                            </span>
                            <span className={`font-semibold ${days < 0 ? "text-red-600" : days <= 60 ? "text-yellow-600" : "text-green-600"}`}>
                                {days < 0 ? `Quá hạn ${Math.abs(days)} ngày` : `${days} ngày`}
                            </span>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1.5 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <ArrowUpFromLine className="w-3.5 h-3.5" />
                            Yêu cầu xuất
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <PackageSearch className="w-3.5 h-3.5" />
                            Xem tồn kho
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                    <EllipsisVerticalIcon className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2 text-xs">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Gia hạn hợp đồng
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-xs">
                                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                    Xem hợp đồng
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const STATUS_TABS = [
    { value: "ALL", label: "Tất cả" },
    { value: "ACTIVE", label: "Đang hiệu lực" },
    { value: "EXPIRING", label: "Sắp hết hạn" },
    { value: "PENDING", label: "Chờ kích hoạt" },
    { value: "OVERDUE_LEVEL_1", label: "Quá hạn" },
];

export default function MyWarehousesPage() {
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("ALL");

    const filtered = useMemo(() =>
        MOCK_RENTED_WAREHOUSES.filter((wh) => {
            const q = search.trim().toLowerCase();
            const matchSearch =
                q === "" ||
                wh.name.toLowerCase().includes(q) ||
                wh.address.toLowerCase().includes(q) ||
                wh.contract_code.toLowerCase().includes(q);
            const matchTab = tab === "ALL" || wh.contract_status === tab;
            return matchSearch && matchTab;
        }), [search, tab]
    );

    const stats = useMemo(() => {
        const all = MOCK_RENTED_WAREHOUSES;
        const active = all.filter((w) => w.contract_status === "ACTIVE" || w.contract_status === "EXPIRING");
        const totalArea = active.reduce((s, w) => s + w.area, 0);
        const totalMonthly = active.reduce((s, w) => s + w.final_price / 12, 0);
        const totalCapacity = active.reduce((s, w) => s + w.total_weight_capacity, 0);
        const totalUsed = active.reduce((s, w) => s + w.current_weight, 0);
        const avgOccupancy = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;
        const expiring = all.filter((w) => w.contract_status === "EXPIRING").length;
        return { count: active.length, totalArea, totalMonthly, avgOccupancy, expiring };
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Kho đang thuê</h1>
                <p className="text-muted-foreground text-sm">
                    Quản lý toàn bộ không gian kho bãi của bạn. Click vào thẻ để xem chi tiết.
                </p>
            </div>

            {/* Smart alert */}
            {stats.expiring > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>
                        Bạn có <strong>{stats.expiring} kho</strong> sắp hết hạn hợp đồng. Hãy kiểm tra và gia hạn sớm để tránh gián đoạn.
                    </span>
                    <Button variant="outline" size="sm" className="ml-auto shrink-0 text-xs border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                        Xem ngay
                    </Button>
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="rounded-lg bg-brand/10 p-2.5 shrink-0">
                            <Building2 className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Kho đang thuê</p>
                            <p className="text-2xl font-bold">{stats.count}</p>
                            {stats.expiring > 0 && <p className="text-xs text-yellow-600">{stats.expiring} sắp hết hạn</p>}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-border">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="rounded-lg bg-blue-500/10 p-2.5 shrink-0">
                            <CubeIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Tổng diện tích</p>
                            <p className="text-2xl font-bold">{stats.totalArea.toLocaleString("vi-VN")}</p>
                            <p className="text-xs text-muted-foreground">m² đang thuê</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-border">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="rounded-lg bg-green-500/10 p-2.5 shrink-0">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Mức sử dụng TB</p>
                            <p className={`text-2xl font-bold ${occupancyColor(stats.avgOccupancy)}`}>{stats.avgOccupancy}%</p>
                            <p className="text-xs text-muted-foreground">trung bình tất cả kho</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-border">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="rounded-lg bg-purple-500/10 p-2.5 shrink-0">
                            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Chi phí / tháng</p>
                            <p className="text-lg font-bold text-brand">{formatCurrency(stats.totalMonthly)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <Tabs value={tab} onValueChange={setTab}>
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                        <TabsList className="bg-card border h-auto p-1 inline-flex flex-nowrap min-w-max">
                            {STATUS_TABS.map((t) => (
                                <TabsTrigger
                                    key={t.value}
                                    value={t.value}
                                    className="text-xs px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-brand data-[state=active]:text-white"
                                >
                                    {t.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                </Tabs>
                <div className="relative flex-1 max-w-xs">
                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm theo tên kho, địa chỉ, mã HĐ..."
                        className="pl-8 text-sm h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <BuildingStorefrontIcon className="w-12 h-12 opacity-30" />
                    <p className="font-medium">Không tìm thấy kho nào</p>
                    <p className="text-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.map((wh) => (
                        <WarehouseCard key={wh.id} wh={wh} />
                    ))}
                </div>
            )}
        </div>
    );
}
