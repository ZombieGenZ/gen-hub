"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";
import type { OutboundRequest, ExportStatus } from "@/services/inventory/inventory.types";

import "./outbound.css";

// Extracted Components
import { OutboundHeader } from "@/components/dashboard/organization/outbound/OutboundHeader";
import { OutboundTable, ITEMS_PER_PAGE } from "@/components/dashboard/organization/outbound/OutboundTable";
import { OutboundCancelDialog } from "@/components/dashboard/organization/outbound/OutboundCancelDialog";
import { CreateOutboundDialog } from "@/components/dashboard/organization/outbound/CreateOutboundDialog";
import { OutboundImportDialog } from "@/components/dashboard/organization/outbound/OutboundImportDialog";

const inventoryService = new InventoryService();

export default function OutboundListPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // ── List state ──
    const [items, setItems] = useState<OutboundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<ExportStatus | "ALL">("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const debouncedKeywords = useDebounce(searchTerm, 500);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Cancel dialog ──
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<OutboundRequest | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    // ── Create dialog state ──
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // ── Fetch list ──
    const fetchItems = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }
            setLoading(true);
            setError(null);

            const res = await inventoryService.listOutbound(token, {
                limit: ITEMS_PER_PAGE,
                offset: (currentPage - 1) * ITEMS_PER_PAGE,
                keywords: debouncedKeywords || undefined,
                status: activeTab === "ALL" ? undefined : activeTab,
            });

            if (res) {
                const data = Array.isArray(res)
                    ? res
                    : Array.isArray((res as any)?.data?.items)
                        ? (res as any).data.items
                        : Array.isArray((res as any)?.data)
                            ? (res as any).data
                            : [];
                const total =
                    (res as any)?.data?.total ??
                    (res as any)?.total ??
                    (res as any)?.meta?.total ??
                    data.length;
                setItems(data);
                setTotalItems(total);
            }
        } catch (err) {
            const e = err instanceof Error ? err : new Error(String(err));
            if (e.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            setError("Không thể tải danh sách phiếu xuất. Vui lòng thử lại sau.");
            showToast("Lỗi khi tải danh sách phiếu xuất kho.", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, activeTab, currentPage, router, showToast]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedKeywords, activeTab]);

    // ── Handlers ──
    const handleCancelConfirm = async () => {
        if (!cancelTarget) return;
        setIsCancelling(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }
            await inventoryService.cancelOutbound(token, cancelTarget.id, "Người tạo phiếu tự hủy");
            showToast(`Phiếu ${cancelTarget.code} đã được hủy`, "success");
            setCancelDialogOpen(false);
            setCancelTarget(null);
            fetchItems();
        } catch (err: any) {
            showToast(err.message || "Hủy phiếu thất bại", "error");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            setIsExporting(true);
            const blob = await inventoryService.exportOutbound(token, {
                keywords: debouncedKeywords || undefined,
                status: activeTab === "ALL" ? undefined : activeTab,
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `outbound-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast("Xuất Excel thành công", "success");
        } catch (err) {
            showToast("Không thể xuất Excel phiếu xuất kho", "error");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <OutboundHeader
                totalItems={totalItems}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onCreateClick={() => setCreateDialogOpen(true)}
                onImportClick={() => setImportDialogOpen(true)}
                onExportClick={handleExportExcel}
                isExporting={isExporting}
            />

            <OutboundTable
                items={items}
                loading={loading}
                error={error}
                searchTerm={searchTerm}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onCreateClick={() => setCreateDialogOpen(true)}
                onCancelClick={(item) => {
                    setCancelTarget(item);
                    setCancelDialogOpen(true);
                }}
            />

            <OutboundCancelDialog
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
                cancelTarget={cancelTarget}
                isCancelling={isCancelling}
                onConfirm={handleCancelConfirm}
            />

            <CreateOutboundDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={fetchItems}
            />

            <OutboundImportDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                onSuccess={fetchItems}
            />
        </div>
    );
}
