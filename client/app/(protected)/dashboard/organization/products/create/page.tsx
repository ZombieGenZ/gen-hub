"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProductService } from "@/services/product/product.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { orgHelper } from "@/lib/organization.utils";
import { useToast } from "@/contexts/ToastContext";
import type { CreateProductPayload } from "@/services/product/product.types";

// ── shadcn/ui ──
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
import {
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { Package, Repeat2 } from "lucide-react";

// ── Service ──
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

// ════════════════════════════════════════════════
// MAIN PAGE: Create Product
// ════════════════════════════════════════════════
export default function CreateProductPage() {
    const router = useRouter();
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
    const [isActive, setIsActive] = useState(true);

    // ── Packaging fields ──
    const [packagingMethod, setPackagingMethod] = useState("STANDARD");
    const [isStackable, setIsStackable] = useState(true);
    const [stackLimit, setStackLimit] = useState("");

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
        fetchOrgUnits();
    }, [fetchOrgUnits]);

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
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }

            const payload: CreateProductPayload = {
                name: name.trim(),
                sku: sku.trim(),
                base_unit_id: baseUnitId,
                is_active: isActive,
            };

            if (barcode.trim()) payload.barcode = barcode.trim();
            if (description.trim()) payload.description = description.trim();
            if (costPrice) payload.cost_price = Number(costPrice.replace(/\./g, "").replace(/,/g, ""));
            if (weight) payload.weight = Number(weight);
            if (length) payload.length = Number(length);
            if (width) payload.width = Number(width);
            if (height) payload.height = Number(height);
            if (maxWeightCapacity)
                payload.max_weight_capacity = Number(maxWeightCapacity);

            // Packaging fields (cast to any since types may not include them yet)
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

            const result = await productService.create(token, payload);
            if (result?.data) {
                showToast(`Đã tạo sản phẩm "${name}" thành công! 🎉`, "success");
                router.push(`/dashboard/organization/products/${result.data.id}`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Tạo sản phẩm thất bại";
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

    // ── Available units for conversion (exclude base unit) ──
    const availableConversionUnits = orgUnits.filter(
        (u) => u.id !== baseUnitId
    );
    
    // ── Handle new barcode scanned ──
    const handleNewBarcodeScanned = useCallback((scannedCode: string) => {
        // Case 1: No base barcode yet
        if (!barcode.trim()) {
            setBarcode(scannedCode);
            setSku(`SP-${scannedCode.slice(-6)}`);
            showToast("Đã tự động điền mã vạch cơ bản", "success");
            return;
        }

        // Case 2: Same as base barcode
        if (scannedCode === barcode.trim()) {
            showToast("Mã vạch này trùng với mã vạch cơ bản", "warning");
            return;
        }

        // Case 3: Check if already in unitRows
        const exists = unitRows.some(row => row.barcode === scannedCode);
        if (exists) {
            showToast("Mã vạch này đã tồn tại trong quy đổi", "warning");
            return;
        }

        // Case 4: Add new unit conversion row
        const newRow: UnitConversionRow = { unit_id: "", conversion_rate: "", barcode: scannedCode };
        setUnitRows(prev => [...prev, newRow]);
        showToast("Đã tự động thêm quy đổi mới từ mã vạch quét được", "success");

        // Focus the newest rate input
        setTimeout(() => {
            const inputs = document.querySelectorAll('input[inputmode="decimal"]');
            const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
            if (lastInput) lastInput.focus();
        }, 100);
    }, [barcode, unitRows, showToast]);

    // ── Smart Scanner Listener (Global) ──
    useEffect(() => {
        let buffer = "";
        let lastTime = 0;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Avoid capturing if user is typing in common text fields (except barcode specific ones)
            const target = e.target as HTMLElement;
            const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
            
            // Still capture if it's rapid (scanner)
            const currentTime = Date.now();
            if (currentTime - lastTime < 50 || buffer === "") {
                if (e.key === "Enter") {
                    if (buffer.length >= 8) {
                        e.preventDefault();
                        handleNewBarcodeScanned(buffer);
                        buffer = "";
                    }
                } else if (e.key.length === 1 && /[0-9]/.test(e.key)) {
                    buffer += e.key;
                }
            } else {
                buffer = e.key.length === 1 && /[0-9]/.test(e.key) ? e.key : "";
            }
            lastTime = currentTime;
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleNewBarcodeScanned]);

    return (
        <div className="flex-1 overflow-auto bg-slate-50/50">
            <form onSubmit={handleSubmit}>
                <main className="pt-0 py-4 px-4 space-y-6">
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-10 w-10 shrink-0"
                                onClick={() =>
                                    router.push("/dashboard/organization/products")
                                }
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    Thêm sản phẩm mới
                                </h1>
                                <p className="text-slate-500 text-sm mt-0.5">
                                    Điền thông tin để tạo sản phẩm vào danh mục
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() =>
                                    router.push("/dashboard/organization/products")
                                }
                            >
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                                disabled={isSubmitting}
                            >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                {isSubmitting ? "Đang tạo..." : "Tạo sản phẩm"}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* ── Left column: Basic info + Dimensions ── */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic info */}
                            <Card className="shadow-premium rounded-3xl border-0">
                                <CardContent className="p-6 space-y-5">
                                    <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-[#0F766E]" />
                                        Thông tin cơ bản
                                    </h2>

                                    {/* Name */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name">
                                            Tên sản phẩm{" "}
                                            <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="name"
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
                                            <Label htmlFor="sku">
                                                Mã SKU{" "}
                                                <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="sku"
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
                                            <Label htmlFor="barcode">Mã vạch</Label>
                                            <Input
                                                id="barcode"
                                                placeholder="8934563012345"
                                                value={barcode}
                                                onChange={(e) => setBarcode(e.target.value)}
                                                className="bg-slate-50 border-slate-200 rounded-xl px-4 font-mono focus-visible:bg-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="description">Mô tả</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Mô tả ngắn về sản phẩm..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="bg-slate-50 border-slate-200 rounded-xl px-4 py-3 resize-none focus-visible:bg-white"
                                            rows={3}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Dimensions */}
                            <Card className="shadow-premium rounded-3xl border-0">
                                <CardContent className="p-6 space-y-5">
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Kích thước & Trọng lượng
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            {
                                                id: "length",
                                                label: "Chiều dài (cm)",
                                                val: length,
                                                setter: setLength,
                                            },
                                            {
                                                id: "width",
                                                label: "Chiều rộng (cm)",
                                                val: width,
                                                setter: setWidth,
                                            },
                                            {
                                                id: "height",
                                                label: "Chiều cao (cm)",
                                                val: height,
                                                setter: setHeight,
                                            },
                                            {
                                                id: "weight",
                                                label: "Trọng lượng (kg)",
                                                val: weight,
                                                setter: setWeight,
                                            },
                                        ].map((field) => (
                                            <div key={field.id} className="space-y-1.5">
                                                <Label htmlFor={field.id}>
                                                    {field.label}
                                                </Label>
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
                                        <Label htmlFor="maxWeight">
                                            Tải trọng tối đa (kg)
                                        </Label>
                                        <Input
                                            id="maxWeight"
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

                            {/* Packaging method */}
                            <Card className="shadow-premium rounded-3xl border-0">
                                <CardContent className="p-6 space-y-5">
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Phương thức đóng gói & Xếp hàng
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="packagingMethod">Cách đóng gói</Label>
                                            <Select value={packagingMethod} onValueChange={setPackagingMethod}>
                                                <SelectTrigger id="packagingMethod" className="bg-slate-50 border-slate-200 rounded-xl">
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
                                            <Label htmlFor="stackLimit">Giới hạn chồng (tầng)</Label>
                                            <Input
                                                id="stackLimit"
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
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="isStackable"
                                            checked={isStackable}
                                            onCheckedChange={setIsStackable}
                                        />
                                        <Label htmlFor="isStackable" className="cursor-pointer">
                                            Có thể xếp chồng lên hàng khác
                                        </Label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Unit conversions */}
                            <Card className="shadow-premium rounded-3xl border-0">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                            <Repeat2 className="w-4 h-4 text-[#0F766E]" />
                                            Quy đổi đơn vị
                                        </h2>
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
                                        <p className="text-sm text-slate-600 text-center py-4">
                                            Chọn đơn vị cơ bản trước để thêm đơn vị quy đổi
                                        </p>
                                    )}

                                    {unitRows.length === 0 && baseUnitId && (
                                        <p className="text-sm text-slate-600 text-center py-4">
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
                                                        className={`bg-slate-50 border-slate-200 rounded-xl px-4 h-10 text-sm focus:bg-white ${errors[`unit_id_${i}`] ? "border-red-400" : ""}`}
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
                                                                            idx !== i &&
                                                                            r.unit_id === u.id
                                                                    )
                                                            )
                                                            .map((u) => (
                                                                <SelectItem
                                                                    key={u.id}
                                                                    value={u.id}
                                                                >
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
                                                    {orgUnits.find((u) => u.id === baseUnitId)
                                                        ?.name || "đơn vị cơ bản"}
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
                                                    className={`bg-slate-50 border-slate-200 rounded-xl h-10 px-4 text-sm focus-visible:bg-white ${errors[`conversion_rate_${i}`] ? "border-red-400" : ""}`}
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
                                                        updateUnitRow(
                                                            i,
                                                            "barcode",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="bg-slate-50 border-slate-200 rounded-xl h-10 px-4 text-sm font-mono focus-visible:bg-white"
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

                        {/* ── Right column: Pricing + Settings ── */}
                        <div className="space-y-6">
                            {/* Pricing */}
                            <Card className="shadow-premium rounded-3xl border-0">
                                <CardContent className="p-6 space-y-5">
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Định giá
                                    </h2>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="costPrice">Giá vốn (₫)</Label>
                                        <Input
                                            id="costPrice"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            value={costPrice}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/\D/g, "");
                                                setCostPrice(
                                                    raw === ""
                                                        ? ""
                                                        : new Intl.NumberFormat("vi-VN").format(Number(raw))
                                                );
                                            }}
                                            className="bg-slate-50 border-slate-200 rounded-xl px-4 focus-visible:bg-white"
                                        />
                                        <p className="text-xs text-slate-600">
                                            Giá nhập kho bình quân của sản phẩm
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Unit & Status */}
                            <Card className="shadow-premium rounded-3xl border-0">
                                <CardContent className="p-6 space-y-5">
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Đơn vị & Trạng thái
                                    </h2>

                                    {/* Base unit */}
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
                                                    // Clear unit rows that conflict
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
                                        <p className="text-xs text-slate-600">
                                            Đơn vị nhỏ nhất trong hệ thống quy đổi
                                        </p>
                                    </div>

                                    {/* Is active */}
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

                            {/* Action summary */}
                            <div className="p-4 bg-[#0F766E]/5 rounded-2xl border border-[#0F766E]/10">
                                <p className="text-xs text-[#0F766E]/70 mb-3 font-medium">
                                    Tóm tắt sản phẩm
                                </p>
                                <ul className="space-y-1.5 text-sm text-slate-700">
                                    <li className="flex justify-between">
                                        <span className="text-slate-500">Tên</span>
                                        <span className="font-medium truncate max-w-32">
                                            {name || "—"}
                                        </span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span className="text-slate-500">SKU</span>
                                        <span className="font-mono text-xs">
                                            {sku || "—"}
                                        </span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span className="text-slate-500">Đơn vị</span>
                                        <span>
                                            {orgUnits.find((u) => u.id === baseUnitId)
                                                ?.name || "—"}
                                        </span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span className="text-slate-500">Quy đổi</span>
                                        <span>{unitRows.length} đơn vị</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span className="text-slate-500">Giá vốn</span>
                                        <span>
                                            {costPrice
                                                ? new Intl.NumberFormat("vi-VN").format(
                                                    Number(costPrice.replace(/\./g, "").replace(/,/g, ""))
                                                ) + " ₫"
                                                : "—"}
                                        </span>
                                    </li>
                                </ul>

                                {/* Dimensions & Weight summary */}
                                {(length || width || height || weight || maxWeightCapacity) && (
                                    <>
                                        <div className="my-3 border-t border-[#0F766E]/10" />
                                        <p className="text-xs text-[#0F766E]/70 mb-2 font-medium">
                                            Kích thước &amp; Trọng lượng
                                        </p>
                                        <ul className="space-y-1.5 text-sm text-slate-700">
                                            {(length || width || height) && (
                                                <li className="flex justify-between">
                                                    <span className="text-slate-500">Kích thước</span>
                                                    <span className="font-mono text-xs tabular-nums">
                                                        {length || "—"} × {width || "—"} × {height || "—"} cm
                                                    </span>
                                                </li>
                                            )}
                                            {weight && (
                                                <li className="flex justify-between">
                                                    <span className="text-slate-500">Trọng lượng</span>
                                                    <span className="tabular-nums">{weight} kg</span>
                                                </li>
                                            )}
                                            {maxWeightCapacity && (
                                                <li className="flex justify-between">
                                                    <span className="text-slate-500">Tải trọng tối đa</span>
                                                    <span className="tabular-nums">{maxWeightCapacity} kg</span>
                                                </li>
                                            )}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </form>
        </div>
    );
}
