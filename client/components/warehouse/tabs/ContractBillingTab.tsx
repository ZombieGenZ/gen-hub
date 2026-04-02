"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
    CheckCircle2,
    Clock,
    XCircle,
    CreditCard,
    Shield,
    Puzzle,
    CalendarDays,
    FileText,
    RotateCcw,
    Sparkles,
    ArrowRight,
    BadgePercent,
} from "lucide-react";
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    daysUntil,
    getOccupancyPct,
    type MockRentedWarehouse,
    type PaymentStatus,
} from "@/data/mockMyWarehouses";
import { TablePagination } from "@/components/ui/table-pagination";

// ── Payment status badge ──

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; icon: React.ReactNode; className: string }> = {
    PAID: { label: "Đã thanh toán", icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400" },
    PENDING: { label: "Chờ thanh toán", icon: <Clock className="w-3.5 h-3.5" />, className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400" },
    FAILED: { label: "Thất bại", icon: <XCircle className="w-3.5 h-3.5" />, className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400" },
    REFUNDED: { label: "Đã hoàn tiền", icon: <RotateCcw className="w-3.5 h-3.5" />, className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400" },
};

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
    const cfg = PAYMENT_STATUS_CONFIG[status];
    return (
        <Badge variant="outline" className={cn("text-[10px] gap-1 font-normal", cfg.className)}>
            {cfg.icon}
            {cfg.label}
        </Badge>
    );
}

// ── Main ──

export function ContractBillingTab({ warehouse }: { warehouse: MockRentedWarehouse }) {
    const ITEMS_PER_PAGE = 8;
    const [paymentPage, setPaymentPage] = React.useState(1);
    const days = daysUntil(warehouse.expired_at);
    const occupancy = getOccupancyPct(warehouse);
    const paidPayments = warehouse.payments.filter((p) => p.status === "PAID");
    const pendingPayments = warehouse.payments.filter((p) => p.status === "PENDING");
    const totalPaid = paidPayments.reduce((s, p) => s + p.amount, 0);
    const totalPending = pendingPayments.reduce((s, p) => s + p.amount, 0);
    const paymentTotalPages = Math.max(1, Math.ceil(warehouse.payments.length / ITEMS_PER_PAGE));

    const paginatedPayments = React.useMemo(() => {
        const start = (paymentPage - 1) * ITEMS_PER_PAGE;
        return warehouse.payments.slice(start, start + ITEMS_PER_PAGE);
    }, [warehouse.payments, paymentPage]);

    React.useEffect(() => {
        setPaymentPage(1);
    }, [warehouse.id]);

    React.useEffect(() => {
        setPaymentPage((prev) => Math.min(prev, paymentTotalPages));
    }, [paymentTotalPages]);

    return (
        <div className="space-y-6">
            {/* Upsell banner */}
            {occupancy >= 80 && (
                <Card className="border-brand/30 bg-brand/5 dark:bg-brand/10">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="rounded-full bg-brand/10 p-2 shrink-0">
                            <Sparkles className="w-5 h-5 text-brand" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">Kho của bạn đã đầy {occupancy}%!</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Nhấn vào đây để xem các kho trống lân cận hoặc mua thêm Addon dọn dẹp kho nhằm tối ưu không gian.
                            </p>
                        </div>
                        <Button size="sm" className="shrink-0 gap-1 text-xs">
                            Xem kho trống
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Contract details */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Contract Overview */}
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    Thông tin hợp đồng
                                </CardTitle>
                                <Badge variant="outline" className="text-[10px]">
                                    {warehouse.contract_code}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <p className="text-muted-foreground">Loại hình</p>
                                    <p className="font-medium">{warehouse.is_whole_warehouse ? "Thuê Nguyên Kho" : "Thuê Một Phần"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Diện tích</p>
                                    <p className="font-medium">{warehouse.area.toLocaleString("vi-VN")} m²</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground flex items-center gap-1">
                                        <CalendarDays className="w-3.5 h-3.5" /> Ngày bắt đầu
                                    </p>
                                    <p className="font-medium">{formatDate(warehouse.started_at)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground flex items-center gap-1">
                                        <CalendarDays className="w-3.5 h-3.5" /> Ngày hết hạn
                                    </p>
                                    <p className={cn("font-medium", days <= 60 && "text-yellow-600", days <= 0 && "text-red-600")}>
                                        {formatDate(warehouse.expired_at)} ({days > 0 ? `còn ${days} ngày` : `quá hạn ${Math.abs(days)} ngày`})
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Tự động gia hạn</p>
                                    <p className="font-medium">{warehouse.auto_renew ? "✅ Có" : "❌ Không"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Chiết khấu</p>
                                    <p className="font-medium">{warehouse.discount_rate > 0 ? `${warehouse.discount_rate}%` : "Không"}</p>
                                </div>
                            </div>

                            {/* Pricing */}
                            <Separator />
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Tổng giá trị hợp đồng</span>
                                <span className="text-muted-foreground line-through">{formatCurrency(warehouse.total_price)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">Giá sau chiết khấu</span>
                                <span className="font-bold text-brand">{formatCurrency(warehouse.final_price)}</span>
                            </div>

                            {warehouse.notes && (
                                <>
                                    <Separator />
                                    <p className="text-xs text-muted-foreground italic">{warehouse.notes}</p>
                                </>
                            )}

                            {/* Signers */}
                            {warehouse.signers.length > 0 && (
                                <>
                                    <Separator />
                                    <p className="text-xs font-medium mb-2">Bên ký kết</p>
                                    <div className="flex flex-wrap gap-2">
                                        {warehouse.signers.map((s, i) => (
                                            <Badge key={i} variant="outline" className="text-[10px] gap-1">
                                                {s.signed ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-yellow-500" />}
                                                {s.name} ({s.role})
                                            </Badge>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment History */}
                    <Card className="border">
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
                        <CardContent>
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
                                        {paginatedPayments.map((pay) => (
                                            <TableRow key={pay.id}>
                                                <TableCell className="text-xs font-medium">{pay.description}</TableCell>
                                                <TableCell className="text-xs text-right font-medium">{formatCurrency(pay.amount)}</TableCell>
                                                <TableCell className="text-xs capitalize">{pay.method.toLowerCase()}</TableCell>
                                                <TableCell className="text-xs font-mono text-muted-foreground">{pay.transaction_code || "—"}</TableCell>
                                                <TableCell className="text-xs">{pay.paid_at ? formatDateTime(pay.paid_at) : "—"}</TableCell>
                                                <TableCell>
                                                    <PaymentStatusBadge status={pay.status} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="mt-4">
                                <TablePagination
                                    currentPage={paymentPage}
                                    totalPages={paymentTotalPages}
                                    totalItems={warehouse.payments.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setPaymentPage}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Addons, Insurances, Quick Actions */}
                <div className="space-y-5">
                    {/* Addons */}
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Puzzle className="w-4 h-4 text-muted-foreground" />
                                Dịch vụ đi kèm
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {warehouse.addons.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Chưa có dịch vụ nào.</p>
                            ) : (
                                warehouse.addons.map((addon) => (
                                    <div key={addon.id} className="flex items-start gap-2.5 p-2.5 bg-muted/50 rounded-lg">
                                        <span className="text-lg">{addon.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium">{addon.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{addon.description}</p>
                                        </div>
                                        <p className="text-xs font-semibold text-brand whitespace-nowrap">{formatCurrency(addon.price)}/th</p>
                                    </div>
                                ))
                            )}
                            <Button variant="outline" size="sm" className="w-full text-xs gap-1 mt-2">
                                <Puzzle className="w-3.5 h-3.5" />
                                Thêm dịch vụ
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Insurances */}
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Shield className="w-4 h-4 text-muted-foreground" />
                                Bảo hiểm
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {warehouse.insurances.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Chưa có bảo hiểm.</p>
                            ) : (
                                warehouse.insurances.map((ins) => (
                                    <div key={ins.id} className="p-2.5 bg-muted/50 rounded-lg space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium">{ins.name}</p>
                                            <p className="text-xs font-semibold text-brand">{formatCurrency(ins.price)}/th</p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{ins.coverage}</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick actions */}
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Hành động</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
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
                        </CardContent>
                    </Card>

                    {/* Manager info */}
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Quản lý kho</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-1">
                            <p className="font-medium">{warehouse.manager_name}</p>
                            <p className="text-muted-foreground">{warehouse.manager_phone}</p>
                            <p className="text-muted-foreground">{warehouse.manager_email}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
