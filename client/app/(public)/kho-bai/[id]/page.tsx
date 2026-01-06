"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Property, mockProperties } from '@/data/mockProperties';
import { PrimeNestHeader } from '@/app/(public)/homepage/Header';
import { PrimeNestFooter } from '@/app/(public)/homepage/Footer';
import MapComponent from '@/app/(public)/homepage/MapSearch/MapComponent';
import {
    MapPin,
    Check,
    Thermometer,
    Truck,
    Download,
    ChevronRight,
    ArrowUpFromLine,
    Weight,
    Warehouse as WarehouseIcon,
    BadgeCheck,
    Square,
    Phone,
    Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRIMARY_COLOR = "#0F766E"; // GenHub Teal

export default function WarehouseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            const found = mockProperties.find(p => p.id === Number(id));
            if (found) {
                setProperty(found);
            }
            setLoading(false);
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <PrimeNestHeader isLogin={false} />
                <main className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F766E]"></div>
                </main>
                <PrimeNestFooter />
            </div>
        );
    }

    if (!property) {
        return (
            <div className="flex flex-col min-h-screen">
                <PrimeNestHeader isLogin={false} />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Không tìm thấy kho</h1>
                        <p className="text-slate-600">Kho bạn đang tìm không tồn tại hoặc đã bị xóa.</p>
                        <Button className="mt-4 bg-[#0F766E] hover:bg-[#0D655D]" onClick={() => router.back()}>Quay lại</Button>
                    </div>
                </main>
                <PrimeNestFooter />
            </div>
        );
    }

    // Mock extra images
    const galleryImages = [
        property.image,
        "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1629814249584-bd4d53cf0e7d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1565514020176-8c03566a01d5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-sans text-slate-900 dark:text-white">
            <PrimeNestHeader isLogin={false} />

            <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Custom Breadcrumbs */}
                <nav className="flex flex-wrap items-center gap-2 mb-8 text-sm">
                    <div
                        className="flex items-center gap-1 text-slate-500 hover:text-[#0F766E] cursor-pointer transition-colors"
                        onClick={() => router.push('/')}
                    >
                        <Home className="w-4 h-4" />
                        <span className="font-medium">Trang chủ</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <span
                        className="text-slate-500 hover:text-[#0F766E] font-medium cursor-pointer transition-colors"
                        onClick={() => router.push('/kho-bai')}
                    >
                        Danh sách kho
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <span className="text-[#0F766E] font-bold px-2 py-0.5 bg-teal-50 rounded-md border border-teal-100">
                        {property.title}
                    </span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT COLUMN (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Header Section */}
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
                                        {property.name || property.title}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-3 text-slate-500 dark:text-gray-400">
                                        <MapPin className="w-5 h-5 text-[#0F766E]" />
                                        <p className="text-base font-medium">{property.address_detail || property.address}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex h-9 items-center justify-center gap-x-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-4 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                        <div className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                        </div>
                                        <p className="text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wide">Đang trống</p>
                                    </div>
                                    <div className="flex h-9 items-center justify-center gap-x-2 rounded-full bg-slate-100 dark:bg-slate-800 px-4 shadow-sm border border-slate-200">
                                        <BadgeCheck className="w-4 h-4 text-slate-600" />
                                        <p className="text-slate-700 dark:text-white text-xs font-bold uppercase tracking-wide">ISO 9001</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Gallery Grid (Improved Layout) */}
                        <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                            <div className="grid grid-cols-4 grid-rows-2 h-[480px] gap-1">
                                {/* Main Image (Large Left) */}
                                <div className="col-span-2 row-span-2 relative group overflow-hidden cursor-pointer bg-slate-100">
                                    <img
                                        src={galleryImages[0]}
                                        alt="Main Warehouse"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </div>
                                {/* Sub Images */}
                                {galleryImages.slice(1, 5).map((img, idx) => (
                                    <div key={idx} className="col-span-1 row-span-1 relative group overflow-hidden cursor-pointer bg-slate-100">
                                        <img
                                            src={img}
                                            alt={`Gallery ${idx}`}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Diện tích', value: `${property.area.toLocaleString()} m²`, icon: Square },
                                { label: 'Chiều cao trần', value: property.ceiling_height ? `${property.ceiling_height}m` : 'Tiêu chuẩn', icon: ArrowUpFromLine },
                                { label: 'Tải trọng sàn', value: property.max_load_capacity ? `${property.max_load_capacity} tấn/m²` : 'Tiêu chuẩn', icon: Weight },
                                { label: 'Loại kho', value: property.type, icon: WarehouseIcon },
                            ].map((metric, idx) => (
                                <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-[#1a202c] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 hover:border-[#0F766E]/30 transition-colors group">
                                    <div className="size-12 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-[#0F766E] group-hover:scale-110 transition-transform">
                                        <metric.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">{metric.label}</p>
                                        <p className="text-slate-900 dark:text-white text-lg font-bold truncate">{metric.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <div className="bg-white dark:bg-[#1a202c] p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                                <span className="w-1 h-6 bg-[#0F766E] rounded-full"></span>
                                Thông tin chi tiết
                            </h3>
                            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p className="mb-4">{property.description || "Chưa có mô tả chi tiết cho kho này."}</p>
                                <p>
                                    Kho được thiết kế tối ưu cho việc lưu trữ và vận hành logistics.
                                    Hệ thống chiếu sáng LED tiết kiệm năng lượng, sàn epoxy chống bụi, và dock leveler tự động.
                                    Vị trí thuận lợi kết nối giao thông, xe container ra vào dễ dàng 24/7.
                                </p>
                            </div>
                        </div>

                        {/* Environment & Amenities */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Environment Monitor */}
                            <div className="bg-white dark:bg-[#1a202c] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Thermometer className="w-5 h-5 text-[#0F766E]" />
                                    Môi trường kho
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-sm font-medium text-slate-500">Nhiệt độ duy trì</span>
                                            <span className="text-xl font-bold text-slate-900 dark:text-white">20°C - 25°C</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                            <div className="bg-emerald-400 h-2.5 rounded-full" style={{ width: '45%', marginLeft: '25%' }}></div>
                                        </div>
                                        <p className="text-xs text-center text-slate-400 mt-2">Dải nhiệt độ lý tưởng</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-sm font-medium text-slate-500">Độ ẩm</span>
                                            <span className="text-xl font-bold text-slate-900 dark:text-white">40% - 60%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                            <div className="bg-[#0F766E] h-2.5 rounded-full" style={{ width: '50%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Amenities */}
                            <div className="bg-white dark:bg-[#1a202c] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-[#0F766E]" />
                                    Tiện ích & Hạ tầng
                                </h3>
                                <ul className="space-y-4">
                                    {[
                                        'Hệ thống PCCC Sprinkler tự động',
                                        'Camera an ninh CCTV 24/7',
                                        'Internet cáp quang tốc độ cao',
                                        '3 Cửa nhập hàng (Dock Levelers)',
                                        'Bãi đỗ xe container rộng 500m²'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <span className="flex items-center justify-center size-6 rounded-full bg-teal-50 dark:bg-teal-900/30 text-[#0F766E]">
                                                <Check className="w-3.5 h-3.5" />
                                            </span>
                                            <span className="text-slate-700 dark:text-slate-200 text-sm font-medium">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Map Component Integration */}
                        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm h-[400px] relative z-0">
                            <MapComponent
                                properties={[property]}
                                highlightedPropertyId={property.id}
                                onMarkerClick={() => { }} // No-op for detail page
                                variant="detail"
                            />
                            {/* Map Overlay Info */}
                            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-4 py-3 rounded-xl shadow-lg border border-slate-100 z-10 max-w-[240px]">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-teal-50 rounded-lg text-[#0F766E]">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">Vị trí chính xác</p>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{property.address}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Pricing Card */}
                        <div className="sticky top-24 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1a202c] shadow-xl shadow-slate-200/50 p-6">
                            <div className="border-b border-dashed border-slate-200 pb-6 mb-6">
                                <p className="text-slate-500 text-sm font-medium mb-1">Giá thuê đề xuất</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-[#0F766E] tracking-tight">
                                        {property.price >= 1000000000
                                            ? `${(property.price / 1000000000).toFixed(1).replace('.', ',')} Tỷ`
                                            : `${(property.price).toLocaleString('vi-VN')}₫`
                                        }
                                    </span>
                                    <span className="text-slate-500 font-medium">/ tháng</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">*Giá chưa bao gồm VAT và phí dịch vụ</p>
                            </div>

                            <div className="space-y-3">
                                <Button className="w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0D655D] text-white text-base font-bold shadow-lg shadow-teal-500/20 transition-all">
                                    Yêu cầu thuê ngay
                                </Button>
                                <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors">
                                    <Download className="w-4 h-4 mr-2 text-[#0F766E]" />
                                    Tải brochure PDF
                                </Button>
                            </div>

                            {/* Contact Person */}
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <p className="text-sm font-medium text-slate-900 dark:text-white mb-4">Liên hệ chuyên viên tư vấn:</p>
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                        <img
                                            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                                            alt="Consultant"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Nguyễn Văn Minh</p>
                                        <p className="text-xs text-slate-500 mb-1">Senior Property Manager</p>
                                        <div className="flex items-center gap-1 text-[#0F766E] text-sm font-bold">
                                            <Phone className="w-4 h-4" />
                                            0912 345 678
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            <PrimeNestFooter />
        </div>
    );
}
