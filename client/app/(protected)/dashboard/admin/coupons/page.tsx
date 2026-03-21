"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { CouponService } from "@/services/coupons/coupon.service";
import { useToast } from "@/contexts/ToastContext";
import { Coupon, CouponRequest } from "@/types/coupons/coupon.type";

// Components
import { CouponHeader } from "@/components/dashboard/admin/coupons/CouponHeader";
import { CouponTable } from "@/components/dashboard/admin/coupons/CouponTable";
import { CouponFormDialogs, CouponActionDialogs } from "@/components/dashboard/admin/coupons/CouponDialogs";
import { CouponFloatingActionBar } from "@/components/dashboard/admin/coupons/CouponFloatingActionBar";

type CouponStatus = 'active' | 'scheduled' | 'expired' | 'depleted' | 'inactive';
type CouponFilterStatus = 'all' | CouponStatus;

const couponService = new CouponService();

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<CouponFilterStatus>("all");
    const [typeFilter, setTypeFilter] = useState<"all" | "PUBLIC" | "PRIVATE">("all");
    const [discountFilter, setDiscountFilter] = useState<"all" | "PERCENT" | "AMOUNT" | "FREE_MONTHS">("all");
    const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
    const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [selectedCouponIds, setSelectedCouponIds] = useState<string[]>([]);

    // Bulk action states
    const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    const [bulkActionSuccess, setBulkActionSuccess] = useState(false);

    const { showToast } = useToast();
    const [error, setError] = useState<string | null>(null);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const response = await couponService.getAllCoupons(token);
            if (response?.data?.items && Array.isArray(response.data.items)) {
                setCoupons(response.data.items);
            }
        } catch (error: any) {
            console.error("Failed to fetch coupons", error);
            setError(error.message || "Failed to fetch coupons");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const getCouponComputedStatus = (coupon: Coupon): CouponStatus => {
        const now = new Date();
        const startDate = new Date(coupon.starts_at);
        const endDate = coupon.is_permanent ? null : new Date(coupon.ends_at);

        if (coupon.max_usage > 0 && coupon.current_usage >= coupon.max_usage) return 'depleted';
        if (!coupon.is_active) return 'inactive';
        if (startDate > now) return 'scheduled';
        if (endDate && endDate < now) return 'expired';
        return 'active';
    };

    const filteredCoupons = coupons.filter((coupon) => {
        const matchesSearch =
            coupon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            coupon.code.toLowerCase().includes(searchTerm.toLowerCase());
        const computedStatus = getCouponComputedStatus(coupon);
        const matchesStatus = statusFilter === "all" || computedStatus === statusFilter;
        const matchesType = typeFilter === "all" || coupon.coupon_type === typeFilter;
        const matchesDiscount = discountFilter === "all" || coupon.discount_type === discountFilter;

        let matchesDateRange = true;
        if (startDateFilter || endDateFilter) {
            const couponStart = new Date(coupon.starts_at);
            const couponEnd = coupon.is_permanent ? new Date('2099-12-31') : new Date(coupon.ends_at);
            if (startDateFilter && endDateFilter) {
                matchesDateRange = couponStart <= endDateFilter && couponEnd >= startDateFilter;
            } else if (startDateFilter) {
                matchesDateRange = couponEnd >= startDateFilter;
            } else if (endDateFilter) {
                matchesDateRange = couponStart <= endDateFilter;
            }
        }
        return matchesSearch && matchesStatus && matchesType && matchesDiscount && matchesDateRange;
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
    const paginatedCoupons = filteredCoupons.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, typeFilter, discountFilter, startDateFilter, endDateFilter]);

    const hasActiveFilters = Boolean(statusFilter !== "all" || typeFilter !== "all" || discountFilter !== "all" || startDateFilter || endDateFilter);

    const clearAllFilters = () => {
        setStatusFilter("all");
        setTypeFilter("all");
        setDiscountFilter("all");
        setStartDateFilter(undefined);
        setEndDateFilter(undefined);
    };

    const getStatusLabel = (status: CouponFilterStatus): string => {
        switch (status) {
            case 'active': return 'Đang hoạt động';
            case 'scheduled': return 'Chờ chạy';
            case 'expired': return 'Hết hạn';
            case 'depleted': return 'Hết lượt';
            case 'inactive': return 'Đã tắt';
            default: return 'Tất cả';
        }
    };

    const getTypeLabel = (type: string): string => {
        switch (type) {
            case 'PUBLIC': return 'Công khai';
            case 'PRIVATE': return 'Riêng tư';
            default: return 'Tất cả';
        }
    };

    const getDiscountLabel = (discount: string): string => {
        switch (discount) {
            case 'PERCENT': return 'Theo %';
            case 'AMOUNT': return 'Số tiền';
            case 'FREE_MONTHS': return 'Tặng tháng';
            default: return 'Tất cả';
        }
    };

    const formatDateRange = (): string => {
        if (startDateFilter && endDateFilter) return `${startDateFilter.toLocaleDateString('vi-VN')} - ${endDateFilter.toLocaleDateString('vi-VN')}`;
        else if (startDateFilter) return `Từ ${startDateFilter.toLocaleDateString('vi-VN')}`;
        else if (endDateFilter) return `Đến ${endDateFilter.toLocaleDateString('vi-VN')}`;
        return '';
    };

    const handleCreateSuccess = () => {
        setIsCreateDialogOpen(false);
        fetchCoupons();
    };

    const handleEditSuccess = () => {
        setIsEditDialogOpen(false);
        setSelectedCoupon(null);
        fetchCoupons();
    };

    const handleDelete = async () => {
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedCoupon) return;
            await couponService.deleteCoupon(token, selectedCoupon.id);
            showToast(`Đã xóa mã giảm giá "${selectedCoupon.name}" 🗑️`, "success");
            setIsDeleteDialogOpen(false);
            setSelectedCoupon(null);
            fetchCoupons();
        } catch (error: any) {
            showToast(error.message || "Xóa thất bại, vui lòng thử lại", "error");
        } finally {
            setIsDeleteLoading(false);
        }
    };

    const toggleSelectCoupon = (couponId: string) => {
        setSelectedCouponIds(prev => prev.includes(couponId) ? prev.filter(id => id !== couponId) : [...prev, couponId]);
    };

    const toggleSelectAll = () => {
        if (selectedCouponIds.length === filteredCoupons.length) {
            setSelectedCouponIds([]);
        } else {
            setSelectedCouponIds(filteredCoupons.map(c => c.id));
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        setBulkActionSuccess(false);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await Promise.all(selectedCouponIds.map(id => couponService.deleteCoupon(token, id)));
            setBulkActionSuccess(true);
            setTimeout(() => {
                setIsBulkActionDialogOpen(false);
                setBulkActionType(null);
                setBulkActionSuccess(false);
                setSelectedCouponIds([]);
                showToast(`Đã xóa ${selectedCouponIds.length} mã giảm giá thành công! 🗑️`, 'success');
                fetchCoupons();
            }, 800);
        } catch (error: any) {
            showToast(error.message || 'Không thể xóa mã giảm giá', 'error');
            setIsBulkActionDialogOpen(false);
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const updateCouponsStatus = async (isActive: boolean, successMessage: string, errorMessage: string) => {
        setIsBulkActionLoading(true);
        setBulkActionSuccess(false);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const selectedCoupons = coupons.filter(c => selectedCouponIds.includes(c.id));
            await Promise.all(selectedCoupons.map(coupon => {
                const couponRequest: CouponRequest = {
                    ...coupon,
                    is_active: isActive,
                    target_warehouse_ids: [],
                    target_row_ids: [],
                    target_addon_ids: [],
                    target_insurance_ids: [],
                    gift_addon_ids: [],
                    gift_insurance_ids: [],
                };
                return couponService.updateCoupon(token, coupon.id, couponRequest);
            }));
            setBulkActionSuccess(true);
            setTimeout(() => {
                setIsBulkActionDialogOpen(false);
                setBulkActionType(null);
                setBulkActionSuccess(false);
                setSelectedCouponIds([]);
                showToast(successMessage, 'success');
                fetchCoupons();
            }, 800);
        } catch (error: any) {
            showToast(error.message || errorMessage, 'error');
            setIsBulkActionDialogOpen(false);
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const openBulkActionDialog = (action: 'activate' | 'deactivate' | 'delete') => {
        setBulkActionType(action);
        setIsBulkActionDialogOpen(true);
    };

    const executeBulkAction = () => {
        switch (bulkActionType) {
            case 'activate': updateCouponsStatus(true, `Đã bật ${selectedCouponIds.length} mã giảm giá`, 'Không thể bật mã giảm giá'); break;
            case 'deactivate': updateCouponsStatus(false, `Đã tắt ${selectedCouponIds.length} mã giảm giá`, 'Không thể tắt mã giảm giá'); break;
            case 'delete': handleBulkDelete(); break;
        }
    };

    const getBulkActionTitle = () => {
        switch (bulkActionType) {
            case 'activate': return 'Bật mã giảm giá';
            case 'deactivate': return 'Tắt mã giảm giá';
            case 'delete': return 'Xóa mã giảm giá';
            default: return '';
        }
    };

    const getBulkActionDescription = () => {
        const count = selectedCouponIds.length;
        switch (bulkActionType) {
            case 'activate': return `Bạn có chắc chắn muốn bật ${count} mã giảm giá?`;
            case 'deactivate': return `Bạn có chắc chắn muốn tắt ${count} mã giảm giá?`;
            case 'delete': return `Bạn có chắc chắn muốn xóa ${count} mã giảm giá? Hành động này không thể hoàn tác.`;
            default: return '';
        }
    };

    const openEditDialog = (coupon: Coupon) => {
        setSelectedCoupon(coupon);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (coupon: Coupon) => {
        setSelectedCoupon(coupon);
        setIsDeleteDialogOpen(true);
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    const formatDate = (dateString: string) => { try { return new Date(dateString).toLocaleDateString('vi-VN'); } catch { return dateString; } };

    return (
        <div className="space-y-6">
            <CouponHeader
                error={error}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                discountFilter={discountFilter}
                setDiscountFilter={setDiscountFilter}
                startDateFilter={startDateFilter}
                setStartDateFilter={setStartDateFilter}
                endDateFilter={endDateFilter}
                setEndDateFilter={setEndDateFilter}
                clearAllFilters={clearAllFilters}
                hasActiveFilters={hasActiveFilters}
                setIsCreateDialogOpen={setIsCreateDialogOpen}
                formatDateRange={formatDateRange}
                getStatusLabel={getStatusLabel}
                getTypeLabel={getTypeLabel}
                getDiscountLabel={getDiscountLabel}
            />

            <CouponTable
                loading={loading}
                filteredCoupons={filteredCoupons}
                paginatedCoupons={paginatedCoupons}
                searchTerm={searchTerm}
                hasActiveFilters={hasActiveFilters}
                setIsCreateDialogOpen={setIsCreateDialogOpen}
                selectedCouponIds={selectedCouponIds}
                toggleSelectAll={toggleSelectAll}
                toggleSelectCoupon={toggleSelectCoupon}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getCouponComputedStatus={getCouponComputedStatus}
                openEditDialog={openEditDialog}
                openDeleteDialog={openDeleteDialog}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalPages={totalPages}
            />

            <CouponFormDialogs
                isCreateDialogOpen={isCreateDialogOpen}
                setIsCreateDialogOpen={setIsCreateDialogOpen}
                handleCreateSuccess={handleCreateSuccess}
                isEditDialogOpen={isEditDialogOpen}
                setIsEditDialogOpen={setIsEditDialogOpen}
                selectedCoupon={selectedCoupon}
                handleEditSuccess={handleEditSuccess}
            />

            <CouponActionDialogs
                isDeleteDialogOpen={isDeleteDialogOpen}
                setIsDeleteDialogOpen={setIsDeleteDialogOpen}
                selectedCoupon={selectedCoupon}
                handleDelete={handleDelete}
                isDeleteLoading={isDeleteLoading}
                isBulkActionDialogOpen={isBulkActionDialogOpen}
                setIsBulkActionDialogOpen={setIsBulkActionDialogOpen}
                isBulkActionLoading={isBulkActionLoading}
                bulkActionSuccess={bulkActionSuccess}
                setBulkActionType={setBulkActionType}
                setBulkActionSuccess={setBulkActionSuccess}
                getBulkActionTitle={getBulkActionTitle}
                getBulkActionDescription={getBulkActionDescription}
                executeBulkAction={executeBulkAction}
                bulkActionType={bulkActionType}
            />

            <CouponFloatingActionBar
                selectedCouponIds={selectedCouponIds}
                setSelectedCouponIds={setSelectedCouponIds}
                openBulkActionDialog={openBulkActionDialog}
            />
        </div>
    );
}
