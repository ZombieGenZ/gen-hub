"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ProductService } from "@/services/product/product.service";
import type { Product } from "@/services/product/product.types";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";
import type { ProductQuickFilter } from "@/types/product-inventory";
import { InventoryService } from "@/services/inventory/inventory.service";
import BarcodeScannerQuickAdd from "@/components/products/BarcodeScannerQuickAdd";

// Components
import { ProductHeader } from "@/components/dashboard/customer/products/ProductHeader";
import { ProductTable, ITEMS_PER_PAGE } from "@/components/dashboard/customer/products/ProductTable";
import { ProductBulkActionBar } from "@/components/dashboard/customer/products/ProductBulkActionBar";
import { ProductDeleteDialogs } from "@/components/dashboard/customer/products/ProductDeleteDialogs";
import { BarcodeDialog } from "@/components/dashboard/customer/products/BarcodeDialog";

const productService = new ProductService();
const inventoryService = new InventoryService();
const IMG_API = process.env.NEXT_PUBLIC_API_URL || "";

export default function ProductMasterListPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // ── Data state ──
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [stockMap, setStockMap] = useState<Record<string, number>>({});

    // ── Selection ──
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // ── Dialogs ──
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    // ── Barcode dialog ──
    const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
    const [selectedBarcode, setSelectedBarcode] = useState({ code: "", name: "" });

    // ── Barcode scanner quick add ──
    const [scannerOpen, setScannerOpen] = useState(false);

    // ── Filters & Pagination ──
    const [searchTerm, setSearchTerm] = useState("");
    const [quickFilter, setQuickFilter] = useState<ProductQuickFilter>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const debouncedKeywords = useDebounce(searchTerm, 500);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Fetch products ──
    const fetchProducts = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }

            setLoading(true);
            setError(null);

            const offset = (currentPage - 1) * ITEMS_PER_PAGE;
            const result = await productService.list(token, {
                keywords: debouncedKeywords || undefined,
                limit: ITEMS_PER_PAGE,
                offset,
                is_active: true,
            });

            if (result?.data) {
                setProducts(result.data.items || []);
                setTotalItems(result.data.total || 0);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            setError("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.");
            showToast("Lỗi khi tải danh sách sản phẩm.", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, currentPage, router, showToast]);

    // ── Fetch stock ──
    const fetchStock = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await inventoryService.listStock(token);
            const items: { product_id: string; quantity_on_hand: number }[] =
                Array.isArray(res?.data) ? res.data
                    : Array.isArray((res?.data as any)?.items) ? (res.data as any).items
                        : Array.isArray(res) ? (res as any) : [];
            const map: Record<string, number> = {};
            items.forEach((item) => {
                map[item.product_id] = (map[item.product_id] || 0) + (item.quantity_on_hand ?? 0);
            });
            setStockMap(map);
        } catch (err) {
            console.error('Failed to fetch stock:', err);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
        fetchStock();
    }, [fetchProducts, fetchStock]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedKeywords, quickFilter]);

    // ── Handlers ──
    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((item) => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === products.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(products.map((p) => p.id));
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await productService.delete(token, deleteTarget.id);
            showToast(`Đã xóa "${deleteTarget.name}" 🗑️`, "success");
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            setSelectedIds([]);
            fetchProducts();
        } catch {
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
            await productService.deleteMany(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} sản phẩm thành công! 🗑️`, "success");
            setIsBulkDeleteDialogOpen(false);
            setSelectedIds([]);
            fetchProducts();
        } catch {
            showToast("Xóa thất bại, vui lòng thử lại", "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleViewDetail = (id: string) => router.push(`/dashboard/customer/products/${id}`);

    const handleShowBarcode = (barcode: string, name: string) => {
        setSelectedBarcode({ code: barcode, name });
        setBarcodeDialogOpen(true);
    };

    const filteredProducts = (() => {
        if (quickFilter === "low_stock") {
            return products.filter((p) => (stockMap[p.id] ?? 0) <= 10);
        }
        if (quickFilter === "expiring_soon") {
            return products;
        }
        return products;
    })();

    return (
        <div className="flex-1 overflow-auto bg-slate-50/50">
            <main className="pt-0 py-4 px-4 space-y-6">
                <ProductHeader
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    quickFilter={quickFilter}
                    onQuickFilterChange={setQuickFilter}
                    onScannerOpen={() => setScannerOpen(true)}
                    onCreateClick={() => router.push("/dashboard/customer/products/create")}
                />

                <ProductTable
                    products={filteredProducts}
                    totalProductsOnPage={products.length}
                    loading={loading}
                    searchTerm={searchTerm}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                    toggleSelectAll={toggleSelectAll}
                    handleViewDetail={handleViewDetail}
                    handleShowBarcode={handleShowBarcode}
                    setDeleteTarget={setDeleteTarget}
                    setDeleteDialogOpen={setDeleteDialogOpen}
                    stockMap={stockMap}
                    IMG_API={IMG_API}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    setCurrentPage={setCurrentPage}
                />

                <ProductBulkActionBar
                    selectedIdsCount={selectedIds.length}
                    onDeleteClick={() => setIsBulkDeleteDialogOpen(true)}
                    onClearSelection={() => setSelectedIds([])}
                />

                <ProductDeleteDialogs
                    deleteDialogOpen={deleteDialogOpen}
                    setDeleteDialogOpen={setDeleteDialogOpen}
                    deleteTarget={deleteTarget}
                    handleDeleteConfirm={handleDeleteConfirm}
                    isDeleteLoading={isDeleteLoading}
                    isBulkDeleteDialogOpen={isBulkDeleteDialogOpen}
                    setIsBulkDeleteDialogOpen={setIsBulkDeleteDialogOpen}
                    handleBulkDelete={handleBulkDelete}
                    isBulkActionLoading={isBulkActionLoading}
                    selectedIdsCount={selectedIds.length}
                />

                <BarcodeDialog
                    open={barcodeDialogOpen}
                    onClose={() => setBarcodeDialogOpen(false)}
                    barcode={selectedBarcode.code}
                    productName={selectedBarcode.name}
                />

                <BarcodeScannerQuickAdd
                    open={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onProductCreated={fetchProducts}
                />
            </main>
        </div>
    );
}
