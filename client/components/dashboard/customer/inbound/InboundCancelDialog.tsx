import React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { XCircleIcon } from "@heroicons/react/24/outline";
import type { InboundRequest } from "@/services/inventory/inventory.types";

interface InboundCancelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cancelTarget: InboundRequest | null;
    isCancelling: boolean;
    onConfirm: () => void;
}

export function InboundCancelDialog({
    open,
    onOpenChange,
    cancelTarget,
    isCancelling,
    onConfirm,
}: InboundCancelDialogProps) {
    return (
        <Dialog
            open={open}
            onOpenChange={(openChange) => {
                if (!isCancelling) onOpenChange(openChange);
            }}
        >
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle>🚫 Hủy phiếu nhập</DialogTitle>
                    <DialogDescription>
                        Bạn có chắc chắn muốn hủy phiếu{" "}
                        <strong className="text-foreground">
                            &ldquo;{cancelTarget?.code}&rdquo;
                        </strong>{" "}
                        không?
                        <br />
                        <span className="text-red-500 text-xs mt-1 inline-block">
                            ⚠️ Hành động này không thể hoàn tác.
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isCancelling}
                        className="rounded-xl"
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isCancelling}
                        className="gap-2 rounded-xl"
                    >
                        {isCancelling ? (
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
                                Đang hủy...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <XCircleIcon className="w-4 h-4" /> Xác nhận hủy
                            </span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
