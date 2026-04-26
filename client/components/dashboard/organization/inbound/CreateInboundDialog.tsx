"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { ProductService } from "@/services/product/product.service";
import { PartnerService } from "@/services/partner/partner.service";
import { BatchService } from "@/services/batch/batch.service";
import { filterCodeInput, filterNotesInput } from "@/lib/validation.utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TrashIcon, InboxIcon, PhotoIcon, DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import { ProductSelector } from "@/components/dashboard/organization/common/ProductSelector";
import { ProductBrowseModal } from "@/components/dashboard/organization/common/ProductBrowseModal";
import { SupplierPOImportModal, type MatchedItem } from "@/components/dashboard/organization/inbound/SupplierPOImportModal";
import type { CreateInboundPayload, InboundDetailPayload } from "@/services/inventory/inventory.types";
import type { Product } from "@/services/product/product.types";
import type { Partner } from "@/services/partner/partner.types";
import type { Batch } from "@/services/batch/batch.types";

const inventoryService = new InventoryService();
const productService = new ProductService();
const partnerService = new PartnerService();
const batchService = new BatchService();

export interface DrawerItem {
    product: Product;
    batch_id?: string;
    batch_code?: string;
    manufacturing_date?: string;
    expiry_date?: string;
    expected_qty: number;
    unit_id: string;
}

/** Ảnh nhỏ trong row */
function RowProductImage({ src, alt }: { src: string | null; alt: string }) {
    if (src) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={src}
                alt={alt}
                className="w-9 h-9 rounded-xl object-cover shrink-0 border"
            />
        );
    }
    return (
        <div className="w-9 h-9 rounded-xl shrink-0 bg-muted flex items-center justify-center border">
            <PhotoIcon className="w-4 h-4 text-muted-foreground/40" />
        </div>
    );
}

