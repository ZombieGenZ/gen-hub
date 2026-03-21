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
import type { Product } from "@/services/product/product.types";

interface ProductDeleteDialogsProps {
    // Single
    deleteDialogOpen: boolean;
    setDeleteDialogOpen: (open: boolean) => void;
    deleteTarget: Product | null;
    handleDeleteConfirm: () => void;
    isDeleteLoading: boolean;

    // Bulk
    isBulkDeleteDialogOpen: boolean;
    setIsBulkDeleteDialogOpen: (open: boolean) => void;
    handleBulkDelete: () => void;
    isBulkActionLoading: boolean;
    selectedIdsCount: number;
}

export function ProductDeleteDialogs({
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteTarget,
    handleDeleteConfirm,
    isDeleteLoading,
    isBulkDeleteDialogOpen,
    setIsBulkDeleteDialogOpen,
    handleBulkDelete,
    isBulkActionLoading,
    selectedIdsCount,
}: ProductDeleteDialogsProps) {
    return (
        <>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa sản phẩm</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa sản phẩm &quot;{deleteTarget?.name}&quot;? Thao tác này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Hủy
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleteLoading}
                        >
                            {isDeleteLoading ? "Đang xóa..." : "Xóa"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xóa nhiều sản phẩm</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa <span className="font-bold">{selectedIdsCount}</span> sản phẩm đã chọn? Thao tác này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsBulkDeleteDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Hủy
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                            onClick={handleBulkDelete}
                            disabled={isBulkActionLoading}
                        >
                            {isBulkActionLoading ? "Đang xóa..." : `Xóa ${selectedIdsCount} sản phẩm`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
