"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { ProductService } from "@/services/product/product.service";
import { PartnerService } from "@/services/partner/partner.service";
import { BatchService } from "@/services/batch/batch.service";
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
import { MagnifyingGlassIcon, PlusIcon, TrashIcon, InboxIcon } from "@heroicons/react/24/outline";
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

function CreateItemRow({
    item,
    index,
    onRemove,
    onUpdate,
}: {
    item: DrawerItem;
    index: number;
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
                .then((res) => {
                    const items = res?.data?.items || [];
                    setBatches(items);
                })
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
        <div className="inbound-drawer__product-row">
            <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                </div>
            </div>
            <div>
                <Input
                    type="number"
                    min={1}
                    value={item.expected_qty}
                    onChange={(e) => onUpdate({ expected_qty: parseInt(e.target.value) || 1 })}
                    className="rounded-xl h-9 text-sm"
                    placeholder="SL"
                />
                {conversionRate > 1 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        = {convertedQty.toLocaleString("vi-VN")} {baseUnitName}
                    </p>
                )}
            </div>
            <div>
                <Select value={item.unit_id} onValueChange={(v) => onUpdate({ unit_id: v })}>
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                        <SelectValue placeholder="Đơn vị" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableUnits.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                                <span>{u.name}</span>
                                {u.conversion_rate > 1 && (
                                    <span className="text-muted-foreground ml-1">(×{u.conversion_rate})</span>
                                )}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Select
                    value={item.batch_id || "__new__"}
                    onValueChange={(v) => {
                        if (v === "__new__") {
                            onUpdate({ batch_id: undefined });
                            setShowNewBatch(true);
                        } else {
                            onUpdate({ batch_id: v });
                            setShowNewBatch(false);
                        }
                    }}
                >
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                        <SelectValue placeholder="Chọn lô" />
                    </SelectTrigger>
                    <SelectContent>
                        {batches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.code}</SelectItem>
                        ))}
                        <SelectItem value="__new__">+ Tạo lô mới</SelectItem>
                    </SelectContent>
                </Select>
                {showNewBatch && (
                    <Popover open={showNewBatch} onOpenChange={setShowNewBatch}>
                        <PopoverTrigger asChild>
                            <button className="text-xs text-[#0F766E] mt-1 underline">Nhập thông tin lô</button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4 space-y-3" align="start">
                            <p className="text-sm font-medium">Tạo lô hàng mới</p>
                            <div className="space-y-2">
                                <Label className="text-xs">Mã lô</Label>
                                <Input
                                    value={newBatchCode}
                                    onChange={(e) => setNewBatchCode(e.target.value)}
                                    className="rounded-xl h-8 text-xs"
                                    placeholder="VD: LOT-001"
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
            </div>
            <div className="text-xs text-muted-foreground truncate">
                {item.batch_code ? <span className="text-[#0F766E] font-medium">{item.batch_code}</span> : null}
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                onClick={onRemove}
            >
                <TrashIcon className="w-4 h-4" />
            </Button>
        </div>
    );
}

interface CreateInboundDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateInboundDialog({ open, onOpenChange, onSuccess }: CreateInboundDialogProps) {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const loadFormData = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        try {
            const [warehouseList, partnerRes, productRes] = await Promise.all([
                inventoryService.listWarehouses(token),
                partnerService.list(token, { limit: 100 }),
                productService.list(token, {
                    limit: 20,
                    keywords: debouncedProductSearch || undefined,
                }),
            ]);
            setWarehouses(warehouseList);
            setPartners(partnerRes?.data?.items || []);
            setProducts(productRes?.data?.items || []);
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

