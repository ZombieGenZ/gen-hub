"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CreditCard,
    BanknoteIcon,
    QrCode,
    CheckCircle2,
    Clock,
    XCircle,
    ArrowUpRight,
    Receipt,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export type PaymentStatus = "PAID" | "PENDING" | "FAILED" | "REFUNDED" | "CANCELLED";
export type PaymentMethod = "CASH" | "TRANSFER" | "CARD" | "WALLET";

export interface Payment {
    id: string;
    amount: number;
    status: PaymentStatus;
    method: PaymentMethod;
    transaction_code?: string;
    paid_at?: string;
    created_at: string;
    description?: string;
    payment_url?: string;
    qr_code?: string;
    qr_code_url?: string;
    expired_at?: string;
}

interface PaymentHistoryProps {
    payments: Payment[];
    className?: string;
    showQrCode?: boolean;
    onRetryPayment?: (payment: Payment) => void | Promise<void>;
    retryingPaymentId?: string | null;
}

const formatCurrency = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (!num && num !== 0) return "0 VND";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
};

const formatDate = (str: string) => {
    try {
        return format(new Date(str), "dd/MM/yyyy HH:mm");
    } catch {
        return str;
    }
};

const STATUS_CONFIG: Record<PaymentStatus, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
    PAID: {
        label: "Đã thanh toán",
        icon: CheckCircle2,
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    PENDING: {
        label: "Chờ thanh toán",
        icon: Clock,
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    FAILED: {
        label: "Thất bại",
        icon: XCircle,
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    REFUNDED: {
        label: "Hoàn tiền",
        icon: ArrowUpRight,
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    CANCELLED: {
        label: "Đã hủy",
        icon: XCircle,
        className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    },
};

const METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    CASH: { label: "Tiền mặt", icon: BanknoteIcon },
    TRANSFER: { label: "Chuyển khoản", icon: QrCode },
    CARD: { label: "Thẻ", icon: CreditCard },
    WALLET: { label: "Ví điện tử", icon: CreditCard },
};

function PaymentCard({
    payment,
    showQrCode,
    onRetryPayment,
    retryingPaymentId,
}: {
    payment: Payment;
    showQrCode?: boolean;
    onRetryPayment?: (payment: Payment) => void | Promise<void>;
    retryingPaymentId?: string | null;
}) {
    const [expanded, setExpanded] = useState(false);
    const statusCfg = STATUS_CONFIG[payment.status];
    const methodCfg = METHOD_CONFIG[payment.method];
    const StatusIcon = statusCfg.icon;
    const MethodIcon = methodCfg.icon;
    const qrSource = payment.qr_code_url || payment.qr_code;
    const isRetrying = retryingPaymentId === payment.id;

    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("rounded-full p-1.5", statusCfg.className)}>
                        <StatusIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                                {payment.description || "Thanh toán hợp đồng"}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                <MethodIcon className="w-3 h-3 mr-1" />
                                {methodCfg.label}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(payment.created_at)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-sm font-semibold">{formatCurrency(payment.amount)}</span>
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-3 pt-0 border-t bg-muted/20">
                    <div className="grid grid-cols-2 gap-2 text-sm pt-3">
                        <div>
                            <span className="text-xs text-muted-foreground">Trạng thái</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <StatusIcon className="w-3.5 h-3.5" />
                                <span className="font-medium">{statusCfg.label}</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground">Phương thức</span>
                            <p className="font-medium mt-0.5">{methodCfg.label}</p>
                        </div>
                        {payment.transaction_code && (
                            <div className="col-span-2">
                                <span className="text-xs text-muted-foreground">Mã giao dịch</span>
                                <p className="font-mono text-xs mt-0.5">{payment.transaction_code}</p>
                            </div>
                        )}
                        {payment.paid_at && (
                            <div>
                                <span className="text-xs text-muted-foreground">Ngày thanh toán</span>
                                <p className="font-medium mt-0.5">{formatDate(payment.paid_at)}</p>
                            </div>
                        )}
                    </div>

                    {showQrCode && payment.status === "PENDING" && payment.method === "TRANSFER" && qrSource && (
                        <div className="mt-3 pt-3 border-t flex flex-col items-center gap-2">
                            <p className="text-xs text-muted-foreground">Quét mã QR để thanh toán</p>
                            <img src={qrSource} alt="QR Code thanh toán" className="w-40 h-40 rounded-md border" />
                        </div>
                    )}

                    {payment.status === "PENDING" && onRetryPayment && (
                        <div className="mt-3 pt-3 border-t flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-muted-foreground">
                                {payment.expired_at
                                    ? `Hết hạn lúc ${formatDate(payment.expired_at)}`
                                    : "Có thể tạo lại giao dịch nếu lần thanh toán cũ đã hết hạn."}
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isRetrying}
                                onClick={() => void onRetryPayment(payment)}
                            >
                                {isRetrying ? "Đang tạo..." : "Tiếp tục thanh toán"}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function PaymentHistory({
    payments,
    className,
    showQrCode = true,
    onRetryPayment,
    retryingPaymentId,
}: PaymentHistoryProps) {
    const totalPaid = payments
        .filter((payment) => payment.status === "PAID")
        .reduce((sum, payment) => sum + (typeof payment.amount === "string" ? parseFloat(payment.amount) : payment.amount), 0);
    const totalPending = payments
        .filter((payment) => payment.status === "PENDING")
        .reduce((sum, payment) => sum + (typeof payment.amount === "string" ? parseFloat(payment.amount) : payment.amount), 0);

    if (payments.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground", className)}>
                <Receipt className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Chưa có giao dịch nào</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50">
                    <CardContent className="pt-3 pb-3 px-4">
                        <p className="text-xs text-muted-foreground">Đã thanh toán</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalPaid)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50">
                    <CardContent className="pt-3 pb-3 px-4">
                        <p className="text-xs text-muted-foreground">Chờ thanh toán</p>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{formatCurrency(totalPending)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-2">
                {payments.map((payment) => (
                    <PaymentCard
                        key={payment.id}
                        payment={payment}
                        showQrCode={showQrCode}
                        onRetryPayment={onRetryPayment}
                        retryingPaymentId={retryingPaymentId}
                    />
                ))}
            </div>
        </div>
    );
}
