"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useToast } from "@/contexts/ToastContext";

const inventoryService = new InventoryService();

interface StockTakeCreateModalProps {
    open: boolean;
    onClose: () => void;
    warehouses: { id: string; name: string }[];
    onCreated: () => void;
}

export function StockTakeCreateModal({
    open,
    onClose,
    warehouses,
    onCreated,
}: StockTakeCreateModalProps) {
    const { showToast } = useToast();
    const [warehouseId, setWarehouseId] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!warehouseId) {
            showToast("Vui lòng chọn kho cần kiểm kê", "error");
            return;
        }
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            await inventoryService.createStockTake(token, {
                warehouse_id: warehouseId,
                notes: notes || undefined,
            });
            showToast("Tạo phiếu kiểm kê thành công", "success");
            setWarehouseId("");
            setNotes("");
            onCreated();
            onClose();
        } catch (err: any) {
            showToast(err.message || "Không thể tạo phiếu kiểm kê", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle>Tạo phiếu kiểm kê</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Kho cần kiểm kê *</Label>
                        <Select value={warehouseId} onValueChange={setWarehouseId}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Chọn kho..." />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.map((wh) => (
                                    <SelectItem key={wh.id} value={wh.id}>
                                        {wh.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Ghi chú</Label>
                        <Textarea
                            placeholder="Ghi chú thêm (tuỳ chọn)..."
                            className="rounded-xl resize-none"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Đang tạo..." : "Tạo phiếu"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
