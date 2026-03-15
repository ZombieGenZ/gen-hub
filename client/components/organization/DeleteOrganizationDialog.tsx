"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteOrganizationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationName: string;
    onConfirm: () => Promise<void>;
}

export function DeleteOrganizationDialog({
    open,
    onOpenChange,
    organizationName,
    onConfirm,
}: DeleteOrganizationDialogProps) {
    const [confirmName, setConfirmName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setConfirmName("");
            setError(null);
        }
    }, [open]);

    const isValid = confirmName === organizationName;

    const handleDelete = async () => {
        if (!isValid) return;
        setError(null);
        setLoading(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.message || "Không thể xóa tổ chức. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Xóa tổ chức
                    </DialogTitle>
                    <DialogDescription>
                        Bạn có chắc chắn muốn xóa <strong>{organizationName}</strong>?
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4">
                    <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 space-y-2">
                        <p className="text-sm text-foreground">
                            Tổ chức này và toàn bộ dữ liệu liên quan sẽ bị xóa. Hành động này là vĩnh viễn và không thể hoàn tác.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-name" className="text-sm font-medium">
                            Nhập tên tổ chức để xác nhận
                        </Label>
                        <Input
                            id="confirm-name"
                            placeholder={organizationName}
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </DialogBody>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!isValid || loading}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Xóa tổ chức
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
