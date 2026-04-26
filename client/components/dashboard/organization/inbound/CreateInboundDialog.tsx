"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TrashIcon, InboxIcon, PhotoIcon, DocumentArrowDownIcon, CalendarDaysIcon, SparklesIcon, PlusCircleIcon, XMarkIcon, BuildingStorefrontIcon, ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
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
    onOpenBatchSheet,
}: {
    item: DrawerItem;
    index: number;
    /** Tồn kho trong kho đã chọn — undefined nếu chưa chọn kho */
    warehouseQty?: number;
    onRemove: () => void;
    onUpdate: (updates: Partial<DrawerItem>) => void;
    onOpenBatchSheet: () => void;
}) {
    const token = authStorage.getAccessToken();
    const [batches, setBatches] = useState<Batch[]>([]);
    // Combobox state
    const [batchComboOpen, setBatchComboOpen] = useState(false);
    const [batchSearch, setBatchSearch] = useState("");

    useEffect(() => {
        if (token && item.product.id) {
            batchService
                .listByProduct(token, item.product.id, { limit: 100 })
                .then((res) => setBatches(res?.data?.items || []))
                .catch(() => setBatches([]));
        }
    }, [token, item.product.id]);

    /** Lọc lô theo search */
    const filteredBatches = useMemo(() => {
        const q = batchSearch.trim().toLowerCase();
        if (!q) return batches;
        return batches.filter((b) => b.code.toLowerCase().includes(q));
    }, [batches, batchSearch]);

    /** Tìm batch đang chọn để hiển thị info */
    const selectedBatch = useMemo(
        () => (item.batch_id ? batches.find((b) => b.id === item.batch_id) : undefined),
        [item.batch_id, batches],
    );

    /** Format ngày ngắn gọn dd/MM/yyyy */
    const fmtDate = (d?: string | null) => {
        if (!d) return null;
        try {
            const dt = new Date(d);
            return dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
        } catch {
            return d;
        }
    };

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
        <tr className="group hover:bg-muted/30 transition-colors align-top">
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

            {/* Lô hàng — Combobox + Sheet */}
            <td className="px-4 py-3 w-[200px]">
                {/* ── Combobox trigger ── */}
                <Popover open={batchComboOpen} onOpenChange={(o) => { setBatchComboOpen(o); if (!o) setBatchSearch(""); }}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                "w-full flex items-center justify-between gap-1.5 rounded-xl border bg-background px-3 h-9 text-xs transition-colors hover:bg-accent",
                                (item.batch_id || item.batch_code) ? "border-[#0F766E]/40 text-foreground" : "border-input text-muted-foreground",
                            )}
                        >
                            <span className="truncate">
                                {item.batch_id
                                    ? (batches.find((b) => b.id === item.batch_id)?.code ?? "Lô đã chọn")
                                    : item.batch_code
                                        ? item.batch_code
                                        : "Chọn lô hàng..."}
                            </span>
                            <ChevronDownIcon className="w-3.5 h-3.5 shrink-0 opacity-50" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-64" align="start" side="bottom">
                        {/* Search */}
                        <div className="p-2 border-b">
                            <div className="relative">
                                <input
                                    className="w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus:border-[#0F766E]/50"
                                    placeholder="Tìm mã lô..."
                                    value={batchSearch}
                                    onChange={(e) => setBatchSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Danh sách lô */}
                        <div className="max-h-48 overflow-y-auto py-1">
                            {/* Không chọn lô */}
                            <button
                                type="button"
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors"
                                onClick={() => { onUpdate({ batch_id: undefined, batch_code: undefined, manufacturing_date: undefined, expiry_date: undefined }); setBatchComboOpen(false); }}
                            >
                                <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground/60" />
                                <span className="text-muted-foreground italic">Không chọn lô</span>
                            </button>

                            {filteredBatches.length === 0 && batchSearch && (
                                <p className="px-3 py-3 text-center text-xs text-muted-foreground">Không tìm thấy lô</p>
                            )}

                            {filteredBatches.map((b) => (
                                <button
                                    key={b.id}
                                    type="button"
                                    className={cn(
                                        "w-full flex items-start gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors text-left",
                                        item.batch_id === b.id && "bg-[#0F766E]/8",
                                    )}
                                    onClick={() => { onUpdate({ batch_id: b.id, batch_code: undefined }); setBatchComboOpen(false); setBatchSearch(""); }}
                                >
                                    <CheckIcon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", item.batch_id === b.id ? "text-[#0F766E]" : "opacity-0")} />
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{b.code}</p>
                                        {b.expiry_date && (
                                            <p className={cn("text-[10px] mt-0.5", new Date(b.expiry_date) < new Date() ? "text-red-500" : "text-muted-foreground")}>
                                                HSD: {fmtDate(b.expiry_date)}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Nút tạo lô mới — cố định dưới */}
                        <div className="p-2 border-t">
                            <button
                                type="button"
                                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#0F766E] hover:bg-[#0F766E]/8 transition-colors border border-dashed border-[#0F766E]/30 hover:border-[#0F766E]/50"
                                onClick={onOpenBatchSheet}
                            >
                                <PlusCircleIcon className="w-4 h-4" />
                                Tạo lô hàng mới
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Info lô đã chọn */}
                {selectedBatch && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarDaysIcon className="w-3 h-3 shrink-0" />
                        <span className={selectedBatch.expiry_date && new Date(selectedBatch.expiry_date) < new Date() ? "text-red-500 font-medium" : ""}>
                            {selectedBatch.expiry_date ? `HSD: ${fmtDate(selectedBatch.expiry_date)}` : "Không có HSD"}
                        </span>
                    </div>
                )}

                {/* Badge lô mới tạo (custom) */}
                {item.batch_code && (
                    <div className="mt-1.5 space-y-0.5">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0F766E]/10 text-[#0F766E] max-w-full">
                            <span className="text-[10px] font-semibold truncate">{item.batch_code}</span>
                            <button type="button" className="btn-raw p-0 shrink-0 hover:text-destructive" onClick={() => onUpdate({ batch_code: undefined, manufacturing_date: undefined, expiry_date: undefined })}>
                                <XMarkIcon className="w-3 h-3" />
                            </button>
                        </div>
                        {(item.manufacturing_date || item.expiry_date) && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <CalendarDaysIcon className="w-3 h-3 shrink-0" />
                                {item.manufacturing_date && <span>NSX: {fmtDate(item.manufacturing_date)}</span>}
                                {item.manufacturing_date && item.expiry_date && <span>·</span>}
                                {item.expiry_date && <span>HSD: {fmtDate(item.expiry_date)}</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Sheet tạo lô mới — render tại parent để tránh conflict Dialog ── */}
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

    // Sheet tạo lô mới — render ngoài Dialog để tránh conflict overlay
    const [batchSheetOpen, setBatchSheetOpen] = useState(false);
    const [batchSheetItemIdx, setBatchSheetItemIdx] = useState<number>(-1);
    const [newBatchCode, setNewBatchCode] = useState("");
    const [newMfgDate, setNewMfgDate] = useState("");
    const [newExpDate, setNewExpDate] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const [batchCodeError, setBatchCodeError] = useState("");

    /** Tự sinh mã lô */
    const generateBatchCode = useCallback(() => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
        setNewBatchCode(`LOT-${dateStr}-${rand}`);
        setBatchCodeError("");
    }, []);

    /** Xác nhận tạo lô mới, update item tương ứng */
    const confirmNewBatch = useCallback(() => {
        const trimmed = newBatchCode.trim();
        if (!trimmed) { setBatchCodeError("Mã lô không được để trống"); return; }
        setFormItems((prev) =>
            prev.map((it, i) =>
                i === batchSheetItemIdx
                    ? { ...it, batch_id: undefined, batch_code: trimmed, manufacturing_date: newMfgDate || undefined, expiry_date: newExpDate || undefined }
                    : it,
            ),
        );
        setBatchSheetOpen(false);
        setBatchCodeError("");
    }, [newBatchCode, newMfgDate, newExpDate, batchSheetItemIdx]);

    /** Mở Sheet tạo lô cho item index */
    const openBatchSheet = useCallback((idx: number) => {
        setBatchSheetItemIdx(idx);
        setNewBatchCode("");
        setNewMfgDate("");
        setNewExpDate("");
        setNewNotes("");
        setBatchCodeError("");
        setBatchSheetOpen(true);
    }, []);
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
    const [stockRefreshTick, setStockRefreshTick] = useState(0);
    const [partnerSearch, setPartnerSearch] = useState("");
    const [partnerPopoverOpen, setPartnerPopoverOpen] = useState(false);

    const filteredPartners = useMemo(() => {
        const q = partnerSearch.trim().toLowerCase();
        if (!q) return partners;
        return partners.filter((p) =>
            p.name?.toLowerCase().includes(q) ||
            p.code?.toLowerCase().includes(q),
        );
    }, [partners, partnerSearch]);

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
     * Polling: cứ 30 giây làm mới tồn kho khi dialog đang mở và có sản phẩm
     */
    useEffect(() => {
        if (!open || !formWarehouse || formItems.length === 0) return;
        const timer = setInterval(() => setStockRefreshTick((t) => t + 1), 30_000);
        return () => clearInterval(timer);
    }, [open, formWarehouse, formItems.length]);

    /**
     * Sync tồn kho: khi kho thay đổi, sản phẩm được thêm/xóa, hoặc polling tick.
     * Fetch từng sản phẩm theo SKU để tránh bỏ sót do phân trang.
     */
    const formItemProductIds = useMemo(
        () => formItems.map((i) => i.product.id).join(","),
        [formItems],
    );

    // Snapshot id+sku chỉ thay đổi khi tập sản phẩm thay đổi (không đổi khi qty thay đổi)
    const formItemSyncKeys = useMemo(
        () => formItems.map((i) => ({ id: i.product.id, sku: i.product.sku })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [formItemProductIds],
    );

    useEffect(() => {
        if (!formWarehouse || formItemSyncKeys.length === 0) return;

        const token = authStorage.getAccessToken();
        if (!token) return;

        let cancelled = false;
        setIsSyncingStock(true);

        // Fetch từng sản phẩm theo SKU để đảm bảo không bị phân trang bỏ sót
        Promise.all(
            formItemSyncKeys.map(({ id, sku }) =>
                productService
                    .list(token, {
                        limit: sku ? 5 : 100,
                        keywords: sku || undefined,
                        warehouse_id: formWarehouse,
                    })
                    .then((res) => {
                        const match = (res?.data?.items || []).find((p) => p.id === id);
                        return { id, qty: match?.quantity_available };
                    })
                    .catch(() => ({ id, qty: undefined as number | undefined })),
            ),
        )
            .then((results) => {
                if (cancelled) return;
                setFormItems((prev) =>
                    prev.map((item) => {
                        const result = results.find((r) => r.id === item.product.id);
                        if (result && result.qty !== undefined) {
                            return {
                                ...item,
                                product: { ...item.product, quantity_available: result.qty },
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
    }, [formWarehouse, formItemProductIds, stockRefreshTick]);

    const resetForm = useCallback(() => {
        setFormWarehouse("");
        setFormPartner("");
        setFormPOCode("");
        setFormNotes("");
        setFormItems([]);
        setProductSearch("");
        setPartnerSearch("");
        setPartnerPopoverOpen(false);
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
        if (!formPartner && !partnerSearch.trim()) {
            showToast("Vui lòng chọn hoặc nhập nhà cung cấp", "error");
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
                notes: !formPartner && partnerSearch.trim()
                    ? `[NCC: ${partnerSearch.trim()}] ${formNotes}`.trim()
                    : formNotes || undefined,
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
                <DialogContent
                    className="sm:max-w-4xl max-h-[88vh] flex flex-col overflow-hidden rounded-3xl p-0"
                    onPointerDownOutside={(e) => { if (batchSheetOpen) e.preventDefault(); }}
                    onInteractOutside={(e) => { if (batchSheetOpen) e.preventDefault(); }}
                >
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
                                    <Label className="flex items-center gap-1.5">
                                        <BuildingStorefrontIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                        Nhà cung cấp *
                                    </Label>
                                    <Popover open={partnerPopoverOpen} onOpenChange={setPartnerPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <div className="relative">
                                                <Input
                                                    className="rounded-xl pr-10"
                                                    placeholder="Gõ tên nhà cung cấp..."
                                                    value={partnerSearch}
                                                    onChange={(e) => {
                                                        setPartnerSearch(e.target.value);
                                                        setPartnerPopoverOpen(true);
                                                        if (formPartner) setFormPartner("");
                                                    }}
                                                    onFocus={() => {
                                                        if (partners.length > 0) setPartnerPopoverOpen(true);
                                                    }}
                                                />
                                                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" />
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="p-0"
                                            align="start"
                                            onOpenAutoFocus={(e) => e.preventDefault()}
                                            style={{ width: "var(--radix-popover-trigger-width)" }}
                                        >
                                            <div className="max-h-52 overflow-y-auto py-1">
                                                {filteredPartners.length === 0 ? (
                                                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">Không tìm thấy nhà cung cấp</p>
                                                ) : (
                                                    filteredPartners.map((p) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                                                            onClick={() => {
                                                                setFormPartner(p.id);
                                                                setPartnerSearch(p.name || "");
                                                                setPartnerPopoverOpen(false);
                                                            }}
                                                        >
                                                            <CheckIcon
                                                                className={cn(
                                                                    "w-4 h-4 shrink-0",
                                                                    formPartner === p.id ? "opacity-100 text-teal-600" : "opacity-0",
                                                                )}
                                                            />
                                                            <div className="flex flex-col text-left">
                                                                <span>{p.name}</span>
                                                                {p.code && (
                                                                    <span className="text-xs text-muted-foreground">{p.code}</span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
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
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[200px]">
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
                                                    onOpenBatchSheet={() => openBatchSheet(idx)}
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

            {/* Modal tạo lô hàng mới — dùng createPortal để tránh conflict với Radix Dialog */}
            {batchSheetOpen && createPortal(
                <div
                    className="fixed inset-0 z-100 bg-black/50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
                    onClick={() => setBatchSheetOpen(false)}
                >
                    {/* Modal content */}
                    <div
                        className="bg-white rounded-2xl w-full max-w-120 flex flex-col shadow-2xl max-h-[90vh] animate-in fade-in-0 zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b flex items-start justify-between shrink-0">
                            <div>
                                <h2 className="text-[20px] font-semibold leading-[130%]">Tạo lô hàng mới</h2>
                                {batchSheetItemIdx >= 0 && formItems[batchSheetItemIdx] && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Sản phẩm: <span className="font-semibold text-foreground">{formItems[batchSheetItemIdx].product.name}</span>
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setBatchSheetOpen(false)}
                                className="rounded-sm opacity-70 transition-opacity hover:opacity-100 ml-4 mt-0.5"
                                aria-label="Đóng"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {/* Mã lô */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Mã lô hàng <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newBatchCode}
                                        onChange={(e) => { setNewBatchCode(e.target.value); if (batchCodeError) setBatchCodeError(""); }}
                                        className={cn("rounded-xl flex-1", batchCodeError && "border-red-400 focus-visible:ring-red-400")}
                                        placeholder="VD: LOT-2026-001"
                                        maxLength={50}
                                    />
                                    <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" title="Tự sinh mã lô" onClick={generateBatchCode}>
                                        <SparklesIcon className="w-4 h-4 text-[#0F766E]" />
                                    </Button>
                                </div>
                                {batchCodeError && <p className="text-xs text-red-500 flex items-center gap-1"><XMarkIcon className="w-3.5 h-3.5" />{batchCodeError}</p>}
                                <p className="text-xs text-muted-foreground">Mã lô phải duy nhất trong toàn bộ sản phẩm này.</p>
                            </div>

                            {/* NSX + HSD */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-1.5">
                                        <CalendarDaysIcon className="w-4 h-4 text-muted-foreground" />
                                        Ngày sản xuất
                                    </Label>
                                    <Input type="date" value={newMfgDate} onChange={(e) => setNewMfgDate(e.target.value)} className="rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-1.5">
                                        <CalendarDaysIcon className="w-4 h-4 text-amber-500" />
                                        <span className="text-amber-600">Hạn sử dụng</span>
                                    </Label>
                                    <Input type="date" value={newExpDate} onChange={(e) => setNewExpDate(e.target.value)} className="rounded-xl" min={newMfgDate || undefined} />
                                </div>
                            </div>

                            {/* Ghi chú lô */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Ghi chú lô</Label>
                                <Textarea
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    placeholder="Thông tin thêm về lô hàng này..."
                                    className="rounded-xl resize-none"
                                    rows={3}
                                    maxLength={500}
                                />
                            </div>

                            {/* Tóm tắt */}
                            {(newBatchCode || newMfgDate || newExpDate) && (
                                <div className="rounded-xl bg-muted/50 border p-4 space-y-1.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tóm tắt lô</p>
                                    {newBatchCode && <p className="text-sm font-medium">{newBatchCode.trim()}</p>}
                                    {newMfgDate && <p className="text-xs text-muted-foreground">NSX: {newMfgDate}</p>}
                                    {newExpDate && <p className={cn("text-xs", new Date(newExpDate) < new Date() ? "text-red-500" : "text-muted-foreground")}>HSD: {newExpDate}</p>}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 border-t px-6 py-4 flex gap-3">
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setBatchSheetOpen(false)}>
                                Hủy
                            </Button>
                            <Button
                                className="flex-1 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-2"
                                onClick={confirmNewBatch}
                            >
                                <CheckIcon className="w-4 h-4" />
                                Xác nhận lô
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

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

