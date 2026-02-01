"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AmenitiesService } from "@/services/amenities/amenities.service";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { AmenityResponse } from "@/types/amenities/amenities.type";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/ToastContext";

const amenitiesService = new AmenitiesService();

export default function AmenitiesPage() {
    const { showToast } = useToast();

    // --- Data States ---
    const [amenities, setAmenities] = useState<AmenityResponse[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // --- Filters ---
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // --- Selection ---
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    // --- Dialogs ---
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedAmenity, setSelectedAmenity] = useState<AmenityResponse | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        is_active: true,
    });

    const fetchAmenities = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const data: any = await amenitiesService.getAllAmenities(token, {
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage,
                keywords: searchTerm,
                is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
            });

            console.log(data);

            let items: AmenityResponse[] = [];
            let total = 0;

            if (data?.items) {
                items = data.items;
                total = data.total || 0;
            } else if (data?.data?.items) {
                items = data.data.items;
                total = data.data.total || 0;
            } else if (Array.isArray(data?.data)) {
                items = data.data;
                total = data.total || data.data.length;
            } else if (Array.isArray(data)) {
                items = data;
                total = data.length;
            }

            setAmenities(items);
            setTotalItems(total);
        } catch (error) {
            console.error("Failed to fetch amenities", error);
            showToast("Không thể tải danh sách tiện ích", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAmenities();
    }, [currentPage, itemsPerPage, statusFilter]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchAmenities();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleCreate = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await amenitiesService.createAmenity(token, formData);
            setIsCreateDialogOpen(false);
            setFormData({ name: "", description: "", is_active: true });
            showToast("Đã thêm tiện ích mới", "success");
            fetchAmenities();
        } catch (error) {
            console.error("Failed to create amenity", error);
            showToast("Thêm tiện ích thất bại", "error");
        }
    };

    const handleEdit = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedAmenity) return;

            await amenitiesService.updateAmenity(token, selectedAmenity.id, formData);
            setIsEditDialogOpen(false);
            setSelectedAmenity(null);
            setFormData({ name: "", description: "", is_active: true });
            showToast("Đã cập nhật tiện ích", "success");
            fetchAmenities();
        } catch (error) {
            console.error("Failed to update amenity", error);
            showToast("Cập nhật thất bại", "error");
        }
    };

    const handleDelete = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedAmenity) return;

            await amenitiesService.deleteAmenity(token, selectedAmenity.id);
            setIsDeleteDialogOpen(false);
            setSelectedAmenity(null);
            showToast("Đã xóa tiện ích", "success");
            fetchAmenities();
        } catch (error) {
            console.error("Failed to delete amenity", error);
            showToast("Xóa thất bại", "error");
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await amenitiesService.deleteMultipleAmenities(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} tiện ích`, "success");
            setIsBulkDeleteDialogOpen(false);
            setSelectedIds([]);
            fetchAmenities();
        } catch (error) {
            console.error("Bulk delete failed", error);
            showToast("Xóa nhiều thất bại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    }

    const openEditDialog = (amenity: AmenityResponse) => {
        setSelectedAmenity(amenity);
        setFormData({
            name: amenity.name,
            description: amenity.description,
            is_active: amenity.is_active,
        });
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (amenity: AmenityResponse) => {
        setSelectedAmenity(amenity);
        setIsDeleteDialogOpen(true);
    };

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === amenities.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(amenities.map(i => i.id));
        }
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontSize: "32px", lineHeight: "130%" }}>
                        Tiện ích
                    </h1>
                    <p className="text-muted-foreground mt-1" style={{ fontSize: "16px", lineHeight: "150%" }}>
                        Quản lý các tiện ích có sẵn tại kho
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                    style={{ borderRadius: "12px" }}
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm tiện ích
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo tên hoặc mô tả..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[180px]" style={{ borderRadius: "12px" }}>
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="active">Đang hoạt động</SelectItem>
                                <SelectItem value="inactive">Không hoạt động</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-0 shadow-premium overflow-hidden" style={{ borderRadius: "24px" }}>
                <CardHeader>
                    <CardTitle style={{ fontSize: "20px", lineHeight: "130%" }}>
                        Danh sách tiện ích ({totalItems})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
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
                                            <td className="py-4 px-4"><Skeleton className="h-4 w-4 rounded" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-6 w-32 mb-2" /></td>
                                            <td className="py-4 px-4"><Skeleton className="h-5 w-48" /></td>
                                            <td className="py-4 px-4"><div className="flex justify-center"><Skeleton className="h-6 w-24 rounded-full" /></div></td>
                                            <td className="py-4 px-4"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div></td>
                                        </tr>
                                    ))
                                ) : amenities.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-muted-foreground">
                                            Không tìm thấy tiện ích nào
                                        </td>
                                    </tr>
                                ) : (
                                    amenities.map((amenity) => (
                                        <tr key={amenity.id} className="hover:bg-muted/50 transition-colors group">
                                            <td className="py-4 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(amenity.id)}
                                                    onChange={() => toggleSelection(amenity.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                />
                                            </td>
                                            <td className="py-4 px-4 font-semibold text-base text-gray-900">
                                                {amenity.name}
                                            </td>
                                            <td className="py-4 px-4 text-sm text-muted-foreground">
                                                {amenity.description}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <Badge
                                                    className={`gap-1 pl-1 pr-2 rounded-full shadow-none font-normal ${amenity.is_active ? "bg-green-50 text-green-700 hover:bg-green-100 border-green-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"}`}
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
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-muted"
                                                        onClick={() => openEditDialog(amenity)}
                                                    >
                                                        <PencilIcon className="w-4 h-4 text-gray-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600"
                                                        onClick={() => openDeleteDialog(amenity)}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalItems > itemsPerPage && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Hiển thị {(currentPage - 1) * itemsPerPage + 1} đến {Math.min(currentPage * itemsPerPage, totalItems)} trong tổng số {totalItems} kết quả
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages)
                                .map((page, index, array) => (
                                    <>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="text-gray-400" key={`dots-${index}`}>...</span>
                                        )}
                                        <Button
                                            key={page}
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                            className={`h-8 min-w-[32px] rounded-lg ${currentPage === page ? 'bg-[#0F766E] hover:bg-[#0F766E]/90' : 'text-gray-600'}`}
                                        >
                                            {page}
                                        </Button>
                                    </>
                                ))
                            }
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Floating Action Bar for Selections */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <div
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in"
                        style={{ borderRadius: "24px" }}
                    >
                        <span className="text-muted-foreground text-sm font-medium">
                            {selectedIds.length} đã chọn
                        </span>
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

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Thêm tiện ích mới</DialogTitle>
                        <DialogDescription>
                            Điền thông tin để tạo tiện ích mới
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên tiện ích</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Mô tả</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_active">Trạng thái hoạt động</Label>
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} style={{ borderRadius: "12px" }}>
                            Hủy
                        </Button>
                        <Button onClick={handleCreate} style={{ borderRadius: "12px" }}>Tạo mới</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa tiện ích</DialogTitle>
                        <DialogDescription>
                            Cập nhật thông tin tiện ích
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Tên tiện ích</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Mô tả</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-is_active">Trạng thái hoạt động</Label>
                            <Switch
                                id="edit-is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} style={{ borderRadius: "12px" }}>
                            Hủy
                        </Button>
                        <Button onClick={handleEdit} style={{ borderRadius: "12px" }}>Cập nhật</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa tiện ích "{selectedAmenity?.name}" không? Hành động này không thể hoàn tác.
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

            {/* Bulk Delete Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa nhiều</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa {selectedIds.length} tiện ích đã chọn không?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkActionLoading} style={{ borderRadius: "12px" }}>Hủy</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionLoading} style={{ borderRadius: "12px" }}>
                            {isBulkActionLoading ? "Đang xóa..." : "Xóa tất cả"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
