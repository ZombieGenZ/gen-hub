"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { XCircleIcon } from "@heroicons/react/24/outline";

// ────────────────────────────────────────────────
// Reject Reason Categories
// ────────────────────────────────────────────────
const REJECT_CATEGORIES = [
    { value: "WRONG_ITEMS", label: "Hàng không đúng yêu cầu" },
    { value: "NO_CAPACITY", label: "Hết chỗ chứa" },
    { value: "QUALITY_ISSUE", label: "Vấn đề chất lượng" },
    { value: "DOCUMENT_ERROR", label: "Sai sót chứng từ" },
    { value: "INSUFFICIENT_STOCK", label: "Tồn kho không đủ" },
    { value: "OTHER", label: "Lý do khác" },
];

interface RejectReasonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ticketCode: string;
    onConfirm: (category: string, reason: string) => void;
    isSubmitting?: boolean;
}

export default function RejectReasonDialog({
    open,
    onOpenChange,
    ticketCode,
    onConfirm,
    isSubmitting = false,
}: RejectReasonDialogProps) {
    const [category, setCategory] = useState("");
    const [reason, setReason] = useState("");

    const canSubmit = category && reason.trim().length > 0;

    const handleConfirm = () => {
        if (!canSubmit) return;
        onConfirm(category, reason.trim());
        setCategory("");
        setReason("");
    };

    const handleClose = (nextOpen: boolean) => {
        if (!isSubmitting) {
            onOpenChange(nextOpen);
            if (!nextOpen) {
                setCategory("");
                setReason("");
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <XCircleIcon className="w-5 h-5 text-red-500" />
                        Từ chối phiếu
                    </DialogTitle>
                    <DialogDescription>
                        Phiếu{" "}
                        <strong className="text-foreground">
                            &ldquo;{ticketCode}&rdquo;
                        </strong>{" "}
                        sẽ bị từ chối. Vui lòng nhập lý do để thông báo cho khách hàng.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Loại lý do *</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Chọn loại lý do" />
                            </SelectTrigger>
                            <SelectContent>
                                {REJECT_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Chi tiết lý do *</Label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Mô tả chi tiết lý do từ chối..."
                            className="rounded-xl min-h-[100px] resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={isSubmitting}
                        className="rounded-xl"
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!canSubmit || isSubmitting}
                        className="gap-2 rounded-xl"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <svg
                                    className="animate-spin h-4 w-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                Đang xử lý...
                            </span>
                        ) : (
                            <>
                                <XCircleIcon className="w-4 h-4" />
                                Xác nhận từ chối
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
