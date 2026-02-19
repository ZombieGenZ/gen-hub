"use client";

import { useState, useEffect, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AddonsService } from "@/services/addons/addons.service";
import { AddonsTypeService } from "@/services/addons/addonsType.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/contexts/ToastContext";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ListBulletIcon,
    Squares2X2Icon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { AddonResponse } from "@/types/addon/addon.type";
import { AddonType } from "@/types/addon/addonType.type";
import { AddonForm } from "./addon-form";
import { AddonTypeForm } from "./addon-type-form";
import { Skeleton } from "@/components/ui/skeleton";

const addonsService = new AddonsService();
const addonsTypeService = new AddonsTypeService();

export default function AddonsPage() {
    // --- Data States ---
    const [addons, setAddons] = useState<AddonResponse[]>([]);
    const [addonTypes, setAddonTypes] = useState<AddonType[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // --- Filters ---
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("services");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    // --- Selection & Actions ---
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);

    // --- Dialogs ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    // --- Edit/Delete Targets ---
    const [targetAddon, setTargetAddon] = useState<AddonResponse | null>(null);
    const [targetType, setTargetType] = useState<AddonType | null>(null);

    // --- Stats ---
    const [addonStats, setAddonStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [typeStats, setTypeStats] = useState({ total: 0, active: 0, inactive: 0 });

    // --- Bulk Actions ---
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    const { showToast } = useToast();

    // --- Fetch Stats ---
    const fetchAddonStats = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const data: any = await addonsService.getAllAddons(token, { limit: 1000 });
            let items: AddonResponse[] = [];
            if (data?.items) items = data.items;
            else if (data?.data?.items) items = data.data.items;
            else if (Array.isArray(data)) items = data;
            else if (Array.isArray(data?.data)) items = data.data;
            const active = items.filter(a => a.is_active).length;
            setAddonStats({ total: items.length, active, inactive: items.length - active });
        } catch (e) { console.error(e); }
    }, []);

    // --- Fetch Data ---
    const fetchAddons = useCallback(async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            // Fetch Addons with pagination
            const addonsData: any = await addonsService.getAllAddons(token, {
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage,
                keywords: searchTerm,
                is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
            });

            // Handle various response structures
            let items: AddonResponse[] = [];
            let total = 0;

            if (addonsData?.items) {
                items = addonsData.items;
                total = addonsData.total || 0;
            } else if (addonsData?.data?.items) {
                items = addonsData.data.items;
                total = addonsData.data.total || 0;
            } else if (Array.isArray(addonsData)) {
                items = addonsData;
                total = addonsData.length;
            } else if (Array.isArray(addonsData?.data)) {
                items = addonsData.data;
                total = addonsData.data.length;
            }

            setAddons(items);
            setTotalItems(total);

        } catch (error) {
            console.error("Failed to fetch addons", error);
            showToast("Không thể tải danh sách dịch vụ", "error");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, statusFilter, showToast]);

    const fetchTypes = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const typesData: any = await addonsTypeService.getAllAddonsType(token);

            let items: AddonType[] = [];
            if (Array.isArray(typesData)) items = typesData;
            else if (Array.isArray(typesData?.data)) items = typesData.data;
            else if (typesData?.items) items = typesData.items;

            setAddonTypes(items);
            const active = items.filter(t => t.is_active).length;
            setTypeStats({ total: items.length, active, inactive: items.length - active });
        } catch (error) {
            console.error("Failed to fetch types", error);
        }
    }, []);

    useEffect(() => { fetchAddonStats(); }, [fetchAddonStats]);
    useEffect(() => {
        if (activeTab === 'services') {
            fetchAddons();
        } else {
            fetchTypes();
        }
    }, [activeTab, fetchAddons, fetchTypes]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'services') {
                setCurrentPage(1);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, activeTab]);


    // --- Filtering Logic for Types (Client-side) ---
    const filteredTypes = addonTypes.filter(type => {
        const matchesSearch = type.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "active" && type.is_active) ||
            (statusFilter === "inactive" && !type.is_active);
        return matchesSearch && matchesStatus;
    });

    // --- Handlers ---
    const handleRefresh = () => {
        if (activeTab === 'services') { fetchAddons(); fetchAddonStats(); }
        else fetchTypes();

        setIsCreateOpen(false);
        setIsEditOpen(false);
        setIsDeleteOpen(false);
        setTargetAddon(null);
        setTargetType(null);
        setSelectedAddonIds([]);
        setSelectedTypeIds([]);
    };

    const handleDelete = async () => {
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (activeTab === "services" && targetAddon) {
                await addonsService.deleteAddon(token, targetAddon.id);
                showToast(`Đã xóa dịch vụ "${targetAddon.name}" 🗑️`, "success");
            } else if (activeTab === "types" && targetType) {
                if (targetType.addons && targetType.addons.length > 0) {
                    showToast(`Không thể xóa nhóm đang chứa ${targetType.addons.length} dịch vụ`, "error");
                    return;
                }
                await addonsTypeService.deleteAddonType(token, targetType.id);
                showToast(`Đã xóa nhóm dịch vụ "${targetType.name}" 🗑️`, "success");
            }
            handleRefresh();
        } catch (error) {
            console.error("Delete failed", error);
            showToast("Xóa thất bại, vui lòng thử lại", "error");
        } finally {
            setIsDeleteLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (activeTab === "services") {
                await addonsService.deleteManyAddons(token, selectedAddonIds);
                showToast(`Đã xóa ${selectedAddonIds.length} dịch vụ thành công! 🗑️`, "success");
            } else {
                await addonsTypeService.deleteManyAddonTypes(token, selectedTypeIds);
                showToast(`Đã xóa ${selectedTypeIds.length} nhóm dịch vụ thành công! 🗑️`, "success");
            }
            setIsBulkDeleteDialogOpen(false);
            handleRefresh();
        } catch (error) {
            console.error("Bulk delete failed", error);
            showToast("Xóa nhiều thất bại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    // --- Helpers ---
    const formatCurrency = (amount: number) => {
        if (amount === 0) return "Liên hệ";
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const toggleSelection = (id: string, currentList: string[], setList: (l: string[]) => void) => {
        if (currentList.includes(id)) {
            setList(currentList.filter(item => item !== id));
        } else {
            setList([...currentList, id]);
        }
    };

    const toggleSelectAll = (items: { id: string }[], currentList: string[], setList: (l: string[]) => void) => {
        if (currentList.length === items.length) {
            setList([]);
        } else {
            setList(items.map(i => i.id));
        }
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontSize: "32px", lineHeight: "130%" }}>
                        Dịch vụ & Tiện ích
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Thiết lập bảng giá dịch vụ và nhóm tiện ích
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setTargetAddon(null);
                        setTargetType(null);
                        setIsCreateOpen(true);
                    }}
                    className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white transition-all duration-200 active:scale-[0.97] hover:shadow-md"
                    style={{ borderRadius: "12px" }}
                >
                    <PlusIcon className="w-4 h-4" />
                    {activeTab === 'services' ? "Thêm dịch vụ mới" : "Thêm nhóm mới"}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-muted/50 p-1" style={{ borderRadius: "12px" }}>
                        <TabsTrigger value="services" className="rounded-lg gap-2 px-4">
                            <ListBulletIcon className="w-4 h-4" /> Danh mục Dịch vụ
                        </TabsTrigger>
                        <TabsTrigger value="types" className="rounded-lg gap-2 px-4">
                            <Squares2X2Icon className="w-4 h-4" /> Nhóm Dịch vụ
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Filters */}
                <Card className="border-0 shadow-premium mb-6" style={{ borderRadius: "24px" }}>
                    <CardContent className="p-6">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[250px]">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder={activeTab === 'services' ? "Tìm dịch vụ..." : "Tìm nhóm dịch vụ..."}
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    style={{ borderRadius: "12px" }}
                                />
                            </div>

                            {/* Status Filters with stats */}
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const s = activeTab === 'services' ? addonStats : typeStats;
                                    return (
                                        <>
                                            <Button
                                                variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                                                onClick={() => { setStatusFilter('all'); if (activeTab === 'services') setCurrentPage(1); }}
                                                size="sm"
                                                className="rounded-full gap-1.5"
                                            >
                                                Tất cả
                                                <Badge variant="secondary" className="px-1.5 py-0 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{s.total}</Badge>
                                            </Button>
                                            <Button
                                                variant={statusFilter === 'active' ? 'secondary' : 'ghost'}
                                                onClick={() => { setStatusFilter('active'); if (activeTab === 'services') setCurrentPage(1); }}
                                                size="sm"
                                                className="rounded-full gap-1.5"
                                            >
                                                <CheckCircleIcon className="w-4 h-4 text-green-600" /> Active
                                                <Badge variant="secondary" className="px-1.5 py-0 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{s.active}</Badge>
                                            </Button>
                                            <Button
                                                variant={statusFilter === 'inactive' ? 'secondary' : 'ghost'}
                                                onClick={() => { setStatusFilter('inactive'); if (activeTab === 'services') setCurrentPage(1); }}
                                                size="sm"
                                                className="rounded-full gap-1.5"
                                            >
                                                <XCircleIcon className="w-4 h-4 text-gray-400" /> Inactive
                                                <Badge variant="secondary" className="px-1.5 py-0 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{s.inactive}</Badge>
                                            </Button>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <TabsContent value="services" className="mt-0 space-y-6">
                    {/* Addons List Table */}
                    <Card className="border-0 shadow-premium overflow-hidden" style={{ borderRadius: "24px" }}>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/30 border-b">
                                        <tr>
                                            <th className="w-12 py-3 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={addons.length > 0 && selectedAddonIds.length === addons.length}
                                                    // Logic for select all current page
                                                    onChange={() => toggleSelectAll(addons, selectedAddonIds, setSelectedAddonIds)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                />
                                            </th>
                                            <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase w-[30%]">Dịch vụ</th>
                                            <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Đơn giá</th>
                                            <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Đơn vị</th>
                                            <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Chu kỳ</th>
                                            <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Trạng thái</th>
                                            <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y relative">
                                        {loading ? (
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <tr key={`skeleton-${index}`}>
                                                    <td className="py-4 px-4"><Skeleton className="h-4 w-4 rounded" /></td>
                                                    <td className="py-4 px-4">
                                                        <Skeleton className="h-6 w-32 mb-2" />
                                                        <Skeleton className="h-4 w-48" />
                                                    </td>
                                                    <td className="py-4 px-4"><Skeleton className="h-6 w-24" /></td>
                                                    <td className="py-4 px-4"><Skeleton className="h-5 w-16" /></td>
                                                    <td className="py-4 px-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                                    <td className="py-4 px-4"><div className="flex justify-center"><Skeleton className="h-6 w-24 rounded-full" /></div></td>
                                                    <td className="py-4 px-4"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div></td>
                                                </tr>
                                            ))
                                        ) : addons.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-16 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                            <ListBulletIcon className="w-8 h-8 text-muted-foreground/50" />
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground font-medium">Không tìm thấy dịch vụ nào</p>
                                                            <p className="text-sm text-muted-foreground/70 mt-1">
                                                                {searchTerm ? "Thử thay đổi từ khóa tìm kiếm" : "Bắt đầu bằng cách thêm dịch vụ mới"}
                                                            </p>
                                                        </div>
                                                        {!searchTerm && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => { setTargetAddon(null); setIsCreateOpen(true); }}
                                                                className="gap-2 mt-2 transition-all duration-200 active:scale-[0.97]"
                                                                style={{ borderRadius: "12px" }}
                                                            >
                                                                <PlusIcon className="w-4 h-4" />
                                                                Thêm dịch vụ đầu tiên
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            addons.map(addon => (
                                                <tr key={addon.id} className="hover:bg-muted/50 transition-colors group">
                                                    <td className="py-4 px-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAddonIds.includes(addon.id)}
                                                            onChange={() => toggleSelection(addon.id, selectedAddonIds, setSelectedAddonIds)}
                                                            className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                        />
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="font-semibold text-base text-gray-900">{addon.name}</div>
                                                        <div className="text-sm text-muted-foreground/80 line-clamp-1 mt-0.5 font-normal">{addon.description}</div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className={`font-bold text-base ${addon.price === 0 ? 'text-blue-600' : 'text-[#0F766E]'}`}>
                                                            {formatCurrency(addon.price)}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        {/* Unit is not standard in AddonResponse yet based on type def getting used, assume it might be missing or handle gracefully */}
                                                        {/* @ts-ignore */}
                                                        <span className="text-sm font-medium text-gray-600">{addon.unit ? `/ ${addon.unit}` : "-"}</span>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <Badge variant="outline" className="rounded-md font-normal bg-white text-gray-600 border-gray-200">
                                                            {addon.is_monthly_payment ? "Hàng tháng" : "Một lần"}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        {addon.is_active ? (
                                                            <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 gap-1 pl-1 pr-2 rounded-full shadow-none font-normal">
                                                                <CheckCircleIcon className="w-4 h-4" /> Hoạt động
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="gap-1 pl-1 pr-2 rounded-full shadow-none font-normal text-muted-foreground">
                                                                <XCircleIcon className="w-4 h-4" /> Đã tắt
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all duration-200 active:scale-90"
                                                                onClick={() => {
                                                                    setTargetAddon(addon);
                                                                    setIsEditOpen(true);
                                                                }}
                                                                title="Chỉnh sửa"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all duration-200 active:scale-90"
                                                                onClick={() => {
                                                                    setTargetAddon(addon);
                                                                    setIsDeleteOpen(true);
                                                                }}
                                                                title="Xóa"
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
                </TabsContent>

                <TabsContent value="types" className="mt-0 space-y-4">
                    {/* Addon Types List */}
                    <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                        <CardContent className="p-0">
                            {/* Keep the client-side rendering for Types or implement custom loading there as well if needed */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/30 border-b">
                                        <tr>
                                            <th className="w-12 py-3 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTypeIds.length === filteredTypes.length && filteredTypes.length > 0}
                                                    onChange={() => toggleSelectAll(filteredTypes, selectedTypeIds, setSelectedTypeIds)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                />
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase">Tên nhóm</th>
                                            <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase">Mô tả</th>
                                            <th className="text-center py-3 px-4 font-medium text-xs text-muted-foreground uppercase">Số lượng dịch vụ</th>
                                            <th className="text-center py-3 px-4 font-medium text-xs text-muted-foreground uppercase">Trạng thái</th>
                                            <th className="text-right py-3 px-4 font-medium text-xs text-muted-foreground uppercase">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredTypes.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-16">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                            <Squares2X2Icon className="w-8 h-8 text-muted-foreground/50" />
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground font-medium">Không tìm thấy nhóm dịch vụ nào</p>
                                                            <p className="text-sm text-muted-foreground/70 mt-1">
                                                                {searchTerm ? "Thử thay đổi từ khóa tìm kiếm" : "Bắt đầu bằng cách thêm nhóm mới"}
                                                            </p>
                                                        </div>
                                                        {!searchTerm && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => { setTargetType(null); setIsCreateOpen(true); }}
                                                                className="gap-2 mt-2 transition-all duration-200 active:scale-[0.97]"
                                                                style={{ borderRadius: "12px" }}
                                                            >
                                                                <PlusIcon className="w-4 h-4" />
                                                                Thêm nhóm đầu tiên
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTypes.map(type => (
                                                <tr key={type.id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTypeIds.includes(type.id)}
                                                            onChange={() => toggleSelection(type.id, selectedTypeIds, setSelectedTypeIds)}
                                                            className="w-4 h-4 rounded border-gray-300 text-[#0F766E] focus:ring-[#0F766E]"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-base">{type.name}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-muted-foreground">
                                                        {type.description}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <Badge variant="outline" className="rounded-lg">
                                                            {type.addons?.length || 0} dịch vụ
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {type.is_active ? (
                                                            <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 gap-1 pl-1 pr-2 rounded-full shadow-none font-normal">
                                                                <CheckCircleIcon className="w-4 h-4" /> Hoạt động
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="gap-1 pl-1 pr-2 rounded-full shadow-none font-normal text-muted-foreground">
                                                                <XCircleIcon className="w-4 h-4" /> Đã tắt
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all duration-200 active:scale-90"
                                                                onClick={() => {
                                                                    setTargetType(type);
                                                                    setIsEditOpen(true);
                                                                }}
                                                                title="Chỉnh sửa"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all duration-200 active:scale-90"
                                                                onClick={() => {
                                                                    setTargetType(type);
                                                                    setIsDeleteOpen(true);
                                                                }}
                                                                title="Xóa"
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
                </TabsContent>
            </Tabs>

            {/* Floating Action Bar for Selections */}
            {(selectedAddonIds.length > 0 || selectedTypeIds.length > 0) && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <div
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in"
                        style={{ borderRadius: "24px" }}
                    >
                        <span className="text-muted-foreground text-sm font-medium">
                            {activeTab === 'services' ? selectedAddonIds.length : selectedTypeIds.length} đã chọn
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
                            onClick={() => {
                                setSelectedAddonIds([]);
                                setSelectedTypeIds([]);
                            }}
                            className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Create/Edit Sheet (Drawer) */}
            <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                    setTargetAddon(null);
                    setTargetType(null);
                }
            }}>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden" style={{ borderRadius: "16px" }}>
                    <DialogHeader className="p-6 pb-4 shrink-0 z-10 border-b bg-background">
                        <DialogTitle>
                            {isEditOpen ? 'Chỉnh sửa' : 'Thêm mới'} {activeTab === 'services' ? 'dịch vụ' : 'nhóm dịch vụ'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 pt-4">
                        {activeTab === 'services' ? (
                            <AddonForm
                                initialData={targetAddon || undefined}
                                isEdit={isEditOpen}
                                onSuccess={handleRefresh}
                                onCancel={() => {
                                    setIsCreateOpen(false);
                                    setIsEditOpen(false);
                                }}
                            />
                        ) : (
                            <AddonTypeForm
                                initialData={targetType || undefined}
                                isEdit={isEditOpen}
                                onSuccess={handleRefresh}
                                onCancel={() => {
                                    setIsCreateOpen(false);
                                    setIsEditOpen(false);
                                }}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!isDeleteLoading) setIsDeleteOpen(open); }}>
                <DialogContent style={{ borderRadius: "16px" }} className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa {activeTab === 'services' ? `dịch vụ` : `nhóm`} <strong className="text-foreground">&ldquo;{activeTab === 'services' ? targetAddon?.name : targetType?.name}&rdquo;</strong> không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading} style={{ borderRadius: "12px" }} className="transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading} style={{ borderRadius: "12px" }} className="gap-2 min-w-[100px] transition-all duration-200">
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
                <DialogContent style={{ borderRadius: "16px" }} className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xác nhận xóa nhiều</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa <strong className="text-foreground">{activeTab === 'services' ? selectedAddonIds.length : selectedTypeIds.length} mục</strong> đã chọn không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkActionLoading} style={{ borderRadius: "12px" }} className="transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionLoading} style={{ borderRadius: "12px" }} className="gap-2 min-w-[120px] transition-all duration-200">
                            {isBulkActionLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Xóa {activeTab === 'services' ? selectedAddonIds.length : selectedTypeIds.length} mục</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
