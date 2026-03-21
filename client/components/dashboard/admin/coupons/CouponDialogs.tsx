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
import { TrashIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { CouponForm } from "@/app/(protected)/dashboard/admin/coupons/coupon-form";
import { Coupon } from "@/types/coupons/coupon.type";

interface CouponFormDialogsProps {
    isCreateDialogOpen: boolean;
    setIsCreateDialogOpen: (val: boolean) => void;
    handleCreateSuccess: () => void;
    isEditDialogOpen: boolean;
    setIsEditDialogOpen: (val: boolean) => void;
    selectedCoupon: Coupon | null;
    handleEditSuccess: () => void;
}

export function CouponFormDialogs({
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    handleCreateSuccess,
    isEditDialogOpen,
    setIsEditDialogOpen,
    selectedCoupon,
    handleEditSuccess,
}: CouponFormDialogsProps) {
    return (
        <>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="w-[95vw] max-w-7xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="p-4 pb-2 shrink-0 z-10 border-b">
                        <DialogTitle>Tạo mã giảm giá mới</DialogTitle>
                    </DialogHeader>
                    {isCreateDialogOpen && (
                        <div className="flex-1 overflow-y-auto p-6 pt-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                            <CouponForm onSuccess={handleCreateSuccess} onCancel={() => setIsCreateDialogOpen(false)} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="w-[95vw] max-w-7xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="p-4 pb-2 shrink-0 z-10 border-b">
                        <DialogTitle>Chỉnh sửa mã giảm giá</DialogTitle>
                    </DialogHeader>
                    {isEditDialogOpen && selectedCoupon && (
                        <div className="flex-1 overflow-y-auto p-6 pt-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                            <CouponForm
                                initialData={selectedCoupon}
                                onSuccess={handleEditSuccess}
                                onCancel={() => setIsEditDialogOpen(false)}
                                isEdit={true}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

interface CouponActionDialogsProps {
    isDeleteDialogOpen: boolean;
    setIsDeleteDialogOpen: (val: boolean) => void;
    selectedCoupon: Coupon | null;
    handleDelete: () => void;
    isDeleteLoading: boolean;

    isBulkActionDialogOpen: boolean;
    setIsBulkActionDialogOpen: (val: boolean) => void;
    isBulkActionLoading: boolean;
    bulkActionSuccess: boolean;
    setBulkActionType: (val: any) => void;
    setBulkActionSuccess: (val: boolean) => void;
    getBulkActionTitle: () => string;
    getBulkActionDescription: () => string;
    executeBulkAction: () => void;
    bulkActionType: 'activate' | 'deactivate' | 'delete' | null;
}

export function CouponActionDialogs({
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    selectedCoupon,
    handleDelete,
    isDeleteLoading,
    isBulkActionDialogOpen,
    setIsBulkActionDialogOpen,
    isBulkActionLoading,
    bulkActionSuccess,
    setBulkActionType,
    setBulkActionSuccess,
    getBulkActionTitle,
    getBulkActionDescription,
    executeBulkAction,
    bulkActionType,
}: CouponActionDialogsProps) {
    return (
        <>
            <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!isDeleteLoading) setIsDeleteDialogOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa mã giảm giá <strong className="text-foreground">&ldquo;{selectedCoupon?.name}&rdquo;</strong> không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleteLoading} className="transition-all duration-200 rounded-xl">
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading} className="gap-2 min-w-[100px] transition-all duration-200 rounded-xl">
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

            <Dialog open={isBulkActionDialogOpen} onOpenChange={(open) => {
                if (!isBulkActionLoading) {
                    setIsBulkActionDialogOpen(open);
                    if (!open) {
                        setBulkActionType(null);
                        setBulkActionSuccess(false);
                    }
                }
            }}>
                <DialogContent className="max-w-md rounded-2xl">
                    {isBulkActionLoading || bulkActionSuccess ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            {bulkActionSuccess ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                        <CheckCircleIcon className="w-8 h-8 text-green-600" />
                                    </div>
                                    <span className="text-lg font-medium text-green-600">Hoàn thành</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                                    <span className="text-muted-foreground">Đang xử lý...</span>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>{getBulkActionTitle()}</DialogTitle>
                            </DialogHeader>
                            <div className="p-4 ">
                                <p>{getBulkActionDescription()}</p>
                            </div>
                            <DialogFooter className="mt-0">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsBulkActionDialogOpen(false);
                                        setBulkActionType(null);
                                    }}
                                    className="rounded-xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    variant={bulkActionType === 'delete' ? 'destructive' : 'default'}
                                    onClick={executeBulkAction}
                                    className={bulkActionType !== 'delete' ? 'bg-[#0F766E] hover:bg-[#0F766E]/90 rounded-xl' : 'rounded-xl'}
                                >
                                    Xác nhận
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
