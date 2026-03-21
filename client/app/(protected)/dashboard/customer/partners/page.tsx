"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { PartnerService } from "@/services/partner/partner.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";
import type { Partner } from "@/services/partner/partner.types";

// Extracted Components
import { PartnerHeader } from "@/components/dashboard/customer/partners/PartnerHeader";
import { PartnerTable, ITEMS_PER_PAGE } from "@/components/dashboard/customer/partners/PartnerTable";
import { PartnerFormDialog } from "@/components/dashboard/customer/partners/PartnerFormDialog";
import { PartnerDeleteDialogs } from "@/components/dashboard/customer/partners/PartnerDeleteDialogs";
import { PartnerBulkActionBar } from "@/components/dashboard/customer/partners/PartnerBulkActionBar";

const partnerService = new PartnerService();

export default function PartnerManagementPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // ── Data state ──
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [activeTab, setActiveTab] = useState<"ALL" | "CUSTOMER" | "SUPPLIER">("ALL");
    const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
    const debouncedKeywords = useDebounce(searchTerm, 500);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Selection ──
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Dialogs state ──
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
    const [editTarget, setEditTarget] = useState<Partner | null>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    // ── Fetch partners ──
    const fetchPartners = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }

            setLoading(true);
            const offset = (currentPage - 1) * ITEMS_PER_PAGE;
            const result = await partnerService.list(token, {
                keywords: debouncedKeywords || undefined,
                type: activeTab === "ALL" ? undefined : activeTab,
                is_active: filterActive === "all" ? undefined : filterActive === "active",
                limit: ITEMS_PER_PAGE,
                offset,
            });

            if (result?.data) {
                setPartners(result.data.items || []);
                setTotalItems(result.data.total || 0);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            showToast("Không thể tải danh sách đối tác", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, currentPage, activeTab, filterActive, router, showToast]);

    useEffect(() => {
        fetchPartners();
    }, [fetchPartners]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedKeywords, activeTab, filterActive]);

    // ── Handlers ──
    const handleToggleActive = async (partner: Partner) => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await partnerService.update(token, partner.id, { is_active: !partner.is_active });
            showToast(
                `Đã ${partner.is_active ? "ngừng" : "kích hoạt"} đối tác "${partner.name}"`,
                "success"
            );
            fetchPartners();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Cập nhật thất bại";
            showToast(msg, "error");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await partnerService.delete(token, deleteTarget.id);
            showToast(`Đã xóa đối tác "${deleteTarget.name}"`, "success");
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
            fetchPartners();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Xóa thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await partnerService.deleteMany(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} đối tác thành công!`, "success");
            setBulkDeleteOpen(false);
            setSelectedIds([]);
            fetchPartners();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Xóa thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        setSelectedIds((prev) =>
            prev.length === partners.length ? [] : partners.map((p) => p.id)
        );
    };

    return (
        <div className="flex-1 overflow-auto bg-slate-50/50">
            <main className="pt-0 py-4 px-4 space-y-6">
                <PartnerHeader
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    filterActive={filterActive}
                    onFilterActiveChange={setFilterActive}
                    onCreateClick={() => {
                        setDrawerMode("create");
                        setEditTarget(null);
                        setDrawerOpen(true);
                    }}
                />

                <PartnerTable
                    partners={partners}
                    loading={loading}
                    selectedIds={selectedIds}
                    onToggleSelection={toggleSelection}
                    onToggleSelectAll={toggleSelectAll}
                    onToggleActive={handleToggleActive}
                    onEditClick={(p) => {
                        setDrawerMode("edit");
                        setEditTarget(p);
                        setDrawerOpen(true);
                    }}
                    onDeleteClick={(p) => {
                        setDeleteTarget(p);
                        setDeleteDialogOpen(true);
                    }}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    onPageChange={setCurrentPage}
                />

                <PartnerBulkActionBar
                    selectedIdsCount={selectedIds.length}
                    onDeleteClick={() => setBulkDeleteOpen(true)}
                    onClearSelection={() => setSelectedIds([])}
                />

                <PartnerFormDialog
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    mode={drawerMode}
                    editTarget={editTarget}
                    onSuccess={fetchPartners}
                />

                <PartnerDeleteDialogs
                    isSubmitting={isSubmitting}
                    deleteDialogOpen={deleteDialogOpen}
                    setDeleteDialogOpen={setDeleteDialogOpen}
                    deleteTarget={deleteTarget}
                    handleDeleteConfirm={handleDeleteConfirm}
                    bulkDeleteOpen={bulkDeleteOpen}
                    setBulkDeleteOpen={setBulkDeleteOpen}
                    selectedIdsCount={selectedIds.length}
                    handleBulkDelete={handleBulkDelete}
                />
            </main>
        </div>
    );
}