/** Một dòng sản phẩm đã thêm vào phiếu — hiển thị theo Table layout */
function CreateItemRow({
    item,
    warehouseQty,
    onRemove,
    onUpdate,
}: {
    item: DrawerItem;
    index: number;
    /** Tồn kho trong kho đã chọn — undefined nếu chưa chọn kho */
    warehouseQty?: number;
    onRemove: () => void;
    onUpdate: (updates: Partial<DrawerItem>) => void;
}) {
    const token = authStorage.getAccessToken();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [showNewBatch, setShowNewBatch] = useState(false);
    const [newBatchCode, setNewBatchCode] = useState("");
    const [newMfgDate, setNewMfgDate] = useState("");
    const [newExpDate, setNewExpDate] = useState("");

    useEffect(() => {
        if (token && item.product.id) {
            batchService
                .listByProduct(token, item.product.id, { limit: 50 })
                .then((res) => setBatches(res?.data?.items || []))
                .catch(() => setBatches([]));
        }
    }, [token, item.product.id]);

    const availableUnits = useMemo(() => {
        const list: { id: string; name: string; conversion_rate: number }[] = [];
        if (item.product.base_unit) {
            list.push({
                id: item.product.base_unit_id,
                name: item.product.base_unit.name || "Đơn vị cơ bản",
                conversion_rate: 1,
            });
        }
        if (item.product.units && item.product.units.length > 0) {
            for (const pu of item.product.units) {
                if (pu.is_active && pu.unit) {
                    list.push({
                        id: pu.unit_id,
                        name: pu.unit.name || "—",
                        conversion_rate: pu.conversion_rate,
                    });
                }
            }
        }
        return list;
    }, [item.product]);

    const currentUnit = availableUnits.find((u) => u.id === item.unit_id);
    const conversionRate = currentUnit?.conversion_rate ?? 1;
    const baseUnitName = item.product.base_unit?.name || "đv";
    const convertedQty = item.expected_qty * conversionRate;

    return (
        <tr className="group hover:bg-muted/30 transition-colors">
            {/* Sản phẩm */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <RowProductImage
                        src={item.product.image_url}
                        alt={item.product.name}
                    />
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[180px]">
                            {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                    </div>
                </div>
            </td>

            {/* Số lượng */}
            <td className="px-4 py-3 w-[120px]">
                <Input
                    type="number"
                    min={1}
                    value={item.expected_qty}
                    onChange={(e) =>
                        onUpdate({ expected_qty: parseInt(e.target.value) || 1 })
                    }
                    className="rounded-xl h-9 text-sm w-full"
                    placeholder="SL"
                />
                {conversionRate > 1 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        = {convertedQty.toLocaleString("vi-VN")} {baseUnitName}
                    </p>
                )}
            </td>

            {/* Đơn vị */}
            <td className="px-4 py-3 w-[120px]">
                <Select
                    value={item.unit_id}
                    onValueChange={(v) => onUpdate({ unit_id: v })}
                >
                    <SelectTrigger className="rounded-xl h-9 text-xs w-full">
                        <SelectValue placeholder="Đơn vị" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableUnits.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                                <span>{u.name}</span>
                                {u.conversion_rate > 1 && (
                                    <span className="text-muted-foreground ml-1">
                                        (×{u.conversion_rate})
                                    </span>
                                )}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </td>

            {/* Lô hàng */}
            <td className="px-4 py-3 w-[160px]">
                <Select
                    value={item.batch_id ?? (item.batch_code ? "__custom__" : "__new__")}
                    onValueChange={(v) => {
                        if (v === "__new__") {
                            onUpdate({ batch_id: undefined, batch_code: undefined });
                            setShowNewBatch(true);
                        } else {
                            onUpdate({ batch_id: v, batch_code: undefined });
                            setShowNewBatch(false);
                        }
                    }}
                >
                    <SelectTrigger className="rounded-xl h-9 text-xs w-full">
                        <SelectValue placeholder="Chọn lô" />
                    </SelectTrigger>
                    <SelectContent>
                        {batches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                                {b.code}
                            </SelectItem>
                        ))}
                        <SelectItem value="__new__">+ Tạo lô mới</SelectItem>
                    </SelectContent>
                </Select>

                {/* Lô đã nhập thủ công */}
                {item.batch_code && (
                    <p className="text-[11px] text-[#0F766E] font-medium mt-1 truncate">
                        {item.batch_code}
                    </p>
                )}

                {/* Popover tạo lô mới */}
                {showNewBatch && (
                    <Popover open={showNewBatch} onOpenChange={setShowNewBatch}>
                        <PopoverTrigger asChild>
                            <button className="btn-raw text-xs text-[#0F766E] mt-1 underline">
                                Nhập thông tin lô
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4 space-y-3" align="start">
                            <p className="text-sm font-medium">Tạo lô hàng mới</p>
                            <div className="space-y-2">
                                <Label className="text-xs">Mã lô</Label>
                                <Input
                                    value={newBatchCode}
                                    onChange={(e) => setNewBatchCode(e.target.value)}
                                    className="rounded-xl h-8 text-xs"
                                    placeholder="VD: Nhập mã lô"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Ngày sản xuất</Label>
                                <Input
                                    type="date"
                                    value={newMfgDate}
                                    onChange={(e) => setNewMfgDate(e.target.value)}
                                    className="rounded-xl h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Hạn sử dụng</Label>
                                <Input
                                    type="date"
                                    value={newExpDate}
                                    onChange={(e) => setNewExpDate(e.target.value)}
                                    className="rounded-xl h-8 text-xs"
                                />
                            </div>
                            <Button
                                size="sm"
                                className="w-full rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                onClick={() => {
                                    onUpdate({
                                        batch_id: undefined,
                                        batch_code: newBatchCode,
                                        manufacturing_date: newMfgDate || undefined,
                                        expiry_date: newExpDate || undefined,
                                    });
                                    setShowNewBatch(false);
                                }}
                            >
                                Xác nhận
                            </Button>
                        </PopoverContent>
                    </Popover>
                )}
            </td>

            {/* Giá vốn */}
            <td className="px-4 py-3 w-[110px] text-right text-sm text-muted-foreground tabular-nums">
                {item.product.cost_price != null
                    ? item.product.cost_price.toLocaleString("vi-VN") + "đ"
                    : "—"}
            </td>

            {/* Tồn kho */}
            <td className="px-4 py-3 w-[90px] text-right text-sm tabular-nums">
                {warehouseQty != null ? (
                    <span
                        className={
                            warehouseQty <= 0
                                ? "text-red-500 font-medium"
                                : warehouseQty < 10
                                    ? "text-amber-600 font-medium"
                                    : "text-[#0F766E] font-medium"
                        }
                    >
                        {warehouseQty.toLocaleString("vi-VN")}
                    </span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </td>

            {/* Xóa */}
            <td className="px-4 py-3 w-[48px]">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={onRemove}
                >
                    <TrashIcon className="w-4 h-4" />
                </Button>
            </td>
        </tr>
    );
}

