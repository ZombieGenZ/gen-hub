"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { ProductService } from "@/services/product/product.service";
import { PartnerService } from "@/services/partner/partner.service";
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
import { TrashIcon, InboxIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { ProductSelector } from "@/components/dashboard/organization/common/ProductSelector";
import { ProductBrowseModal } from "@/components/dashboard/organization/common/ProductBrowseModal";
import type {
    CreateOutboundPayload,
    OutboundDetailPayload,
    PickingStrategy,
} from "@/services/inventory/inventory.types";
import type { Product } from "@/services/product/product.types";
import type { Partner } from "@/services/partner/partner.types";

const inventoryService = new InventoryService();
const productService = new ProductService();
const partnerService = new PartnerService();

interface DrawerItem {
    product: Product;
    quantity: number;
    unit_id: string;
    required_batch_id?: string;
    stockError?: string;
}

const STRATEGY_OPTIONS: {
    value: PickingStrategy | "MANUAL";
    title: string;
    desc: string;
}[] = [
    { value: "FEFO", title: "FEFO", desc: "Hết hạn trước, xuất trước" },
    { value: "FIFO", title: "FIFO", desc: "Nhập trước, xuất trước" },
    { value: "MANUAL", title: "Thủ công", desc: "Chọn lô thủ công" },
];

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

interface CreateOutboundDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateOutboundDialog({
    open,
    onOpenChange,
    onSuccess,
}: CreateOutboundDialogProps) {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [browseOpen, setBrowseOpen] = useState(false);

    // Form states
    const [formWarehouse, setFormWarehouse] = useState("");
    const [formPartner, setFormPartner] = useState("");
    const [formSOCode, setFormSOCode] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formStrategy, setFormStrategy] = useState<PickingStrategy | "MANUAL">("FEFO");
    const [formItems, setFormItems] = useState<DrawerItem[]>([]);

    // Data resources
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const debouncedProductSearch = useDebounce(productSearch, 300);

    const loadFormData = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        try {
            const [warehouseRes, partnerRes, productRes] = await Promise.all([
                inventoryService.listWarehouses(token),
                partnerService.list(token, { limit: 100 }),
                productService.list(token, {
                    limit: 20,
                    keywords: debouncedProductSearch || undefined,
                }),
            ]);
            setWarehouses(Array.isArray(warehouseRes) ? warehouseRes : []);

            const pList = Array.isArray(partnerRes)
                ? partnerRes
                : Array.isArray((partnerRes as unknown as { data: { items: Partner[] } })?.data?.items)
                  ? (partnerRes as unknown as { data: { items: Partner[] } }).data.items
                  : [];
            setPartners(pList);

            const prList = Array.isArray(productRes)
                ? productRes
                : Array.isArray(
                        (productRes as unknown as { data: { items: Product[] } })?.data?.items,
                    )
                  ? (productRes as unknown as { data: { items: Product[] } }).data.items
                  : [];
            setProducts(prList);
        } catch {
            // silent fail
        }
    }, [debouncedProductSearch]);

    useEffect(() => {
        if (open) loadFormData();
    }, [open, loadFormData]);

    const resetForm = useCallback(() => {
        setFormWarehouse("");
        setFormPartner("");
        setFormSOCode("");
        setFormNotes("");
        setFormStrategy("FEFO");
        setFormItems([]);
        setProductSearch("");
    }, []);

    const handleClose = useCallback(() => {
        if (!isSubmitting) {
            onOpenChange(false);
            resetForm();
        }
    }, [isSubmitting, onOpenChange, resetForm]);

    const addProduct = (product: Product, scannedBarcode?: string) => {
        if (formItems.find((i) => i.product.id === product.id)) return;

        let autoUnitId = product.base_unit_id || "";
        if (scannedBarcode && product.units) {
            const matchedUnit = product.units.find((pu) => pu.barcode === scannedBarcode);
            if (matchedUnit) autoUnitId = matchedUnit.unit_id;
        }
        setFormItems((prev) => [
            ...prev,
            { product, quantity: 1, unit_id: autoUnitId },
        ]);
        setProductSearch("");
    };

    const addMultipleProducts = (selected: Product[]) => {
        setFormItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.product.id));
            const newItems: DrawerItem[] = selected
                .filter((p) => !existingIds.has(p.id))
                .map((p) => ({
                    product: p,
                    quantity: 1,
                    unit_id: p.base_unit_id || "",
                }));
            return [...prev, ...newItems];
        });
    };

    const removeItem = (idx: number) => {
        setFormItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateItemUnit = (idx: number, unitId: string) => {
        setFormItems((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, unit_id: unitId } : item)),
        );
    };

    const updateItemQty = (idx: number, qty: number) => {
        setFormItems((prev) =>
            prev.map((item, i) => {
                if (i !== idx) return item;
                const available =
                    (item.product as unknown as { quantity_available?: number })
                        .quantity_available ?? Infinity;
                const stockError =
                    qty > available
                        ? `Tồn kho không đủ (còn ${available})`
                        : undefined;
                return { ...item, quantity: qty, stockError };
            }),
        );
    };

    const handleSubmit = async () => {
        if (!formWarehouse) {
            showToast("Vui lòng chọn kho", "error");
            return;
        }
        if (formItems.length === 0) {
            showToast("Vui lòng thêm ít nhất 1 sản phẩm", "error");
            return;
        }
        if (formItems.some((i) => i.stockError)) {
            showToast("Một số sản phẩm không đủ tồn kho", "error");
            return;
        }

        const token = authStorage.getAccessToken();
        if (!token) return;

        setIsSubmitting(true);
        try {
            const payload: CreateOutboundPayload = {
                warehouse_id: formWarehouse,
                partner_id: formPartner || undefined,
                sales_order_code: formSOCode || undefined,
                notes: formNotes || undefined,
                picking_strategy: formStrategy !== "MANUAL" ? formStrategy : undefined,
                details: formItems.map((item) => {
                    const detail: OutboundDetailPayload = {
                        product_id: item.product.id,
                        quantity: item.quantity,
                        unit_id: item.unit_id,
                    };
                    if (item.required_batch_id) {
                        detail.required_batch_id = item.required_batch_id;
                    }
                    return detail;
                }),
            };
            await inventoryService.createOutbound(token, payload);
            showToast("Tạo phiếu xuất thành công! 🎉", "success");
            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Tạo phiếu xuất thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredProducts = useMemo(() => {
        const addedIds = new Set(formItems.map((i) => i.product.id));
        return products.filter((p) => !addedIds.has(p.id));
    }, [products, formItems]);

    const addedIds = useMemo(() => formItems.map((i) => i.product.id), [formItems]);

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-y-auto rounded-3xl p-0">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle className="text-[20px] leading-[130%]">
                            Tạo phiếu xuất kho
                        </DialogTitle>
                        <DialogDescription>
                            Nhập thông tin phiếu xuất và chọn sản phẩm cần xuất kho
                        </DialogDescription>
                    </DialogHeader>

                    {/* Section 1 — Thông tin chung */}
                    <div className="p-6 border-b">
                        <h3 className="text-[16px] font-semibold leading-[150%] mb-4">
                            1. Thông tin chung
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Kho xuất *</Label>
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
                                <Label>Đối tác nhận</Label>
                                <Select value={formPartner} onValueChange={setFormPartner}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Chọn đối tác" />
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
                                <Label>Mã SO tham chiếu</Label>
                                <Input
                                    value={formSOCode}
                                    onChange={(e) => setFormSOCode(e.target.value)}
                                    placeholder="Nhập mã SO"
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Label>Ghi chú</Label>
                            <Input
                                value={formNotes}
                                onChange={(e) => setFormNotes(e.target.value)}
                                placeholder="Ghi chú cho phiếu xuất..."
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Section 2 — Chiến lược xuất hàng */}
                    <div className="p-6 border-b">
                        <h3 className="text-[16px] font-semibold leading-[150%] mb-4">
                            2. Chiến lược xuất hàng
                        </h3>
                        <div className="outbound-strategy">
                            {STRATEGY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`outbound-strategy__option ${
                                        formStrategy === opt.value
                                            ? "outbound-strategy__option--active"
                                            : ""
                                    }`}
                                    onClick={() => setFormStrategy(opt.value)}
                                >
                                    <div className="outbound-strategy__option-title">
                                        {opt.title}
                                    </div>
                                    <div className="outbound-strategy__option-desc">
                                        {opt.desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Section 3 — Chi tiết hàng hóa */}
                    <div className="p-6 border-b">
                        <h3 className="text-[16px] font-semibold leading-[150%] mb-4">
                            3. Chi tiết hàng hóa
                        </h3>

                        {/* ProductSelector */}
                        <div className="mb-4">
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

                        {/* Table sản phẩm đã thêm */}
                        {formItems.length > 0 ? (
                            <div className="border rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-muted/40 border-b">
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                Sản phẩm
                                            </th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[130px]">
                                                Số lượng
                                            </th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[120px]">
                                                Đơn vị
                                            </th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[100px]">
                                                Tồn kho
                                            </th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[110px]">
                                                Giá vốn
                                            </th>
                                            <th className="px-4 py-2.5 w-[48px]" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {formItems.map((item, idx) => {
                                            const availableUnits: {
                                                id: string;
                                                name: string;
                                                conversion_rate: number;
                                            }[] = [];
                                            if (item.product.base_unit) {
                                                availableUnits.push({
                                                    id: item.product.base_unit_id,
                                                    name:
                                                        item.product.base_unit.name ||
                                                        "Đơn vị cơ bản",
                                                    conversion_rate: 1,
                                                });
                                            }
                                            if (item.product.units) {
                                                for (const pu of item.product.units) {
                                                    if (pu.is_active && pu.unit) {
                                                        availableUnits.push({
                                                            id: pu.unit_id,
                                                            name: pu.unit.name || "—",
                                                            conversion_rate: pu.conversion_rate,
                                                        });
                                                    }
                                                }
                                            }

                                            const currentUnit = availableUnits.find(
                                                (u) => u.id === item.unit_id,
                                            );
                                            const conversionRate =
                                                currentUnit?.conversion_rate ?? 1;
                                            const baseUnitName =
                                                item.product.base_unit?.name || "đv";
                                            const convertedQty = item.quantity * conversionRate;
                                            const qtyAvailable = (
                                                item.product as unknown as {
                                                    quantity_available?: number;
                                                }
                                            ).quantity_available;

                                            return (
                                                <tr
                                                    key={item.product.id}
                                                    className="group hover:bg-muted/30 transition-colors"
                                                >
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
                                                                <p className="text-xs text-muted-foreground">
                                                                    {item.product.sku}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Số lượng */}
                                                    <td className="px-4 py-3 w-[130px]">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={item.quantity}
                                                            onChange={(e) =>
                                                                updateItemQty(
                                                                    idx,
                                                                    parseInt(e.target.value) || 1,
                                                                )
                                                            }
                                                            className={`rounded-xl h-9 text-sm w-full ${
                                                                item.stockError
                                                                    ? "border-red-500 focus-visible:ring-red-500"
                                                                    : ""
                                                            }`}
                                                            placeholder="SL"
                                                        />
                                                        {conversionRate > 1 && (
                                                            <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                                                                ={" "}
                                                                {convertedQty.toLocaleString(
                                                                    "vi-VN",
                                                                )}{" "}
                                                                {baseUnitName}
                                                            </p>
                                                        )}
                                                        {item.stockError && (
                                                            <p className="text-[10px] text-red-500 mt-0.5">
                                                                {item.stockError}
                                                            </p>
                                                        )}
                                                    </td>

                                                    {/* Đơn vị */}
                                                    <td className="px-4 py-3 w-[120px]">
                                                        <Select
                                                            value={item.unit_id}
                                                            onValueChange={(v) =>
                                                                updateItemUnit(idx, v)
                                                            }
                                                        >
                                                            <SelectTrigger className="rounded-xl h-9 text-xs w-full">
                                                                <SelectValue placeholder="Đơn vị" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableUnits.map((u) => (
                                                                    <SelectItem
                                                                        key={u.id}
                                                                        value={u.id}
                                                                    >
                                                                        <span>{u.name}</span>
                                                                        {u.conversion_rate > 1 && (
                                                                            <span className="text-muted-foreground ml-1">
                                                                                (×
                                                                                {u.conversion_rate})
                                                                            </span>
                                                                        )}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </td>

                                                    {/* Tồn kho */}
                                                    <td className="px-4 py-3 w-[100px] text-right">
                                                        <span
                                                            className={`text-sm font-medium tabular-nums ${
                                                                qtyAvailable != null &&
                                                                item.quantity > qtyAvailable
                                                                    ? "text-red-500"
                                                                    : "text-muted-foreground"
                                                            }`}
                                                        >
                                                            {qtyAvailable != null
                                                                ? qtyAvailable.toLocaleString(
                                                                      "vi-VN",
                                                                  )
                                                                : "—"}
                                                        </span>
                                                    </td>

                                                    {/* Giá vốn */}
                                                    <td className="px-4 py-3 w-[110px] text-right text-sm text-muted-foreground tabular-nums">
                                                        {item.product.cost_price != null
                                                            ? item.product.cost_price.toLocaleString(
                                                                  "vi-VN",
                                                              ) + "đ"
                                                            : "—"}
                                                    </td>

                                                    {/* Xóa */}
                                                    <td className="px-4 py-3 w-[48px]">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => removeItem(idx)}
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl">
                                <InboxIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">Chưa có sản phẩm nào</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Tìm kiếm hoặc chọn từ danh sách để thêm sản phẩm vào phiếu xuất
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer sticky */}
                    <div className="sticky bottom-0 bg-white border-t p-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">
                                {formItems.length}
                            </span>{" "}
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
                                disabled={isSubmitting}
                                className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl min-w-[140px]"
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
                                    "Tạo phiếu xuất"
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
            />
        </>
    );
}