    const addProduct = (product: Product, scannedBarcode?: string) => {
        if (formItems.find((i) => i.product.id === product.id)) return;

        let autoUnitId = product.base_unit_id || "";
        if (scannedBarcode && product.units) {
            const matchedUnit = product.units.find((pu) => pu.barcode === scannedBarcode);
            if (matchedUnit) {
                autoUnitId = matchedUnit.unit_id;
            }
        }
        setFormItems((prev) => [
            ...prev,
            { product, expected_qty: 1, unit_id: autoUnitId },
        ]);
        setProductSearch("");
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
            showToast("Tạo phiếu nhập thành công! 🎉", "success");
            onSuccess(); // Triggers list refetch
            onOpenChange(false);
            resetForm();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Tạo phiếu nhập thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredProducts = useMemo(() => {
        const addedIds = new Set(formItems.map((i) => i.product.id));
        return products.filter((p) => !addedIds.has(p.id));
    }, [products, formItems]);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl p-0">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle className="text-[20px] leading-[130%]">Tạo phiếu nhập kho</DialogTitle>
                    <DialogDescription>
                        Nhập thông tin phiếu nhập và thêm sản phẩm cần nhập kho
                    </DialogDescription>
                </DialogHeader>

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
                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Nhà cung cấp</Label>
                            <Select value={formPartner} onValueChange={setFormPartner}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Chọn NCC" />
                                </SelectTrigger>
                                <SelectContent>
                                    {partners.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Mã PO tham chiếu</Label>
                            <Input
                                value={formPOCode}
                                onChange={(e) => setFormPOCode(e.target.value)}
                                placeholder="VD: PO-2024-001"
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        <Label>Ghi chú</Label>
                        <Input
                            value={formNotes}
                            onChange={(e) => setFormNotes(e.target.value)}
                            placeholder="Ghi chú cho phiếu nhập..."
                            className="rounded-xl"
                        />
                    </div>
                </div>

                <div className="inbound-drawer__section">
                    <h3 className="inbound-drawer__section-title">2. Chi tiết hàng hóa</h3>
                    <div className="relative mb-4">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm sản phẩm theo tên, SKU hoặc quét barcode..."
                            className="pl-9 rounded-xl"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && productSearch.trim()) {
                                    const barcode = productSearch.trim();
                                    const directMatch = products.find((p) => p.barcode === barcode);
                                    if (directMatch) {
                                        addProduct(directMatch, barcode);
                                        return;
                                    }
                                    for (const p of products) {
                                        if (p.units) {
                                            const unitMatch = p.units.find((pu) => pu.barcode === barcode);
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
                        {productSearch && filteredProducts.length > 0 && (
                            <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                                {filteredProducts.map((p) => (
                                    <button
                                        key={p.id}
                                        className="w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors text-sm flex items-center justify-between"
                                        onClick={() => addProduct(p)}
                                    >
                                        <span>
                                            <span className="font-medium">{p.name}</span>
                                            <span className="text-muted-foreground ml-2 text-xs">{p.sku}</span>
                                        </span>
                                        <PlusIcon className="w-4 h-4 text-[#0F766E]" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {formItems.length > 0 && (
                        <>
                            <div className="inbound-drawer__product-row text-xs font-semibold text-muted-foreground uppercase border-b pb-2">
                                <span>Sản phẩm</span>
                                <span>Số lượng</span>
                                <span>Đơn vị</span>
                                <span>Lô hàng</span>
                                <span>Lô mới</span>
                                <span></span>
                            </div>
                            {formItems.map((item, idx) => (
                                <CreateItemRow
                                    key={item.product.id}
                                    item={item}
                                    index={idx}
                                    onRemove={() => setFormItems((prev) => prev.filter((_, i) => i !== idx))}
                                    onUpdate={(updates) => setFormItems((prev) =>
                                        prev.map((it, i) => (i === idx ? { ...it, ...updates } : it))
                                    )}
                                />
                            ))}
                        </>
                    )}

                    {formItems.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <InboxIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">Tìm kiếm và thêm sản phẩm vào phiếu nhập</p>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t p-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{formItems.length} sản phẩm</p>
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
                            className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl min-w-35"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Đang tạo...
                                </span>
                            ) : (
                                "Tạo phiếu nhập"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
