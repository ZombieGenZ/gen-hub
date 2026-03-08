"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

import { authStorage } from "@/services/auth/auth-storage.service";
import { RentalContractService } from "@/services/rental-contract/rental-contract.service";
import type { RentalContractDetail } from "@/types/rental-contracts/rental-contracts.type";

import {
    formatCurrency,
    formatDate,
    formatDateTime,
    daysUntil,
} from "@/data/mockMyWarehouses";
import type { MockRentedWarehouse, ContractStatus } from "@/data/mockMyWarehouses";

import { FloorPlanTab } from "@/components/warehouse/tabs/FloorPlanTab";
import { InventoryTab } from "@/components/warehouse/tabs/InventoryTab";
import { ContractBillingTab } from "@/components/warehouse/tabs/ContractBillingTab";
import {
    CapacityForecastChart,
    ContractAlertBanner,
    OptimizeStorageCard,
} from "@/components/warehouse/SmartAlerts";

// ── Service ────────────────────────────────────────────────────────────────────
const rentalContractService = new RentalContractService();

// ── Map ContractStatus ────────────────────────────────────────────────────────
// API has OVERDUE_LEVEL_1/2/3 but MockRentedWarehouse only knows OVERDUE_LEVEL_1
function mapStatus(status: string): ContractStatus {
    if (status === "OVERDUE_LEVEL_2" || status === "OVERDUE_LEVEL_3") return "OVERDUE_LEVEL_1";
    if (["ACTIVE", "PENDING", "EXPIRING", "OVERDUE_LEVEL_1"].includes(status)) {
        return status as ContractStatus;
    }
    return "ACTIVE"; // fallback
}

// ── Map API → MockRentedWarehouse ────────────────────────────────────────────
function mapContractToWarehouse(contract: RentalContractDetail): MockRentedWarehouse {
    const firstWarehouse = contract.warehouses?.[0];
    const days = daysUntil(contract.expired_at);

    // Map real payments
    const payments = (contract.payments ?? []).map((p) => ({
        id: p.id,
        amount: typeof p.amount === "string" ? parseFloat(p.amount) : (p.amount ?? 0),
        status: p.status as any,
        method: (p.method ?? "TRANSFER") as any,
        transaction_code: p.transaction_code,
        paid_at: p.paid_at,
        created_at: p.created_at,
        description: p.description ?? "Thanh toán",
    }));

    // Map real addons
    const addons = (contract.addons ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        price: typeof a.price === "string" ? parseFloat(a.price as any) : (a.price ?? 0),
        description: "",
        icon: "📦",
    }));

    // Map real insurances
    const insurances = (contract.insurances ?? []).map((ins) => ({
        id: ins.id,
        name: ins.name,
        price: typeof ins.price === "string" ? parseFloat(ins.price as any) : (ins.price ?? 0),
        coverage: "",
    }));

    // Map signers
    const signers = (contract.signers ?? []).map((s) => ({
        name: s.name,
        role: s.role,
        signed: s.signed,
        signedAt: s.signedAt,
    }));

    const totalPriceNum = typeof contract.total_price === "string"
        ? parseFloat(contract.total_price)
        : (contract.total_price ?? 0);
    const finalPriceNum = typeof contract.final_price === "string"
        ? parseFloat(contract.final_price)
        : (contract.final_price ?? 0);

    // Determine contract_status: if near expiry, mark as EXPIRING
    let contractStatus = mapStatus(contract.status);
    if (contractStatus === "ACTIVE" && days > 0 && days <= 60) {
        contractStatus = "EXPIRING";
    }

    // Map warehouse rows from the real warehouses array → floor_rows
    // The API returns warehouses[].rows[] with basic info, we build minimal floor plan
    const floorRows = (contract.warehouses ?? []).flatMap((wh, whIdx) =>
        (wh.rows ?? []).map((row, rowIdx) => ({
            id: row.id,
            code: `ROW-${rowIdx + 1}`,
            name: row.name,
            is_mine: true,
            price_per_month: 0,
            total_weight_capacity: 0,
            current_weight: 0,
            racks: [],
        }))
    );

    return {
        id: contract.id,
        name: firstWarehouse?.name ?? contract.name ?? "—",
        type: "Kho Thường" as any,
        address: "",
        province: "",
        area: 0,
        image: "",

        contract_id: contract.id,
        contract_code: contract.code,
        contract_status: contractStatus,
        started_at: contract.started_at,
        expired_at: contract.expired_at,
        auto_renew: contract.auto_renew ?? false,
        total_price: totalPriceNum,
        final_price: finalPriceNum,
        discount_rate: contract.discount_rate ?? 0,
        notes: contract.notes,

        is_whole_warehouse: true,
        ceiling_height: 0,
        total_weight_capacity: 0,
        current_weight: 0,

        floor_rows: floorRows,
        inventory: [],
        forecast: [],
        forecast_full_date: undefined,

        addons,
        insurances,
        payments,

        manager_name: "—",
        manager_phone: "—",
        manager_email: "—",

        signers,
    };
}

