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
import type { Partner } from "@/services/partner/partner.types";

interface PartnerDeleteDialogsProps {
    isSubmitting: boolean;
    // Single
    deleteDialogOpen: boolean;
    setDeleteDialogOpen: (open: boolean) => void;
    deleteTarget: Partner | null;
    handleDeleteConfirm: () => void;

    // Bulk
    bulkDeleteOpen: boolean;
    setBulkDeleteOpen: (open: boolean) => void;
    selectedIdsCount: number;
    handleBulkDelete: () => void;
}

export function PartnerDeleteDialogs({
    isSubmitting,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteTarget,
    handleDeleteConfirm,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    selectedIdsCount,
    handleBulkDelete,
}: PartnerDeleteDialogsProps) {
    return (
        <>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa đối tác</DialogTitle>
                        <DialogDescription className="space-y-2">
                            <span>Bạn có chắc chắn muốn xóa đối tác &quot;{deleteTarget?.name}&quot;?</span>
                            <span className="block text-amber-600 text-xs bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                                Các phiếu PO/xuất lịch sử liên quan vẫn sẽ được lưu trữ để đối soát.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                            onClick={handleDeleteConfirm}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Đang xóa..." : "Xóa đối tác"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xóa nhiều đối tác</DialogTitle>
                        <DialogDescription className="space-y-2">
                            <span>Bạn có chắc chắn muốn xóa {selectedIdsCount} đối tác đã chọn?</span>
                            <span className="block text-amber-600 text-xs bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                                Các phiếu PO/xuất lịch sử liên quan vẫn sẽ được lưu trữ để đối soát.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setBulkDeleteOpen(false)}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                            onClick={handleBulkDelete}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Đang xóa..." : `Xóa ${selectedIdsCount} đối tác`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

