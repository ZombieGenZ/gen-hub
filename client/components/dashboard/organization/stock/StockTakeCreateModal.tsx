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
import {
    ClipboardDocumentListIcon,
    BuildingStorefrontIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";
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

    const handleClose = () => {
        if (loading) return;
        setWarehouseId("");
        setNotes("");
        onClose();
    };

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
                notes: notes.trim() || undefined,
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
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                            <ClipboardDocumentListIcon className="w-5 h-5 text-[#0F766E]" />
                        </div>
                        <div>
                            <DialogTitle className="text-base">Tạo phiếu kiểm kê</DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Chọn kho và thêm ghi chú để bắt đầu kiểm đếm
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Warehouse selector */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1">
                            Kho cần kiểm kê
                            <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <Select value={warehouseId} onValueChange={setWarehouseId}>
                            <SelectTrigger className="rounded-xl h-10">
                                <SelectValue placeholder="Chọn kho..." />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.length === 0 ? (
                                    <div className="py-4 text-center text-sm text-muted-foreground">
                                        Không có kho nào khả dụng
                                    </div>
                                ) : (
                                    warehouses.map((wh) => (
                                        <SelectItem key={wh.id} value={wh.id}>
                                            <span className="flex items-center gap-2">
                                                <BuildingStorefrontIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                                {wh.name}
                                            </span>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                            Ghi chú
                            <span className="ml-1.5 text-xs font-normal opacity-60">(tuỳ chọn)</span>
                        </Label>
                        <Textarea
                            placeholder="Ghi chú thêm về đợt kiểm kê này..."
                            className="rounded-xl resize-none text-sm"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={loading}
                        className="rounded-xl"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !warehouseId}
                        className="rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5"
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <PlusIcon className="w-4 h-4" />
                                Tạo phiếu
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
