import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { TrashIcon, CheckCircleIcon, UsersIcon } from "@heroicons/react/24/outline";
import { CouponForm } from "@/app/(protected)/dashboard/admin/coupons/coupon-form";
import { Coupon } from "@/types/coupons/coupon.type";
import { CouponService } from "@/services/coupons/coupon.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const couponService = new CouponService();

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

interface CouponUsage {
    id: string;
    contract_id: string;
    contract_code: string;
    discount_value: number;
    discount_amount: number;
    used_at: string;
    organization: { id: string; name: string };
    user: { id: string; name: string; email: string; avatar_url?: string };
}

interface CouponUsersDialogProps {
    open: boolean;
    onClose: () => void;
    coupon: Coupon | null;
    formatCurrency: (amount: number) => string;
}

export function CouponUsersDialog({ open, onClose, coupon, formatCurrency }: CouponUsersDialogProps) {
    const [usages, setUsages] = useState<CouponUsage[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [skip, setSkip] = useState(0);
    const take = 15;

    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleString('vi-VN'); } catch { return d; }
    };

    useEffect(() => {
        if (!open || !coupon) return;
        setSkip(0);
        setUsages([]);
        loadUsages(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, coupon]);

    const loadUsages = async (newSkip: number) => {
        if (!coupon) return;
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await couponService.getCouponUsages(token, coupon.id, newSkip, take);
            const data = res?.data;
            if (data) {
                if (newSkip === 0) {
                    setUsages(data.items);
                } else {
                    setUsages((prev) => [...prev, ...data.items]);
                }
                setTotal(data.total);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const newSkip = skip + take;
        setSkip(newSkip);
        loadUsages(newSkip);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[80dvh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-5 pb-3 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-violet-500" />
                        User đã sử dụng mã
                        {coupon && (
                            <code className="ml-1 text-sm bg-violet-50 text-violet-700 px-2 py-0.5 rounded-lg font-mono">
                                {coupon.code}
                            </code>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Tổng cộng <strong>{total}</strong> lượt sử dụng
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading && usages.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                        </div>
                    ) : usages.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <UsersIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                            <p className="font-medium">Chưa có ai sử dụng mã này</p>
                        </div>
                    ) : (
                        <>
                            {usages.map((usage) => (
                                <div key={usage.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <Avatar className="w-9 h-9 shrink-0">
                                        <AvatarImage src={usage.user.avatar_url} alt={usage.user.name} />
                                        <AvatarFallback className="text-xs bg-violet-100 text-violet-700">
                                            {usage.user.name?.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm truncate">{usage.user.name}</span>
                                            <span className="text-xs text-muted-foreground truncate">{usage.user.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-xs text-muted-foreground">{usage.organization.name}</span>
                                            <span className="text-xs text-muted-foreground">·</span>
                                            <code className="text-xs text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">{usage.contract_code}</code>
                                            <span className="text-xs text-muted-foreground">· {formatDate(usage.used_at)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold text-green-600">
                                            -{formatCurrency(usage.discount_amount)}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {usages.length < total && (
                                <div className="pt-2 flex justify-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleLoadMore}
                                        disabled={loading}
                                        className="rounded-xl"
                                    >
                                        {loading ? 'Đang tải...' : `Xem thêm (còn ${total - usages.length})`}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 border-t shrink-0 flex justify-end">
                    <Button variant="outline" onClick={onClose} className="rounded-xl">Đóng</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
