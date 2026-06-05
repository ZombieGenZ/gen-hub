"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ProductService } from "@/services/product/product.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { orgHelper } from "@/lib/organization.utils";
import { useToast } from "@/contexts/ToastContext";
import type { Product, UpdateProductPayload } from "@/services/product/product.types";

// ── shadcn/ui ──
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ── Icons ──
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Package, Repeat2, Save } from "lucide-react";

const productService = new ProductService();
const API = process.env.NEXT_PUBLIC_API_URL;

interface OrgUnit {
    id: string;
    name: string;
}

interface UnitConversionRow {
    unit_id: string;
    conversion_rate: string;
    barcode: string;
}

interface ProductEditDialogProps {
    open: boolean;
    product: Product | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function ProductEditDialog({
    open,
    product,
    onClose,
    onSuccess,
}: ProductEditDialogProps) {
    const { showToast } = useToast();

    // ── Available units from org ──
    const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
    const [loadingUnits, setLoadingUnits] = useState(true);

    // ── Form fields ──
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [barcode, setBarcode] = useState("");
    const [description, setDescription] = useState("");
    const [baseUnitId, setBaseUnitId] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [weight, setWeight] = useState("");
    const [length, setLength] = useState("");
    const [width, setWidth] = useState("");
    const [height, setHeight] = useState("");
    const [maxWeightCapacity, setMaxWeightCapacity] = useState("");
    const [packagingMethod, setPackagingMethod] = useState("STANDARD");
    const [isStackable, setIsStackable] = useState(true);
    const [stackLimit, setStackLimit] = useState("");
    const [isActive, setIsActive] = useState(true);

    // ── Unit conversions ──
    const [unitRows, setUnitRows] = useState<UnitConversionRow[]>([]);

    // ── Submit state ──
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // ── Fetch org units ──
    const fetchOrgUnits = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const orgId = await orgHelper.getOrgId(token);
            const res = await fetch(
                `${API}/organizations/${orgId}/units?limit=100`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            if (!res.ok) return;
            const json = await res.json();
            const items: OrgUnit[] = json?.data?.items ?? json?.data ?? [];
            setOrgUnits(items);
        } catch {
            // silent
        } finally {
            setLoadingUnits(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchOrgUnits();
        }
    }, [open, fetchOrgUnits]);

    // ── Pre-fill form when product changes ──
    useEffect(() => {
        if (!product) return;

        setName(product.name ?? "");
        setSku(product.sku ?? "");
        setBarcode(product.barcode ?? "");
        setDescription(product.description ?? "");
        setBaseUnitId(product.base_unit_id ?? "");
        setIsActive(product.is_active ?? true);

        // Cost price formatted
        if (product.cost_price != null) {
            setCostPrice(
                new Intl.NumberFormat("vi-VN").format(product.cost_price)
            );
        } else {
            setCostPrice("");
        }

        // Numeric fields
        setWeight(product.weight != null ? String(product.weight) : "");
        setLength(product.length != null ? String(product.length) : "");
        setWidth(product.width != null ? String(product.width) : "");
        setHeight(product.height != null ? String(product.height) : "");
        setMaxWeightCapacity(
            product.max_weight_capacity != null
                ? String(product.max_weight_capacity)
                : ""
        );

        setPackagingMethod((product as any).packaging_method ?? "STANDARD");
        setIsStackable((product as any).is_stackable !== false);
        setStackLimit(
            (product as any).stack_limit != null
                ? String((product as any).stack_limit)
                : ""
        );

        // Unit conversions (exclude base unit row)
        if (product.units && product.units.length > 0) {
            setUnitRows(
                product.units.map((u) => ({
                    unit_id: u.unit_id,
                    conversion_rate: String(u.conversion_rate),
                    barcode: u.barcode ?? "",
                }))
            );
        } else {
            setUnitRows([]);
        }

        setErrors({});
    }, [product]);

