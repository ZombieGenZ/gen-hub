"use client";

import { useEffect, useState, useMemo } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calculator, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { refundService } from "@/services/refund/refund.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import type { RefundRequest, RefundStatus } from "@/types/refund/refund.type";

interface ReconciliationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    request: RefundRequest | null;
    onSuccess: () => void;
}

export function ReconciliationDrawer({
    isOpen,
    onClose,
    request,
    onSuccess,
}: ReconciliationDrawerProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    
    // Calculator States
    const [feePercent, setFeePercent] = useState<number>(0);
    const [feeAmount, setFeeAmount] = useState<number>(0);
    const [processNotes, setProcessNotes] = useState("");

    // Initialize state when request changes
    useEffect(() => {
        if (request && isOpen) {
            setFeePercent(request.fee_percent || 0);
            setFeeAmount(request.fee_amount || 0);
            setProcessNotes("");
        }
    }, [request, isOpen]);

    // Handle percent change -> auto update amount
    const handlePercentChange = (val: string) => {
        const pct = parseFloat(val) || 0;
        setFeePercent(pct);
        if (request) {
            setFeeAmount(Math.round((request.original_amount * pct) / 100));
        }
    };

    // Handle amount change -> auto update percent (to 2 decimal places)
    const handleAmountChange = (val: string) => {
        const amt = parseFloat(val) || 0;
        setFeeAmount(amt);
        if (request && request.original_amount > 0) {
            setFeePercent(parseFloat(((amt / request.original_amount) * 100).toFixed(2)));
        }
    };

    const finalAmount = useMemo(() => {
        if (!request) return 0;
        const result = request.original_amount - feeAmount;
        return result > 0 ? result : 0;
    }, [request, feeAmount]);

    const handleAction = async (action: "ACCEPT" | "REJECT") => {
        if (!request) return;

        if (action === "REJECT" && !processNotes.trim()) {
            showToast("Vui lòng nhập lý do từ chối vào phần Ghi chú xử lý.", "error");
            return;
        }

        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) throw new Error("Vui lòng đăng nhập lại");

            // Build payload based on our backend requirements: 
            // In the backend, we configured `accept` and `reject` implicitly inside `changeStatus` 
            // OR through our DTO modifications. Wait, our frontend refund.service.ts uses 
            // PATCH /admin/refund-requests/:id/status
            // We'll prepare the payload that our custom `adminProcessRequest` can consume,
            // Then we might need to update that frontend service if it doesn't match the new backend.
            // Let's pass the exact fields expecting our backend to read them.
            const payload: any = {
                status: action === "ACCEPT" ? "APPROVED" : "REJECTED", // Wait, backend enum is APPROVED
                process_notes: processNotes,
            };

            if (action === "ACCEPT") {
                payload.fee_percent = feePercent;
                payload.fee_amount = feeAmount;
                payload.final_refund_amount = finalAmount;
            } else {
                payload.reject_reason = processNotes; // If backend requires reject_reason
            }

            await refundService.adminProcessRequest(token, request.id, payload);

            showToast(`Đã ${action === "ACCEPT" ? "duyệt" : "từ chối"} yêu cầu hoàn tiền.`, "success");
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.message || "Không thể xử lý yêu cầu.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!request) return null;

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto flex flex-col h-full border-l">
                 <SheetHeader className="mb-6">
                    <SheetTitle>Xử lý Yêu cầu Hoàn tiền / Thanh lý</SheetTitle>
                    <SheetDescription>
                        Đối soát và duyệt số tiền hoàn lại cho hợp đồng <span className="font-semibold text-foreground">{request.rental_contract_id.substring(0,8)}...</span>
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-6">
                    {/* KH Detail Box */}
                    <div className="space-y-3 bg-muted/30 p-4 border rounded-xl text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Mã Y/C:</span>
                            <span className="font-mono">{request.id.substring(0,8)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Lý do gốc:</span>
                            <span className="font-medium text-right max-w-[250px]">{request.reason}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tiền gốc hợp đồng:</span>
                            <span className="font-semibold">{formatCurrency(request.original_amount)}</span>
                        </div>
                    </div>

                    {request.status !== "PENDING" && (
                         <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-3 rounded-lg text-sm flex items-start gap-2">
                             <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                             <div>
                                 <p className="font-medium mb-1">Yêu cầu này không ở trạng thái Chờ xử lý.</p>
                                 <p className="text-xs">Chỉ xem được thông tin, không thể thao tác duyệt/từ chối lại.</p>
                             </div>
                         </div>
                    )}

                    {/* Calculator Form */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 font-semibold text-sm">
                            <Calculator className="w-4 h-4 text-brand" />
                            Smart Calculator: Đối soát Phí
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Phí phạt (%)</Label>
                                <Input 
                                    type="number" 
                                    className="text-right font-mono"
                                    value={feePercent} 
                                    onChange={(e) => handlePercentChange(e.target.value)}
                                    disabled={loading || request.status !== "PENDING"}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phí phạt (VNĐ)</Label>
                                <Input 
                                    type="number" 
                                    className="text-right font-mono text-destructive"
                                    value={feeAmount} 
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    disabled={loading || request.status !== "PENDING"}
                                />
                            </div>
                        </div>

                        {/* Summary Line */}
                        <div className="p-4 bg-muted/50 rounded-lg border flex items-center justify-between">
                            <span className="font-medium">Số tiền thực chuyển lại:</span>
                            <span className="text-xl font-bold text-brand">{formatCurrency(finalAmount)}</span>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Ghi chú xử lý <span className="text-muted-foreground font-normal">(Bắt buộc nếu Từ chối)</span></Label>
                        <Textarea 
                            placeholder="Ghi chú nội bộ hoặc lý do từ chối..."
                            className="resize-none min-h-[100px]"
                            value={processNotes}
                            onChange={(e) => setProcessNotes(e.target.value)}
                            disabled={loading || request.status !== "PENDING"}
                        />
                    </div>
                </div>

                <SheetFooter className="mt-8 shrink-0">
                    {request.status === "PENDING" ? (
                        <div className="flex items-center gap-3 w-full sm:justify-end">
                            <Button 
                                variant="outline" 
                                className="flex-1 sm:flex-none border-destructive text-destructive hover:bg-destructive/10"
                                onClick={() => handleAction("REJECT")}
                                disabled={loading}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Từ chối
                            </Button>
                            <Button 
                                className="flex-1 sm:flex-none bg-brand hover:bg-brand-hover"
                                onClick={() => handleAction("ACCEPT")}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {!loading && <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Duyệt Phân bổ &gt;
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" className="w-full" onClick={onClose}>Đóng</Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

