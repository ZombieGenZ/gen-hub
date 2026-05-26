"use client";

import React, { useEffect, useState, useCallback } from "react";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { LocationService } from "@/services/location/location.service";
import { Province } from "@/types/location/provinces.type";
import { useToast } from "@/contexts/ToastContext";
// Components
import { WarehouseHeader } from "@/components/dashboard/admin/warehouses/WarehouseHeader";
import { WarehouseFilterBar } from "@/components/dashboard/admin/warehouses/WarehouseFilterBar";
import { WarehouseTable } from "@/components/dashboard/admin/warehouses/WarehouseTable";
import { WarehouseFloatingActionBar } from "@/components/dashboard/admin/warehouses/WarehouseFloatingActionBar";
import { WarehouseActionDialogs } from "@/components/dashboard/admin/warehouses/WarehouseActionDialogs";

const warehouseService = new WarehouseTemplateService();
const locationService = new LocationService();
const ITEMS_PER_PAGE = 10;
const IMG_API = process.env.NEXT_PUBLIC_API_URL;

function formatVND(value: string | number): string {
    const num = typeof value === "string" ? parseFloat(value) : Number(value);
    if (isNaN(num)) return "—";
    return num.toLocaleString("vi-VN") + " ₫";
}

export default function WarehouseTemplatePage() {
    const router = useRouter();

    const { showToast } = useToast();

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: "",
        length: 0,
        width: 0,
        price_per_month: 0,
        dock_count: 1,
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [provinceFilter, setProvinceFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "full">("all");

    const [sortPriceDir, setSortPriceDir] = useState<"asc" | "desc" | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const debouncedKeywords = useDebounce(searchTerm, 500);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    const fetchWarehouses = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }

            setLoading(true);
            setError(null);

            const apiParams: Record<string, any> = {
                keywords: debouncedKeywords,
                page: currentPage,
                limit: ITEMS_PER_PAGE,
            };
            if (provinceFilter && provinceFilter !== "all") {
                apiParams.province_id = provinceFilter;
            }
            if (statusFilter === "active") apiParams.is_active = true;
            else if (statusFilter === "inactive") apiParams.is_active = false;
            else if (statusFilter === "full") apiParams.rental_status = "RENTED";

            const data = await warehouseService.getWarehouseTemplates(token, apiParams);

            if (data && data.items) {
                setWarehouses(data.items);
                setTotalItems(data.total || 0);
            } else if (Array.isArray(data)) {
                setWarehouses(data);
                setTotalItems(data.length);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") { router.push("/login"); return; }
            setError("Không thể tải dữ liệu kho. Vui lòng thử lại sau.");
            showToast("Lỗi khi tải dữ liệu kho.", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, provinceFilter, statusFilter, currentPage, router]);

    const fetchProvinces = useCallback(async () => {
        try {
            const data = await locationService.getProvinces();
            if (Array.isArray(data)) setProvinces(data);
        } catch {
            showToast("Không thể tải danh sách tỉnh thành", "error");
        }
    }, []);

    useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);
    useEffect(() => { fetchProvinces(); }, [fetchProvinces]);

    const sortedWarehouses = React.useMemo(() => {
        if (!sortPriceDir) return warehouses;
        return [...warehouses].sort((a, b) => {
            const pa = parseFloat(a.price_per_month as any) || 0;
            const pb = parseFloat(b.price_per_month as any) || 0;
            return sortPriceDir === "asc" ? pa - pb : pb - pa;
        });
    }, [warehouses, sortPriceDir]);

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === sortedWarehouses.length && sortedWarehouses.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(sortedWarehouses.map(w => w.id));
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await warehouseService.deleteWarehouseTemplate(token, deleteTarget.id);
            showToast(`Đã xóa "${deleteTarget.name}"`, "success");
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            setSelectedIds([]);
            fetchWarehouses();
        } catch (err: any) {
            showToast(err.message || "Xóa thất bại, vui lòng thử lại", "error");
        } finally {
            setIsDeleteLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkActionLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await warehouseService.deleteManyWarehouseTemplates(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} kho thành công!`, "success");
            setIsBulkDeleteDialogOpen(false);
            setSelectedIds([]);
            fetchWarehouses();
        } catch (err: any) {
            showToast(err.message || "Xóa thất bại, vui lòng thử lại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!createForm.name.trim()) {
            showToast("Vui lòng nhập tên kho.", "error");
            return;
        }
        const token = authStorage.getAccessToken();
        if (!token) return;

        setIsCreating(true);
        try {
            const result = await warehouseService.createWarehouseTemplate(token, {
                ...createForm,
                block_length: 1,
                block_width: 1,
                is_active: false,
            });
            showToast(`Đã tạo kho "${createForm.name}" thành công!`, "success");
            setCreateDialogOpen(false);
            setCreateForm({ name: "", length: 0, width: 0, price_per_month: 0, dock_count: 1 });
            const newId = result?.data?.id || result?.id;
            if (newId) {
                router.push(`/dashboard/admin/warehouses/${newId}`);
            } else {
                fetchWarehouses();
            }
        } catch (err: any) {
            showToast(err.message || "Tạo kho thất bại, vui lòng thử lại", "error");
        } finally {
            setIsCreating(false);
        }
    };

    const handleEdit = (id: string) => router.push(`/dashboard/admin/warehouses/${id}`);
    const handleDuplicate = (warehouse: Warehouse) => {
        router.push(`/dashboard/admin/warehouses/create?duplicate=${warehouse.id}`);
    };
    const handleDelete = (warehouse: Warehouse) => {
        setDeleteTarget(warehouse);
        setDeleteDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <WarehouseHeader
                totalItems={totalItems}
                setCreateDialogOpen={setCreateDialogOpen}
            />

            <WarehouseFilterBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                setCurrentPage={setCurrentPage}
                provinceFilter={provinceFilter}
                setProvinceFilter={setProvinceFilter}
                provinces={provinces}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
            />

            <WarehouseTable
                loading={loading}
                error={error}
                sortedWarehouses={sortedWarehouses}
                selectedIds={selectedIds}
                toggleSelection={toggleSelection}
                toggleSelectAll={toggleSelectAll}
                setSortPriceDir={setSortPriceDir}
                sortPriceDir={sortPriceDir}
                searchTerm={searchTerm}
                setCreateDialogOpen={setCreateDialogOpen}
                handleEdit={handleEdit}
                handleDuplicate={handleDuplicate}
                handleDelete={handleDelete}
                totalItems={totalItems}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                ITEMS_PER_PAGE={ITEMS_PER_PAGE}
                formatVND={formatVND}
                IMG_API={IMG_API}
            />

            <WarehouseFloatingActionBar
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                setIsBulkDeleteDialogOpen={setIsBulkDeleteDialogOpen}
            />

            <WarehouseActionDialogs
                deleteDialogOpen={deleteDialogOpen}
                setDeleteDialogOpen={setDeleteDialogOpen}
                deleteTarget={deleteTarget}
                isDeleteLoading={isDeleteLoading}
                handleDeleteConfirm={handleDeleteConfirm}
                isBulkDeleteDialogOpen={isBulkDeleteDialogOpen}
                setIsBulkDeleteDialogOpen={setIsBulkDeleteDialogOpen}
                selectedIds={selectedIds}
                isBulkActionLoading={isBulkActionLoading}
                handleBulkDelete={handleBulkDelete}
                createDialogOpen={createDialogOpen}
                setCreateDialogOpen={setCreateDialogOpen}
                isCreating={isCreating}
                createForm={createForm}
                setCreateForm={setCreateForm}
                handleCreate={handleCreate}
            />
        </div>
    );
}