    // ── Validate ──
    const validate = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = "Tên sản phẩm là bắt buộc";
        if (!sku.trim()) errs.sku = "Mã SKU là bắt buộc";
        if (!baseUnitId) errs.baseUnitId = "Đơn vị cơ bản là bắt buộc";
        unitRows.forEach((row, i) => {
            if (!row.unit_id) errs[`unit_id_${i}`] = "Chọn đơn vị";
            if (!row.conversion_rate || Number(row.conversion_rate) <= 0)
                errs[`conversion_rate_${i}`] = "Tỷ lệ phải > 0";
        });
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Submit ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !validate()) return;

        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const payload: UpdateProductPayload = {
                name: name.trim(),
                sku: sku.trim(),
                base_unit_id: baseUnitId,
                is_active: isActive,
                barcode: barcode.trim() || undefined,
                description: description.trim() || undefined,
                cost_price: costPrice
                    ? Number(costPrice.replace(/\./g, "").replace(/,/g, ""))
                    : undefined,
                weight: weight ? Number(weight) : undefined,
                length: length ? Number(length) : undefined,
                width: width ? Number(width) : undefined,
                height: height ? Number(height) : undefined,
                max_weight_capacity: maxWeightCapacity
                    ? Number(maxWeightCapacity)
                    : undefined,
            };

            (payload as any).packaging_method = packagingMethod;
            (payload as any).is_stackable = isStackable;
            if (stackLimit) (payload as any).stack_limit = Number(stackLimit);

            if (unitRows.length > 0) {
                payload.units = unitRows.map((r) => ({
                    unit_id: r.unit_id,
                    conversion_rate: Number(r.conversion_rate),
                    barcode: r.barcode.trim() || undefined,
                }));
            }

            await productService.update(token, product.id, payload);
            showToast(`Đã cập nhật sản phẩm "${name}" thành công! ✅`, "success");
            onSuccess();
            onClose();
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : "Cập nhật sản phẩm thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Unit row helpers ──
    const addUnitRow = () =>
        setUnitRows((prev) => [
            ...prev,
            { unit_id: "", conversion_rate: "", barcode: "" },
        ]);

    const removeUnitRow = (i: number) =>
        setUnitRows((prev) => prev.filter((_, idx) => idx !== i));

    const updateUnitRow = (
        i: number,
        field: keyof UnitConversionRow,
        value: string
    ) =>
        setUnitRows((prev) =>
            prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
        );

    const toDecimalStr = (v: string) => {
        const normalized = v.replace(/,/g, ".").replace(/[^0-9.]/g, "");
        const parts = normalized.split(".");
        return parts.length > 1
            ? parts[0] + "." + parts.slice(1).join("")
            : parts[0];
    };

    const availableConversionUnits = orgUnits.filter(
        (u) => u.id !== baseUnitId
    );

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                        <DialogTitle className="text-lg font-semibold text-slate-900">
                            Chỉnh sửa sản phẩm
                        </DialogTitle>
                        {product && (
                            <p className="text-sm text-slate-500 mt-0.5">
                                SKU: <span className="font-mono">{product.sku}</span>
                            </p>
                        )}
                    </DialogHeader>

                    <div className="px-6 py-5 space-y-5">
                        {/* ── Basic info ── */}
                        <Card className="shadow-sm rounded-2xl border border-slate-100">
                            <CardContent className="p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-[#0F766E]" />
                                    Thông tin cơ bản
                                </h3>

                                {/* Name */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-name">
                                        Tên sản phẩm{" "}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-name"
                                        placeholder="Nhập tên sản phẩm"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={`bg-slate-50 border-slate-200 rounded-xl px-4 focus-visible:bg-white ${errors.name ? "border-red-400" : ""}`}
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-500">{errors.name}</p>
                                    )}
                                </div>

                                {/* SKU + Barcode */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-sku">
                                            Mã SKU{" "}
                                            <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="edit-sku"
                                            placeholder="SP-001"
                                            value={sku}
                                            onChange={(e) => setSku(e.target.value)}
                                            className={`bg-slate-50 border-slate-200 rounded-xl px-4 font-mono focus-visible:bg-white ${errors.sku ? "border-red-400" : ""}`}
                                        />
                                        {errors.sku && (
                                            <p className="text-xs text-red-500">{errors.sku}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-barcode">Mã vạch</Label>
                                        <Input
                                            id="edit-barcode"
                                            placeholder="8934563012345"
                                            value={barcode}
                                            onChange={(e) => setBarcode(e.target.value)}
                                            className="bg-slate-50 border-slate-200 rounded-xl px-4 font-mono focus-visible:bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-description">Mô tả</Label>
                                    <Textarea
                                        id="edit-description"
                                        placeholder="Mô tả ngắn về sản phẩm..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-slate-50 border-slate-200 rounded-xl px-4 py-3 resize-none focus-visible:bg-white"
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Pricing + Unit + Status (2-col) ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Pricing */}
                            <Card className="shadow-sm rounded-2xl border border-slate-100">
                                <CardContent className="p-5 space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Định giá
                                    </h3>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-costPrice">Giá vốn (₫)</Label>
                                        <Input
                                            id="edit-costPrice"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            value={costPrice}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/\D/g, "");
                                                setCostPrice(
                                                    raw === ""
                                                        ? ""
                                                        : new Intl.NumberFormat("vi-VN").format(
                                                            Number(raw)
                                                        )
                                                );
                                            }}
                                            className="bg-slate-50 border-slate-200 rounded-xl px-4 focus-visible:bg-white"
                                        />
                                        <p className="text-xs text-slate-400">
                                            Giá nhập kho bình quân
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Unit + Status */}
                            <Card className="shadow-sm rounded-2xl border border-slate-100">
                                <CardContent className="p-5 space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Đơn vị & Trạng thái
                                    </h3>

                                    <div className="space-y-1.5">
                                        <Label>
                                            Đơn vị cơ bản{" "}
                                            <span className="text-red-500">*</span>
                                        </Label>
                                        {loadingUnits ? (
                                            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                                        ) : (
                                            <Select
                                                value={baseUnitId}
                                                onValueChange={(v) => {
                                                    setBaseUnitId(v);
                                                    setUnitRows((rows) =>
                                                        rows.filter((r) => r.unit_id !== v)
                                                    );
                                                }}
                                            >
                                                <SelectTrigger
                                                    className={`bg-slate-50 border-slate-200 rounded-xl px-4 h-10 focus:bg-white ${errors.baseUnitId ? "border-red-400" : ""}`}
                                                >
                                                    <SelectValue placeholder="Chọn đơn vị cơ bản" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {orgUnits.length === 0 ? (
                                                        <SelectItem value="__empty" disabled>
                                                            Chưa có đơn vị nào
                                                        </SelectItem>
                                                    ) : (
                                                        orgUnits.map((u) => (
                                                            <SelectItem key={u.id} value={u.id}>
                                                                {u.name}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {errors.baseUnitId && (
                                            <p className="text-xs text-red-500">
                                                {errors.baseUnitId}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                Đang bán
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Sản phẩm có thể xuất nhập kho
                                            </p>
                                        </div>
                                        <Switch
                                            checked={isActive}
                                            onCheckedChange={setIsActive}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Dimensions ── */}
                        <Card className="shadow-sm rounded-2xl border border-slate-100">
                            <CardContent className="p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Kích thước & Trọng lượng
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { id: "edit-length", label: "Chiều dài (cm)", val: length, setter: setLength },
                                        { id: "edit-width", label: "Chiều rộng (cm)", val: width, setter: setWidth },
                                        { id: "edit-height", label: "Chiều cao (cm)", val: height, setter: setHeight },
                                        { id: "edit-weight", label: "Trọng lượng (kg)", val: weight, setter: setWeight },
                                    ].map((field) => (
                                        <div key={field.id} className="space-y-1.5">
                                            <Label htmlFor={field.id}>{field.label}</Label>
                                            <Input
                                                id={field.id}
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={field.val}
                                                onChange={(e) =>
                                                    field.setter(toDecimalStr(e.target.value))
                                                }
                                                className="bg-slate-50 border-slate-200 rounded-xl px-4 focus-visible:bg-white"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1.5 max-w-xs">
                                    <Label htmlFor="edit-maxWeight">Tải trọng tối đa (kg)</Label>
                                    <Input
                                        id="edit-maxWeight"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={maxWeightCapacity}
                                        onChange={(e) =>
                                            setMaxWeightCapacity(toDecimalStr(e.target.value))
                                        }
                                        className="bg-slate-50 border-slate-200 rounded-xl px-4 focus-visible:bg-white"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Packaging & Stacking ── */}
                        <Card className="shadow-sm rounded-2xl border border-slate-100">
                            <CardContent className="p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-[#0F766E]" />
                                    Đóng gói & Xếp chồng
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-packagingMethod">Cách đóng gói</Label>
                                        <Select value={packagingMethod} onValueChange={setPackagingMethod}>
                                            <SelectTrigger id="edit-packagingMethod" className="bg-slate-50 border-slate-200 rounded-xl">
                                                <SelectValue placeholder="Chọn cách đóng gói" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="STANDARD">Tiêu chuẩn</SelectItem>
                                                <SelectItem value="FRAGILE">Hàng dễ vỡ</SelectItem>
                                                <SelectItem value="STACKABLE">Có thể xếp chồng</SelectItem>
                                                <SelectItem value="NON_STACKABLE">Không xếp chồng</SelectItem>
                                                <SelectItem value="LIQUID">Chất lỏng</SelectItem>
                                                <SelectItem value="OVERSIZED">Hàng cồng kềnh</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-stackLimit">Giới hạn chồng (tầng)</Label>
                                        <Input
                                            id="edit-stackLimit"
                                            type="number"
                                            min={1}
                                            placeholder="Để trống = không giới hạn"
                                            value={stackLimit}
                                            onChange={(e) => setStackLimit(e.target.value)}
                                            disabled={!isStackable}
                                            className="bg-slate-50 border-slate-200 rounded-xl px-4 focus-visible:bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <Switch
                                        id="edit-isStackable"
                                        checked={isStackable}
                                        onCheckedChange={setIsStackable}
                                    />
                                    <Label htmlFor="edit-isStackable" className="cursor-pointer text-sm">
                                        Có thể xếp chồng lên hàng khác
                                    </Label>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Unit conversions ── */}
                        <Card className="shadow-sm rounded-2xl border border-slate-100">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                        <Repeat2 className="w-4 h-4 text-[#0F766E]" />
                                        Quy đổi đơn vị
                                    </h3>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl"
                                        onClick={addUnitRow}
                                        disabled={
                                            !baseUnitId ||
                                            availableConversionUnits.length === 0
                                        }
                                    >
                                        <PlusIcon className="w-4 h-4 mr-1" />
                                        Thêm đơn vị
                                    </Button>
                                </div>

                                {!baseUnitId && (
                                    <p className="text-sm text-slate-400 text-center py-2">
                                        Chọn đơn vị cơ bản trước để thêm đơn vị quy đổi
                                    </p>
                                )}

                                {unitRows.length === 0 && baseUnitId && (
                                    <p className="text-sm text-slate-400 text-center py-2">
                                        Chưa có đơn vị quy đổi. Nhấn &quot;Thêm đơn vị&quot; để bắt đầu.
                                    </p>
                                )}

                                {unitRows.map((row, i) => (
                                    <div
                                        key={i}
                                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-3 bg-slate-50 rounded-xl border border-slate-100"
                                    >
                                        {/* Unit select */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Đơn vị</Label>
                                            <Select
                                                value={row.unit_id}
                                                onValueChange={(v) =>
                                                    updateUnitRow(i, "unit_id", v)
                                                }
                                            >
                                                <SelectTrigger
                                                    className={`bg-white border-slate-200 rounded-xl px-4 h-10 text-sm ${errors[`unit_id_${i}`] ? "border-red-400" : ""}`}
                                                >
                                                    <SelectValue placeholder="Chọn đơn vị" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableConversionUnits
                                                        .filter(
                                                            (u) =>
                                                                u.id === row.unit_id ||
                                                                !unitRows.some(
                                                                    (r, idx) =>
                                                                        idx !== i && r.unit_id === u.id
                                                                )
                                                        )
                                                        .map((u) => (
                                                            <SelectItem key={u.id} value={u.id}>
                                                                {u.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                            {errors[`unit_id_${i}`] && (
                                                <p className="text-xs text-red-500">
                                                    {errors[`unit_id_${i}`]}
                                                </p>
                                            )}
                                        </div>

                                        {/* Conversion rate */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">
                                                Quy đổi (sang{" "}
                                                {orgUnits.find((u) => u.id === baseUnitId)?.name ||
                                                    "đơn vị cơ bản"}
                                                )
                                            </Label>
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="1"
                                                value={row.conversion_rate}
                                                onChange={(e) =>
                                                    updateUnitRow(
                                                        i,
                                                        "conversion_rate",
                                                        toDecimalStr(e.target.value)
                                                    )
                                                }
                                                className={`bg-white border-slate-200 rounded-xl h-10 px-4 text-sm focus-visible:bg-white ${errors[`conversion_rate_${i}`] ? "border-red-400" : ""}`}
                                            />
                                            {errors[`conversion_rate_${i}`] && (
                                                <p className="text-xs text-red-500">
                                                    {errors[`conversion_rate_${i}`]}
                                                </p>
                                            )}
                                        </div>

                                        {/* Barcode */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Mã vạch (tuỳ chọn)</Label>
                                            <Input
                                                placeholder="Barcode..."
                                                value={row.barcode}
                                                onChange={(e) =>
                                                    updateUnitRow(i, "barcode", e.target.value)
                                                }
                                                className="bg-white border-slate-200 rounded-xl h-10 px-4 text-sm font-mono"
                                            />
                                        </div>

                                        {/* Remove */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                            onClick={() => removeUnitRow(i)}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white z-10">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                            disabled={isSubmitting}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
