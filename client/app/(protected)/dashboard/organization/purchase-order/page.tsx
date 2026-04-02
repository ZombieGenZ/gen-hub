"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";
import { useOrganizationRealtime } from "@/hooks/useOrganizationRealtime";
import { orgHelper } from "@/lib/organization.utils";
import type { InboundRequest, ReceiptStatus } from "@/services/inventory/inventory.types";

import "./purchase-order.css";

// Extracted Components
import { InboundHeader } from "@/components/dashboard/organization/inbound/InboundHeader";
import { InboundTable, ITEMS_PER_PAGE } from "@/components/dashboard/organization/inbound/InboundTable";
import { InboundCancelDialog } from "@/components/dashboard/organization/inbound/InboundCancelDialog";
import { CreateInboundDialog } from "@/components/dashboard/organization/inbound/CreateInboundDialog";
import { InboundImportDialog } from "@/components/dashboard/organization/inbound/InboundImportDialog";

const inventoryService = new InventoryService();

const INBOUND_LIST_REALTIME_EVENTS = [
    "inbound:created",
    "inbound:approved",
    "inbound:cancelled",
    "inbound:receiving-started",
    "inbound:receiving-confirmed",
    "inbound:putaway-confirmed",
];

const INBOUND_LIST_REALTIME_TOAST_MESSAGES: Record<string, string> = {
    "inbound:created": "Có phiếu PO mới vừa được tạo",
    "inbound:approved": "Một phiếu PO đã được duyệt",
    "inbound:cancelled": "Một phiếu PO đã bị hủy",
    "inbound:receiving-started": "Đã bắt đầu kiểm đếm một phiếu PO",
    "inbound:receiving-confirmed": "Đã xác nhận kiểm đếm một phiếu PO",
    "inbound:putaway-confirmed": "Một phiếu PO đã hoàn tất nhập kho",
};

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
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null);
    const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRealtimeToastRef = useRef<{ key: string; at: number } | null>(null);
    const lastManualCancelRef = useRef<{ receiptId: string; at: number } | null>(null);

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
            setError("Không thể tải danh sách phiếu PO. Vui lòng thử lại sau.");
            showToast("Lỗi khi tải danh sách phiếu PO.", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, activeTab, currentPage, router, showToast]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems, showToast]);

    useEffect(() => {
        const resolveOrgId = async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const resolvedOrgId = await orgHelper.getOrgId(token);
                setOrgId(resolvedOrgId);
            } catch {
                // Keep list working even when orgId cannot be resolved.
            }
        };

        void resolveOrgId();
    }, []);

    useEffect(() => {
        return () => {
            if (realtimeRefreshTimeoutRef.current) {
                clearTimeout(realtimeRefreshTimeoutRef.current);
                realtimeRefreshTimeoutRef.current = null;
            }
        };
    }, []);

    const handleRealtimeEvent = useCallback((eventName: string, payload: unknown) => {
        if (realtimeRefreshTimeoutRef.current) {
            clearTimeout(realtimeRefreshTimeoutRef.current);
        }

        realtimeRefreshTimeoutRef.current = setTimeout(() => {
            void fetchItems();
        }, 250);

        const data = payload as { receiptId?: string; code?: string } | undefined;
        const receiptId = data?.receiptId;

        // Avoid duplicate toast when user just cancelled this receipt locally.
        if (eventName === "inbound:cancelled" && receiptId) {
            const lastManualCancel = lastManualCancelRef.current;
            if (
                lastManualCancel &&
                lastManualCancel.receiptId === receiptId &&
                Date.now() - lastManualCancel.at < 2000
            ) {
                return;
            }
        }

        const message = INBOUND_LIST_REALTIME_TOAST_MESSAGES[eventName];
        if (!message) return;

        const toastKey = `${eventName}:${receiptId ?? data?.code ?? "unknown"}`;
        const lastToast = lastRealtimeToastRef.current;
        if (lastToast && lastToast.key === toastKey && Date.now() - lastToast.at < 1500) {
            return;
        }

        const messageWithCode = data?.code ? `${message} (${data.code})` : message;
        showToast(messageWithCode, "success");
        lastRealtimeToastRef.current = { key: toastKey, at: Date.now() };
    }, [fetchItems, showToast]);

    useOrganizationRealtime({
        orgId,
        events: INBOUND_LIST_REALTIME_EVENTS,
        enabled: !!orgId,
        onEvent: handleRealtimeEvent,
    });

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
            lastManualCancelRef.current = { receiptId: cancelTarget.id, at: Date.now() };
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

    const handleExportExcel = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            setIsExporting(true);
            const blob = await inventoryService.exportInbound(token, {
                keywords: debouncedKeywords || undefined,
                status: activeTab === "ALL" ? undefined : activeTab,
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `purchase-order-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast("Xuất Excel thành công", "success");
        } catch {
            showToast("Không thể xuất Excel phiếu PO", "error");
        } finally {
            setIsExporting(false);
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
                onImportClick={() => setImportDialogOpen(true)}
                onExportClick={handleExportExcel}
                isExporting={isExporting}
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

            <InboundImportDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                onSuccess={fetchItems}
            />
        </div>
    );
}

