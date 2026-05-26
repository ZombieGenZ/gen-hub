"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    ArrowPathIcon,
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
import { authStorage } from "@/services/auth/auth-storage.service";
import { RentalContractService } from "@/services/rental-contract/rental-contract.service";
import { formatCurrency, occupancyColor, occupancyBarColor, daysUntil } from "@/data/mockMyWarehouses";
import type { ContractStatus, RentalContractListItem } from "@/types/rental-contracts/rental-contracts.type";
import { orgHelper } from "@/lib/organization.utils";
import { useToast } from "@/contexts/ToastContext";
import { useOrganizationRealtime } from "@/hooks/useOrganizationRealtime";

// ── Service instance ─────────────────────────────────────────────────────────
const rentalContractService = new RentalContractService();

// ── Status config ─────────────────────────────────────────────────────────────
// Map real API statuses to display config
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: "Đang hiệu lực", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" },
    PENDING: { label: "Chờ kích hoạt", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
    OVERDUE_LEVEL_1: { label: "Quá hạn", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
    OVERDUE_LEVEL_2: { label: "Quá hạn L2", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
    OVERDUE_LEVEL_3: { label: "Quá hạn L3", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
    SEALED: { label: "Niêm phong", className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-700" },
    LIQUIDATED: { label: "Thanh lý", className: "bg-gray-50 text-gray-700 border-gray-200" },
    CANCELLED: { label: "Đã hủy", className: "bg-gray-50 text-gray-500 border-gray-200" },
    COMPLETED: { label: "Hoàn thành", className: "bg-green-50 text-green-700 border-green-200" },
};

// Statuses that count as "expiring soon" — we detect by date
const ACTIVE_STATUSES = ["ACTIVE", "OVERDUE_LEVEL_1", "OVERDUE_LEVEL_2", "OVERDUE_LEVEL_3"];

function getStatusCfg(status: string) {
    return STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-50 text-gray-600 border-gray-200" };
}

// ── Warehouse Card ────────────────────────────────────────────────────────────
function WarehouseCard({ contract }: { contract: RentalContractListItem }) {
    const statusCfg = getStatusCfg(contract.status);
    const days = daysUntil(contract.expired_at);

    // Ưu tiên lấy tên từ template detail mới fetch thêm
    const firstDetail = contract.details?.[0];
    const warehouseName = firstDetail?.warehouse_template?.name ?? contract.warehouses?.[0]?.name ?? contract.name ?? "—";
    const warehouseImage = firstDetail?.warehouse_template?.images?.[0]?.url;

    // final_price may be a string from API (Decimal)
    const finalPrice = typeof contract.final_price === "string"
        ? parseFloat(contract.final_price)
        : (contract.final_price ?? 0);

    const isExpiringSoon = !contract.auto_renew && days > 0 && days <= 60;

    return (
        <Link href={`/dashboard/organization/warehouses/${contract.id}`} className="block">
            <Card className="overflow-hidden border border-border hover:shadow-lg hover:border-brand/30 transition-all duration-200 group cursor-pointer h-full">
                {/* Header banner/image */}
                <div className="relative h-36 overflow-hidden bg-muted flex items-center justify-center">
                    {warehouseImage ? (
                        <img
                            src={warehouseImage}
                            alt={warehouseName}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-brand/10 to-transparent" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Status badge */}
                    <div className="absolute top-2.5 left-2.5">
                        <Badge variant="outline" className={`text-xs backdrop-blur-sm ${statusCfg.className}`}>
                            {statusCfg.label}
                        </Badge>
                    </div>

                    {/* Warehouse count badge */}
                    {contract.warehouses && contract.warehouses.length > 0 && (
                        <div className="absolute top-2.5 right-2.5">
                            <Badge variant="secondary" className="text-xs flex items-center gap-1 backdrop-blur-sm bg-white/90 text-foreground border-none shadow-sm">
                                <Warehouse className="w-3.5 h-3.5" />
                                {contract.warehouses.length > 1
                                    ? `${contract.warehouses.length} kho`
                                    : "1 kho"}
                            </Badge>
                        </div>
                    )}

                    {/* Warehouse icon fallback (if no image) */}
                    {!warehouseImage && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Building2 className="w-14 h-14 text-brand/20 group-hover:text-brand/30 transition-colors" />
                        </div>
                    )}

                    {/* Expiring warning */}
                    {isExpiringSoon && (
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
                            {warehouseName}
                        </h3>
                        {contract.warehouses && contract.warehouses.length > 1 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                + {contract.warehouses.length - 1} kho khác
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{contract.name ?? "—"}</span>
                        </p>
                    </div>

                    {/* Contract info */}
                    <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Hợp đồng</span>
                            <span className="font-medium text-brand">{contract.code}</span>
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
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Giá trị HĐ</span>
                            <span className="font-semibold text-foreground">{formatCurrency(finalPrice)}</span>
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

// ── Tab config ────────────────────────────────────────────────────────────────
const STATUS_TABS = [
    { value: "ALL", label: "Tất cả" },
    { value: "ACTIVE", label: "Đang hiệu lực" },
    { value: "PENDING", label: "Chờ kích hoạt" },
    { value: "OVERDUE_LEVEL_1", label: "Quá hạn" },
    { value: "COMPLETED", label: "Hoàn thành" },
];

const WAREHOUSE_REALTIME_EVENTS = [
    "rentalContract:created",
    "rentalContract:statusUpdated",
    "rentalContract:updated",
    "rentalContract:deleted",
    "rentalContract:deletedMany",
    "rentalContract:renewed",
    "warehouse:updated",
    "warehouse:deleted",
    "warehouse:deletedMany",
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MyWarehousesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [contracts, setContracts] = useState<RentalContractListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("ALL");
    const [orgId, setOrgId] = useState<string | null>(null);

    // ── Fetch ──────────────────────────────────────────────────────────────── //
    const fetchContracts = useCallback(async (currentOrgId?: string | null) => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // Resolve orgId nếu chưa có
            let resolvedOrgId = currentOrgId;
            if (!resolvedOrgId) {
                resolvedOrgId = await orgHelper.getOrgId(token);
                setOrgId(resolvedOrgId);
            }

            if (!resolvedOrgId) {
                setContracts([]);
                return;
            }

            // Fetch contracts scoped theo org (tránh lấy dữ liệu toàn hệ thống)
            const data: any = await rentalContractService.getOrgRentalContracts(token, resolvedOrgId, {
                limit: 50,
                page: 1,
            });

            if (data && data.items) {
                setContracts(data.items);
            } else if (Array.isArray(data)) {
                setContracts(data);
            } else {
                setContracts([]);
            }
        } catch (err: any) {
            if (err.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            setError("Không thể tải danh sách kho. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    useEffect(() => {
        const initOrg = async () => {
            if (orgId) return;
            const token = authStorage.getAccessToken();
            if (!token) return;
            try {
                const resolvedOrgId = await orgHelper.getOrgId(token);
                setOrgId(resolvedOrgId);
            } catch {
                // Skip realtime if org cannot be resolved.
            }
        };

        void initOrg();
    }, [orgId]);

    useOrganizationRealtime({
        orgId,
        events: WAREHOUSE_REALTIME_EVENTS,
        enabled: !!orgId,
        onEvent: (eventName, payload) => {
            void fetchContracts(orgId);

            const data = payload as { code?: string } | undefined;
            const suffix = data?.code ? ` ${data.code}` : "";
            const messageMap: Record<string, string> = {
                "rentalContract:created": `Hợp đồng mới đã được tạo${suffix}`,
                "rentalContract:statusUpdated": `Trạng thái hợp đồng đã thay đổi${suffix}`,
                "rentalContract:updated": `Hợp đồng đã được cập nhật${suffix}`,
                "rentalContract:deleted": `Hợp đồng đã bị xóa${suffix}`,
                "rentalContract:deletedMany": "Danh sách hợp đồng đã được cập nhật",
                "rentalContract:renewed": `Hợp đồng đã được gia hạn${suffix}`,
                "warehouse:updated": "Kho đã được cập nhật",
                "warehouse:deleted": "Một kho đã bị xóa",
                "warehouse:deletedMany": "Danh sách kho đã được cập nhật",
            };

            const message = messageMap[eventName];
            if (message) {
                showToast(message, "success");
            }
        },
    });

    // ── Filter ─────────────────────────────────────────────────────────────── //
    const filtered = useMemo(() => {
        const list = contracts.filter((c) => {
            const q = search.trim().toLowerCase();
            // Lấy tên từ cả details mới và warehouses cũ để search
            const detailNames = (c.details ?? []).map(d => d.warehouse_template?.name?.toLowerCase() ?? "").join(" ");
            const warehouseNames = (c.warehouses ?? []).map(w => w.name.toLowerCase()).join(" ");

            const matchSearch =
                q === "" ||
                (c.name ?? "").toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                detailNames.includes(q) ||
                warehouseNames.includes(q);
            const matchTab =
                tab === "ALL" ||
                c.status === tab ||
                // Group OVERDUE_LEVEL_2 and OVERDUE_LEVEL_3 under the "Quá hạn" tab
                (tab === "OVERDUE_LEVEL_1" && ["OVERDUE_LEVEL_1", "OVERDUE_LEVEL_2", "OVERDUE_LEVEL_3"].includes(c.status));
            return matchSearch && matchTab;
        });

        // Sắp xếp: ACTIVE lên đầu, sau đó theo ngày tạo mới nhất
        return [...list].sort((a, b) => {
            if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
            if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [contracts, search, tab]);

    // ── Stats ──────────────────────────────────────────────────────────────── //
    const stats = useMemo(() => {
        const active = contracts.filter(c => ACTIVE_STATUSES.includes(c.status));
        const totalMonthly = active.reduce((s, c) => {
            const fp = typeof c.final_price === "string" ? parseFloat(c.final_price) : (c.final_price ?? 0);
            // Approximate monthly = total / 12 if we don't have duration
            return s + fp / 12;
        }, 0);
        const warehouseCount = active.reduce((s, c) => s + (c.warehouses?.length ?? 0), 0);
        const expiring = contracts.filter(c => {
            const d = daysUntil(c.expired_at);
            return d > 0 && d <= 60 && !c.auto_renew && ACTIVE_STATUSES.includes(c.status);
        }).length;
        return {
            contractCount: active.length,
            warehouseCount,
            totalMonthly,
            expiring,
        };
    }, [contracts]);

    // ── Render ─────────────────────────────────────────────────────────────── //
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Kho đang thuê</h1>
                    <p className="text-muted-foreground text-sm">
                        Quản lý toàn bộ không gian kho bãi theo hợp đồng. Click vào thẻ để xem chi tiết.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchContracts(orgId)} disabled={isLoading} className="gap-2">
                    <ArrowPathIcon className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    Làm mới
                </Button>
            </div>

            {/* Smart alert */}
            {stats.expiring > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>
                        Bạn có <strong>{stats.expiring} hợp đồng</strong> sắp hết hạn. Hãy kiểm tra và gia hạn sớm để tránh gián đoạn.
                    </span>
                    <Button variant="outline" size="sm" className="ml-auto shrink-0 text-xs border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                        Xem ngay
                    </Button>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-destructive/10 text-destructive border border-destructive/20">
                    <span>{error}</span>
                    <Button variant="outline" size="sm" onClick={() => fetchContracts(orgId)} className="ml-auto shrink-0 text-xs">
                        Thử lại
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
                            <p className="text-xs text-muted-foreground">Hợp đồng đang thuê</p>
                            <p className="text-2xl font-bold">{isLoading ? "—" : stats.contractCount}</p>
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
                            <p className="text-xs text-muted-foreground">Tổng số kho</p>
                            <p className="text-2xl font-bold">{isLoading ? "—" : stats.warehouseCount}</p>
                            <p className="text-xs text-muted-foreground">kho đang thuê</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-border">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="rounded-lg bg-green-500/10 p-2.5 shrink-0">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Hợp đồng ACTIVE</p>
                            <p className="text-2xl font-bold text-green-600">
                                {isLoading ? "—" : contracts.filter(c => c.status === "ACTIVE").length}
                            </p>
                            <p className="text-xs text-muted-foreground">đang hoạt động</p>
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
                            <p className="text-xs text-muted-foreground">Ước tính / tháng</p>
                            <p className="text-lg font-bold text-brand">
                                {isLoading ? "—" : formatCurrency(stats.totalMonthly)}
                            </p>
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
                        placeholder="Tìm theo tên kho, mã HĐ..."
                        className="pl-8 text-sm h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden border border-border animate-pulse">
                            <div className="h-36 bg-muted" />
                            <CardContent className="p-4 space-y-3">
                                <div className="h-4 bg-muted rounded w-3/4" />
                                <div className="h-3 bg-muted rounded w-full" />
                                <div className="h-16 bg-muted rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <BuildingStorefrontIcon className="w-12 h-12 opacity-30" />
                    <p className="font-medium">
                        {contracts.length === 0 ? "Bạn chưa thuê kho nào" : "Không tìm thấy kho nào"}
                    </p>
                    <p className="text-sm">
                        {contracts.length === 0
                            ? "Bắt đầu bằng cách tìm kiếm và thuê kho phù hợp."
                            : "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.map((contract) => (
                        <WarehouseCard key={contract.id} contract={contract} />
                    ))}
                </div>
            )}
        </div>
    );
}
