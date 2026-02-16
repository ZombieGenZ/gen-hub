"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { authStorage } from "@/services/auth/auth-storage.service";
import { toast } from "sonner";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

// ── shadcn/ui ──
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Tab Components ──
import { WarehouseOverviewTab } from "@/components/dashboard/warehouse-template/WarehouseOverviewTab";
import { WarehouseLayoutTab } from "@/components/dashboard/warehouse-template/WarehouseLayoutTab";
import { WarehouseImagesTab } from "@/components/dashboard/warehouse-template/WarehouseImagesTab";
import { WarehousePricingTab } from "@/components/dashboard/warehouse-template/WarehousePricingTab";
import { WarehouseGiftsTab } from "@/components/dashboard/warehouse-template/WarehouseGiftsTab";

const warehouseService = new WarehouseTemplateService();

export default function WarehouseEditPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [isDirty, setIsDirty] = useState(false);

    // ── Form data (controlled by each tab) ──
    const [formData, setFormData] = useState<Record<string, any>>({});

    // ── Load warehouse data ──
    const fetchWarehouse = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) { router.push("/login"); return; }

        try {
            setLoading(true);
            const data = await warehouseService.getWarehouseTemplateById(token, id);
            setWarehouse(data);
            setFormData(data);
        } catch (err) {
            toast.error("Không thể tải dữ liệu kho.");
            router.push("/dashboard/admin/warehouses");
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        if (id) fetchWarehouse();
    }, [id, fetchWarehouse]);

    // ── Handle form change ──
    const handleFormChange = useCallback((updates: Record<string, any>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
    }, []);

    // ── Save handler ──
    const handleSave = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        setSaving(true);
        try {
            await warehouseService.updateWarehouseTemplate(token, id, formData);
            toast.success("Đã lưu thay đổi.");
            setIsDirty(false);
            fetchWarehouse();
        } catch (err) {
            toast.error("Lưu thất bại. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-full max-w-md" />
                <Skeleton className="h-[400px] w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Sticky Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => router.push("/dashboard/admin/warehouses")}
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink
                                    href="/dashboard/admin/warehouses"
                                    className="cursor-pointer"
                                >
                                    Templates
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{warehouse?.name || "Chỉnh sửa"}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    {isDirty && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 rounded-md text-xs">
                            Chưa lưu
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/dashboard/admin/warehouses")}
                        style={{ borderRadius: "12px" }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        loading={saving}
                        className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                        style={{ borderRadius: "12px" }}
                    >
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </div>
            </div>

            {/* ── Tab Navigation (shadcn Tabs) ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start bg-muted/30 h-auto p-1 rounded-xl">
                    <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                    <TabsTrigger value="layout" className="rounded-lg">Layout Structure</TabsTrigger>
                    <TabsTrigger value="3d" className="rounded-lg">3D Layout Editor</TabsTrigger>
                    <TabsTrigger value="images" className="rounded-lg">Images</TabsTrigger>
                    <TabsTrigger value="pricing" className="rounded-lg">Pricing & Discount</TabsTrigger>
                    <TabsTrigger value="gifts" className="rounded-lg">Gifts & Amenities</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <WarehouseOverviewTab data={formData} onChange={handleFormChange} />
                </TabsContent>
                <TabsContent value="layout" className="mt-6">
                    <WarehouseLayoutTab warehouseId={id} data={formData} onChange={handleFormChange} />
                </TabsContent>
                <TabsContent value="3d" className="mt-6">
                    <div className="flex items-center justify-center h-[300px] rounded-2xl bg-muted/30 border border-dashed border-muted-foreground/30">
                        <p className="text-muted-foreground">🚧 3D Layout Editor — sẽ được tích hợp ở Phase 5</p>
                    </div>
                </TabsContent>
                <TabsContent value="images" className="mt-6">
                    <WarehouseImagesTab warehouseId={id} />
                </TabsContent>
                <TabsContent value="pricing" className="mt-6">
                    <WarehousePricingTab data={formData} onChange={handleFormChange} />
                </TabsContent>
                <TabsContent value="gifts" className="mt-6">
                    <WarehouseGiftsTab data={formData} onChange={handleFormChange} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
