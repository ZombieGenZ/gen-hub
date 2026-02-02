"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { warehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    MapPin,
    Snowflake,
    Box,
    ArrowLeft,
    CheckCircle2,
    Ruler,
    Thermometer
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { useToast } from "@/contexts/ToastContext";

interface WarehouseDetail {
    id: string;
    name: string;
    description: string;
    address_detail: string;
    price_per_month: number;
    length: number;
    width: number;
    ceiling_height: number;
    is_cold_storage: boolean;
    images: { url: string }[];
    ward?: {
        name: string;
        province?: {
            name: string;
        }
    };
    amenities: { amenity: { name: string } }[];
    total_weight_capacity: number;
    min_temperature?: number;
    max_temperature?: number;
}

export default function WarehouseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const [warehouse, setWarehouse] = useState<WarehouseDetail | null>(null);
    const [imageError, setImageError] = useState(false);
    const PLACEHOLDER_IMAGE = "/placeholder-warehouse.svg";
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) {
                    // Handle auth
                }
                const id = params.id as string;
                const data = await warehouseTemplateService.getWarehouseTemplateById(token || "", id);
                setWarehouse(data);
            } catch (error) {
                console.error("Failed to fetch detail", error);
                showToast("Không thể tải thông tin kho", "error");
            } finally {
                setLoading(false);
            }
        };

        if (params.id) fetchDetail();
    }, [params.id, showToast]);

    const handleBooking = () => {
        router.push(`/dashboard/customer/warehouses/${params.id}/booking`);
    };

    if (loading) return <div className="p-8 text-center">Đang tải...</div>;
    if (!warehouse) return <div className="p-8 text-center">Không tìm thấy kho</div>;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0 gap-2 hover:bg-transparent hover:text-brand">
                <ArrowLeft className="w-4 h-4" />
                Quay lại danh sách
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Images & Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{warehouse.name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{warehouse.address_detail}, {warehouse.ward?.name}, {warehouse.ward?.province?.name}</span>
                        </div>
                    </div>

                    {/* Image Gallery (Simplified) */}
                    <div className="aspect-video relative rounded-2xl overflow-hidden bg-muted">
                        <Image
                            src={imageError ? PLACEHOLDER_IMAGE : (warehouse.images?.[0]?.url || PLACEHOLDER_IMAGE)}
                            alt={warehouse.name}
                            fill
                            className="object-cover"
                            onError={() => setImageError(true)}
                        />
                        <div className="absolute top-4 left-4">
                            <Badge className={warehouse.is_cold_storage ? "bg-blue-500" : "bg-orange-500"}>
                                {warehouse.is_cold_storage ? "Kho lạnh" : "Kho thường"}
                            </Badge>
                        </div>
                    </div>

                    {/* Tabs for Details */}
                    <Tabs defaultValue="overview">
                        <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto rounded-none">
                            <TabsTrigger value="overview" className="border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent rounded-none px-4 py-3">Tổng quan</TabsTrigger>
                            <TabsTrigger value="features" className="border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent rounded-none px-4 py-3">Tiện ích & Dịch vụ</TabsTrigger>
                            <TabsTrigger value="location" className="border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent rounded-none px-4 py-3">Vị trí</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="pt-6 space-y-6">
                            <div className="prose max-w-none text-muted-foreground">
                                <p>{warehouse.description || "Chưa có mô tả chi tiết."}</p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                        <Ruler className="w-4 h-4" />
                                        <span className="text-sm">Diện tích</span>
                                    </div>
                                    <p className="font-semibold text-lg">{warehouse.length * warehouse.width} m²</p>
                                </div>
                                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                        <Box className="w-4 h-4" />
                                        <span className="text-sm">Sức chứa</span>
                                    </div>
                                    <p className="font-semibold text-lg">{warehouse.total_weight_capacity} tấn</p>
                                </div>
                                {warehouse.is_cold_storage && (
                                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                            <Thermometer className="w-4 h-4" />
                                            <span className="text-sm">Nhiệt độ</span>
                                        </div>
                                        <p className="font-semibold text-lg">{warehouse.min_temperature}°C - {warehouse.max_temperature}°C</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="features" className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {warehouse.amenities?.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                        <CheckCircle2 className="w-5 h-5 text-brand" />
                                        <span>{item.amenity.name}</span>
                                    </div>
                                ))}
                                {(!warehouse.amenities || warehouse.amenities.length === 0) && (
                                    <p className="text-muted-foreground">Không có tiện ích.</p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column: Booking Card */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Giá thuê tham khảo</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-brand">{formatCurrency(warehouse.price_per_month)}</span>
                                <span className="text-muted-foreground">/tháng</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Thời hạn thuê tối thiểu</span>
                                <span className="font-medium">1 tháng</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Đặt cọc</span>
                                <span className="font-medium">1 tháng</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border">
                            <Button className="w-full h-12 text-base font-semibold bg-brand hover:bg-brand-hover shadow-lg shadow-brand/20" onClick={handleBooking}>
                                Đặt thuê ngay
                            </Button>
                            <p className="text-xs text-center text-muted-foreground mt-3">
                                Bạn sẽ không bị tính phí cho đến khi hợp đồng được xác nhận.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
