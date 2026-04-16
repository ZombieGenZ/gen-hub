"use client";

import { useEffect, useCallback, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    CreditCard,
    CheckCircle2,
    XCircle,
    Clock,
    Copy,
    Loader2,
    Building2,
    AlertTriangle,
    Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { paymentService } from "@/services/payment/payment.service";
import { useToast } from "@/contexts/ToastContext";

const formatCurrency = (val: number | string) => {
    try {
        const num = typeof val === "string" ? parseFloat(val) : val;
        if (isNaN(num)) return "0 ₫";
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(num);
    } catch {
        return "0 ₫";
    }
};

const formatDateTime = (str?: string) => {
    if (!str) return "—";
    try {
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(str));
    } catch {
        return str;
    }
};

export interface SePayPaymentData {
    paymentCode?: string;
    amount?: number;
    qrCode?: string;
    qr_code?: string;
    qr_code_url?: string;
    payment_url?: string;
    expired_at?: string;
    description?: string;
    bankInfo?: {
        bankName?: string;
        accountNumber?: string;
        accountHolder?: string;
    };
    contractCode?: string;
    contractName?: string;
}

type PaymentStatus = "pending" | "paid" | "expired" | "failed";

interface SePayQRModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paymentData: SePayPaymentData | null;
    onPaymentSuccess?: () => void;
    onPaymentExpired?: () => void;
}

