"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";
import { useOrganizationRealtime } from "@/hooks/useOrganizationRealtime";
import { orgHelper } from "@/lib/organization.utils";
import type { StockItem } from "@/services/inventory/inventory.types";

import { StockHeader } from "@/components/dashboard/organization/stock/StockHeader";
import { StockTable, ITEMS_PER_PAGE } from "@/components/dashboard/organization/stock/StockTable";

const inventoryService = new InventoryService();

const STOCK_REALTIME_EVENTS = [
    "inbound:putaway-confirmed",
    "outbound:shipment-completed",
    "stock:rebalanced",
];

export default function StockPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // ── State ──
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Filters ──
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
    const debouncedKeywords = useDebounce(searchTerm, 500);

    // ── Danh sách kho ──
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);

    // ── Org ID cho realtime ──
    const [orgId, setOrgId] = useState<string | null>(null);

    // ── Export ──
    const [isExporting, setIsExporting] = useState(false);

    // Tránh race condition khi fetch
    const fetchIdRef = useRef(0);

    // ── Lấy danh sách kho ──
    const fetchWarehouses = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const list = await inventoryService.listWarehouses(token);
            setWarehouses(list);
        } catch {
            // Không critical, bỏ qua
        }
    }, []);

    // ── Lấy tồn kho ──
    const fetchStock = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }

            const fetchId = ++fetchIdRef.current;
            setLoading(true);
            setError(null);

            const res = await inventoryService.listStock(token, {
                warehouse_id: selectedWarehouseId || undefined,
                keywords: debouncedKeywords || undefined,
                limit: ITEMS_PER_PAGE,
                offset: (currentPage - 1) * ITEMS_PER_PAGE,
            });

            // Bỏ qua nếu có fetch mới hơn đã trigger
            if (fetchId !== fetchIdRef.current) return;

            const data = res?.data;
            if (data) {
                setItems(data.items ?? []);
                setTotalItems(data.total ?? 0);
            }
        } catch (err) {
            const e = err instanceof Error ? err : new Error(String(err));
            if (e.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            setError("Không thể tải dữ liệu tồn kho. Vui lòng thử lại.");
            showToast("Lỗi khi tải tồn kho.", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, selectedWarehouseId, currentPage, router, showToast]);

    // ── Init org ID ──
    useEffect(() => {
        const init = async () => {
            if (orgId) return;
            const token = authStorage.getAccessToken();
            if (!token) return;
            try {
                const id = await orgHelper.getOrgId(token);
                setOrgId(id);
            } catch {
                // Bỏ qua
            }
        };
        void init();
    }, [orgId]);

    useEffect(() => {
        void fetchWarehouses();
    }, [fetchWarehouses]);

    useEffect(() => {
        void fetchStock();
    }, [fetchStock]);

    // Reset về trang 1 khi thay đổi filter
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedKeywords, selectedWarehouseId]);

    // ── Realtime ──
    useOrganizationRealtime({
        orgId,
        events: STOCK_REALTIME_EVENTS,
        enabled: !!orgId,
        onEvent: () => {
            void fetchStock();
        },
    });

    // ── Export Excel ──
    const handleExport = async () => {
        try {
            setIsExporting(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            const blob = await inventoryService.exportStock(
                token,
                selectedWarehouseId || undefined,
                debouncedKeywords || undefined,
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ton-kho-${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            showToast("Không thể xuất file Excel.", "error");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <StockHeader
                totalItems={totalItems}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedWarehouseId={selectedWarehouseId}
                onWarehouseChange={setSelectedWarehouseId}
                warehouses={warehouses}
                onExportClick={handleExport}
                isExporting={isExporting}
            />
            <StockTable
                items={items}
                loading={loading}
                error={error}
                searchTerm={searchTerm}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
