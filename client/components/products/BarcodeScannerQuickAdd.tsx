"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ProductService } from "@/services/product/product.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { orgHelper } from "@/lib/organization.utils";
import { useToast } from "@/contexts/ToastContext";
import type { CreateProductPayload } from "@/services/product/product.types";

// ── shadcn/ui ──
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ── Icons ──
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import {
    ScanLine,
    Loader2,
    Barcode,
    Sparkles,
    Package,
    Save,
    RotateCcw,
    Repeat2,
    Plus,
    Trash2,
} from "lucide-react";

// ── Types ──
interface BarcodeLookupResult {
    name: string | null;
    image_url: string | null;
    brand: string | null;
    category: string | null;
    quantity: string | null;
}

interface OrgUnit {
    id: string;
    name: string;
}

interface UnitConversionRow {
    unit_id: string;
    conversion_rate: string;
    barcode: string;
}

interface BarcodeScannerQuickAddProps {
    open: boolean;
    onClose: () => void;
    onProductCreated: () => void;
}

type ScanStep = "scan" | "review" | "saving";

const API = process.env.NEXT_PUBLIC_API_URL;
const productService = new ProductService();

// ════════════════════════════════════════════════
// BARCODE SCANNER QUICK ADD DIALOG
// ════════════════════════════════════════════════
export default function BarcodeScannerQuickAdd({
    open,
    onClose,
    onProductCreated,
}: BarcodeScannerQuickAddProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // ── Step state ──
    const [step, setStep] = useState<ScanStep>("scan");

    // ── Barcode scan state ──
    const [barcodeValue, setBarcodeValue] = useState("");
    const [isLooking, setIsLooking] = useState(false);
    const [lookupResult, setLookupResult] = useState<BarcodeLookupResult | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [lookupDone, setLookupDone] = useState(false);

    // ── Form fields (review step) ──
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [weight, setWeight] = useState("");
    const [length, setLength] = useState("");
    const [width, setWidth] = useState("");
    const [height, setHeight] = useState("");
    const [baseUnitId, setBaseUnitId] = useState("");

    // ── Unit conversions ──
    const [unitRows, setUnitRows] = useState<UnitConversionRow[]>([]);

    // ── Org units ──
    const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
    const [loadingUnits, setLoadingUnits] = useState(false);

    // ── Submit ──
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // ── Buffer for barcode scanner (accumulates rapid keystrokes) ──
    const scanBufferRef = useRef("");
    const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Focus input on open ──
    useEffect(() => {
        if (open && step === "scan") {
            setTimeout(() => barcodeInputRef.current?.focus(), 200);
        }
    }, [open, step]);

    // ── Fetch org units ──
    const fetchOrgUnits = useCallback(async () => {
        try {
            setLoadingUnits(true);
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
        if (open) fetchOrgUnits();
    }, [open, fetchOrgUnits]);

    // ── Reset everything on close ──
    const handleClose = () => {
        setStep("scan");
        setBarcodeValue("");
        setIsLooking(false);
        setLookupResult(null);
        setLookupError(null);
        setLookupDone(false);
        setName("");
        setSku("");
        setDescription("");
        setImageUrl("");
        setCostPrice("");
        setWeight("");
        setLength("");
        setWidth("");
        setHeight("");
        setBaseUnitId("");
        setUnitRows([]);
        setErrors({});
        setIsSubmitting(false);
        onClose();
    };

    // ── Barcode lookup handler ──
    const lookupBarcode = async (code: string) => {
        if (!code.trim()) return;

        setIsLooking(true);
        setLookupError(null);
        setLookupResult(null);
        setLookupDone(false);

        try {
            // Call our proxy API route
            const res = await fetch(
                `/api/barcode-lookup?code=${encodeURIComponent(code.trim())}`
            );
            const data = await res.json();

            if (data.success && data.found && data.data) {
                setLookupResult(data.data);
                // Pre-fill form fields from lookup
                if (data.data.name) setName(data.data.name);
                if (data.data.image_url) setImageUrl(data.data.image_url);
                if (data.data.brand && data.data.name) {
                    setDescription(
                        `${data.data.brand}${data.data.category ? " — " + data.data.category : ""}`
                    );
                }
            } else {
                setLookupError(
                    data.message || "Không tìm thấy sản phẩm trong cơ sở dữ liệu toàn cầu"
                );
            }

            setLookupDone(true);
        } catch {
            setLookupError("Lỗi kết nối. Bạn vẫn có thể nhập thông tin thủ công.");
            setLookupDone(true);
        } finally {
            setIsLooking(false);
        }
    };

    // ── Handle barcode input (supports both keyboard entry & barcode scanner) ──
    const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (barcodeValue.trim()) {
                handleProceedToReview();
            }
        }
    };

    // ── Handle scanner-like rapid input ──
    const handleBarcodeInput = (value: string) => {
        setBarcodeValue(value);

        // Scanner detection: if input comes in rapidly, auto-submit
        if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
        scanBufferRef.current = value;

        scanTimerRef.current = setTimeout(() => {
            // If the buffer is long enough (barcode typically 8+ chars)
            // and was entered rapidly, treat as scanner input
            if (scanBufferRef.current.length >= 8) {
                // Auto-trigger lookup (scanner detected)
            }
            scanBufferRef.current = "";
        }, 100);
    };

    // ── Generate SKU from barcode ──
    const generateSku = (barcode: string): string => {
        const last6 = barcode.slice(-6);
        return `SP-${last6}`;
    };

    // ── Proceed to review step ──
    const handleProceedToReview = async () => {
        if (!barcodeValue.trim()) return;

        // Generate a default SKU from barcode
        setSku(generateSku(barcodeValue.trim()));

        // Trigger barcode lookup
        await lookupBarcode(barcodeValue.trim());

        setStep("review");
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

    // ── Available units for conversion (exclude base unit) ──
    const availableConversionUnits = orgUnits.filter(
        (u) => u.id !== baseUnitId
    );

    // ── Validate form ──
    const validate = (): boolean => {
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

    // ── Submit / Save product ──
    const handleSave = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        setStep("saving");

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
                barcode: barcodeValue.trim(),
                is_active: true,
            };

            if (description.trim()) payload.description = description.trim();
            if (imageUrl.trim()) payload.image_url = imageUrl.trim();
            if (costPrice) {
                payload.cost_price = Number(
                    costPrice.replace(/\./g, "").replace(/,/g, "")
                );
            }
            if (weight) payload.weight = Number(weight);
            if (length) payload.length = Number(length);
            if (width) payload.width = Number(width);
            if (height) payload.height = Number(height);

            if (unitRows.length > 0) {
                payload.units = unitRows.map((r) => ({
                    unit_id: r.unit_id,
                    conversion_rate: Number(r.conversion_rate),
                    barcode: r.barcode.trim() || undefined,
                }));
            }

            const result = await productService.create(token, payload);
            if (result?.data) {
                showToast(
                    `Đã tạo sản phẩm "${name}" từ mã vạch thành công! 🎉`,
                    "success"
                );
                onProductCreated();
                handleClose();
            }
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : "Tạo sản phẩm thất bại";
            showToast(msg, "error");
            setStep("review");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Go back to scan step ──
    const handleRescan = () => {
        setStep("scan");
        setBarcodeValue("");
        setLookupResult(null);
        setLookupError(null);
        setLookupDone(false);
        setName("");
        setSku("");
        setDescription("");
        setImageUrl("");
        setCostPrice("");
        setWeight("");
        setLength("");
        setWidth("");
        setHeight("");
        setBaseUnitId("");
        setUnitRows([]);
        setErrors({});
        setTimeout(() => barcodeInputRef.current?.focus(), 200);
    };

    // ── Decimal string helper ──
    const toDecimalStr = (v: string) => {
        const normalized = v.replace(/,/g, ".").replace(/[^0-9.]/g, "");
        const parts = normalized.split(".");
        return parts.length > 1
            ? parts[0] + "." + parts.slice(1).join("")
            : parts[0];
    };

    // ════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════
    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-4">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-[#0F766E]" />
                        Quét mã vạch để thêm nhanh
                    </DialogTitle>
                    <DialogDescription>
                        {step === "scan"
                            ? "Quét mã vạch hoặc nhập thủ công để tra cứu và tạo sản phẩm nhanh"
                            : step === "review"
                                ? "Kiểm tra thông tin và bổ sung các trường còn thiếu"
                                : "Đang lưu sản phẩm..."}
                    </DialogDescription>
                </DialogHeader>

                {/* ── Step indicator ── */}
                <div className="flex items-center justify-center gap-2 p-2">
                    <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${step === "scan"
                            ? "bg-[#0F766E] text-white"
                            : "bg-emerald-100 text-emerald-700"
                            }`}
                    >
                        <Barcode className="w-3.5 h-3.5" />
                        Quét mã
                    </div>
                    <div className="w-6 h-px bg-slate-300" />
                    <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${step === "review"
                            ? "bg-[#0F766E] text-white"
                            : step === "saving"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-400"
                            }`}
                    >
                        <Package className="w-3.5 h-3.5" />
                        Xem lại
                    </div>
                    <div className="w-6 h-px bg-slate-300" />
                    <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${step === "saving"
                            ? "bg-[#0F766E] text-white"
                            : "bg-slate-100 text-slate-400"
                            }`}
                    >
                        <Save className="w-3.5 h-3.5" />
                        Lưu
                    </div>
                </div>

                {/* ════════════════════════════════════ */}
                {/* STEP 1: SCAN BARCODE                */}
                {/* ════════════════════════════════════ */}
                {step === "scan" && (
                    <div className="space-y-5">
                        {/* Visual scanner area */}
                        <div className="bg-linear-to-b from-slate-50 to-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                            <div className="mx-auto w-20 h-20 rounded-2xl bg-[#0F766E]/10 flex items-center justify-center mb-4">
                                <ScanLine className="w-10 h-10 text-[#0F766E]" />
                            </div>
                            <p className="text-sm text-slate-600 mb-1">
                                Dùng súng quét mã vạch hoặc nhập số thủ công
                            </p>
                            <p className="text-xs text-slate-400">
                                Hệ thống sẽ tự động tra cứu thông tin từ cơ sở dữ liệu
                                mã vạch toàn cầu (GS1/Open Food Facts)
                            </p>
                        </div>

                        {/* Barcode input */}
                        <div className="space-y-2">
                            <Label htmlFor="barcode-scan" className="text-sm font-medium">
                                Mã vạch sản phẩm
                            </Label>
                            <div className="relative">
                                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    ref={barcodeInputRef}
                                    id="barcode-scan"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Quét hoặc nhập mã vạch..."
                                    value={barcodeValue}
                                    onChange={(e) =>
                                        handleBarcodeInput(
                                            e.target.value.replace(/[^0-9]/g, "")
                                        )
                                    }
                                    onKeyDown={handleBarcodeKeyDown}
                                    className="pl-10 pr-4 h-12 text-lg font-mono rounded-xl bg-slate-50 border-slate-200 focus-visible:bg-white tracking-widest"
                                    autoComplete="off"
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-slate-400">
                                Nhấn Enter hoặc bấm nút bên dưới sau khi quét/nhập xong
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="rounded-xl flex-1"
                                onClick={handleClose}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl flex-1"
                                disabled={!barcodeValue.trim() || barcodeValue.length < 8}
                                onClick={handleProceedToReview}
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Tra cứu & Tiếp tục
                            </Button>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════ */}
                {/* STEP 2: REVIEW & FILL FORM          */}
                {/* ════════════════════════════════════ */}
                {step === "review" && (
                    <div className="space-y-5">
                        {/* Barcode display */}
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-10 h-10 rounded-lg bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                                <Barcode className="w-5 h-5 text-[#0F766E]" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-500">Mã vạch đã quét</p>
                                <p className="font-mono text-sm font-semibold tracking-widest text-slate-900">
                                    {barcodeValue}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-slate-600"
                                onClick={handleRescan}
                            >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Quét lại
                            </Button>
                        </div>

                        {/* Lookup status */}
                        {isLooking && (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                <p className="text-sm text-blue-700">
                                    Đang tra cứu thông tin từ cơ sở dữ liệu toàn cầu...
                                </p>
                            </div>
                        )}

                        {lookupDone && lookupResult && (
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-emerald-800">
                                        Tìm thấy thông tin sản phẩm!
                                    </p>
                                    <p className="text-xs text-emerald-600 truncate">
                                        {lookupResult.name}
                                        {lookupResult.brand
                                            ? ` — ${lookupResult.brand}`
                                            : ""}
                                    </p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs shrink-0"
                                >
                                    Tự động điền
                                </Badge>
                            </div>
                        )}

                        {lookupDone && lookupError && (
                            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm text-amber-800">
                                        {lookupError}
                                    </p>
                                    <p className="text-xs text-amber-600">
                                        Bạn có thể nhập thông tin thủ công bên dưới
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Preview image from lookup */}
                        {imageUrl && (
                            <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100">
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 relative shrink-0">
                                    <Image
                                        src={imageUrl}
                                        alt="Ảnh sản phẩm"
                                        fill
                                        className="object-contain"
                                        sizes="64px"
                                        unoptimized
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-slate-400">
                                        Ảnh sản phẩm (từ cơ sở dữ liệu)
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {imageUrl}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-red-500"
                                    onClick={() => setImageUrl("")}
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {/* Form fields */}
                        <div className="space-y-4">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="qa-name">
                                    Tên sản phẩm <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="qa-name"
                                    placeholder="Nhập tên sản phẩm"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`bg-slate-50 border-slate-200 rounded-xl px-4 focus-visible:bg-white ${errors.name ? "border-red-400" : ""
                                        }`}
                                />
                                {errors.name && (
                                    <p className="text-xs text-red-500">{errors.name}</p>
                                )}
                            </div>

                            {/* SKU */}
                            <div className="space-y-1.5">
                                <Label htmlFor="qa-sku">
                                    Mã SKU <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="qa-sku"
                                    placeholder="SP-001"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    className={`bg-slate-50 border-slate-200 rounded-xl px-4 font-mono focus-visible:bg-white ${errors.sku ? "border-red-400" : ""
                                        }`}
                                />
                                {errors.sku && (
                                    <p className="text-xs text-red-500">{errors.sku}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label htmlFor="qa-desc">Mô tả</Label>
                                <Textarea
                                    id="qa-desc"
                                    placeholder="Mô tả ngắn..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="bg-slate-50 border-slate-200 rounded-xl px-4 py-3 resize-none focus-visible:bg-white"
                                    rows={2}
                                />
                            </div>

                            {/* Base unit */}
                            <div className="space-y-1.5">
                                <Label>
                                    Đơn vị cơ bản <span className="text-red-500">*</span>
                                </Label>
                                {loadingUnits ? (
                                    <Skeleton className="h-10 w-full rounded-xl" />
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
                                            className={`bg-slate-50 border-slate-200 rounded-xl px-4 h-10 focus:bg-white ${errors.baseUnitId ? "border-red-400" : ""
                                                }`}
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

                            {/* Unit conversions */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium flex items-center gap-1.5">
                                        <Repeat2 className="w-3.5 h-3.5 text-[#0F766E]" />
                                        Quy đổi đơn vị
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl h-7 text-xs"
                                        onClick={addUnitRow}
                                        disabled={
                                            !baseUnitId ||
                                            availableConversionUnits.length === 0
                                        }
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Thêm đơn vị
                                    </Button>
                                </div>

                                {!baseUnitId && (
                                    <p className="text-xs text-slate-400 text-center py-2">
                                        Chọn đơn vị cơ bản trước để thêm đơn vị quy đổi
                                    </p>
                                )}

                                {unitRows.length === 0 && baseUnitId && (
                                    <p className="text-xs text-slate-400 text-center py-2">
                                        Chưa có đơn vị quy đổi. Nhấn &quot;Thêm đơn vị&quot; để bắt đầu.
                                    </p>
                                )}

                                {unitRows.map((row, i) => (
                                    <div
                                        key={i}
                                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                                    >
                                        {/* Unit select */}
                                        <div className="space-y-1">
                                            <Label className="text-xs">Đơn vị</Label>
                                            <Select
                                                value={row.unit_id}
                                                onValueChange={(v) =>
                                                    updateUnitRow(i, "unit_id", v)
                                                }
                                            >
                                                <SelectTrigger
                                                    className={`bg-white border-slate-200 rounded-lg px-3 h-9 text-xs focus:bg-white ${errors[`unit_id_${i}`] ? "border-red-400" : ""}`}
                                                >
                                                    <SelectValue placeholder="Chọn" />
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
                                        <div className="space-y-1">
                                            <Label className="text-xs">
                                                Quy đổi (→{" "}
                                                {orgUnits.find((u) => u.id === baseUnitId)
                                                    ?.name || "cơ bản"}
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
                                                className={`bg-white border-slate-200 rounded-lg h-9 px-3 text-xs focus-visible:bg-white ${errors[`conversion_rate_${i}`] ? "border-red-400" : ""}`}
                                            />
                                            {errors[`conversion_rate_${i}`] && (
                                                <p className="text-xs text-red-500">
                                                    {errors[`conversion_rate_${i}`]}
                                                </p>
                                            )}
                                        </div>

                                        {/* Unit barcode */}
                                        <div className="space-y-1">
                                            <Label className="text-xs">Mã vạch</Label>
                                            <Input
                                                placeholder="Tuỳ chọn"
                                                value={row.barcode}
                                                onChange={(e) =>
                                                    updateUnitRow(
                                                        i,
                                                        "barcode",
                                                        e.target.value
                                                    )
                                                }
                                                className="bg-white border-slate-200 rounded-lg h-9 px-3 text-xs font-mono focus-visible:bg-white"
                                            />
                                        </div>

                                        {/* Remove */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                            onClick={() => removeUnitRow(i)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Cost price */}
                            <div className="space-y-1.5">
                                <Label htmlFor="qa-cost">Giá vốn (₫)</Label>
                                <Input
                                    id="qa-cost"
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
                            </div>

                            {/* Dimensions */}
                            <div>
                                <Label className="text-sm text-slate-700 mb-2 block">
                                    Kích thước & Trọng lượng
                                </Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        {
                                            id: "qa-length",
                                            label: "Dài (cm)",
                                            val: length,
                                            setter: setLength,
                                        },
                                        {
                                            id: "qa-width",
                                            label: "Rộng (cm)",
                                            val: width,
                                            setter: setWidth,
                                        },
                                        {
                                            id: "qa-height",
                                            label: "Cao (cm)",
                                            val: height,
                                            setter: setHeight,
                                        },
                                        {
                                            id: "qa-weight",
                                            label: "Nặng (kg)",
                                            val: weight,
                                            setter: setWeight,
                                        },
                                    ].map((field) => (
                                        <div key={field.id} className="space-y-1">
                                            <Label
                                                htmlFor={field.id}
                                                className="text-xs text-slate-500"
                                            >
                                                {field.label}
                                            </Label>
                                            <Input
                                                id={field.id}
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={field.val}
                                                onChange={(e) =>
                                                    field.setter(
                                                        toDecimalStr(e.target.value)
                                                    )
                                                }
                                                className="bg-slate-50 border-slate-200 rounded-xl px-3 h-9 text-sm focus-visible:bg-white"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={handleClose}
                            >
                                Hủy
                            </Button>
                            <div className="flex-1" />
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={handleRescan}
                            >
                                <RotateCcw className="w-4 h-4 mr-1.5" />
                                Quét lại
                            </Button>
                            <Button
                                className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                                onClick={handleSave}
                                disabled={isSubmitting}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Lưu sản phẩm
                            </Button>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════ */}
                {/* STEP 3: SAVING                      */}
                {/* ════════════════════════════════════ */}
                {step === "saving" && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Loader2 className="w-10 h-10 text-[#0F766E] animate-spin" />
                        <p className="text-sm text-slate-600">
                            Đang tạo sản phẩm &quot;{name}&quot;...
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
