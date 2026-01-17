"use client";

import { useEffect, useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import { accountBalanceService } from "@/services/account-balance/account-balance.service";
import { ClockIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowDownTrayIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ChevronDownIcon,
    ArrowUpRightIcon,
    ArrowDownLeftIcon,
    EllipsisHorizontalIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function CustomerDashboardOverview() {
    const router = useRouter();
    const [dateFilter, setDateFilter] = useState("week");
    const [stats, setStats] = useState({
        totalStock: 0,
        totalStockTrend: { value: "0%", direction: "up", label: "" },
        outboundOrders: 0,
        outboundOrdersTrend: { value: "0%", direction: "up", label: "" },
        inboundShipments: 0,
        inboundShipmentsTrend: { value: "0%", direction: "up", label: "" },
        efficiency: 0,
        balance: 0,
        unpaidInvoices: 2,
        totalDebt: 15000000,
        activeContracts: 0,
        expiringContracts: 0
    });
    const [stockFlow, setStockFlow] = useState<any[]>([]);
    const [shipments, setShipments] = useState<any[]>([]);
    const [stockAlerts, setStockAlerts] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartPeriod, setChartPeriod] = useState("week");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = authStorage.getAccessToken();
                const user = authStorage.getUser();
                if (!token) return;
                const balanceRes = user?.organization_id
                    ? await accountBalanceService.getOrganizationBalance(token, user.organization_id).catch(() => ({ balance: 0 }))
                    : { balance: 0 };

                // Mock Operational Data (since inventory services aren't connected yet)
                setStats({
                    totalStock: 84932,
                    totalStockTrend: { value: "+4%", direction: "up", label: "so với tuần trước" },
                    outboundOrders: 7214,
                    outboundOrdersTrend: { value: "-3.2%", direction: "down", label: "so với tuần trước" },
                    inboundShipments: 4286,
                    inboundShipmentsTrend: { value: "+2.3%", direction: "up", label: "so với tuần trước" },
                    efficiency: 84,
                    balance: (balanceRes as any)?.balance || 0,
                    unpaidInvoices: 2,
                    totalDebt: 15000000,
                    activeContracts: 12,
                    expiringContracts: 2
                });

                // Mock Stock Flow (Last 7 days)
                setStockFlow([
                    { day: "T2", inbound: 950, outbound: 600 },
                    { day: "T3", inbound: 480, outbound: 590 },
                    { day: "T4", inbound: 760, outbound: 450 },
                    { day: "T5", inbound: 1020, outbound: 600 },
                    { day: "T6", inbound: 910, outbound: 590 },
                    { day: "T7", inbound: 450, outbound: 530 },
                    { day: "CN", inbound: 290, outbound: 740 },
                ]);

                // Mock Shipments
                setShipments([
                    { id: "BOB-1-298", type: "Nhập", partner: "CV. Indika Perkasa", date: "25/01/2025 20:00", status: "Đang xử lý" },
                    { id: "BOB-1-295", type: "Xuất", partner: "PT. Boga Makmur", date: "24/01/2025 13:25", status: "Hoàn tất" },
                    { id: "BOB-1-274", type: "Nhập", partner: "Simmons Karl Global", date: "23/01/2025 13:25", status: "Đã hủy" },
                    { id: "BOB-1-262", type: "Xuất", partner: "Wings Corp Group", date: "23/01/2025 10:00", status: "Delayed" },
                    { id: "BOB-1-256", type: "Nhập", partner: "Maxim Global Ltd", date: "22/01/2025 20:00", status: "Hoàn tất" },
                ]);

                // Mock Stock Alerts
                // Mock Stock Alerts
                setStockAlerts([
                    { name: "Trứng gà", unit: "kg", left: 24, total: 100 },
                    { name: "Dầu ăn", unit: "lít", left: 24, total: 100 },
                    { name: "Tỏi", unit: "kg", left: 12, total: 50 },
                    { name: "Tiêu đen", unit: "gói", left: 32, total: 120 },
                ]);

                // Mock Top Products
                setTopProducts([
                    { name: "iPhone 15 Pro Max", count: 500, unit: "cái", trend: "up", data: [30, 45, 60, 50, 70, 90] },
                    { name: "Ốp lưng Silicon", count: 200, unit: "cái", trend: "down", data: [80, 65, 50, 45, 30, 25] },
                    { name: "Củ sạc 20W", count: 150, unit: "cái", trend: "up", data: [20, 35, 40, 50, 60, 80] },
                    { name: "MacBook Air M2", count: 120, unit: "cái", trend: "up", data: [40, 50, 45, 60, 70, 85] },
                    { name: "Kính cường lực", count: 85, unit: "cái", trend: "down", data: [70, 60, 55, 40, 35, 20] },
                ]);

            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center mb-4">
                {/* Date Filter */}
                <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/40">
                    {["today", "week", "month"].map((key) => (
                        <button
                            key={key}
                            onClick={() => setDateFilter(key)}
                            className={cn(
                                "px-3.5 py-1.5 text-xs font-medium rounded-md transition-all",
                                dateFilter === key
                                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            {key === "today" ? "Hôm nay" : key === "week" ? "Tuần này" : "Tháng này"}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 h-8 text-xs px-3.5">
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        Xuất dữ liệu
                    </Button>
                </div>
            </div>

            {/* KPI Area (Top Row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Stock */}
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-sm font-medium text-muted-foreground">Tổng tồn kho</span>
                        </div>
                        <div className="text-3xl font-bold text-foreground">{loading ? "-" : stats.totalStock.toLocaleString()}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className={cn(
                                "px-1.5 py-0.5 text-[10px] gap-1",
                                stats.totalStockTrend.direction === "up" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" : "bg-rose-50 text-rose-700 hover:bg-rose-50"
                            )}>
                                {stats.totalStockTrend.direction === "up" ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                {stats.totalStockTrend.value}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{stats.totalStockTrend.label}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Outbound Orders */}
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-sm font-medium text-muted-foreground">Đơn xuất hàng</span>
                        </div>
                        <div className="text-3xl font-bold text-foreground">{loading ? "-" : stats.outboundOrders.toLocaleString()}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className={cn(
                                "px-1.5 py-0.5 text-[10px] gap-1",
                                stats.outboundOrdersTrend.direction === "up" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" : "bg-rose-50 text-rose-700 hover:bg-rose-50"
                            )}>
                                {stats.outboundOrdersTrend.direction === "up" ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                {stats.outboundOrdersTrend.value}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{stats.outboundOrdersTrend.label}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Inbound Shipments */}
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-sm font-medium text-muted-foreground">Đơn nhập hàng</span>
                        </div>
                        <div className="text-3xl font-bold text-foreground">{loading ? "-" : stats.inboundShipments.toLocaleString()}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className={cn(
                                "px-1.5 py-0.5 text-[10px] gap-1",
                                stats.inboundShipmentsTrend.direction === "up" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" : "bg-rose-50 text-rose-700 hover:bg-rose-50"
                            )}>
                                {stats.inboundShipmentsTrend.direction === "up" ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                {stats.inboundShipmentsTrend.value}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{stats.inboundShipmentsTrend.label}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Active Contracts */}
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="text-sm font-medium text-muted-foreground">Hợp đồng đang thuê</span>
                        </div>
                        <div className="text-3xl font-bold text-foreground">{loading ? "-" : stats.activeContracts}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-50 px-1.5 py-0.5 text-[10px] gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {stats.expiringContracts}
                            </Badge>
                            <span className="text-xs text-muted-foreground">sắp hết hạn</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Layout */}
            {/* Main Content Layout - Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Stock Flow Analysis Chart (2/3) */}
                <div className="lg:col-span-2">
                    <Card className="h-full border-border/60 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-semibold">Phân tích dòng hàng</CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground mr-1">
                                    {chartPeriod === "day" ? "24h qua" : chartPeriod === "week" ? "7 ngày qua" : "30 ngày qua"}
                                </span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3 gap-1 shadow-sm hover:bg-muted/50 border-border/50 font-medium">
                                            {chartPeriod === "day" ? "Hôm nay" : chartPeriod === "week" ? "Tuần này" : "Tháng này"}
                                            <ChevronDownIcon className="w-3 h-3 text-muted-foreground/70" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setChartPeriod("day")}>Hôm nay</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setChartPeriod("week")}>Tuần này</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setChartPeriod("month")}>Tháng này</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[210px] w-full relative pt-2">
                                {/* Grid Lines (Optional - visual guide) */}
                                <div className="absolute inset-x-0 bottom-6 top-4 flex flex-col justify-between pointer-events-none">
                                    {[1, 0.75, 0.5, 0.25, 0].map((tick, i) => (
                                        <div key={i} className="w-full h-px bg-border/80 border-dashed" />
                                    ))}
                                </div>

                                <div className="h-full flex items-end justify-between gap-2 md:gap-4 relative z-10">
                                    {stockFlow.map((item, index) => {
                                        const maxVal = 1200;
                                        const inHeight = (item.inbound / maxVal) * 100;
                                        const outHeight = (item.outbound / maxVal) * 100;

                                        return (
                                            <div key={index} className="flex flex-col items-center gap-3 flex-1 h-full justify-end group cursor-pointer relative">
                                                {/* Hover Tooltip */}
                                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none bg-popover/95 backdrop-blur-md shadow-xl border border-border/40 rounded-xl p-3 text-[10px] z-20 whitespace-nowrap min-w-[100px]">
                                                    {/* Tooltip Arrow */}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-4 border-transparent border-t-popover/95 drop-shadow-sm"></div>

                                                    <div className="font-semibold mb-2 text-foreground text-center border-b border-border/30 pb-1">{item.day}</div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between gap-3 text-muted-foreground">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)]" />
                                                                <span>Nhập</span>
                                                            </div>
                                                            <span className="text-foreground font-mono font-medium">{item.inbound}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3 text-muted-foreground">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.5)]" />
                                                                <span>Xuất</span>
                                                            </div>
                                                            <span className="text-foreground font-mono font-medium">{item.outbound}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-1 md:gap-1.5 items-end justify-center w-full h-full">
                                                    {/* Inbound Bar */}
                                                    <div
                                                        className="w-2.5 md:w-5 bg-gradient-to-t from-teal-500/80 to-emerald-400/80 rounded-t-lg shadow-sm transition-all duration-300 group-hover:from-teal-500 group-hover:to-emerald-400 group-hover:shadow-md hover:scale-y-[1.02] origin-bottom"
                                                        style={{ height: `${inHeight}%` }}
                                                    />
                                                    {/* Outbound Bar */}
                                                    <div
                                                        className="w-2.5 md:w-5 bg-gradient-to-t from-orange-500/80 to-rose-400/80 rounded-t-lg shadow-sm transition-all duration-300 group-hover:from-orange-500 group-hover:to-rose-400 group-hover:shadow-md hover:scale-y-[1.02] origin-bottom"
                                                        style={{ height: `${outHeight}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-muted-foreground font-medium group-hover:text-foreground transition-colors">{item.day}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex justify-center gap-6 mt-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gradient-to-br from-teal-500 to-emerald-400 rounded-sm shadow-sm opacity-80" />
                                    <span className="text-[10px] text-muted-foreground font-medium">Hàng nhập</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gradient-to-br from-orange-500 to-rose-400 rounded-sm shadow-sm opacity-80" />
                                    <span className="text-[10px] text-muted-foreground font-medium">Hàng xuất</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Stocks Alert (1/3) */}
                <div>
                    <Card className="h-full border-border/60 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-semibold">Cảnh báo tồn kho</CardTitle>
                            <EllipsisHorizontalIcon className="w-4 h-4 text-muted-foreground/70 cursor-pointer hover:text-foreground transition-colors" />
                        </CardHeader>
                        <CardContent className="p-3 space-y-2">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-red-50 rounded-lg p-2 flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                            <ExclamationTriangleIcon className="w-3 h-3" />
                                        </div>
                                        <span className="text-[10px] font-semibold text-red-900/70">Sắp hết hàng</span>
                                    </div>
                                    <span className="text-lg font-bold text-red-700 pl-1">{stockAlerts.length}</span>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-2 flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                            <XCircleIcon className="w-3 h-3" />
                                        </div>
                                        <span className="text-[10px] font-semibold text-orange-900/70">Hết hạn</span>
                                    </div>
                                    <span className="text-lg font-bold text-orange-700 pl-1">3</span>
                                </div>
                            </div>

                            {/* Alert List */}
                            <div className="space-y-1">
                                {stockAlerts.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-red-50/40 hover:bg-red-50/80 transition-colors group cursor-pointer">
                                        <div>
                                            <p className="font-semibold text-xs text-foreground/90">{item.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{item.left} {item.unit}</p>
                                        </div>
                                        <div className="px-2 py-0.5 rounded-md bg-red-100/50 text-red-600 text-[9px] font-bold">
                                            Low stock
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Main Content Layout - Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                {/* Shipments Timeline Table (2/3) */}
                <div className="lg:col-span-2">
                    <Card className="h-full border-border/60 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-semibold">Tiến độ vận đơn</CardTitle>
                            <Link href="#" className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium">
                                Xem chi tiết <ArrowUpRightIcon className="w-2.5 h-2.5" />
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="text-[10px] text-muted-foreground uppercase bg-transparent border-b border-border/50">
                                        <tr>
                                            <th className="px-3 py-3 font-medium">Mã vận đơn</th>
                                            <th className="px-3 py-3 font-medium">Loại</th>
                                            <th className="px-3 py-3 font-medium">Đối tác</th>
                                            <th className="px-3 py-3 font-medium">Thời gian</th>
                                            <th className="px-3 py-3 font-medium text-right">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {shipments.map((ship, i) => (
                                            <tr key={i} className="hover:bg-muted/30 transition-colors group">
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center bg-muted/60 group-hover:bg-background shadow-none group-hover:shadow-sm transition-all border border-transparent group-hover:border-border/50",
                                                            ship.type === "Nhập" ? "text-purple-600" : "text-teal-600"
                                                        )}>
                                                            {ship.type === "Nhập"
                                                                ? <ArrowDownLeftIcon className="w-3 h-3" />
                                                                : <ArrowUpRightIcon className="w-3 h-3" />
                                                            }
                                                        </div>
                                                        <span className="font-semibold text-foreground/90 text-xs">{ship.id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1.5 text-muted-foreground text-xs">{ship.type}</td>
                                                <td className="px-2 py-1.5 font-medium text-foreground/80 text-xs">{ship.partner}</td>
                                                <td className="px-2 py-1.5 text-muted-foreground/70 text-[10px]">{ship.date}</td>
                                                <td className="px-2 py-1.5 text-right">
                                                    <span className={cn(
                                                        "text-[9px] px-1.5 py-0.5 rounded-full font-medium border",
                                                        ship.status === "Hoàn tất" || ship.status === "Đã đến" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                            ship.status === "Đang xử lý" ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                ship.status === "Delayed" ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-red-50 text-red-700 border-red-100"
                                                    )}>
                                                        {ship.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Top Products (1/3) */}
                <div>
                    <Card className="h-full border-border/60 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold">Top sản phẩm xuất nhập</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-0.5 pt-2">
                            {topProducts.map((item, i) => (
                                <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-muted/40 p-2 rounded-lg -mx-2 transition-all duration-200">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm border shrink-0 transition-transform group-hover:scale-105",
                                            i === 0 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                i === 1 ? "bg-slate-50 text-slate-700 border-slate-200" :
                                                    i === 2 ? "bg-orange-50 text-orange-700 border-orange-200" :
                                                        "bg-muted/30 text-muted-foreground border-transparent"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-foreground/90 line-clamp-1 group-hover:text-primary transition-colors">{item.name}</p>
                                            <p className="text-[12.5px] text-muted-foreground">{item.unit}</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-bold text-sm text-foreground">{item.count}</div>
                                        <div className={cn("text-[10px] flex items-center justify-end gap-0.5", item.trend === "up" ? "text-emerald-600" : "text-rose-600")}>
                                            {item.trend === "up" ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                            <span>{item.trend === "up" ? "Tăng" : "Giảm"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-7 mt-1 hover:bg-muted/50">
                                Xem tất cả sản phẩm
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
