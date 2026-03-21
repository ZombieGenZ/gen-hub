import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { TrashIcon } from "@heroicons/react/24/outline";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";

interface WarehouseActionDialogsProps {
    deleteDialogOpen: boolean;
    setDeleteDialogOpen: (val: boolean) => void;
    deleteTarget: Warehouse | null;
    isDeleteLoading: boolean;
    handleDeleteConfirm: () => void;

    isBulkDeleteDialogOpen: boolean;
    setIsBulkDeleteDialogOpen: (val: boolean) => void;
    selectedIds: string[];
    isBulkActionLoading: boolean;
    handleBulkDelete: () => void;

    createDialogOpen: boolean;
    setCreateDialogOpen: (val: boolean) => void;
    isCreating: boolean;
    createForm: { name: string; length: number; width: number; price_per_month: number };
    setCreateForm: React.Dispatch<React.SetStateAction<{ name: string; length: number; width: number; price_per_month: number }>>;
    handleCreate: () => void;
}

export function WarehouseActionDialogs({
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteTarget,
    isDeleteLoading,
    handleDeleteConfirm,
    isBulkDeleteDialogOpen,
    setIsBulkDeleteDialogOpen,
    selectedIds,
    isBulkActionLoading,
    handleBulkDelete,
    createDialogOpen,
    setCreateDialogOpen,
    isCreating,
    createForm,
    setCreateForm,
    handleCreate,
}: WarehouseActionDialogsProps) {
    return (
        <>
            {/* ── Delete Confirmation Dialog ── */}
            <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!isDeleteLoading) setDeleteDialogOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa kho <strong className="text-foreground">&ldquo;{deleteTarget?.name}&rdquo;</strong> không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleteLoading} className="transition-all duration-200 rounded-xl">
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleteLoading} className="gap-2 min-w-[100px] transition-all duration-200 rounded-xl">
                            {isDeleteLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Xóa</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Bulk Delete Dialog ── */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={(open) => { if (!isBulkActionLoading) setIsBulkDeleteDialogOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa nhiều</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa <strong className="text-foreground">{selectedIds.length} template</strong> đã chọn không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkActionLoading} className="transition-all duration-200 rounded-xl">
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionLoading} className="gap-2 min-w-[120px] transition-all duration-200 rounded-xl">
                            {isBulkActionLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa {selectedIds.length}...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Xóa {selectedIds.length} mục</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Create Warehouse Modal ── */}
            <Dialog open={createDialogOpen} onOpenChange={(open) => {
                if (!open && !isCreating) {
                    setCreateDialogOpen(false);
                    setCreateForm({ name: "", length: 0, width: 0, price_per_month: 0 });
                }
            }}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Tạo kho mới</DialogTitle>
                        <DialogDescription>
                            Nhập thông tin cơ bản để tạo kho. Bạn có thể bổ sung chi tiết sau.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 p-4">
                        <div className="space-y-2">
                            <Label htmlFor="create-name">Tên kho *</Label>
                            <Input
                                id="create-name"
                                value={createForm.name}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Nhập tên kho..."
                                className="rounded-xl"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Chiều dài</Label>
                                <FormattedNumberInput
                                    value={createForm.length}
                                    onChange={(v) => setCreateForm(prev => ({ ...prev, length: Number(v) }))}
                                    suffix="m"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Chiều rộng</Label>
                                <FormattedNumberInput
                                    value={createForm.width}
                                    onChange={(v) => setCreateForm(prev => ({ ...prev, width: Number(v) }))}
                                    suffix="m"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Giá thuê / tháng</Label>
                            <FormattedNumberInput
                                value={createForm.price_per_month}
                                onChange={(v) => setCreateForm(prev => ({ ...prev, price_per_month: Number(v) }))}
                                suffix="đ"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCreateDialogOpen(false);
                                setCreateForm({ name: "", length: 0, width: 0, price_per_month: 0 });
                            }}
                            disabled={isCreating}
                            className="rounded-xl"
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating || !createForm.name.trim()}
                            className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl"
                        >
                            {isCreating ? "Đang tạo..." : "Tạo kho"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