// ── Status badge config ──────────────────────────────────────────────────────
const STATUS_CFG: Record<ContractStatus, { label: string; className: string }> = {
    ACTIVE: { label: "Đang hoạt động", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400" },
    PENDING: { label: "Chờ duyệt", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400" },
    EXPIRING: { label: "Sắp hết hạn", className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400" },
    OVERDUE_LEVEL_1: { label: "Quá hạn", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400" },
};

// ── Loading skeleton ─────────────────────────────────────────────────────────
function DetailSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-start gap-4">
                <div className="w-9 h-9 bg-muted rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-6 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-muted rounded-xl" />
                ))}
            </div>
            <div className="h-72 bg-muted rounded-xl" />
            <div className="h-48 bg-muted rounded-xl" />
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function WarehouseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const contractId = params.id as string;
    const [activeTab, setActiveTab] = useState("contract");

    const [contract, setContract] = useState<RentalContractDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContract = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await rentalContractService.getRentalContractById(token, contractId);
            // getRentalContractById returns the full response JSON; data may be nested
            const detail: RentalContractDetail = res?.data ?? res?.data?.data ?? res;
            setContract(detail);
        } catch (err: any) {
            if (err.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            setError("Không thể tải thông tin hợp đồng. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    }, [contractId, router]);

    useEffect(() => {
        fetchContract();
    }, [fetchContract]);

    // ── Loading ──
    if (isLoading) return <DetailSkeleton />;

    // ── Error ──
    if (error || !contract) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <p className="text-muted-foreground">{error ?? "Không tìm thấy hợp đồng."}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchContract}>
                        <ArrowPathIcon className="w-4 h-4 mr-1" /> Thử lại
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/customer/warehouses")}>
                        <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
                    </Button>
                </div>
            </div>
        );
    }

    // ── Map to display shape ──
    const warehouse = mapContractToWarehouse(contract);
    const status = STATUS_CFG[warehouse.contract_status];
    const primaryWarehouse = contract.warehouses?.[0];
    console.log('[WarehouseDetail] contract.warehouses:', JSON.stringify(contract.warehouses), 'primaryWarehouse?.id:', primaryWarehouse?.id);
    const days = daysUntil(contract.expired_at);
    const finalPrice = typeof contract.final_price === "string"
        ? parseFloat(contract.final_price)
        : (contract.final_price ?? 0);
    const totalPrice = typeof contract.total_price === "string"
        ? parseFloat(contract.total_price)
        : (contract.total_price ?? 0);

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
                        <h1 className="text-xl font-bold tracking-tight">
                            {primaryWarehouse?.name ?? contract.name ?? "—"}
                        </h1>
                        <Badge variant="outline" className={cn("text-[10px] font-normal", status.className)}>
                            {status.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                            {contract.code}
                        </Badge>
                        {contract.auto_renew && (
                            <Badge variant="secondary" className="text-[10px]">
                                Tự động gia hạn
                            </Badge>
                        )}
                    </div>
                    {/* List all warehouses in contract */}
                    {(contract.warehouses ?? []).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {(contract.warehouses ?? []).map(w => w.name).join(" · ")}
                        </p>
                    )}
                </div>

                <Link
                    href={`/dashboard/customer/contracts/${contract.id}`}
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
                    label="Số kho"
                    value={`${(contract.warehouses ?? []).length} kho`}
                />
                <SummaryCard
                    icon={<Ruler className="w-4 h-4" />}
                    label="Ngày bắt đầu"
                    value={formatDate(contract.started_at)}
                />
                <SummaryCard
                    icon={<Weight className="w-4 h-4" />}
                    label="Giá trị HĐ"
                    value={formatCurrency(finalPrice)}
                />
                <SummaryCard
                    icon={<Thermometer className="w-4 h-4" />}
                    label="Hết hạn"
                    value={days < 0
                        ? `Quá hạn ${Math.abs(days)} ngày`
                        : `Còn ${days} ngày`}
                    valueClassName={days < 0 ? "text-red-600" : days <= 60 ? "text-yellow-600" : "text-green-600"}
                />
            </div>

            {/* Warehouses in contract */}
            {(contract.warehouses ?? []).length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(contract.warehouses ?? []).map((wh) => (
                        <Card key={wh.id} className="border">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="rounded-lg bg-brand/10 p-2 shrink-0">
                                    <Building2 className="w-4 h-4 text-brand" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{wh.name}</p>
                                    {wh.rows && wh.rows.length > 0 && (
                                        <p className="text-[10px] text-muted-foreground">
                                            {wh.rows.length} dãy
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Main tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-9">
                    <TabsTrigger value="contract" className="text-xs gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Hợp đồng & Thanh toán
                    </TabsTrigger>
                    {warehouse.floor_rows.length > 0 && (
                        <TabsTrigger value="floor-plan" className="text-xs gap-1.5">
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Sơ đồ kho
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="inventory" className="text-xs gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Tồn kho
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="contract" className="mt-4">
                    <ContractBillingTabReal contract={contract} warehouse={warehouse} />
                </TabsContent>
                {warehouse.floor_rows.length > 0 && (
                    <TabsContent value="floor-plan" className="mt-4">
                        <FloorPlanTab warehouse={warehouse} />
                    </TabsContent>
                )}
                <TabsContent value="inventory" className="mt-4">
                    <InventoryTab warehouseId={contract.warehouses?.[0]?.id ?? ''} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ── ContractBillingTabReal – uses real contract data directly ─────────────────
import { Card as CardUI, CardContent as CardContentUI, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    CheckCircle2, Clock, XCircle, CreditCard, Shield, Puzzle,
    CalendarDays, RotateCcw, Sparkles, ArrowRight, BadgePercent, XSquare,
} from "lucide-react";

type RealPaymentStatus = "PAID" | "PENDING" | "FAILED" | "REFUNDED" | "CANCELLED";

const PAYMENT_STATUS_CFG: Record<RealPaymentStatus, { label: string; icon: React.ReactNode; className: string }> = {
    PAID: { label: "Đã thanh toán", icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400" },
    PENDING: { label: "Chờ thanh toán", icon: <Clock className="w-3.5 h-3.5" />, className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400" },
    FAILED: { label: "Thất bại", icon: <XCircle className="w-3.5 h-3.5" />, className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400" },
    REFUNDED: { label: "Đã hoàn tiền", icon: <RotateCcw className="w-3.5 h-3.5" />, className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400" },
    CANCELLED: { label: "Đã hủy", icon: <XSquare className="w-3.5 h-3.5" />, className: "bg-gray-50 text-gray-600 border-gray-200" },
};

function RealPaymentBadge({ status }: { status: string }) {
    const cfg = PAYMENT_STATUS_CFG[status as RealPaymentStatus] ?? PAYMENT_STATUS_CFG.PENDING;
    return (
        <Badge variant="outline" className={cn("text-[10px] gap-1 font-normal", cfg.className)}>
            {cfg.icon}
            {cfg.label}
        </Badge>
    );
}

function ContractBillingTabReal({
    contract,
    warehouse,
}: {
    contract: RentalContractDetail;
    warehouse: MockRentedWarehouse;
}) {
    const days = daysUntil(contract.expired_at);
    const payments = contract.payments ?? [];
    const addons = contract.addons ?? [];
    const insurances = contract.insurances ?? [];
    const signers = contract.signers ?? [];

    const paidPayments = payments.filter(p => p.status === "PAID");
    const pendingPayments = payments.filter(p => p.status === "PENDING");
    const totalPaid = paidPayments.reduce((s, p) => s + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount), 0);
    const totalPending = pendingPayments.reduce((s, p) => s + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount), 0);
    const finalPrice = typeof contract.final_price === "string" ? parseFloat(contract.final_price) : (contract.final_price ?? 0);
    const totalPrice = typeof contract.total_price === "string" ? parseFloat(contract.total_price) : (contract.total_price ?? 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Contract details + Payments */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Contract Overview */}
                    <CardUI className="border">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    Thông tin hợp đồng
                                </CardTitle>
                                <Badge variant="outline" className="text-[10px]">
                                    {contract.code}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContentUI className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <p className="text-muted-foreground">Tên hợp đồng</p>
                                    <p className="font-medium">{contract.name ?? "—"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Trạng thái</p>
                                    <p className="font-medium">{warehouse.contract_status}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground flex items-center gap-1">
                                        <CalendarDays className="w-3.5 h-3.5" /> Ngày bắt đầu
                                    </p>
                                    <p className="font-medium">{formatDate(contract.started_at)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground flex items-center gap-1">
                                        <CalendarDays className="w-3.5 h-3.5" /> Ngày hết hạn
                                    </p>
                                    <p className={cn("font-medium", days <= 60 && "text-yellow-600", days <= 0 && "text-red-600")}>
                                        {formatDate(contract.expired_at)} ({days > 0 ? `còn ${days} ngày` : `quá hạn ${Math.abs(days)} ngày`})
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Tự động gia hạn</p>
                                    <p className="font-medium">{contract.auto_renew ? "✅ Có" : "❌ Không"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Chiết khấu</p>
                                    <p className="font-medium">
                                        {(contract.discount_rate ?? 0) > 0 ? `${contract.discount_rate}%` : "Không"}
                                    </p>
                                </div>
                                {contract.payment_method && (
                                    <div>
                                        <p className="text-muted-foreground">Phương thức TT</p>
                                        <p className="font-medium">{contract.payment_method}</p>
                                    </div>
                                )}
                            </div>

                            {/* Kho liên quan */}
                            {(contract.warehouses ?? []).length > 0 && (
                                <>
                                    <Separator />
                                    <p className="text-xs font-medium mb-1">Kho trong hợp đồng</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(contract.warehouses ?? []).map(wh => (
                                            <Badge key={wh.id} variant="secondary" className="text-[10px] gap-1">
                                                <Building2 className="w-3 h-3" /> {wh.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Pricing */}
                            <Separator />
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Tổng giá trị hợp đồng</span>
                                <span className="text-muted-foreground line-through">{formatCurrency(totalPrice)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">Giá sau chiết khấu</span>
                                <span className="font-bold text-brand">{formatCurrency(finalPrice)}</span>
                            </div>

                            {contract.notes && (
                                <>
                                    <Separator />
                                    <p className="text-xs text-muted-foreground italic">{contract.notes}</p>
                                </>
                            )}

                            {/* Signers */}
                            {signers.length > 0 && (
                                <>
                                    <Separator />
                                    <p className="text-xs font-medium mb-2">Bên ký kết</p>
                                    <div className="flex flex-wrap gap-2">
                                        {signers.map((s, i) => (
                                            <Badge key={i} variant="outline" className="text-[10px] gap-1">
                                                {s.signed ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-yellow-500" />}
                                                {s.name} ({s.role})
                                            </Badge>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContentUI>
                    </CardUI>

                    {/* Payment History */}
                    <CardUI className="border">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    Lịch sử thanh toán
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="text-[10px] gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        Đã TT: {formatCurrency(totalPaid)}
                                    </Badge>
                                    {totalPending > 0 && (
                                        <Badge variant="outline" className="text-[10px] gap-1 border-yellow-300 text-yellow-700 bg-yellow-50">
                                            <Clock className="w-3 h-3" />
                                            Chờ: {formatCurrency(totalPending)}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContentUI>
                            {payments.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-6">Chưa có lịch sử thanh toán.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="text-xs">Mô tả</TableHead>
                                                <TableHead className="text-xs text-right">Số tiền</TableHead>
                                                <TableHead className="text-xs">Phương thức</TableHead>
                                                <TableHead className="text-xs">Mã GD</TableHead>
                                                <TableHead className="text-xs">Ngày TT</TableHead>
                                                <TableHead className="text-xs">Trạng thái</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payments.map((pay) => {
                                                const amount = typeof pay.amount === "string"
                                                    ? parseFloat(pay.amount)
                                                    : pay.amount;
                                                return (
                                                    <TableRow key={pay.id}>
                                                        <TableCell className="text-xs font-medium">{pay.description ?? "—"}</TableCell>
                                                        <TableCell className="text-xs text-right font-medium">{formatCurrency(amount)}</TableCell>
                                                        <TableCell className="text-xs capitalize">{(pay.method ?? "—").toLowerCase()}</TableCell>
                                                        <TableCell className="text-xs font-mono text-muted-foreground">{pay.transaction_code ?? "—"}</TableCell>
                                                        <TableCell className="text-xs">{pay.paid_at ? formatDateTime(pay.paid_at) : "—"}</TableCell>
                                                        <TableCell>
                                                            <RealPaymentBadge status={pay.status} />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContentUI>
                    </CardUI>

                    {/* History */}
                    {(contract.history ?? []).length > 0 && (
                        <CardUI className="border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold">Lịch sử hoạt động</CardTitle>
                            </CardHeader>
                            <CardContentUI className="space-y-3">
                                {(contract.history ?? []).slice(0, 8).map((h) => (
                                    <div key={h.id} className="flex gap-3 text-xs">
                                        <div className="w-1 rounded-full bg-brand/30 shrink-0 mt-1" />
                                        <div className="flex-1">
                                            <p className="font-medium">{h.description}</p>
                                            {h.actor && (
                                                <p className="text-muted-foreground">
                                                    {h.actor.name} {h.actor.role ? `(${h.actor.role})` : ""}
                                                </p>
                                            )}
                                            <p className="text-muted-foreground">{formatDateTime(h.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContentUI>
                        </CardUI>
                    )}
                </div>

                {/* Right: Addons, Insurances, Actions */}
                <div className="space-y-5">
                    {/* Addons */}
                    <CardUI className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Puzzle className="w-4 h-4 text-muted-foreground" />
                                Dịch vụ đi kèm
                            </CardTitle>
                        </CardHeader>
                        <CardContentUI className="space-y-3">
                            {addons.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Chưa có dịch vụ nào.</p>
                            ) : (
                                addons.map((addon) => {
                                    const price = typeof addon.price === "string" ? parseFloat(addon.price as any) : (addon.price ?? 0);
                                    return (
                                        <div key={addon.id} className="flex items-start gap-2.5 p-2.5 bg-muted/50 rounded-lg">
                                            <div className="rounded-lg bg-brand/10 p-1.5 shrink-0">
                                                <Puzzle className="w-3.5 h-3.5 text-brand" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium">{addon.name}</p>
                                            </div>
                                            {price > 0 && (
                                                <p className="text-xs font-semibold text-brand whitespace-nowrap">
                                                    {formatCurrency(price)}/th
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            <Button variant="outline" size="sm" className="w-full text-xs gap-1 mt-2">
                                <Puzzle className="w-3.5 h-3.5" />
                                Thêm dịch vụ
                            </Button>
                        </CardContentUI>
                    </CardUI>

                    {/* Insurances */}
                    <CardUI className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Shield className="w-4 h-4 text-muted-foreground" />
                                Bảo hiểm
                            </CardTitle>
                        </CardHeader>
                        <CardContentUI className="space-y-3">
                            {insurances.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Chưa có bảo hiểm.</p>
                            ) : (
                                insurances.map((ins) => {
                                    const price = typeof ins.price === "string" ? parseFloat(ins.price as any) : (ins.price ?? 0);
                                    return (
                                        <div key={ins.id} className="p-2.5 bg-muted/50 rounded-lg space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-medium">{ins.name}</p>
                                                {price > 0 && (
                                                    <p className="text-xs font-semibold text-brand">{formatCurrency(price)}/th</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContentUI>
                    </CardUI>

                    {/* Quick actions */}
                    <CardUI className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Hành động</CardTitle>
                        </CardHeader>
                        <CardContentUI className="space-y-2">
                            <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-2">
                                <RotateCcw className="w-3.5 h-3.5" />
                                Gia hạn hợp đồng
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-2">
                                <BadgePercent className="w-3.5 h-3.5" />
                                Áp dụng mã giảm giá
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                Tải hợp đồng PDF
                            </Button>
                        </CardContentUI>
                    </CardUI>
                </div>
            </div>
        </div>
    );
}

// ── Summary card ─────────────────────────────────────────────────────────────
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
