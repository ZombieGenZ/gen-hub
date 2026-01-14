"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { authStorage } from "@/services/auth/auth-storage.service";
import { DashboardHeader } from "@/components/layouts/AdminHeader";
import { Button } from "@/components/ui/button";
import {
    MapPin,
    CheckCircle,
    ShieldCheck,
    Ruler,
    ArrowUpFromLine,
    Weight,
    Thermometer,
    Droplets,
    Wifi,
    Video,
    Truck,
    Car,
    FileText,
    Phone,
    Mail,
    ChevronRight,
    Home,
    Box
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function WarehouseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState<string>("");

    useEffect(() => {
        const fetchWarehouse = async () => {
            if (!id) return;

            try {
                const token = authStorage.getAccessToken();
                if (!token) {
                    router.push("/login");
                    return;
                }

                setLoading(true);
                const warehouseService = new WarehouseTemplateService();
                const data: any = await warehouseService.getWarehouseTemplateById(token, id);

                setWarehouse(data);
                // Set initial active image if available, otherwise use placeholder
                if (data.images && data.images.length > 0) {
                    setActiveImage(data.images[0].url);
                } else {
                    setActiveImage("https://placehold.co/800x600?text=Warehouse+Image");
                }
            } catch (err: any) {
                setError(err.message || "Failed to load warehouse details");
            } finally {
                setLoading(false);
            }
        };

        fetchWarehouse();
    }, [id, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen bg-slate-50">
                <div className="flex-1 flex flex-col">
                    <DashboardHeader />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !warehouse) {
        return (
            <div className="flex min-h-screen bg-slate-50">
                <div className="flex-1 flex flex-col">
                    <DashboardHeader />
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="text-red-500 text-xl mb-4">⚠️ {error || "Warehouse not found"}</div>
                        <Button
                            onClick={() => router.push("/dashboard/warehouse_template")}
                            className="bg-primary hover:bg-teal-700"
                        >
                            Quay lại danh sách
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Mock data for UI demonstration where real data is missing
    const mockImages = [
        "https://placehold.co/800x600?text=Main+View",
        "https://placehold.co/800x600?text=Interior",
        "https://placehold.co/800x600?text=Floor+Plan",
        "https://placehold.co/800x600?text=3D+Model"
    ];

    const displayImages = warehouse.images && warehouse.images.length > 0
        ? warehouse.images.map(img => img.url)
        : mockImages;

    const area = warehouse.length * warehouse.width;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <DashboardHeader>
                <div className="flex items-center text-sm text-slate-500">
                    <Link href="/dashboard" className="hover:text-primary flex items-center gap-1">
                        <Home className="w-4 h-4" /> Trang chủ
                    </Link>
                    <ChevronRight className="w-4 h-4 mx-2" />
                    <Link href="/dashboard/warehouse_template" className="hover:text-primary">
                        Danh sách kho
                    </Link>
                    <ChevronRight className="w-4 h-4 mx-2" />
                    <span className="text-slate-900 font-medium truncate max-w-[200px]">{warehouse.name}</span>
                </div>
            </DashboardHeader>

            <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{warehouse.name}</h1>
                            <div className="flex items-center gap-2 text-slate-600 mb-3">
                                <MapPin className="w-4 h-4 text-red-500" />
                                <span>{warehouse.address_detail}, {warehouse.ward?.name}, {warehouse.ward?.province?.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${warehouse.is_active
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}>
                                    <div className={`w-2 h-2 rounded-full ${warehouse.is_active ? "bg-green-500" : "bg-red-500"}`}></div>
                                    {warehouse.is_active ? "ĐANG HOẠT ĐỘNG" : "NGỪNG HOẠT ĐỘNG"}
                                </span>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> ISO 9001
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Image Gallery */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4">
                            <div className="aspect-video w-full bg-slate-100 rounded-lg overflow-hidden mb-4 relative group">
                                <Image
                                    src={activeImage || displayImages[0]}
                                    alt={warehouse.name}
                                    fill
                                    className="object-cover"
                                    priority
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 66vw"
                                />
                                <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm backdrop-blur-sm z-10">
                                    Khu vực lưu trữ chính
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                {displayImages.slice(0, 4).map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(img)}
                                        className={`aspect-video rounded-lg overflow-hidden border-2 transition-all relative ${activeImage === img ? "border-primary ring-2 ring-teal-100" : "border-transparent hover:border-slate-300"
                                            }`}
                                    >
                                        <Image
                                            src={img}
                                            alt={`View ${idx + 1}`}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 25vw, 15vw"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-primary mb-3">
                                    <Ruler className="w-5 h-5" />
                                </div>
                                <p className="text-sm text-slate-500 mb-1">Diện tích</p>
                                <p className="text-lg font-bold text-slate-900">{area.toLocaleString()} m²</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-primary mb-3">
                                    <ArrowUpFromLine className="w-5 h-5" />
                                </div>
                                <p className="text-sm text-slate-500 mb-1">Chiều cao trần</p>
                                <p className="text-lg font-bold text-slate-900">12m</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-primary mb-3">
                                    <Weight className="w-5 h-5" />
                                </div>
                                <p className="text-sm text-slate-500 mb-1">Tải trọng sàn</p>
                                <p className="text-lg font-bold text-slate-900">5 tấn/m²</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-primary mb-3">
                                    <Box className="w-5 h-5" />
                                </div>
                                <p className="text-sm text-slate-500 mb-1">Loại kho</p>
                                <p className="text-lg font-bold text-slate-900">{warehouse.type || "Kho thường"}</p>
                            </div>
                        </div>

                        {/* Detailed Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Thông tin chi tiết</h3>
                            <div className="prose prose-slate max-w-none text-slate-600">
                                <p>{warehouse.description || "Chưa có mô tả chi tiết cho kho này."}</p>
                                <p className="mt-4">
                                    Hệ thống quản lý tòa nhà thông minh (BMS) tích hợp giúp duy trì điều kiện môi trường lý tưởng
                                    cho linh kiện điện tử, dược phẩm hoặc hàng hóa giá trị cao. Sàn bê tông cốt thép được xử lý
                                    tăng cứng bề mặt, chống bụi, đáp ứng tiêu chuẩn phòng sạch cơ bản.
                                </p>
                            </div>
                        </div>

                        {/* Environment & Utilities */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Environment */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Thermometer className="w-5 h-5 text-primary" /> Môi trường kho
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-slate-600">Nhiệt độ duy trì</span>
                                            <span className="font-bold text-slate-900">20°C - 25°C</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-teal-400 to-red-400 w-3/4 ml-4 rounded-full"></div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 text-center">Dải nhiệt độ lý tưởng</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-slate-600">Độ ẩm</span>
                                            <span className="font-bold text-slate-900">40% - 60%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-teal-500 w-1/2 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Utilities */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" /> Tiện ích & Hạ tầng
                                </h3>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1 bg-green-100 p-1 rounded-full">
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                        </div>
                                        <span className="text-slate-600 text-sm">Hệ thống PCCC Sprinkler tự động</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1 bg-green-100 p-1 rounded-full">
                                            <Video className="w-3 h-3 text-green-600" />
                                        </div>
                                        <span className="text-slate-600 text-sm">Camera an ninh CCTV 24/7</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1 bg-green-100 p-1 rounded-full">
                                            <Wifi className="w-3 h-3 text-green-600" />
                                        </div>
                                        <span className="text-slate-600 text-sm">Internet cáp quang tốc độ cao</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1 bg-green-100 p-1 rounded-full">
                                            <Truck className="w-3 h-3 text-green-600" />
                                        </div>
                                        <span className="text-slate-600 text-sm">3 Cửa nhập hàng (Dock Levelers)</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1 bg-green-100 p-1 rounded-full">
                                            <Car className="w-3 h-3 text-green-600" />
                                        </div>
                                        <span className="text-slate-600 text-sm">Bãi đỗ xe container rộng 500m²</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Map Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="h-64 bg-slate-100 relative">
                                <Image
                                    src="https://placehold.co/1200x400?text=Map+View"
                                    alt="Map"
                                    fill
                                    className="object-cover opacity-80"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 66vw"
                                />
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-red-500" />
                                        <div>
                                            <p className="font-bold text-sm text-slate-900">Vị trí bản đồ</p>
                                            <p className="text-xs text-slate-500">Cách cao tốc Láng - Hòa Lạc 2km</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Right Column */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            {/* Pricing Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <p className="text-sm text-slate-500 mb-1">Giá thuê đề xuất</p>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-3xl font-bold text-primary">
                                        {warehouse.price_per_month
                                            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(warehouse.price_per_month))
                                            : "Liên hệ"}
                                    </span>
                                    <span className="text-slate-600">/ tháng</span>
                                </div>
                                <p className="text-xs text-slate-400 mb-6">+Giá chưa bao gồm VAT và phí dịch vụ</p>

                                <div className="space-y-3">
                                    <Button
                                        className="w-full bg-primary hover:bg-teal-700 text-white h-12 text-base font-medium shadow-lg shadow-primary/30"
                                        onClick={() => router.push(`/dashboard/rental_request?warehouse_id=${warehouse.id}`)}
                                    >
                                        Yêu cầu thuê ngay
                                    </Button>
                                    <Button variant="outline" className="w-full border-slate-200 bg-slate-100 hover:bg-slate-200 h-12 text-base font-medium text-slate-700 hover:text-slate-900">
                                        <FileText className="w-4 h-4 mr-2" /> Tải brochure PDF
                                    </Button>
                                </div>
                            </div>

                            {/* Contact Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <p className="text-sm font-medium text-slate-900 mb-4">Liên hệ chuyên viên tư vấn:</p>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden relative">
                                        <Image src="https://placehold.co/100x100?text=User" alt="Agent" fill className="object-cover" sizes="48px" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Nguyễn Văn Minh</p>
                                        <p className="text-xs text-slate-500">Senior Property Manager</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <a href="tel:0912345678" className="flex items-center gap-3 text-slate-600 hover:text-primary transition-colors p-2 rounded-lg hover:bg-teal-50">
                                        <Phone className="w-4 h-4" />
                                        <span className="font-medium">0912 345 678</span>
                                    </a>
                                    <a href="mailto:minh.nv@smartwarehouse.com" className="flex items-center gap-3 text-slate-600 hover:text-primary transition-colors p-2 rounded-lg hover:bg-teal-50">
                                        <Mail className="w-4 h-4" />
                                        <span className="font-medium">minh.nv@smartwarehouse.com</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
