"use client";

import { useState, useEffect, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { IsuranceService } from "@/services/Insurance/Insurance.service";
import { Insurance } from "@/types/insurance/Insurance.types";
import { useToast } from "@/contexts/ToastContext";
// Components
import { InsuranceHeader } from "@/components/dashboard/admin/insurances/InsuranceHeader";
import { InsuranceFilterBar } from "@/components/dashboard/admin/insurances/InsuranceFilterBar";
import { InsuranceTable } from "@/components/dashboard/admin/insurances/InsuranceTable";
import { InsuranceFloatingActionBar } from "@/components/dashboard/admin/insurances/InsuranceFloatingActionBar";
import { InsuranceActionDialogs } from "@/components/dashboard/admin/insurances/InsuranceActionDialogs";

const insuranceService = new IsuranceService();

export default function InsurancesPage() {

    // --- Data States ---
    const { showToast } = useToast();
    const [insurances, setInsurances] = useState<Insurance[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // --- Filters ---
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    // --- Stats ---
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

    // --- Selection & Actions ---
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    // --- Dialogs ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    // --- Edit/Delete Targets ---
    const [targetInsurance, setTargetInsurance] = useState<Insurance | null>(null);

    // --- Fetch Stats ---
    const fetchStats = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const data: any = await insuranceService.getAllInsurance(token, { limit: 1000 });
            let items: Insurance[] = [];
            if (data?.data?.items) items = data.data.items;
            else if (data?.items) items = data.items;
            else if (Array.isArray(data?.data)) items = data.data;
            else if (Array.isArray(data)) items = data;
            const active = items.filter(a => a.is_active).length;
            const inactive = items.filter(a => !a.is_active).length;
            setStats({ total: items.length, active, inactive });
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    }, []);

    // --- Fetch Data ---
    const fetchInsurances = useCallback(async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const data: any = await insuranceService.getAllInsurance(token, {
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage,
                keywords: searchTerm,
                is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
            });

            let items: Insurance[] = [];
            let total = 0;

            if (data?.data?.items) {
                items = data.data.items;
                total = data.data.total || data.data.items.length;
            } else if (data?.items) {
                items = data.items;
                total = data.total || 0;
            } else if (Array.isArray(data?.data)) {
                items = data.data;
                total = data.data.length;
            } else if (Array.isArray(data)) {
                items = data;
                total = data.length;
            }

            setInsurances(items);
            setTotalItems(total);
        } catch (error: any) {
            console.error("Failed to fetch insurances", error);
            showToast(error.message || "Không thể tải danh sách bảo hiểm", "error");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, statusFilter]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchInsurances(); }, [fetchInsurances]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // --- Handlers ---
    const handleRefresh = () => {
        fetchInsurances();
        fetchStats();
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setIsDeleteOpen(false);
        setTargetInsurance(null);
        setSelectedIds([]);
    };

    const handleDelete = async () => {
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token || !targetInsurance) return;

            await insuranceService.deleteInsurance(token, targetInsurance.id);
            showToast(`Đã xóa gói bảo hiểm "${targetInsurance.name}"`, "success");
            handleRefresh();
        } catch (error: any) {
            console.error("Failed to delete insurance", error);
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

            await insuranceService.deleteManyInsurances(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} gói bảo hiểm thành công!`, "success");
            setIsBulkDeleteDialogOpen(false);
            handleRefresh();
        } catch (error: any) {
            console.error("Bulk delete failed", error);
            showToast(error.message || "Xóa nhiều thất bại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === insurances.length && insurances.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(insurances.map(i => i.id));
        }
    };

    const formatCurrency = (amount: string | number) => {
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numericAmount) || numericAmount === 0) return "0 ₫";
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numericAmount);
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    return (
        <div className="space-y-6">
            <InsuranceHeader
                setIsCreateOpen={setIsCreateOpen}
                setTargetInsurance={setTargetInsurance}
            />

            <InsuranceFilterBar
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                setCurrentPage={setCurrentPage}
                stats={stats}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />

            <InsuranceTable
                loading={loading}
                insurances={insurances}
                totalItems={totalItems}
                searchTerm={searchTerm}
                setIsCreateOpen={setIsCreateOpen}
                setTargetInsurance={setTargetInsurance}
                selectedIds={selectedIds}
                toggleSelectAll={toggleSelectAll}
                toggleSelection={toggleSelection}
                formatCurrency={formatCurrency}
                setIsEditOpen={setIsEditOpen}
                setIsDeleteOpen={setIsDeleteOpen}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalPages={totalPages}
            />

            <InsuranceFloatingActionBar
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                setIsBulkDeleteDialogOpen={setIsBulkDeleteDialogOpen}
            />

            <InsuranceActionDialogs
                isCreateOpen={isCreateOpen}
                isEditOpen={isEditOpen}
                setIsCreateOpen={setIsCreateOpen}
                setIsEditOpen={setIsEditOpen}
                targetInsurance={targetInsurance}
                setTargetInsurance={setTargetInsurance}
                handleRefresh={handleRefresh}
                isDeleteOpen={isDeleteOpen}
                setIsDeleteOpen={setIsDeleteOpen}
                isDeleteLoading={isDeleteLoading}
                handleDelete={handleDelete}
                isBulkDeleteDialogOpen={isBulkDeleteDialogOpen}
                setIsBulkDeleteDialogOpen={setIsBulkDeleteDialogOpen}
                isBulkActionLoading={isBulkActionLoading}
                handleBulkDelete={handleBulkDelete}
                selectedIdsLength={selectedIds.length}
            />
        </div>
    );
}
