"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";
import type { InboundRequest, ReceiptStatus } from "@/services/inventory/inventory.types";

import "./inbound.css";

// Extracted Components
import { InboundHeader } from "@/components/dashboard/customer/inbound/InboundHeader";
import { InboundTable, ITEMS_PER_PAGE } from "@/components/dashboard/customer/inbound/InboundTable";
import { InboundCancelDialog } from "@/components/dashboard/customer/inbound/InboundCancelDialog";
import { CreateInboundDialog } from "@/components/dashboard/customer/inbound/CreateInboundDialog";

const inventoryService = new InventoryService();

export default function InboundListPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // ── List state ──
    const [items, setItems] = useState<InboundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<ReceiptStatus | "ALL">("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const debouncedKeywords = useDebounce(searchTerm, 500);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Dialog states ──
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<InboundRequest | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

            const res = await inventoryService.listInbound(token, {
                limit: ITEMS_PER_PAGE,
                offset: (currentPage - 1) * ITEMS_PER_PAGE,
                keywords: debouncedKeywords || undefined,
                status: activeTab === "ALL" ? undefined : activeTab,
            });

            if (res && res.data) {
                const data = res.data.items || [];
                const total = res.data.total || data.length;
                setItems(data);
                setTotalItems(total);
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error(String(err));
            if (errorObj.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            setError("Không thể tải danh sách phiếu nhập. Vui lòng thử lại sau.");
            showToast("Lỗi khi tải danh sách phiếu nhập kho.", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, activeTab, currentPage, router, showToast]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

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
            await inventoryService.cancelInbound(token, cancelTarget.id, "Người tạo phiếu tự hủy");
            showToast(`Phiếu ${cancelTarget.code} đã được hủy`, "success");
            setCancelDialogOpen(false);
            setCancelTarget(null);
            fetchItems();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Hủy phiếu thất bại";
            showToast(msg, "error");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleCreateSuccess = () => {
        fetchItems();
    };

    return (
        <div className="space-y-6">
            <InboundHeader
                totalItems={totalItems}
                searchTerm={searchTerm}
                onSearchChange={(val) => {
                    setSearchTerm(val);
                    setCurrentPage(1);
                }}
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                }}
                onCreateClick={() => setCreateDialogOpen(true)}
            />

            <InboundTable
                items={items}
                loading={loading}
                error={error}
                searchTerm={searchTerm}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onCreateClick={() => setCreateDialogOpen(true)}
                onCancelClick={(item) => {
                    setCancelTarget(item);
                    setCancelDialogOpen(true);
                }}
                onPageChange={setCurrentPage}
            />

            <InboundCancelDialog
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
                cancelTarget={cancelTarget}
                isCancelling={isCancelling}
                onConfirm={handleCancelConfirm}
            />

            <CreateInboundDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
}
