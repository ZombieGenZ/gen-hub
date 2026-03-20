"use client";

import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Calculator, AlertCircle } from "lucide-react";
import { refundService } from "@/services/refund/refund.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";

interface RequestRefundModalProps {
    isOpen: boolean;
    onClose: () => void;
    contractId: string;
    originalAmount: number;
    onSuccess: () => void;
}

const COMMON_REASONS = [
    "Dừng kinh doanh / Phá sản",
    "Chuyển địa điểm kinh doanh",
    "Không còn nhu cầu lưu kho",
    "Chất lượng dịch vụ không đảm bảo",
    "Tìm được đối tác khác",
    "Khác",
];

export function RequestRefundModal({
    isOpen,
    onClose,
    contractId,
    originalAmount,
    onSuccess,
}: RequestRefundModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [reasonSelect, setReasonSelect] = useState<string>("");
    const [reasonDetail, setReasonDetail] = useState("");

    // Calculator values (Simulated estimate for customer)
    // We can assume a default 10% penalty fee for early termination logic as base
    // However, exact fee will be verified by admin
    const estimatedFeePercent = 10;
    const feeAmount = useMemo(() => (originalAmount * estimatedFeePercent) / 100, [originalAmount]);
    const finalAmount = useMemo(() => originalAmount - feeAmount, [originalAmount, feeAmount]);

    const handleSubmit = async () => {
        if (!reasonSelect) {
            showToast("Vui lòng chọn lý do hoàn tiền.", "error");
            return;
        }

        const finalReason =
            reasonSelect === "Khác"
                ? reasonDetail
                : reasonDetail
                ? `${reasonSelect} - ${reasonDetail}`
                : reasonSelect;

        if (!finalReason.trim()) {
            showToast("Vui lòng điền chi tiết lý do.", "error");
            return;
        }

        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) throw new Error("Vui lòng đăng nhập lại");

            // Payload based on backend DTO requirements
            await refundService.createRequest(token, {
                rental_contract_id: contractId,
                original_amount: originalAmount,
                fee_percent: estimatedFeePercent,
                fee_amount: feeAmount,
                final_refund_amount: finalAmount,
                reason: finalReason,
            });

            showToast("Hệ thống đã ghi nhận yêu cầu hoàn tiền / thanh lý hợp đồng của bạn.", "success");
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.message || "Không thể gửi dữ liệu.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Yêu cầu Hoàn tiền / Thanh lý</DialogTitle>
                    <DialogDescription>
                        Vui lòng điền thông tin để tạo yêu cầu thanh lý hợp đồng sớm. Kế toán sẽ xem xét và đối soát lại số tiền.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 my-2">
                    {/* Calculator Box */}
                    <div className="bg-muted/50 border rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                            <Calculator className="w-4 h-4" />
                            Dự toán hoàn tiền (Tạm tính)
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Giá trị hợp đồng gốc:</span>
                            <span className="font-semibold">{originalAmount.toLocaleString("vi-VN")} đ</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Phí xử lý dự kiến ({estimatedFeePercent}%):</span>
                            <span className="font-medium text-destructive">
                                - {feeAmount.toLocaleString("vi-VN")} đ
                            </span>
                        </div>
                        
                        <div className="h-px bg-border w-full my-1" />
                        
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Thực nhận dự kiến:</span>
                            <span className="text-lg font-bold text-brand">
                                {finalAmount.toLocaleString("vi-VN")} đ
                            </span>
                        </div>

                        <div className="flex gap-2 items-start mt-2 p-2.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>Đây chỉ là số tiền dự toán. Bộ phận kế toán có thể điều chỉnh lại dựa trên chính sách và tình trạng thực tế của hợp đồng.</p>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Lý do chính <span className="text-destructive">*</span></label>
                            <Select value={reasonSelect} onValueChange={setReasonSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn lý do hoàn tiền" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COMMON_REASONS.map((r) => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Chi tiết lý do</label>
                            <Textarea
                                placeholder="Vui lòng cung cấp thêm thông tin chia sẻ để chúng tôi có thể hỗ trợ tốt hơn..."
                                value={reasonDetail}
                                onChange={(e) => setReasonDetail(e.target.value)}
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Gửi yêu cầu
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