interface CreateInboundDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateInboundDialog({
    open,
    onOpenChange,
    onSuccess,
}: CreateInboundDialogProps) {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [browseOpen, setBrowseOpen] = useState(false);
    const [supplierPOOpen, setSupplierPOOpen] = useState(false);

    // Form states
    const [formWarehouse, setFormWarehouse] = useState("");
    const [formPartner, setFormPartner] = useState("");
    const [formPOCode, setFormPOCode] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formItems, setFormItems] = useState<DrawerItem[]>([]);

    // Data resources
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const debouncedProductSearch = useDebounce(productSearch, 300);
    const [isSyncingStock, setIsSyncingStock] = useState(false);

    const loadFormData = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        try {
            const [warehouseList, partnerRes, productRes] = await Promise.all([
                inventoryService.listWarehouses(token),
                partnerService.list(token, { limit: 100, type: "SUPPLIER" }),
                productService.list(token, {
                    limit: 20,
                    keywords: debouncedProductSearch || undefined,
                    warehouse_id: formWarehouse || undefined,
                }),
            ]);
            setWarehouses(warehouseList);
            setPartners(partnerRes?.data?.items || []);
            const freshProducts: Product[] = productRes?.data?.items || [];
            setProducts(freshProducts);

            setFormItems((prev) =>
                prev.map((item) => {
                    const updated = freshProducts.find((p) => p.id === item.product.id);
                    if (updated && updated.quantity_available !== undefined) {
                        return { ...item, product: { ...item.product, quantity_available: updated.quantity_available } };
                    }
                    return item;
                }),
            );
        } catch {
            // silent fail
        }
    }, [debouncedProductSearch, formWarehouse]);

    useEffect(() => {
        if (open) loadFormData();
    }, [open, loadFormData]);

    /**
     * Sync tồn kho real-time: khi kho thay đổi hoặc sản phẩm được thêm vào,
     * fetch lại quantity_available theo warehouse_id cụ thể.
     */
    const formItemProductIds = useMemo(
        () => formItems.map((i) => i.product.id).join(","),
        [formItems],
    );

    useEffect(() => {
        if (!formWarehouse || formItems.length === 0) return;

        const token = authStorage.getAccessToken();
        if (!token) return;

        let cancelled = false;
        setIsSyncingStock(true);

        productService
            .list(token, { limit: 100, warehouse_id: formWarehouse })
            .then((res) => {
                if (cancelled) return;
                const freshList: Product[] = res?.data?.items || [];

                setFormItems((prev) =>
                    prev.map((item) => {
                        const fresh = freshList.find((p) => p.id === item.product.id);
                        if (fresh !== undefined) {
                            return {
                                ...item,
                                product: {
                                    ...item.product,
                                    quantity_available: fresh.quantity_available,
                                },
                            };
                        }
                        return item;
                    }),
                );
            })
            .catch(() => { /* silent fail */ })
            .finally(() => {
                if (!cancelled) setIsSyncingStock(false);
            });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formWarehouse, formItemProductIds]);

    const resetForm = useCallback(() => {
        setFormWarehouse("");
        setFormPartner("");
        setFormPOCode("");
        setFormNotes("");
        setFormItems([]);
        setProductSearch("");
    }, []);

    const handleClose = useCallback(() => {
        if (!isSubmitting) {
            onOpenChange(false);
            resetForm();
        }
    }, [isSubmitting, onOpenChange, resetForm]);

    /** Thêm một sản phẩm (từ gợi ý hoặc barcode) */
    const addProduct = (product: Product, scannedBarcode?: string) => {
        if (formItems.find((i) => i.product.id === product.id)) return;

        let autoUnitId = product.base_unit_id || "";
        if (scannedBarcode && product.units) {
            const matchedUnit = product.units.find((pu) => pu.barcode === scannedBarcode);
            if (matchedUnit) autoUnitId = matchedUnit.unit_id;
        }
        setFormItems((prev) => [
            ...prev,
            { product, expected_qty: 1, unit_id: autoUnitId },
        ]);
        setProductSearch("");
    };

    /** Thêm nhiều sản phẩm từ ProductBrowseModal */
    const addMultipleProducts = (selected: Product[]) => {
        setFormItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.product.id));
            const newItems: DrawerItem[] = selected
                .filter((p) => !existingIds.has(p.id))
                .map((p) => ({
                    product: p,
                    expected_qty: 1,
                    unit_id: p.base_unit_id || "",
                }));
            return [...prev, ...newItems];
        });
    };

    /** Thêm sản phẩm từ phiếu NCC (với số lượng từ phiếu) */
    const handleSupplierPOImport = useCallback((items: MatchedItem[]) => {
        setFormItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.product.id));
            // Cập nhật qty nếu sản phẩm đã có, thêm mới nếu chưa có
            const updated = prev.map((existing) => {
                const fromPO = items.find((it) => it.product.id === existing.product.id);
                if (fromPO) return { ...existing, expected_qty: fromPO.qty };
                return existing;
            });
            const brandNew: DrawerItem[] = items
                .filter((it) => !existingIds.has(it.product.id))
                .map((it) => ({
                    product: it.product,
                    expected_qty: it.qty,
                    unit_id: it.product.base_unit_id || "",
                }));
            return [...updated, ...brandNew];
        });
    }, []);

    const handleSubmit = async () => {
        if (!formWarehouse) {
            showToast("Vui lòng chọn kho", "error");
            return;
        }
        if (!formPartner) {
            showToast("Vui lòng chọn nhà cung cấp", "error");
            return;
        }
        if (formItems.length === 0) {
            showToast("Vui lòng thêm ít nhất 1 sản phẩm", "error");
            return;
        }

        const token = authStorage.getAccessToken();
        if (!token) return;

        setIsSubmitting(true);
        try {
            const payload: CreateInboundPayload = {
                warehouse_id: formWarehouse,
                partner_id: formPartner || undefined,
                purchase_order_code: formPOCode || undefined,
                notes: formNotes || undefined,
                details: formItems.map((item) => {
                    const detail: InboundDetailPayload = {
                        product_id: item.product.id,
                        expected_qty: item.expected_qty,
                        unit_id: item.unit_id,
                    };
                    if (item.batch_id) {
                        detail.batch_id = item.batch_id;
                    } else if (item.batch_code) {
                        detail.batch_code = item.batch_code;
                        detail.manufacturing_date = item.manufacturing_date;
                        detail.expiry_date = item.expiry_date;
                    }
                    return detail;
                }),
            };
            await inventoryService.createInbound(token, payload);
            showToast("Tạo phiếu PO thành công! 🎉", "success");
            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Tạo phiếu PO thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredProducts = useMemo(() => {
        const addedIds = new Set(formItems.map((i) => i.product.id));
        return products.filter((p) => !addedIds.has(p.id));
    }, [products, formItems]);

    const addedIds = useMemo(
        () => formItems.map((i) => i.product.id),
        [formItems],
    );

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col overflow-hidden rounded-3xl p-0">
                    <DialogHeader className="p-6 border-b shrink-0">
                        <DialogTitle className="text-[20px] leading-[130%]">
                            Tạo phiếu PO
                        </DialogTitle>
                        <DialogDescription>
                            Nhập thông tin phiếu PO và thêm sản phẩm cần nhập kho
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {/* Section 1 — Thông tin chung */}
                        <div className="inbound-drawer__section">
                            <h3 className="inbound-drawer__section-title">1. Thông tin chung</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Kho nhập *</Label>
                                    <Select value={formWarehouse} onValueChange={setFormWarehouse}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Chọn kho" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((w) => (
                                                <SelectItem key={w.id} value={w.id}>
                                                    {w.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Nhà cung cấp *</Label>
                                    <Select value={formPartner} onValueChange={setFormPartner}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Chọn NCC" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {partners.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Mã PO tham chiếu</Label>
                                    <Input
                                        value={formPOCode}
                                        onChange={(e) => setFormPOCode(filterCodeInput(e.target.value))}
                                        placeholder="Nhập mã PO"
                                        maxLength={50}
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                <Label>Ghi chú</Label>
                                <Input
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(filterNotesInput(e.target.value))}
                                    placeholder="Ghi chú cho phiếu PO..."
                                    maxLength={500}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Section 2 — Chi tiết hàng hóa */}
                        <div className="inbound-drawer__section">
                            <h3 className="inbound-drawer__section-title">2. Chi tiết hàng hóa</h3>

                            {/* Toolbar: ProductSelector + Nút nhập từ NCC */}
                            <div className="mb-4 flex items-start gap-2">
                                <div className="flex-1">
                                    <ProductSelector
                                        value={productSearch}
                                        onChange={setProductSearch}
                                        suggestions={filteredProducts}
                                        onSelect={addProduct}
                                        onBrowse={() => setBrowseOpen(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && productSearch.trim()) {
                                                const barcode = productSearch.trim();
                                                const directMatch = products.find(
                                                    (p) => p.barcode === barcode,
                                                );
                                                if (directMatch) {
                                                    addProduct(directMatch, barcode);
                                                    return;
                                                }
                                                for (const p of products) {
                                                    if (p.units) {
                                                        const unitMatch = p.units.find(
                                                            (pu) => pu.barcode === barcode,
                                                        );
                                                        if (unitMatch) {
                                                            addProduct(p, barcode);
                                                            return;
                                                        }
                                                    }
                                                }
                                                if (filteredProducts.length === 1) {
                                                    addProduct(filteredProducts[0]);
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl h-10 shrink-0 gap-1.5 text-sm border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E]/10"
                                    onClick={() => setSupplierPOOpen(true)}
                                >
                                    <DocumentArrowDownIcon className="w-4 h-4" />
                                    Nhập từ phiếu NCC
                                </Button>
                            </div>

                            {/* Table sản phẩm đã thêm */}
                            {formItems.length > 0 ? (
                                <div className="border rounded-2xl overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-muted/40 border-b">
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                    Sản phẩm
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[120px]">
                                                    Số lượng
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[120px]">
                                                    Đơn vị
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[160px]">
                                                    Lô hàng
                                                </th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[110px]">
                                                    Giá vốn
                                                </th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[90px]">
                                                    <span className="flex items-center justify-end gap-1">
                                                        Tồn kho
                                                        {isSyncingStock && (
                                                            <svg className="animate-spin h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                            </svg>
                                                        )}
                                                    </span>
                                                </th>
                                                <th className="px-4 py-2.5 w-[48px]" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {formItems.map((item, idx) => (
                                                <CreateItemRow
                                                    key={item.product.id}
                                                    item={item}
                                                    index={idx}
                                                    warehouseQty={formWarehouse ? (item.product.quantity_available ?? 0) : undefined}
                                                    onRemove={() =>
                                                        setFormItems((prev) =>
                                                            prev.filter((_, i) => i !== idx),
                                                        )
                                                    }
                                                    onUpdate={(updates) =>
                                                        setFormItems((prev) =>
                                                            prev.map((it, i) =>
                                                                i === idx ? { ...it, ...updates } : it,
                                                            ),
                                                        )
                                                    }
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl">
                                    <InboxIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm font-medium">Chưa có sản phẩm nào</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Tìm kiếm hoặc chọn từ danh sách để thêm sản phẩm vào phiếu PO
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 bg-background border-t p-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{formItems.length}</span>{" "}
                            sản phẩm
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="rounded-xl"
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !formWarehouse || !formPartner || formItems.length === 0}
                                className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <svg
                                            className="animate-spin h-4 w-4"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Đang tạo...
                                    </span>
                                ) : (
                                    "Tạo phiếu PO"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal chọn hàng loạt */}
            <ProductBrowseModal
                open={browseOpen}
                onOpenChange={setBrowseOpen}
                alreadyAddedIds={addedIds}
                onConfirm={addMultipleProducts}
                warehouseId={formWarehouse || undefined}
                disableOutOfStock={false}
            />

            {/* Modal nhập từ phiếu NCC */}
            <SupplierPOImportModal
                open={supplierPOOpen}
                onOpenChange={setSupplierPOOpen}
                onImport={handleSupplierPOImport}
                warehouseId={formWarehouse || undefined}
            />
        </>
    );
}

