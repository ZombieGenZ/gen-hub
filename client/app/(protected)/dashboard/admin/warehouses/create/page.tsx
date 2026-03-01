"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { toast } from "sonner";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

// ── shadcn/ui ──
import { Button } from "@/components/ui/button";
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
import { WarehousePricingTab } from "@/components/dashboard/warehouse-template/WarehousePricingTab";
import { WarehouseGiftsTab } from "@/components/dashboard/warehouse-template/WarehouseGiftsTab";

const warehouseService = new WarehouseTemplateService();

export default function WarehouseCreatePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const duplicateId = searchParams?.get("duplicate");

    const [loading, setLoading] = useState(!!duplicateId);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [formData, setFormData] = useState<Record<string, any>>({
        name: "",
        description: "",
        length: 0,
        width: 0,
        ceiling_height: 0,
        block_length: 0,
        block_width: 0,
        is_shared_warehouse: false,
        is_active: true,
        ward_id: "",
        address_detail: "",
        latitude: 0,
        longitude: 0,
        price_per_month: 0,
        discount_configs: [],
        addon_gifts: [],
        insurance_gifts: [],
        amenity_ids: [],
    });

    // ── Prefill from duplicate ──
    useEffect(() => {
        if (!duplicateId) return;
        const token = authStorage.getAccessToken();
        if (!token) return;

        (async () => {
            try {
                const data = await warehouseService.getWarehouseTemplateById(token, duplicateId);
                setFormData({
                    ...data,
                    name: `${data.name} (Copy)`,
                    id: undefined,
                    images: undefined,
                    rows: undefined,
                    created_at: undefined,
                    updated_at: undefined,
                });
            } catch {
                toast.error("Không thể tải dữ liệu để nhân bản.");
            } finally {
                setLoading(false);
            }
        })();
    }, [duplicateId]);

    const handleFormChange = useCallback((updates: Record<string, any>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    }, []);

    const handleSave = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        if (!formData.name) {
            toast.error("Vui lòng nhập tên kho.");
            return;
        }

        setSaving(true);
        try {
            const result = await warehouseService.createWarehouseTemplate(token, formData);
            toast.success("Đã tạo kho mới.");
            const newId = result?.data?.id;
            if (newId) {
                router.push(`/dashboard/admin/warehouses/${newId}`);
            } else {
                router.push("/dashboard/admin/warehouses");
            }
        } catch (err) {
            toast.error("Tạo kho thất bại. Vui lòng thử lại.");
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
            {/* ── Header ── */}
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
                                <BreadcrumbPage>Tạo mới</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
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
                        disabled={saving}
                        loading={saving}
                        className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                        style={{ borderRadius: "12px" }}
                    >
                        {saving ? "Đang tạo..." : "Tạo kho"}
                    </Button>
                </div>
            </div>

            {/* ── Tab Navigation ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start bg-muted/30 h-auto p-1 rounded-xl">
                    <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                    <TabsTrigger value="pricing" className="rounded-lg">Pricing & Discount</TabsTrigger>
                    <TabsTrigger value="gifts" className="rounded-lg">Gifts & Amenities</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <WarehouseOverviewTab data={formData} onChange={handleFormChange} />
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
