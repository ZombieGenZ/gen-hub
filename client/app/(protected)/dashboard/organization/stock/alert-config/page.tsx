"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryAlertService } from "@/services/inventory-alert/inventory-alert.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { ProductService } from "@/services/product/product.service";
import { useToast } from "@/contexts/ToastContext";
import type { AlertConfig, CreateAlertConfigPayload } from "@/services/inventory-alert/inventory-alert.types";
import type { Product } from "@/services/product/product.types";

const alertService = new InventoryAlertService();
const inventoryService = new InventoryService();
const productService = new ProductService();

const DEFAULT_FORM: CreateAlertConfigPayload = {
    warehouse_id: "",
    product_id: "",
    min_quantity: 0,
    reorder_point: 0,
    lead_time_days: 7,
    is_active: true,
};

export default function AlertConfigPage() {
    const router = useRouter();
    const { showToast } = useToast();

    const [configs, setConfigs] = useState<AlertConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<CreateAlertConfigPayload>(DEFAULT_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [productSearch, setProductSearch] = useState("");
    const [productLoading, setProductLoading] = useState(false);

    // Delete state
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchConfigs = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            setLoading(true);
            const data = await alertService.listConfigs(token, selectedWarehouseId || undefined);
            setConfigs(data);
        } catch {
            showToast("Không thể tải cấu hình cảnh báo.", "error");
        } finally {
            setLoading(false);
        }
    }, [selectedWarehouseId, router, showToast]);

    const fetchWarehouses = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const list = await inventoryService.listWarehouses(token);
            setWarehouses(list);
        } catch {
            // không critical
        }
    }, []);

    const fetchProducts = useCallback(async (keywords?: string) => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setProductLoading(true);
            const res = await productService.list(token, {
                keywords: keywords || undefined,
                limit: 50,
                offset: 0,
            });
            const items = (res as any)?.data?.items ?? (res as any)?.items ?? [];
            setProducts(items);
        } catch {
            // không critical
        } finally {
            setProductLoading(false);
        }
    }, []);

    useEffect(() => { void fetchWarehouses(); }, [fetchWarehouses]);
    useEffect(() => { void fetchConfigs(); }, [fetchConfigs]);

    // Tải sản phẩm khi mở form
    useEffect(() => {
        if (showForm) void fetchProducts(productSearch);
    }, [showForm, productSearch, fetchProducts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.warehouse_id || !form.product_id) {
            showToast("Vui lòng chọn kho và sản phẩm.", "error");
            return;
        }
        try {
            setSubmitting(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            await alertService.upsertConfig(token, form);
            showToast("Đã lưu cấu hình cảnh báo.", "success");
            setShowForm(false);
            setForm(DEFAULT_FORM);
            void fetchConfigs();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Lỗi không xác định";
            showToast(`Không thể lưu: ${msg}`, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            const token = authStorage.getAccessToken();
            if (!token) return;
            await alertService.deleteConfig(token, id);
            showToast("Đã xóa cấu hình.", "success");
            setConfigs((prev) => prev.filter((c) => c.id !== id));
        } catch {
            showToast("Không thể xóa cấu hình.", "error");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Cấu hình Cảnh báo Tồn kho</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Thiết lập ngưỡng cảnh báo cho từng sản phẩm tại từng kho. Hệ thống sẽ tự động quét mỗi 6 giờ và gửi thông báo khi cần.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setForm(DEFAULT_FORM); }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <span>+</span> Thêm cấu hình
                </button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Lọc theo kho:</label>
                <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                    <option value="">Tất cả kho</option>
                    {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                        Đang tải...
                    </div>
                ) : configs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                        <div className="text-4xl">🔔</div>
                        <p className="text-sm font-medium text-muted-foreground">Chưa có cấu hình cảnh báo nào</p>
                        <p className="text-xs text-muted-foreground">Nhấn "+ Thêm cấu hình" để bắt đầu theo dõi tồn kho</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/30">
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sản phẩm</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kho</th>
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tối thiểu</th>
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Điểm đặt hàng</th>
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Lead time</th>
                                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {configs.map((cfg) => (
                                <tr key={cfg.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{cfg.product?.name ?? cfg.product_id}</div>
                                        {cfg.product?.sku && (
                                            <div className="text-xs text-muted-foreground">SKU: {cfg.product.sku}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {cfg.warehouse?.name ?? cfg.warehouse_id}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {Number(cfg.min_quantity).toLocaleString("vi-VN")}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {Number(cfg.reorder_point).toLocaleString("vi-VN")}
                                    </td>
                                    <td className="px-4 py-3 text-right text-muted-foreground">
                                        {cfg.lead_time_days} ngày
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            cfg.is_active
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-500"
                                        }`}>
                                            {cfg.is_active ? "Đang bật" : "Tắt"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleDelete(cfg.id)}
                                            disabled={deletingId === cfg.id}
                                            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                                        >
                                            {deletingId === cfg.id ? "Đang xóa..." : "Xóa"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Form Dialog */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="font-semibold text-base">Thêm cấu hình cảnh báo</h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            {/* Kho */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Kho <span className="text-red-500">*</span></label>
                                <select
                                    value={form.warehouse_id}
                                    onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
                                    required
                                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value="">Chọn kho...</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Sản phẩm */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Sản phẩm <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Tìm sản phẩm..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                {productLoading ? (
                                    <p className="text-xs text-muted-foreground">Đang tải...</p>
                                ) : (
                                    <select
                                        value={form.product_id}
                                        onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                                        required
                                        size={5}
                                        className="w-full text-sm border border-input rounded-lg px-3 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                        <option value="">Chọn sản phẩm...</option>
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.sku ? `(${p.sku})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Ngưỡng tối thiểu */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Số lượng tối thiểu</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={form.min_quantity}
                                        onChange={(e) => setForm((f) => ({ ...f, min_quantity: Number(e.target.value) }))}
                                        className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                    <p className="text-xs text-muted-foreground">Cảnh báo khi tồn kho &lt;= mức này</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Điểm đặt hàng</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={form.reorder_point}
                                        onChange={(e) => setForm((f) => ({ ...f, reorder_point: Number(e.target.value) }))}
                                        className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                    <p className="text-xs text-muted-foreground">Trigger đặt hàng bổ sung</p>
                                </div>
                            </div>

                            {/* Lead time */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Thời gian giao hàng (ngày)</label>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={form.lead_time_days}
                                    onChange={(e) => setForm((f) => ({ ...f, lead_time_days: Number(e.target.value) }))}
                                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                <p className="text-xs text-muted-foreground">Số ngày để nhà cung cấp giao hàng tới kho</p>
                            </div>

                            {/* Trạng thái */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={form.is_active ?? true}
                                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                                    className="w-4 h-4 rounded border-input"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium">Kích hoạt ngay</label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
                                >
                                    {submitting ? "Đang lưu..." : "Lưu cấu hình"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