export function SePayQRModal({
    open,
    onOpenChange,
    paymentData,
    onPaymentSuccess,
    onPaymentExpired,
}: SePayQRModalProps) {
    const { showToast } = useToast();
    const [status, setStatus] = useState<PaymentStatus>("pending");
    const [checking, setChecking] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (open) {
            setStatus("pending");
        }
    }, [open]);

    const qrSrc =
        paymentData?.qrCode ||
        paymentData?.qr_code_url ||
        paymentData?.qr_code;

    const checkStatus = useCallback(async () => {
        if (!paymentData?.paymentCode) return;
        try {
            setChecking(true);
            const data = await paymentService.getPaymentByCode(paymentData.paymentCode);
            if (data.status === "PAID") {
                setStatus("paid");
                onPaymentSuccess?.();
            } else if (data.status === "EXPIRED" || data.status === "CANCELLED") {
                setStatus("expired");
                onPaymentExpired?.();
            }
        } catch {
            // silent – realtime will handle it
        } finally {
            setChecking(false);
        }
    }, [paymentData?.paymentCode, onPaymentSuccess, onPaymentExpired]);

    // Poll every 10 seconds when pending
    useEffect(() => {
        if (!open || status !== "pending") return;
        const interval = setInterval(checkStatus, 10_000);
        return () => clearInterval(interval);
    }, [open, status, checkStatus]);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Đã sao chép ${label}`, "success");
        });
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-120 p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <CreditCard className="w-5 h-5 text-brand" />
                        {status === "paid"
                            ? "Thanh toán thành công"
                            : status === "expired"
                            ? "Giao dịch hết hạn"
                            : "Thanh toán qua QR SePay"}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {status === "paid"
                            ? "Hợp đồng của bạn đã được xác nhận và kích hoạt."
                            : status === "expired"
                            ? "Giao dịch đã hết hạn hoặc bị hủy. Vui lòng thử lại."
                            : "Quét mã QR hoặc chuyển khoản theo thông tin bên dưới để hoàn tất."}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-4">
                    {/* ── SUCCESS ── */}
                    {status === "paid" && (
                        <div className="flex flex-col items-center gap-4 py-6">
                            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                            </div>
                            {paymentData?.contractCode && (
                                <p className="text-sm text-center text-muted-foreground">
                                    Hợp đồng{" "}
                                    <span className="font-semibold text-foreground">
                                        {paymentData.contractCode}
                                    </span>{" "}
                                    đã được kích hoạt.
                                </p>
                            )}
                            {paymentData?.amount !== undefined && (
                                <div className="text-2xl font-bold text-emerald-700">
                                    {formatCurrency(paymentData.amount)}
                                </div>
                            )}
                            <Button className="w-full" onClick={handleClose}>
                                Đóng
                            </Button>
                        </div>
                    )}

                    {/* ── EXPIRED / FAILED ── */}
                    {(status === "expired" || status === "failed") && (
                        <div className="flex flex-col items-center gap-4 py-6">
                            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
                                <XCircle className="w-10 h-10 text-red-500" />
                            </div>
                            <p className="text-sm text-center text-muted-foreground">
                                {status === "expired"
                                    ? "Mã QR đã hết hạn hoặc giao dịch bị hủy."
                                    : "Thanh toán thất bại. Vui lòng thử lại."}
                            </p>
                            <Button variant="outline" className="w-full" onClick={handleClose}>
                                Đóng
                            </Button>
                        </div>
                    )}

                    {/* ── PENDING ── */}
                    {status === "pending" && (
                        <>
                            {/* Amount */}
                            {paymentData?.amount !== undefined && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-amber-600 font-medium">Số tiền cần thanh toán</p>
                                        <p className="text-xl font-bold text-amber-700 mt-0.5">
                                            {formatCurrency(paymentData.amount)}
                                        </p>
                                    </div>
                                    {paymentData.expired_at && (
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                                <Clock className="w-3 h-3" />
                                                Hết hạn
                                            </p>
                                            <p className="text-xs font-medium text-foreground">
                                                {formatDateTime(paymentData.expired_at)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* QR Code */}
                            {qrSrc ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="border-2 border-brand/20 rounded-xl p-3 bg-white shadow-sm">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={qrSrc}
                                            alt="QR Code SePay"
                                            className="w-44 h-44 object-contain"
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Wifi className="w-3 h-3 animate-pulse text-emerald-500" />
                                        <span>Đang chờ xác nhận thanh toán...</span>
                                        {checking && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-6 border-2 border-dashed rounded-xl text-muted-foreground gap-2 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    Không có mã QR. Vui lòng chuyển khoản thủ công bên dưới.
                                </div>
                            )}

                            <Separator />

                            {/* Bank Info */}
                            {paymentData?.bankInfo?.bankName && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                        <Building2 className="w-3 h-3" />
                                        Thông tin chuyển khoản
                                    </p>
                                    <div className="bg-muted/40 rounded-xl divide-y divide-border overflow-hidden">
                                        {/* Bank name */}
                                        <InfoRow label="Ngân hàng" value={paymentData.bankInfo.bankName} />

                                        {/* Account number */}
                                        {paymentData.bankInfo.accountNumber && (
                                            <InfoRow
                                                label="Số tài khoản"
                                                value={paymentData.bankInfo.accountNumber}
                                                onCopy={() =>
                                                    copyToClipboard(
                                                        paymentData.bankInfo!.accountNumber!,
                                                        "số tài khoản"
                                                    )
                                                }
                                                highlight
                                            />
                                        )}

                                        {/* Account holder */}
                                        {paymentData.bankInfo.accountHolder && (
                                            <InfoRow
                                                label="Chủ tài khoản"
                                                value={paymentData.bankInfo.accountHolder}
                                            />
                                        )}

                                        {/* Amount */}
                                        {paymentData.amount !== undefined && (
                                            <InfoRow
                                                label="Số tiền"
                                                value={formatCurrency(paymentData.amount)}
                                                onCopy={() =>
                                                    copyToClipboard(
                                                        String(paymentData.amount),
                                                        "số tiền"
                                                    )
                                                }
                                            />
                                        )}

                                        {/* Transfer description */}
                                        {(paymentData.description || paymentData.paymentCode) && (
                                            <InfoRow
                                                label="Nội dung CK"
                                                value={paymentData.description || paymentData.paymentCode || ""}
                                                onCopy={() =>
                                                    copyToClipboard(
                                                        paymentData.description || paymentData.paymentCode || "",
                                                        "nội dung"
                                                    )
                                                }
                                                highlight
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Warning note */}
                            <div className={cn(
                                "flex items-start gap-2 text-xs p-3 rounded-lg",
                                "bg-blue-50 border border-blue-200 text-blue-700"
                            )}>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>
                                    Vui lòng nhập <strong>đúng nội dung chuyển khoản</strong> để hệ thống tự động xác nhận.
                                    Hợp đồng sẽ được kích hoạt ngay sau khi thanh toán thành công.
                                </span>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleClose}
                            >
                                Đóng
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function InfoRow({
    label,
    value,
    onCopy,
    highlight,
}: {
    label: string;
    value: string;
    onCopy?: () => void;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-xs text-muted-foreground shrink-0">{label}</span>
            <div className="flex items-center gap-1.5 min-w-0">
                <span
                    className={cn(
                        "text-xs font-medium truncate",
                        highlight && "text-brand font-semibold"
                    )}
                >
                    {value}
                </span>
                {onCopy && (
                    <button
                        onClick={onCopy}
                        className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
                        title="Sao chép"
                    >
                        <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </button>
                )}
            </div>
        </div>
    );
}
