"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { authStorage } from "@/services/auth/auth-storage.service";
import { toast } from "sonner";
import { ArrowLeftIcon, GlobeAltIcon } from "@heroicons/react/24/outline";

// ── shadcn/ui ──
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Tab Components ──
import { WarehouseOverviewTab } from "@/components/dashboard/warehouse-template/WarehouseOverviewTab";
import { WarehouseLayoutTab } from "@/components/dashboard/warehouse-template/WarehouseLayoutTab";
import { WarehouseImagesTab } from "@/components/dashboard/warehouse-template/WarehouseImagesTab";
import { WarehousePricingTab } from "@/components/dashboard/warehouse-template/WarehousePricingTab";
import { WarehouseGiftsTab } from "@/components/dashboard/warehouse-template/WarehouseGiftsTab";

const warehouseService = new WarehouseTemplateService();
const WAREHOUSES_BASE_PATH = "/dashboard/admin/warehouses";

export default function WarehouseEditPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [isDirty, setIsDirty] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const goToWarehouses = useCallback(() => {
        router.push(WAREHOUSES_BASE_PATH);
    }, [router]);

    // ── Form data  ──
    const [formData, setFormData] = useState<Record<string, any>>({});

    // ── Load warehouse data ──
    const fetchWarehouse = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) { router.push("/login"); return; }

        try {
            setLoading(true);
            const data = await warehouseService.getWarehouseTemplateById(token, id);
            setWarehouse(data);
            const normalized = {
                ...data,
                ward_id: data.ward_id || data.ward?.id || "",
            };
            setFormData(normalized);
        } catch (err) {
            toast.error("Không thể tải dữ liệu kho.");
            goToWarehouses();
        } finally {
            setLoading(false);
        }
    }, [id, goToWarehouses]);

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

        // Only send fields that are actually changed and valid
        const cleanData: Record<string, any> = {};

        // Required string fields
        if (formData.name?.trim()) cleanData.name = formData.name.trim();

        // Optional string fields
        if (formData.description?.trim()) cleanData.description = formData.description.trim();
        if (formData.address_detail?.trim()) cleanData.address_detail = formData.address_detail.trim();
        // NOTE: manager_name / manager_email / manager_phone are NOT columns on warehouse_templates table.
        // Manager assignment uses a separate join table (WarehouseTemplateManager) via /warehouse-managers/assign API.

        // Required numeric fields (must have valid value)
        const requiredNumbers = ['length', 'width', 'block_length', 'block_width', 'price_per_month'];
        for (const key of requiredNumbers) {
            if (formData[key] !== undefined && formData[key] !== null && formData[key] !== '') {
                const val = Number(formData[key]);
                if (!isNaN(val) && val > 0) {
                    cleanData[key] = val;
                }
            }
        }

        // Optional numeric fields
        const optionalNumbers = ['ceiling_height', 'total_weight_capacity',
            'min_temperature', 'max_temperature', 'min_humidity', 'max_humidity',
            'latitude', 'longitude'];
        for (const key of optionalNumbers) {
            if (formData[key] !== undefined && formData[key] !== null && formData[key] !== '') {
                const val = Number(formData[key]);
                if (!isNaN(val)) {
                    cleanData[key] = val;
                }
            }
        }

        // Boolean fields
        if (typeof formData.is_shared_warehouse === 'boolean') {
            cleanData.is_shared_warehouse = formData.is_shared_warehouse;
        }
        if (typeof formData.is_active === 'boolean') {
            cleanData.is_active = formData.is_active;
        }

        // UUID fields
        if (formData.ward_id && formData.ward_id !== '' && formData.ward_id !== 'undefined') {
            cleanData.ward_id = formData.ward_id;
        }

        // Gifts & amenities fields
        if (Array.isArray(formData.amenity_ids)) {
            cleanData.amenity_ids = Array.from(new Set(formData.amenity_ids.filter((id: unknown) => typeof id === 'string' && id.trim())));
        } else if (Array.isArray(formData.amenities)) {
            const normalizedAmenityIds = formData.amenities
                .map((item: any) => item?.amenity_id || item?.id)
                .filter((id: unknown) => typeof id === 'string' && id.trim());
            cleanData.amenity_ids = Array.from(new Set(normalizedAmenityIds));
        }

        if (Array.isArray(formData.addon_gifts)) {
            cleanData.addon_gifts = formData.addon_gifts
                .filter((gift: any) => typeof gift?.addon_id === 'string' && gift.addon_id.trim())
                .map((gift: any) => ({
                    id: gift.id,
                    addon_id: gift.addon_id,
                    is_until_service_end: !!gift.is_until_service_end,
                    gift_duration_value: Number(gift.gift_duration_value) || 1,
                    gift_duration_unit: gift.gift_duration_unit || 'MONTH',
                    is_active: gift.is_active !== false,
                }));
        }

        if (Array.isArray(formData.insurance_gifts)) {
            cleanData.insurance_gifts = formData.insurance_gifts
                .filter((gift: any) => typeof gift?.insurance_id === 'string' && gift.insurance_id.trim())
                .map((gift: any) => ({
                    id: gift.id,
                    insurance_id: gift.insurance_id,
                    is_until_service_end: !!gift.is_until_service_end,
                    gift_duration_value: Number(gift.gift_duration_value) || 1,
                    gift_duration_unit: gift.gift_duration_unit || 'MONTH',
                    is_active: gift.is_active !== false,
                }));
        }

        // Validate required fields
        if (!cleanData.name) {
            toast.error("Tên kho không được để trống");
            return;
        }
        if (!cleanData.length || cleanData.length <= 0) {
            toast.error("Chiều dài phải lớn hơn 0");
            return;
        }
        if (!cleanData.width || cleanData.width <= 0) {
            toast.error("Chiều rộng phải lớn hơn 0");
            return;
        }
        if (!cleanData.block_length || cleanData.block_length <= 0) {
            toast.error("Chiều dài block phải lớn hơn 0");
            return;
        }
        if (!cleanData.block_width || cleanData.block_width <= 0) {
            toast.error("Chiều rộng block phải lớn hơn 0");
            return;
        }
        if (!cleanData.price_per_month || cleanData.price_per_month <= 0) {
            toast.error("Giá thuê phải lớn hơn 0");
            return;
        }

        setSaving(true);
        try {
            // 1. Update warehouse template basic info
            await warehouseService.updateWarehouseTemplate(token, id, cleanData);

            // 2. Assign manager via separate API if a new manager_user was selected
            // (manager is stored in WarehouseTemplateManager join table, not on warehouse_templates)
            if (formData.manager_user?.id) {
                const API = process.env.NEXT_PUBLIC_API_URL;
                await fetch(`${API}/warehouse-managers/assign`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        warehouse_template_id: id,
                        user_id: formData.manager_user.id,
                    }),
                });
                // Note: 409 Conflict (already assigned) is acceptable — ignore silently
            }

            toast.success("Đã lưu thay đổi.");
            setIsDirty(false);
            fetchWarehouse();
        } catch (err: any) {
            const msg = err?.message || "Lỗi không xác định";
            toast.error(`Lưu thất bại: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    // ── Publish/Unpublish handler ──
    const handleTogglePublish = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        setPublishing(true);
        try {
            const newStatus = !formData.is_active;
            await warehouseService.updateWarehouseTemplate(token, id, { is_active: newStatus });
            toast.success(newStatus ? "Kho đã được xuất bản!" : "Kho đã được ẩn.");
            fetchWarehouse();
        } catch {
            toast.error("Thao tác thất bại. Vui lòng thử lại.");
        } finally {
            setPublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-full max-w-md" />
                <Skeleton className="h-100 w-full rounded-2xl" />
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
                        onClick={goToWarehouses}
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <h1 className="text-lg font-semibold truncate">{warehouse?.name || "Chỉnh sửa"}</h1>
                    {isDirty && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 rounded-md text-xs">
                            Chưa lưu
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={goToWarehouses}
                        style={{ borderRadius: "12px" }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant={formData.is_active ? "outline" : "default"}
                        onClick={handleTogglePublish}
                        disabled={publishing}
                        className={formData.is_active
                            ? "gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                            : "gap-2 bg-green-600 hover:bg-green-700 text-white"
                        }
                        style={{ borderRadius: "12px" }}
                    >
                        <GlobeAltIcon className="w-4 h-4" />
                        {publishing
                            ? "Đang xử lý..."
                            : formData.is_active ? "Unpublish" : "Publish"
                        }
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

            {/* ── Tab Navigation ── */}
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
                    <div className="flex items-center justify-center h-75 rounded-2xl bg-muted/30 border border-dashed border-muted-foreground/30">
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
