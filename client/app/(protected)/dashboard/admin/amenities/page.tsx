"use client";

import { useState, useEffect, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AmenitiesService } from "@/services/amenities/amenities.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    XMarkIcon,
    Squares2X2Icon,
    ListBulletIcon,
    CubeIcon,
} from "@heroicons/react/24/outline";
import { AmenityRequest, AmenityResponse } from "@/types/amenities/amenities.type";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/ToastContext";
import { AmenityDialog, AmenityGridView, getIconComponent } from "@/components/amenities";
import { TablePagination } from "@/components/ui/table-pagination";

const amenitiesService = new AmenitiesService();

export default function AmenitiesPage() {

    // --- Data States ---
    const { showToast } = useToast();
    const [amenities, setAmenities] = useState<AmenityResponse[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // --- Filters ---
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    // --- Stats for KPI ---
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

    // --- Selection ---
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    // --- Dialog States ---
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [selectedAmenity, setSelectedAmenity] = useState<AmenityResponse | null>(null);
    const [isFormLoading, setIsFormLoading] = useState(false);

    // --- Delete Dialog ---
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const data: any = await amenitiesService.getAllAmenities(token, {
                limit: 1000,
            });

            let items: AmenityResponse[] = [];
            if (data?.items) items = data.items;
            else if (Array.isArray(data)) items = data;

            const active = items.filter((a) => a.is_active).length;
            const inactive = items.filter((a) => !a.is_active).length;
            setStats({ total: items.length, active, inactive });
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    }, []);

    const fetchAmenities = useCallback(async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const data: any = await amenitiesService.getAllAmenities(token, {
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage,
                keywords: searchTerm || undefined,
                is_active: statusFilter === "all" ? undefined : statusFilter === "active" ? true : false,
            });

            let items: AmenityResponse[] = [];
            let total = 0;

            if (data?.items) {
                items = data.items;
                total = data.total || 0;
            } else if (Array.isArray(data)) {
                items = data;
                total = data.length;
            }

            setAmenities(items);
            setTotalItems(total);
        } catch (error: any) {
            console.error("Failed to fetch amenities", error);
            showToast(error.message || "Không thể tải danh sách tiện ích", "error");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, statusFilter]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchAmenities();
    }, [fetchAmenities]);

    // Debounce search - no need to call fetchAmenities here since it's already in the dependency
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSave = async (data: AmenityRequest) => {
        setIsFormLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (formMode === "create") {
                await amenitiesService.createAmenity(token, data);
                showToast("Đã thêm tiện ích mới thành công!", "success");
            } else if (selectedAmenity) {
                await amenitiesService.updateAmenity(token, selectedAmenity.id, data);
                showToast("Cập nhật tiện ích thành công!", "success");
            }

            setIsFormDialogOpen(false);
            setSelectedAmenity(null);
            fetchAmenities();
            fetchStats();
        } catch (error: any) {
            console.error("Failed to save amenity", error);
            showToast(error.message || (formMode === "create" ? "Thêm tiện ích thất bại" : "Cập nhật thất bại"), "error");
            throw error; // Re-throw for dialog to handle state
        } finally {
            setIsFormLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedAmenity) return;

            await amenitiesService.deleteAmenity(token, selectedAmenity.id);
            setIsDeleteDialogOpen(false);
            setSelectedAmenity(null);
            showToast(`Đã xóa tiện ích "${selectedAmenity.name}"`, "success");
            fetchAmenities();
            fetchStats();
        } catch (error: any) {
            console.error("Failed to delete amenity", error);
            showToast(error.message || "Xóa thất bại, vui lòng thử lại", "error");
        } finally {
            setIsDeleteLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await amenitiesService.deleteMultipleAmenities(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} tiện ích thành công!`, "success");
            setIsBulkDeleteDialogOpen(false);
            setSelectedIds([]);
            fetchAmenities();
            fetchStats();
        } catch (error: any) {
            console.error("Bulk delete failed", error);
            showToast(error.message || "Xóa nhiều thất bại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const openCreateDialog = () => {
        setFormMode("create");
        setSelectedAmenity(null);
        setIsFormDialogOpen(true);
    };

    const openEditDialog = (amenity: AmenityResponse) => {
        setFormMode("edit");
        setSelectedAmenity(amenity);
        setIsFormDialogOpen(true);
    };

    const openDeleteDialog = (amenity: AmenityResponse) => {
        setSelectedAmenity(amenity);
        setIsDeleteDialogOpen(true);
    };

    const toggleSelection = (id: string, checked?: boolean) => {
        if (checked === false || selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((item) => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === amenities.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(amenities.map((i) => i.id));
        }
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[32px] leading-[130%]">
                        Tiện ích
                    </h1>
                    <p className="text-muted-foreground mt-1 text-base">
                        Quản lý các tiện ích có sẵn tại kho
                    </p>
                </div>
                <Button
                    onClick={openCreateDialog}
                    className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white transition-all duration-200 active:scale-[0.97] hover:shadow-md rounded-xl"
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm tiện ích
                </Button>
            </div>

            {/* Filter Tabs with Stats */}
            <Tabs
                value={statusFilter}
                onValueChange={(value) => {
                    setStatusFilter(value as "all" | "active" | "inactive");
                    setCurrentPage(1);
                }}
                className="w-full"
            >
                <TabsList className="bg-muted/50 p-1.5 h-auto rounded-xl">
                    <TabsTrigger
                        value="all"
                        className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl"
                    >
                        <CubeIcon className="w-4 h-4" />
                        Tất cả
                        <Badge
                            variant="secondary"
                            className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                            {stats.total}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="active"
                        className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl"
                    >
                        <CheckCircleIcon className="w-4 h-4" />
                        Đang hoạt động
                        <Badge
                            variant="secondary"
                            className="ml-1 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        >
                            {stats.active}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="inactive"
                        className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl"
                    >
                        <XCircleIcon className="w-4 h-4" />
                        Chưa sử dụng
                        <Badge
                            variant="secondary"
                            className="ml-1 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                            {stats.inactive}
                        </Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Filters */}
            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-col md:flex-row gap-4 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm kiếm theo tên hoặc mô tả..."
                                    className="pl-9 rounded-xl"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                            <Button
                                variant={viewMode === "list" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("list")}
                                className={`gap-2 rounded-2xl ${viewMode === "list" ? "" : "text-muted-foreground"}`}
                            >
                                <ListBulletIcon className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === "grid" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("grid")}
                                className={`gap-2 rounded-2xl ${viewMode === "grid" ? "" : "text-muted-foreground"}`}
                            >
                                <Squares2X2Icon className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Content - List or Grid View */}
            <Card className="border-0 shadow-premium overflow-hidden rounded-3xl">
                <CardHeader>
                    <CardTitle className="text-[20px] leading-[130%]">
                        Danh sách tiện ích ({totalItems})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {viewMode === "grid" ? (
                        <AmenityGridView
                            amenities={amenities}
                            selectedIds={selectedIds}
                            onSelect={toggleSelection}
                            onEdit={openEditDialog}
                            onDelete={openDeleteDialog}
                            loading={loading}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="w-12 py-3 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === amenities.length && amenities.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                            />
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase">
                                            Icon
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase">
                                            Tên
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase">
                                            Mô tả
                                        </th>
                                        <th className="text-center py-3 px-4 font-medium text-xs text-muted-foreground uppercase">
                                            Trạng thái
                                        </th>
                                        <th className="text-right py-3 px-4 font-medium text-xs text-muted-foreground uppercase">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y relative">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, index) => (
                                            <tr key={`skeleton-${index}`}>
                                                <td className="py-4 px-4">
                                                    <Skeleton className="h-4 w-4 rounded" />
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Skeleton className="h-6 w-32 mb-2" />
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Skeleton className="h-5 w-20" />
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Skeleton className="h-5 w-48" />
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex justify-center">
                                                        <Skeleton className="h-6 w-24 rounded-full" />
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Skeleton className="h-8 w-8 rounded-full" />
                                                        <Skeleton className="h-8 w-8 rounded-full" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : amenities.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-16">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                        <CubeIcon className="w-8 h-8 text-muted-foreground/50" />
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground font-medium">Không tìm thấy tiện ích nào</p>
                                                        <p className="text-sm text-muted-foreground/70 mt-1">
                                                            {searchTerm ? "Thử thay đổi từ khóa tìm kiếm" : "Bắt đầu bằng cách thêm tiện ích mới"}
                                                        </p>
                                                    </div>
                                                    {!searchTerm && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={openCreateDialog}
                                                            className="gap-2 mt-2 transition-all duration-200 active:scale-[0.97] rounded-xl"
                                                        >
                                                            <PlusIcon className="w-4 h-4" />
                                                            Thêm tiện ích đầu tiên
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        amenities.map((amenity) => {
                                            const IconComponent = amenity.icon ? getIconComponent(amenity.icon) : null;
                                            return (
                                                <tr key={amenity.id} className="hover:bg-muted/50 transition-colors group">
                                                    <td className="py-4 px-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(amenity.id)}
                                                            onChange={() => toggleSelection(amenity.id)}
                                                            className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                        />
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${amenity.is_active
                                                                ? "bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-800/30"
                                                                : "bg-gray-100 dark:bg-gray-700"
                                                                }`}
                                                        >
                                                            {IconComponent ? (
                                                                <IconComponent
                                                                    className={`w-5 h-5 ${amenity.is_active
                                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                                        : "text-gray-700"
                                                                        }`}
                                                                />
                                                            ) : (
                                                                <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-600" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 font-semibold text-base text-slate-900 dark:text-gray-100">
                                                        {amenity.name}
                                                    </td>
                                                    <td className="py-4 px-4 text-sm text-muted-foreground max-w-xs truncate">
                                                        {amenity.description || "—"}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <Badge
                                                            className={`gap-1 pl-1 pr-2 rounded-full shadow-none font-normal ${amenity.is_active
                                                                ? "bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                                                                }`}
                                                        >
                                                            {amenity.is_active ? (
                                                                <>
                                                                    <CheckCircleIcon className="w-4 h-4" />
                                                                    Hoạt động
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircleIcon className="w-4 h-4" />
                                                                    Không hoạt động
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <div className="flex justify-end gap-1 opacity-100 transition-all duration-200">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full hover:bg-blue-50 text-blue-600/70 hover:text-blue-600 transition-all duration-200 active:scale-90"
                                                                onClick={() => openEditDialog(amenity)}
                                                                title="Chỉnh sửa"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full hover:bg-red-50 text-red-600/70 hover:text-red-600 transition-all duration-200 active:scale-90"
                                                                onClick={() => openDeleteDialog(amenity)}
                                                                title="Xóa"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalItems > itemsPerPage && (
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            )}

            {/* Floating Action Bar for Selections */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <div
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in rounded-3xl"
                    >
                        <span className="text-muted-foreground text-sm font-medium">{selectedIds.length} đã chọn</span>
                        <div className="h-4 w-px bg-border" />
                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2 rounded-xl"
                            onClick={() => setIsBulkDeleteDialogOpen(true)}
                        >
                            <TrashIcon className="w-4 h-4" /> Xóa
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedIds([])}
                            className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <AmenityDialog
                open={isFormDialogOpen}
                onOpenChange={setIsFormDialogOpen}
                mode={formMode}
                amenity={selectedAmenity}
                onSave={handleSave}
                isLoading={isFormLoading}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!isDeleteLoading) setIsDeleteDialogOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa tiện ích <strong className="text-foreground">&ldquo;{selectedAmenity?.name}&rdquo;</strong> không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={isDeleteLoading}
                            className="transition-all duration-200 rounded-xl"
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleteLoading}
                            className="gap-2 min-w-[100px] transition-all duration-200 rounded-xl"
                        >
                            {isDeleteLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Đang xóa...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <TrashIcon className="w-4 h-4" />
                                    Xóa
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={(open) => { if (!isBulkActionLoading) setIsBulkDeleteDialogOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa nhiều</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa <strong className="text-foreground">{selectedIds.length} tiện ích</strong> đã chọn không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsBulkDeleteDialogOpen(false)}
                            disabled={isBulkActionLoading}
                            className="transition-all duration-200 rounded-xl"
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                            disabled={isBulkActionLoading}
                            className="gap-2 min-w-[120px] transition-all duration-200 rounded-xl"
                        >
                            {isBulkActionLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Đang xóa {selectedIds.length}...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <TrashIcon className="w-4 h-4" />
                                    Xóa {selectedIds.length} mục
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
