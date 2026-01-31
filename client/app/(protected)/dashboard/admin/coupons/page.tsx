"use client";

import { useState, useEffect, useMemo } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { CouponService } from "@/services/coupons/coupon.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/contexts/ToastContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    CalendarIcon,
    XMarkIcon,
    ClockIcon,
    CurrencyDollarIcon,
    PercentBadgeIcon,
    GiftIcon,
    ChevronDownIcon,
    ArchiveBoxArrowDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Coupon, CouponRequest } from "@/types/coupons/coupon.type";
import { CouponForm } from "./coupon-form";

// Status types for computed status
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
            console.log('Token:', token ? 'exists' : 'missing');
            if (!token) {
                console.log('No token - returning early');
                return;
            }

            const response = await couponService.getAllCoupons(token);
            console.log('API Response:', response);
            if (response?.data?.items && Array.isArray(response.data.items)) {
                setCoupons(response.data.items);
                console.log('Coupons set:', response.data.items.length);
            } else {
                console.log('Response structure unexpected:', response);
            }
        } catch (error: any) {
            console.error("Failed to fetch coupons", error);
            setError(error.message || "Failed to fetch coupons");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log('useEffect triggered - fetching coupons...');
        fetchCoupons();
    }, []);

    // Helper function to compute coupon status
    const getCouponComputedStatus = (coupon: Coupon): CouponStatus => {
        const now = new Date();
        const startDate = new Date(coupon.starts_at);
        const endDate = coupon.is_permanent ? null : new Date(coupon.ends_at);

        // Check if depleted (usage exhausted)
        if (coupon.max_usage > 0 && coupon.current_usage >= coupon.max_usage) {
            return 'depleted';
        }

        // Check if not active (manually disabled)
        if (!coupon.is_active) {
            return 'inactive';
        }

        // Check if scheduled (starts in future)
        if (startDate > now) {
            return 'scheduled';
        }

        // Check if expired
        if (endDate && endDate < now) {
            return 'expired';
        }

        // Active
        return 'active';
    };

    const filteredCoupons = coupons.filter((coupon) => {
        // Search filter
        const matchesSearch =
            coupon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            coupon.code.toLowerCase().includes(searchTerm.toLowerCase());

        // Status filter (computed)
        const computedStatus = getCouponComputedStatus(coupon);
        const matchesStatus = statusFilter === "all" || computedStatus === statusFilter;

        // Type filter
        const matchesType = typeFilter === "all" || coupon.coupon_type === typeFilter;

        // Discount type filter
        const matchesDiscount = discountFilter === "all" || coupon.discount_type === discountFilter;

        // Date range filtering
        let matchesDateRange = true;
        if (startDateFilter || endDateFilter) {
            const couponStart = new Date(coupon.starts_at);
            const couponEnd = coupon.is_permanent ? new Date('2099-12-31') : new Date(coupon.ends_at);

            if (startDateFilter && endDateFilter) {
                // Check if coupon period overlaps with filter range
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

    // Helper to check if any filters are active
    const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || discountFilter !== "all" || startDateFilter || endDateFilter;

    const clearAllFilters = () => {
        setStatusFilter("all");
        setTypeFilter("all");
        setDiscountFilter("all");
        setStartDateFilter(undefined);
        setEndDateFilter(undefined);
    };

    // Status label mapping
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

    // Type label mapping  
    const getTypeLabel = (type: string): string => {
        switch (type) {
            case 'PUBLIC': return 'Công khai';
            case 'PRIVATE': return 'Riêng tư';
            default: return 'Tất cả';
        }
    };

    // Discount label mapping
    const getDiscountLabel = (discount: string): string => {
        switch (discount) {
            case 'PERCENT': return 'Theo %';
            case 'AMOUNT': return 'Số tiền';
            case 'FREE_MONTHS': return 'Tặng tháng';
            default: return 'Tất cả';
        }
    };

    const formatDateRange = (): string => {
        if (startDateFilter && endDateFilter) {
            return `${startDateFilter.toLocaleDateString('vi-VN')} - ${endDateFilter.toLocaleDateString('vi-VN')}`;
        } else if (startDateFilter) {
            return `Từ ${startDateFilter.toLocaleDateString('vi-VN')}`;
        } else if (endDateFilter) {
            return `Đến ${endDateFilter.toLocaleDateString('vi-VN')}`;
        }
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
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedCoupon) return;

            await couponService.deleteCoupon(token, selectedCoupon.id);
            setIsDeleteDialogOpen(false);
            setSelectedCoupon(null);
            fetchCoupons();
        } catch (error) {
            console.error("Failed to delete coupon", error);
        }
    };

    // Bulk Actions
    const toggleSelectCoupon = (couponId: string) => {
        setSelectedCouponIds(prev =>
            prev.includes(couponId)
                ? prev.filter(id => id !== couponId)
                : [...prev, couponId]
        );
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

            await Promise.all(
                selectedCouponIds.map(id => couponService.deleteCoupon(token, id))
            );

            setBulkActionSuccess(true);
            setTimeout(() => {
                setIsBulkActionDialogOpen(false);
                setBulkActionType(null);
                setBulkActionSuccess(false);
                setSelectedCouponIds([]);
                showToast(`Đã xóa ${selectedCouponIds.length} mã giảm giá`, 'success');
                fetchCoupons();
            }, 800);
        } catch (error) {
            console.error("Failed to bulk delete coupons", error);
            showToast('Không thể xóa mã giảm giá', 'error');
            setIsBulkActionDialogOpen(false);
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleBulkActivate = async () => {
        setIsBulkActionLoading(true);
        setBulkActionSuccess(false);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const selectedCoupons = coupons.filter(c => selectedCouponIds.includes(c.id));

            await Promise.all(
                selectedCoupons.map(coupon => {
                    const couponRequest: CouponRequest = {
                        name: coupon.name,
                        description: coupon.description,
                        code: coupon.code,
                        coupon_type: coupon.coupon_type,
                        discount_type: coupon.discount_type,
                        discount_value: coupon.discount_value,
                        require_min_warehouses: coupon.require_min_warehouses,
                        min_warehouses: coupon.min_warehouses,
                        require_min_rows: coupon.require_min_rows,
                        min_rows: coupon.min_rows,
                        require_min_order_amount: coupon.require_min_order_amount,
                        min_order_amount: coupon.min_order_amount,
                        require_min_rental_duration: coupon.require_min_rental_duration,
                        min_rental_duration_value: coupon.min_rental_duration_value,
                        min_rental_duration_unit: coupon.min_rental_duration_unit,
                        is_unlimited_discount: coupon.is_unlimited_discount,
                        max_discount_amount: coupon.max_discount_amount,
                        is_permanent: coupon.is_permanent,
                        starts_at: coupon.starts_at,
                        ends_at: coupon.ends_at,
                        max_usage: coupon.max_usage,
                        is_public: coupon.is_public,
                        apply_for_first_rental: coupon.apply_for_first_rental,
                        apply_for_renewal: coupon.apply_for_renewal,
                        apply_for_all_warehouses: coupon.apply_for_all_warehouses,
                        apply_for_all_rows: coupon.apply_for_all_rows,
                        apply_for_all_addons: coupon.apply_for_all_addons,
                        apply_for_all_insurances: coupon.apply_for_all_insurances,
                        target_warehouse_ids: [],
                        target_row_ids: [],
                        target_addon_ids: [],
                        target_insurance_ids: [],
                        is_active: true,
                        is_unlimited_stack: coupon.is_unlimited_stack,
                        max_stack_count: coupon.max_stack_count,
                        has_gift_addons: coupon.has_gift_addons,
                        gift_addon_ids: [],
                        has_gift_insurances: coupon.has_gift_insurances,
                        gift_insurance_ids: [],
                        target_user_ids: coupon.target_user_ids
                    };
                    return couponService.updateCoupon(token, coupon.id, couponRequest);
                })
            );

            setBulkActionSuccess(true);
            setTimeout(() => {
                setIsBulkActionDialogOpen(false);
                setBulkActionType(null);
                setBulkActionSuccess(false);
                setSelectedCouponIds([]);
                showToast(`Đã bật ${selectedCouponIds.length} mã giảm giá`, 'success');
                fetchCoupons();
            }, 800);
        } catch (error) {
            console.error("Failed to bulk activate coupons", error);
            showToast('Không thể bật mã giảm giá', 'error');
            setIsBulkActionDialogOpen(false);
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleBulkDeactivate = async () => {
        setIsBulkActionLoading(true);
        setBulkActionSuccess(false);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const selectedCoupons = coupons.filter(c => selectedCouponIds.includes(c.id));

            await Promise.all(
                selectedCoupons.map(coupon => {
                    const couponRequest: CouponRequest = {
                        name: coupon.name,
                        description: coupon.description,
                        code: coupon.code,
                        coupon_type: coupon.coupon_type,
                        discount_type: coupon.discount_type,
                        discount_value: coupon.discount_value,
                        require_min_warehouses: coupon.require_min_warehouses,
                        min_warehouses: coupon.min_warehouses,
                        require_min_rows: coupon.require_min_rows,
                        min_rows: coupon.min_rows,
                        require_min_order_amount: coupon.require_min_order_amount,
                        min_order_amount: coupon.min_order_amount,
                        require_min_rental_duration: coupon.require_min_rental_duration,
                        min_rental_duration_value: coupon.min_rental_duration_value,
                        min_rental_duration_unit: coupon.min_rental_duration_unit,
                        is_unlimited_discount: coupon.is_unlimited_discount,
                        max_discount_amount: coupon.max_discount_amount,
                        is_permanent: coupon.is_permanent,
                        starts_at: coupon.starts_at,
                        ends_at: coupon.ends_at,
                        max_usage: coupon.max_usage,
                        is_public: coupon.is_public,
                        apply_for_first_rental: coupon.apply_for_first_rental,
                        apply_for_renewal: coupon.apply_for_renewal,
                        apply_for_all_warehouses: coupon.apply_for_all_warehouses,
                        apply_for_all_rows: coupon.apply_for_all_rows,
                        apply_for_all_addons: coupon.apply_for_all_addons,
                        apply_for_all_insurances: coupon.apply_for_all_insurances,
                        target_warehouse_ids: [],
                        target_row_ids: [],
                        target_addon_ids: [],
                        target_insurance_ids: [],
                        is_active: false,
                        is_unlimited_stack: coupon.is_unlimited_stack,
                        max_stack_count: coupon.max_stack_count,
                        has_gift_addons: coupon.has_gift_addons,
                        gift_addon_ids: [],
                        has_gift_insurances: coupon.has_gift_insurances,
                        gift_insurance_ids: [],
                        target_user_ids: coupon.target_user_ids
                    };
                    return couponService.updateCoupon(token, coupon.id, couponRequest);
                })
            );

            setBulkActionSuccess(true);
            setTimeout(() => {
                setIsBulkActionDialogOpen(false);
                setBulkActionType(null);
                setBulkActionSuccess(false);
                setSelectedCouponIds([]);
                showToast(`Đã tắt ${selectedCouponIds.length} mã giảm giá`, 'success');
                fetchCoupons();
            }, 800);
        } catch (error) {
            console.error("Failed to bulk deactivate coupons", error);
            showToast('Không thể tắt mã giảm giá', 'error');
            setIsBulkActionDialogOpen(false);
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Open bulk action confirmation dialog
    const openBulkActionDialog = (action: 'activate' | 'deactivate' | 'delete') => {
        setBulkActionType(action);
        setIsBulkActionDialogOpen(true);
    };

    // Execute the selected bulk action
    const executeBulkAction = () => {
        switch (bulkActionType) {
            case 'activate':
                handleBulkActivate();
                break;
            case 'deactivate':
                handleBulkDeactivate();
                break;
            case 'delete':
                handleBulkDelete();
                break;
        }
    };

    // Get bulk action dialog title
    const getBulkActionTitle = () => {
        switch (bulkActionType) {
            case 'activate': return 'Bật mã giảm giá';
            case 'deactivate': return 'Tắt mã giảm giá';
            case 'delete': return 'Xóa mã giảm giá';
            default: return '';
        }
    };

    // Get bulk action dialog description
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('vi-VN');
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontSize: "32px", lineHeight: "130%" }}>
                        Mã giảm giá
                    </h1>
                </div>
                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="gap-2"
                    style={{ borderRadius: "12px" }}
                >
                    <PlusIcon className="w-4 h-4" />
                    Tạo mã giảm giá
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Old toolbar removed - now using floating bottom action bar */}

            {/* Filters */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                        {/* Row 1: Search + Quick Facets + Date Range */}
                        <div className="flex flex-wrap items-center gap-4">
                            {/* A. Search Area (300-400px) */}
                            <div className="relative" style={{ width: '360px', minWidth: '300px', maxWidth: '400px' }}>
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm theo mã (CODE), tên chương trình..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ borderRadius: "12px" }}
                                />
                            </div>

                            {/* Divider */}
                            <div className="h-8 w-px bg-border hidden sm:block" />

                            {/* B. Quick Facets */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Status Filter */}
                                <Select
                                    value={statusFilter}
                                    onValueChange={(value: CouponFilterStatus) => setStatusFilter(value)}
                                >
                                    <SelectTrigger
                                        className="w-fit gap-2"
                                        style={{ borderRadius: "12px" }}
                                    >
                                        <ClockIcon className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="Trạng thái" />
                                    </SelectTrigger>
                                    <SelectContent style={{ borderRadius: "12px" }}>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="active">
                                            <span className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                                Đang hoạt động
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="scheduled">
                                            <span className="flex items-center gap-2">
                                                <ClockIcon className="w-4 h-4 text-blue-500" />
                                                Chờ chạy
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="expired">
                                            <span className="flex items-center gap-2">
                                                <XCircleIcon className="w-4 h-4 text-orange-500" />
                                                Hết hạn
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="depleted">
                                            <span className="flex items-center gap-2">
                                                <XCircleIcon className="w-4 h-4 text-red-500" />
                                                Hết lượt
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            <span className="flex items-center gap-2">
                                                <XCircleIcon className="w-4 h-4 text-gray-400" />
                                                Đã tắt
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Type Filter */}
                                <Select
                                    value={typeFilter}
                                    onValueChange={(value: "all" | "PUBLIC" | "PRIVATE") => setTypeFilter(value)}
                                >
                                    <SelectTrigger
                                        className="w-fit gap-2"
                                        style={{ borderRadius: "12px" }}
                                    >
                                        <SelectValue placeholder="Loại mã" />
                                    </SelectTrigger>
                                    <SelectContent style={{ borderRadius: "12px" }}>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="PUBLIC">Công khai</SelectItem>
                                        <SelectItem value="PRIVATE">Riêng tư</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Discount Type Filter */}
                                <Select
                                    value={discountFilter}
                                    onValueChange={(value: "all" | "PERCENT" | "AMOUNT" | "FREE_MONTHS") => setDiscountFilter(value)}
                                >
                                    <SelectTrigger
                                        className="w-fit gap-2"
                                        style={{ borderRadius: "12px" }}
                                    >
                                        <PercentBadgeIcon className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="Loại giảm giá" />
                                    </SelectTrigger>
                                    <SelectContent style={{ borderRadius: "12px" }}>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="PERCENT">
                                            <span className="flex items-center gap-2">
                                                <PercentBadgeIcon className="w-4 h-4" />
                                                Theo %
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="AMOUNT">
                                            <span className="flex items-center gap-2">
                                                <CurrencyDollarIcon className="w-4 h-4" />
                                                Số tiền
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="FREE_MONTHS">
                                            <span className="flex items-center gap-2">
                                                <GiftIcon className="w-4 h-4" />
                                                Tặng tháng
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Divider */}
                            <div className="h-8 w-px bg-border hidden sm:block" />

                            {/* C. Date Range Picker */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="gap-2 min-w-[200px] justify-start font-normal"
                                        style={{ borderRadius: "12px" }}
                                    >
                                        <CalendarIcon className="w-4 h-4" />
                                        {startDateFilter || endDateFilter ? (
                                            <span>{formatDateRange()}</span>
                                        ) : (
                                            <span className="text-muted-foreground">Chọn khoảng thời gian</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-4"
                                    align="end"
                                    side="bottom"
                                    style={{ borderRadius: "16px" }}
                                >
                                    <div className="flex flex-col gap-4">
                                        {/* Date inputs row */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-muted-foreground">Từ ngày</label>
                                                <div className="px-3 py-2 border rounded-lg text-sm min-w-[120px]" style={{ borderRadius: "8px" }}>
                                                    {startDateFilter ? startDateFilter.toLocaleDateString('vi-VN') : '-- / -- / ----'}
                                                </div>
                                            </div>
                                            <span className="text-muted-foreground">→</span>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-muted-foreground">Đến ngày</label>
                                                <div className="px-3 py-2 border rounded-lg text-sm min-w-[120px]" style={{ borderRadius: "8px" }}>
                                                    {endDateFilter ? endDateFilter.toLocaleDateString('vi-VN') : '-- / -- / ----'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Single calendar */}
                                        <Calendar
                                            mode="range"
                                            selected={{ from: startDateFilter, to: endDateFilter }}
                                            onSelect={(range) => {
                                                setStartDateFilter(range?.from);
                                                setEndDateFilter(range?.to);
                                            }}
                                            numberOfMonths={1}
                                        />

                                        {(startDateFilter || endDateFilter) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setStartDateFilter(undefined);
                                                    setEndDateFilter(undefined);
                                                }}
                                                className="self-end text-muted-foreground"
                                            >
                                                <XMarkIcon className="w-4 h-4 mr-1" />
                                                Xóa ngày
                                            </Button>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Row 2: Active Filter Badges */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                                <span className="text-sm text-muted-foreground mr-2">Đang lọc:</span>

                                {statusFilter !== "all" && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1.5 px-3 py-1 cursor-pointer hover:bg-secondary/80"
                                        style={{ borderRadius: "12px" }}
                                    >
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        {getStatusLabel(statusFilter)}
                                        <button
                                            onClick={() => setStatusFilter("all")}
                                            className="ml-1 hover:text-destructive transition-colors"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                )}

                                {typeFilter !== "all" && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1.5 px-3 py-1 cursor-pointer hover:bg-secondary/80"
                                        style={{ borderRadius: "12px" }}
                                    >
                                        {getTypeLabel(typeFilter)}
                                        <button
                                            onClick={() => setTypeFilter("all")}
                                            className="ml-1 hover:text-destructive transition-colors"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                )}

                                {discountFilter !== "all" && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1.5 px-3 py-1 cursor-pointer hover:bg-secondary/80"
                                        style={{ borderRadius: "12px" }}
                                    >
                                        <PercentBadgeIcon className="w-3.5 h-3.5" />
                                        {getDiscountLabel(discountFilter)}
                                        <button
                                            onClick={() => setDiscountFilter("all")}
                                            className="ml-1 hover:text-destructive transition-colors"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                )}

                                {(startDateFilter || endDateFilter) && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1.5 px-3 py-1 cursor-pointer hover:bg-secondary/80"
                                        style={{ borderRadius: "12px" }}
                                    >
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        {formatDateRange()}
                                        <button
                                            onClick={() => {
                                                setStartDateFilter(undefined);
                                                setEndDateFilter(undefined);
                                            }}
                                            className="ml-1 hover:text-destructive transition-colors"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                )}

                                {/* Clear All Button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAllFilters}
                                    className="text-muted-foreground hover:text-destructive ml-auto"
                                >
                                    <XMarkIcon className="w-4 h-4 mr-1" />
                                    Xóa tất cả
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                    ) : filteredCoupons.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Không tìm thấy mã giảm giá nào
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-border">
                                        <tr>
                                            <th className="text-left py-3 px-4 w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredCoupons.length > 0 && selectedCouponIds.length === filteredCoupons.length}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E] cursor-pointer"
                                                />
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                                Mã
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                                Giảm giá
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                                Lượt dùng
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                                Ngày bắt đầu
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                                Ngày hết hạn
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                                Trạng thái
                                            </th>
                                            <th className="text-right py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                                Thao tác
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {paginatedCoupons.map((coupon) => (
                                            <tr key={coupon.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCouponIds.includes(coupon.id)}
                                                        onChange={() => toggleSelectCoupon(coupon.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E] cursor-pointer"
                                                    />
                                                </td>
                                                <td className="py-3 px-4" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{coupon.name}</span>
                                                        <code className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded w-fit mt-1">
                                                            {coupon.code}
                                                        </code>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-medium" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                    {coupon.discount_type === 'PERCENT' ? (
                                                        <span>{coupon.discount_value}%</span>
                                                    ) : (
                                                        <span>{formatCurrency(coupon.discount_value)}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                    {coupon.current_usage} / {coupon.max_usage > 0 ? coupon.max_usage : '∞'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">
                                                    <div>{formatDate(coupon.starts_at)}</div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">
                                                    {coupon.is_permanent ? (
                                                        <span className="text-xs italic">Vô thời hạn</span>
                                                    ) : (
                                                        <div>{formatDate(coupon.ends_at)}</div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {(() => {
                                                        const status = getCouponComputedStatus(coupon);
                                                        const statusConfig = {
                                                            active: {
                                                                variant: "default" as const,
                                                                icon: <CheckCircleIcon className="w-3 h-3" />,
                                                                label: "Đang hoạt động",
                                                                className: "bg-green-500/10 text-green-600 border-green-500/20"
                                                            },
                                                            scheduled: {
                                                                variant: "secondary" as const,
                                                                icon: <ClockIcon className="w-3 h-3" />,
                                                                label: "Chờ chạy",
                                                                className: "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                            },
                                                            expired: {
                                                                variant: "secondary" as const,
                                                                icon: <XCircleIcon className="w-3 h-3" />,
                                                                label: "Hết hạn",
                                                                className: "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                                            },
                                                            depleted: {
                                                                variant: "secondary" as const,
                                                                icon: <XCircleIcon className="w-3 h-3" />,
                                                                label: "Hết lượt",
                                                                className: "bg-red-500/10 text-red-600 border-red-500/20"
                                                            },
                                                            inactive: {
                                                                variant: "secondary" as const,
                                                                icon: <XCircleIcon className="w-3 h-3" />,
                                                                label: "Đã tắt",
                                                                className: "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                                            },
                                                        };
                                                        const config = statusConfig[status] || statusConfig.inactive;
                                                        return (
                                                            <Badge
                                                                variant={config.variant}
                                                                className={`gap-1 border ${config.className}`}
                                                                style={{ borderRadius: "12px" }}
                                                            >
                                                                {config.icon}
                                                                {config.label}
                                                            </Badge>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditDialog(coupon)}
                                                            style={{ borderRadius: "12px" }}
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog(coupon)}
                                                            className="text-destructive"
                                                            style={{ borderRadius: "12px" }}
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredCoupons.length > 0 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                                    <div className="text-sm text-muted-foreground">
                                        Hiển thị {(currentPage - 1) * itemsPerPage + 1}-
                                        {Math.min(currentPage * itemsPerPage, filteredCoupons.length)} trên tổng {filteredCoupons.length}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            style={{ borderRadius: "8px" }}
                                        >
                                            <ChevronLeftIcon className="w-4 h-4" />
                                        </Button>
                                        <div className="text-sm font-medium px-2">
                                            Trang {currentPage} / {totalPages}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            style={{ borderRadius: "8px" }}
                                        >
                                            <ChevronRightIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="w-[95vw] max-w-7xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden" style={{ borderRadius: "16px" }}>
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

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="w-[95vw] max-w-7xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden" style={{ borderRadius: "16px" }}>
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa mã giảm giá "{selectedCoupon?.name}" không? Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} style={{ borderRadius: "12px" }}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} style={{ borderRadius: "12px" }}>
                            Xóa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Action Confirmation Dialog */}
            <Dialog open={isBulkActionDialogOpen} onOpenChange={(open) => {
                if (!isBulkActionLoading) {
                    setIsBulkActionDialogOpen(open);
                    if (!open) {
                        setBulkActionType(null);
                        setBulkActionSuccess(false);
                    }
                }
            }}>
                <DialogContent style={{ borderRadius: "16px" }} className="max-w-md">
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
                                    style={{ borderRadius: "12px" }}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    variant={bulkActionType === 'delete' ? 'destructive' : 'default'}
                                    onClick={executeBulkAction}
                                    style={{ borderRadius: "12px" }}
                                    className={bulkActionType !== 'delete' ? 'bg-[#0F766E] hover:bg-[#0F766E]/90' : ''}
                                >
                                    Xác nhận
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Floating Bottom Action Bar */}
            {selectedCouponIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <div
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4"
                        style={{ borderRadius: "24px" }}
                    >
                        <span className="text-muted-foreground font-rem" style={{ fontSize: "13px" }}>
                            {selectedCouponIds.length} đã chọn
                        </span>


                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    style={{ borderRadius: "12px " }}
                                >
                                    Hành động
                                    <ChevronDownIcon className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" style={{ borderRadius: "12px" }} className="w-48">
                                <DropdownMenuItem
                                    onClick={() => openBulkActionDialog('activate')}
                                    className="cursor-pointer"
                                >
                                    <span className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-4 h-4 text-green-600 shrink-0" />
                                        <span>Bật mã giảm giá</span>
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => openBulkActionDialog('deactivate')}
                                    className="cursor-pointer"
                                >
                                    <span className="flex items-center gap-2">
                                        <XCircleIcon className="w-4 h-4 text-gray-500 shrink-0" />
                                        <span>Tắt mã giảm giá</span>
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => openBulkActionDialog('delete')}
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                    <span className="flex items-center gap-2">
                                        <TrashIcon className="w-4 h-4 shrink-0" />
                                        <span>Xóa mã giảm giá</span>
                                    </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCouponIds([])}
                            className="text-muted-foreground hover:text-foreground"
                            style={{ borderRadius: "12px" }}
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
