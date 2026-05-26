"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ProductService } from "@/services/product/product.service";
import { BatchService } from "@/services/batch/batch.service";
import type { Product } from "@/services/product/product.types";
import type { Batch } from "@/services/batch/batch.types";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";
import {
    getExpiryStatus,
    getDaysUntilExpiry,
    type SmartAlert,
} from "@/types/product-inventory";

// ── Components ──
import { GeneralInfoTab } from "@/components/pages/products/GeneralInfoTab";
import { UnitConversionsTab } from "@/components/pages/products/UnitConversionsTab";
import { BatchManagementTab } from "@/components/pages/products/BatchManagementTab";
import { StockLocationsTab } from "@/components/pages/products/StockLocationsTab";

// ── shadcn/ui ──
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ── Icons ──
import {
    ArrowLeftIcon,
    CubeIcon,
} from "@heroicons/react/24/outline";
import {
    Info,
    Repeat2,
    Layers,
    MapPin,
    AlertTriangle,
    Ticket,
} from "lucide-react";

// ── Services ──
const productService = new ProductService();
const batchService = new BatchService();
const IMG_API = process.env.NEXT_PUBLIC_API_URL;

// ════════════════════════════════════════════════
// Smart Alert Card — Cảnh báo thông minh
// ════════════════════════════════════════════════
function SmartAlertCard({ alert }: { alert: SmartAlert }) {
    const severityStyles = {
        danger: "bg-red-50 border-red-200 text-red-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800",
        info: "bg-blue-50 border-blue-200 text-blue-800",
    };

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-xl border ${severityStyles[alert.severity]}`}
        >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{alert.title}</p>
                <p className="text-sm opacity-80 mt-0.5">{alert.message}</p>
            </div>
            {alert.action_label && (
                <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs rounded-lg"
                >
                    <Ticket className="w-3.5 h-3.5 mr-1" />
                    {alert.action_label}
                </Button>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════
// MAIN PAGE: Product Detail View
// ════════════════════════════════════════════════
export default function ProductDetailPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params?.id as string;
    const { showToast } = useToast();

    useEffect(() => {
        if (productId === "create") {
            router.replace("/dashboard/organization/products/create");
        }
    }, [productId, router]);

    // ── Data ──
    const [product, setProduct] = useState<Product | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [batchesLoading, setBatchesLoading] = useState(true);

    // ── Smart alerts ──
    const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);

    // ── Active tab ──
    const [activeTab, setActiveTab] = useState("general");

    // ── Fetch product ──
    const fetchProduct = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }
            setLoading(true);
            const result = await productService.getById(token, productId);
            if (result?.data) {
                setProduct(result.data);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            showToast("Không thể tải thông tin sản phẩm", "error");
        } finally {
            setLoading(false);
        }
    }, [productId, router, showToast]);

    // ── Fetch batches ──
    const fetchBatches = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setBatchesLoading(true);
            const result = await batchService.listByProduct(token, productId, {
                limit: 100,
                offset: 0,
            });
            if (result?.data) {
                const items = result.data.items || [];
                setBatches(items);
                // Generate smart alerts from batch data
                generateSmartAlerts(items);
            }
        } catch {
            // Silent — batch data is supplementary
        } finally {
            setBatchesLoading(false);
        }
    }, [productId]);

    // ── Generate smart alerts from batches ──
    const generateSmartAlerts = (batchList: Batch[]) => {
        const alerts: SmartAlert[] = [];

        batchList.forEach((batch) => {
            if (!batch.expiry_date) return;
            const status = getExpiryStatus(batch.expiry_date);
            const daysLeft = getDaysUntilExpiry(batch.expiry_date);

            if (status === "expired") {
                alerts.push({
                    id: `expired-${batch.id}`,
                    type: "expired",
                    severity: "danger",
                    title: `Lô ${batch.code} đã hết hạn sử dụng`,
                    message: `Hạn sử dụng đã qua ${Math.abs(daysLeft || 0)} ngày. Cần khóa lô hàng và ngừng xuất kho ngay.`,
                    product_id: batch.product_id,
                    batch_id: batch.id,
                    action_label: "Khóa lô hàng",
                    action_type: "lock_batch",
                    created_at: new Date().toISOString(),
                });
            } else if (status === "warning") {
                alerts.push({
                    id: `expiring-${batch.id}`,
                    type: "expiry_risk",
                    severity: "warning",
                    title: `Lô ${batch.code} sắp hết hạn (còn ${daysLeft} ngày)`,
                    message: `Dự báo lô hàng có thể không bán hết trước hạn sử dụng. Nên tạo chương trình giảm giá để xả hàng.`,
                    product_id: batch.product_id,
                    batch_id: batch.id,
                    action_label: "Tạo mã giảm giá",
                    action_type: "create_coupon",
                    created_at: new Date().toISOString(),
                });
            }
        });

        // Check for price spikes
        const batchesWithPrice = batchList
            .filter((b) => b.import_price != null)
            .sort(
                (a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

        if (batchesWithPrice.length >= 2) {
            const latest = batchesWithPrice[batchesWithPrice.length - 1];
            const prev = batchesWithPrice[batchesWithPrice.length - 2];
            if (latest.import_price && prev.import_price) {
                const change =
                    ((latest.import_price - prev.import_price) / prev.import_price) *
                    100;
                if (change > 15) {
                    alerts.push({
                        id: `price-spike-${latest.id}`,
                        type: "price_spike",
                        severity: "warning",
                        title: `Giá nhập tăng ${change.toFixed(1)}% so với lô trước`,
                        message: `Lô ${latest.code}: ${new Intl.NumberFormat("vi-VN").format(latest.import_price)}₫ vs Lô ${prev.code}: ${new Intl.NumberFormat("vi-VN").format(prev.import_price)}₫. Kiểm tra lại với nhà cung cấp.`,
                        product_id: latest.product_id,
                        batch_id: latest.id,
                        created_at: new Date().toISOString(),
                    });
                }
            }
        }

        setSmartAlerts(alerts);
    };

    useEffect(() => {
        if (productId && productId !== "create") {
            fetchProduct();
            fetchBatches();
        }
    }, [productId, fetchProduct, fetchBatches]);

    // ════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════
    if (loading) {
        return (
            <div className="flex-1 overflow-auto bg-slate-50/50">
                <main className="pt-0 py-4 px-4 space-y-6">
                    {/* Header skeleton */}
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-64" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    </div>
                    {/* Content skeleton */}
                    <Card className="shadow-premium rounded-3xl border-0">
                        <CardContent className="p-6 space-y-4">
                            <Skeleton className="h-10 w-full max-w-md" />
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex-1 overflow-auto bg-slate-50/50">
                <main className="pt-0 py-4 px-4">
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <CubeIcon className="w-16 h-16 text-slate-500" />
                        <p className="text-lg font-medium text-slate-700">
                            Không tìm thấy sản phẩm
                        </p>
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => router.push("/dashboard/organization/products")}
                        >
                            <ArrowLeftIcon className="w-4 h-4 mr-2" />
                            Quay lại danh sách
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto bg-slate-50/50">
            <main className="pt-0 py-4 px-4 space-y-6">
                {/* ── Back button + Product header ── */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl h-10 w-10 shrink-0"
                            onClick={() => router.push("/dashboard/organization/products")}
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-4">
                            {/* Product thumbnail */}
                            <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                                {product.image_url ? (
                                    <Image
                                        src={
                                            product.image_url.startsWith("http")
                                                ? product.image_url
                                                : `${IMG_API}${product.image_url}`
                                        }
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        sizes="56px"
                                    />
                                ) : (
                                    <CubeIcon className="w-7 h-7 text-slate-600" />
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-slate-900">
                                        {product.name}
                                    </h1>
                                    {product.is_active ? (
                                        <Badge
                                            variant="outline"
                                            className="rounded-md font-normal bg-emerald-50 text-emerald-700 border-emerald-200"
                                        >
                                            Đang bán
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="rounded-md font-normal bg-gray-50 text-gray-500 border-gray-200"
                                        >
                                            Ngừng bán
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    SKU: <span className="font-mono">{product.sku}</span>
                                    {product.barcode && (
                                        <>
                                            {" "}
                                            · Barcode:{" "}
                                            <span className="font-mono">
                                                {product.barcode}
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Smart Alerts ── */}
                {smartAlerts.length > 0 && (
                    <div className="space-y-2">
                        {smartAlerts.map((alert) => (
                            <SmartAlertCard key={alert.id} alert={alert} />
                        ))}
                    </div>
                )}

                {/* ── Tabbed Content ── */}
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                >
                    <TabsList className="bg-white border border-slate-200 rounded-xl p-1 w-full md:w-auto">
                        <TabsTrigger
                            value="general"
                            className="rounded-lg data-[state=active]:bg-[#0F766E] data-[state=active]:text-white gap-1.5"
                        >
                            <Info className="w-4 h-4" />
                            <span className="hidden sm:inline">Thông tin cơ bản</span>
                            <span className="sm:hidden">Cơ bản</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="units"
                            className="rounded-lg data-[state=active]:bg-[#0F766E] data-[state=active]:text-white gap-1.5"
                        >
                            <Repeat2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Quy đổi đơn vị</span>
                            <span className="sm:hidden">Đơn vị</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="batches"
                            className="rounded-lg data-[state=active]:bg-[#0F766E] data-[state=active]:text-white gap-1.5"
                        >
                            <Layers className="w-4 h-4" />
                            <span className="hidden sm:inline">Lô hàng</span>
                            <span className="sm:hidden">Lô hàng</span>
                            {batches.length > 0 && (
                                <Badge className="ml-1 h-5 min-w-5 px-1 bg-white/20 text-white text-[10px]">
                                    {batches.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="locations"
                            className="rounded-lg data-[state=active]:bg-[#0F766E] data-[state=active]:text-white gap-1.5"
                        >
                            <MapPin className="w-4 h-4" />
                            <span className="hidden sm:inline">Vị trí tồn kho</span>
                            <span className="sm:hidden">Vị trí</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="mt-4">
                        <GeneralInfoTab product={product} />
                    </TabsContent>

                    <TabsContent value="units" className="mt-4">
                        <UnitConversionsTab product={product} />
                    </TabsContent>

                    <TabsContent value="batches" className="mt-4">
                        <BatchManagementTab
                            product={product}
                            batches={batches}
                            loading={batchesLoading}
                            onRefresh={fetchBatches}
                        />
                    </TabsContent>

                    <TabsContent value="locations" className="mt-4">
                        <StockLocationsTab productId={productId} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
