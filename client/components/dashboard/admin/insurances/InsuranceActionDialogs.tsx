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
import { TrashIcon } from "@heroicons/react/24/outline";
import { InsuranceForm } from "../../../../app/(protected)/dashboard/admin/insurances/insurance-form";
import { Insurance } from "@/types/insurance/Insurance.types";

interface InsuranceActionDialogsProps {
    isCreateOpen: boolean;
    isEditOpen: boolean;
    setIsCreateOpen: (val: boolean) => void;
    setIsEditOpen: (val: boolean) => void;
    targetInsurance: Insurance | null;
    setTargetInsurance: (val: Insurance | null) => void;
    handleRefresh: () => void;
    isDeleteOpen: boolean;
    setIsDeleteOpen: (val: boolean) => void;
    isDeleteLoading: boolean;
    handleDelete: () => void;
    isBulkDeleteDialogOpen: boolean;
    setIsBulkDeleteDialogOpen: (val: boolean) => void;
    isBulkActionLoading: boolean;
    handleBulkDelete: () => void;
    selectedIdsLength: number;
}

export function InsuranceActionDialogs({
    isCreateOpen,
    isEditOpen,
    setIsCreateOpen,
    setIsEditOpen,
    targetInsurance,
    setTargetInsurance,
    handleRefresh,
    isDeleteOpen,
    setIsDeleteOpen,
    isDeleteLoading,
    handleDelete,
    isBulkDeleteDialogOpen,
    setIsBulkDeleteDialogOpen,
    isBulkActionLoading,
    handleBulkDelete,
    selectedIdsLength,
}: InsuranceActionDialogsProps) {
    return (
        <>
            {/* Create/Edit dialog */}
            <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                    setTargetInsurance(null);
                }
            }}>
                <DialogContent className="rounded-2xl w-[95vw] max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4 shrink-0 z-10 border-b bg-background">
                        <DialogTitle>
                            {isEditOpen ? 'Chỉnh sửa' : 'Thêm mới'} gói bảo hiểm
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 pt-4">
                        <InsuranceForm
                            initialData={targetInsurance || undefined}
                            isEdit={isEditOpen}
                            onSuccess={handleRefresh}
                            onCancel={() => {
                                setIsCreateOpen(false);
                                setIsEditOpen(false);
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!isDeleteLoading) setIsDeleteOpen(open); }}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa gói bảo hiểm <strong className="text-foreground">&ldquo;{targetInsurance?.name}&rdquo;</strong> không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading} className="rounded-xl transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading} className="rounded-xl gap-2 min-w-[100px] transition-all duration-200">
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

            {/* Bulk Delete Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={(open) => { if (!isBulkActionLoading) setIsBulkDeleteDialogOpen(open); }}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa nhiều</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa <strong className="text-foreground">{selectedIdsLength} gói bảo hiểm</strong> đã chọn không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkActionLoading} className="rounded-xl transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionLoading} className="rounded-xl gap-2 min-w-[120px] transition-all duration-200">
                            {isBulkActionLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa {selectedIdsLength}...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Xóa {selectedIdsLength} mục</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
