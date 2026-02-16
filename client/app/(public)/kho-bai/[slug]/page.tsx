"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Property, mapWarehouseToProperty } from '@/data/mockProperties';
import { publicWarehouseService } from '@/services/public-warehouse/public-warehouse.service';
import { PrimeNestHeader } from '@/app/(public)/homepage/Header';
import { PrimeNestFooter } from '@/app/(public)/homepage/Footer';
import MapComponent from '@/app/(public)/homepage/MapSearch/MapComponent';
import { BookingWidget } from '@/components/warehouse/booking-widget';
import PropertySearch from '@/components/search/PropertySearch';
import SearchHeader from "@/components/search/SearchHeader";
import { FilterModal, FilterState } from '@/components/search/FilterModal';
import { SearchFilters } from '@/components/search/HeroSearchBar';
import '../kho-bai.css';

import {
    MapPinIcon,
    CheckIcon,
    SunIcon,
    TruckIcon,
    ArrowDownTrayIcon,
    ChevronRightIcon,
    ArrowUpIcon,
    CubeIcon,
    BuildingOffice2Icon,
    CheckBadgeIcon,
    Squares2X2Icon,
    PhoneIcon,
    HomeIcon,
    BoltIcon,
    ShieldCheckIcon,
    FireIcon,
    InboxStackIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WarehouseBookingPanel } from '@/components/warehouse/WarehouseBookingPanel';

const PRIMARY_COLOR = "#0F766E"; // GenHub Teal

export default function WarehouseDynamicPage() {
    const params = useParams();
    const router = useRouter();

    const slug = params.slug as string;
    const isId = !isNaN(Number(slug));

    if (!isId) {
        return (
            <div className="kho-bai-page">
                <PrimeNestHeader isLogin={false} />
                <Suspense fallback={<div className="p-10 text-center">Đang tải...</div>}>
                    <PropertySearch initialLocationSlug={slug} />
                </Suspense>
                <PrimeNestFooter />
            </div>
        );
    }

    // --- DETAIL MODE (Numeric ID) ---
    const id = slug;
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    const handleDetailSearch = (filters: SearchFilters) => {
        const params = new URLSearchParams();
        if (filters.areaRange) {
            params.set('areaMin', filters.areaRange.min.toString());
            params.set('areaMax', filters.areaRange.max.toString());
        }
        if (filters.rentalType) params.set('type', filters.rentalType);

        if (filters.location) {
            router.push(`/kho-bai/${filters.location}?${params.toString()}`);
        } else {
            router.push(`/kho-bai?${params.toString()}`);
        }
    };

    useEffect(() => {
        const fetchWarehouse = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await publicWarehouseService.getPublicWarehouseById(id);
                if (data) {
                    const mapped = mapWarehouseToProperty(data);
                    const enrichedProperty = {
                        ...mapped,
                        power_type: mapped.power_type || "3 Pha / 500kVA",
                        pccc_level: mapped.pccc_level || "Tự động Sprinkler (TCVN 3890)",
                        floor_load: mapped.floor_load || `${mapped.max_load_capacity || 3.5} Tấn/m²`,
                        container_access: mapped.container_access ?? true,
                    };
                    setProperty(enrichedProperty);
                }
            } catch (error) {
                console.error('Failed to fetch warehouse:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWarehouse();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
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

    const PLACEHOLDER_IMAGE = "/placeholder-warehouse.svg";
    // Use real images from API; fallback to placeholder
    const apiImages = (property.images || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(img => img.url);
    const galleryImages = apiImages.length > 0 ? apiImages : [
        property.image || PLACEHOLDER_IMAGE,
        PLACEHOLDER_IMAGE,
        PLACEHOLDER_IMAGE,
        PLACEHOLDER_IMAGE,
        PLACEHOLDER_IMAGE,
    ];

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#0f172a] font-sans text-slate-900 dark:text-white">
            <SearchHeader
                onSearch={handleDetailSearch}
                onOpenFilter={() => setIsFilterModalOpen(true)}
            />
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={() => { setIsFilterModalOpen(false); /* Optional redirect logic could go here */ }}
                initialFilters={{
                    priceRange: [0, 500],
                    amenities: [],
                    ceilingHeight: null,
                    floorLoadCapacity: 3,
                }}
            />
            <main className="flex-1 w-full max-w-350 mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* 1. Header Section */}
                <div className="space-y-4 mb-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            {/* Breadcrumbs */}
                            <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
                                <span className="hover:text-[#0F766E] cursor-pointer" onClick={() => router.push('/')}>Trang chủ</span>
                                <ChevronRightIcon className="w-4 h-4" />
                                <span className="hover:text-[#0F766E] cursor-pointer" onClick={() => router.push('/kho-bai')}>Kho bãi</span>
                                <ChevronRightIcon className="w-4 h-4" />
                                <span className="font-medium text-slate-900 dark:text-white line-clamp-1">{property.title}</span>
                            </div>

                            <h1 className="text-2xl md:text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white mb-2">
                                {property.name || property.title}
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                                <MapPinIcon className="w-5 h-5 text-[#0F766E]" />
                                <p className="text-base font-medium">{property.address_detail || property.address}</p>
                            </div>
                        </div>
                    </div>

                    {/* Technical Highlights Badge Row - B2B Focus */}
                    <div className="flex flex-wrap gap-3 pt-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium">
                            <BuildingOffice2Icon className="w-4 h-4 text-slate-500" />
                            <span>{property.area.toLocaleString()} m²</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium">
                            <CubeIcon className="w-4 h-4 text-slate-500" />
                            <span>{property.floor_load || "5 Tấn/m²"}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium">
                            <ArrowUpIcon className="w-4 h-4 text-slate-500" />
                            <span>Trần {property.ceiling_height || "10"}m</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium">
                            <BoltIcon className="w-4 h-4 text-slate-500" />
                            <span>{property.power_type || "Điện 3 Pha"}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Image Grid ) */}
                <div className="rounded-2xl overflow-hidden shadow-sm mb-10 h-75 md:h-112.5">
                    <div className="grid grid-cols-4 grid-rows-2 h-full gap-2">
                        {/* Main Image (Large Left) */}
                        <div className="col-span-4 md:col-span-2 row-span-2 relative group cursor-pointer bg-slate-100">
                            <img
                                src={galleryImages[0]}
                                alt="Main Warehouse"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                        </div>
                        {/* Sub Images */}
                        <div className="hidden md:block col-span-1 row-span-1 relative group cursor-pointer bg-slate-100">
                            <img src={galleryImages[1]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }} alt="" />
                        </div>
                        <div className="hidden md:block col-span-1 row-span-1 relative group cursor-pointer bg-slate-100">
                            <img src={galleryImages[2]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }} alt="" />
                        </div>
                        <div className="hidden md:block col-span-1 row-span-1 relative group cursor-pointer bg-slate-100">
                            <img src={galleryImages[3]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }} alt="" />
                        </div>
                        <div className="hidden md:block col-span-1 row-span-1 relative group cursor-pointer bg-slate-100">
                            <img src={galleryImages[4]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }} alt="" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none group-hover:bg-black/50 transition-colors">
                                <span className="text-white font-bold text-lg">+5 ảnh</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Main Content Split */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* LEFT COLUMN: Details (8 cols) */}
                    <div className="lg:col-span-8 space-y-10">

                        {/* Overview Host */}
                        <div className="flex items-center justify-between pb-8 border-b border-slate-200 dark:border-slate-800">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Quản lý bởi GenHub Logistics</h2>
                            </div>
                            <div className="size-14 rounded-full bg-teal-100 flex items-center justify-center text-[#0F766E] font-bold text-xl border-2 border-white shadow-sm">
                                <img src="/assets/icongenhub.svg" alt="Logo" className="w-7 h-7" />
                            </div>
                        </div>

                        {/* Technical Specs Table */}
                        <section>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Thông số kỹ thuật</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                        <CubeIcon className="w-4 h-4 text-[#0F766E]" /> Kết cấu & Tải trọng
                                    </h4>
                                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                        <li className="flex justify-between"><span>Tải trọng sàn:</span> <span className="font-medium text-slate-900 dark:text-white">{property.floor_load || "5.0 Tấn/m²"}</span></li>
                                        <li className="flex justify-between"><span>Độ phẳng sàn:</span> <span className="font-medium text-slate-900 dark:text-white">FF25/FL20 (Tiêu chuẩn Superflat)</span></li>
                                        <li className="flex justify-between"><span>Chiều cao trần:</span> <span className="font-medium text-slate-900 dark:text-white">{property.ceiling_height || "10.5"}m</span></li>
                                    </ul>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                        <BoltIcon className="w-4 h-4 text-[#0F766E]" /> Điện & PCCC
                                    </h4>
                                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                        <li className="flex justify-between"><span>Nguồn điện:</span> <span className="font-medium text-slate-900 dark:text-white">{property.power_type || "3 Pha / 2000kVA"}</span></li>
                                        <li className="flex justify-between"><span>Hệ thống PCCC:</span> <span className="font-medium text-slate-900 dark:text-white">Sprinkler Tự động</span></li>
                                        <li className="flex justify-between"><span>Chiếu sáng:</span> <span className="font-medium text-slate-900 dark:text-white">LED 200 Lux</span></li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Description */}
                        <section>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Mô tả kho</h3>
                            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                                <p className="leading-relaxed">
                                    {property.description || "Kho nằm trong khu vực logistics trọng điểm, kết nối trực tiếp với Cao tốc Long Thành - Dầu Giây và Cảng Cát Lái. Thiết kế hiện đại với hệ thống dock leveler tự động, phù hợp cho trung tâm phân phối (DC) hoặc kho fulfillment thương mại điện tử."}
                                </p>
                                <p className="leading-relaxed mt-2">
                                    Hệ thống an ninh 3 lớp với bảo vệ 24/7, camera CCTV toàn khu vực và hệ thống kiểm soát ra vào bằng thẻ từ, đảm bảo an toàn tuyệt đối cho hàng hóa giá trị cao.
                                </p>
                            </div>
                            <div className="mt-4">
                                <Button variant="link" className="px-0 text-[#0F766E] font-bold">
                                    Xem thêm chi tiết <ChevronRightIcon className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </section>

                        <Separator className="bg-slate-100" />

                        {/* Amenities */}
                        <section>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Tiện ích & Hạ tầng</h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                {(property.amenities && property.amenities.length > 0
                                    ? property.amenities.map((item, i) => (
                                        <div key={item.id || i} className="flex items-center gap-3 text-slate-700 font-medium">
                                            <CheckIcon className="w-6 h-6 text-[#0F766E]" />
                                            <span>{item.name}</span>
                                        </div>
                                    ))
                                    : [
                                        { icon: ShieldCheckIcon, label: "Camera an ninh CCTV 24/7" },
                                        { icon: FireIcon, label: "PCCC Sprinkler vách tường" },
                                        { icon: TruckIcon, label: "Bãi đỗ container 500m²" },
                                        { icon: InboxStackIcon, label: "3 Dock Leveler tự động" },
                                        { icon: MapPinIcon, label: "Gần Cảng Cát Lái (5km)" },
                                        { icon: InformationCircleIcon, label: "Văn phòng điều hành 50m²" },
                                        { icon: BoltIcon, label: "WiFi / Internet Tốc độ cao" },
                                        { icon: SunIcon, label: "Điều hòa trung tâm (Kho mát)" },
                                        { icon: BuildingOffice2Icon, label: "Phòng họp / Co-working space" },
                                        { icon: Squares2X2Icon, label: "Khu vực Canteen / Ăn uống" },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                                            <item.icon className="w-6 h-6 text-slate-400" />
                                            <span>{item.label}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <Separator className="bg-slate-100" />

                        {/* Terms Section from Document */}
                        <section>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Điều khoản thuê kho</h3>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-100 dark:border-slate-700 space-y-4">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 uppercase tracking-wide">Thanh toán & Đặt cọc</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Thanh toán 100% một lần trong vòng 07 ngày kể từ ngày ký HĐ. Phí dịch vụ chưa bao gồm VAT.
                                        Lãi chậm trả: 0.05%/ngày.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 uppercase tracking-wide">Quy trình vận hành</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Tiếp nhận xe tại bãi đệm - Hạ hàng tại khu vực chung (miễn phí) - Cất hàng vào vị trí thuê.
                                        Kiểm tra ngoại quan 100% hàng hóa đầu vào.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 uppercase tracking-wide">Định mức hao hụt</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Cho phép trong khoảng quy định. Bên A bồi thường nếu vượt định mức theo giá trị hóa đơn.
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <a href="#" className="text-[#0F766E] font-bold text-sm hover:underline">Xem chi tiết Hợp đồng mẫu &gt;</a>
                                </div>
                            </div>
                        </section>

                        <Separator className="bg-slate-100" />

                        {/* Map */}
                        <section>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Vị trí</h3>
                            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm h-[400px] relative z-0">
                                <MapComponent
                                    properties={[property]}
                                    highlightedPropertyId={property.id}
                                    onMarkerClick={() => { }}
                                    variant="detail"
                                />
                            </div>

                        </section>

                    </div>

                    {/* RIGHT COLUMN: Booking Widget (Sticky) */}
                    <div className="lg:col-span-4 relative">
                        <WarehouseBookingPanel price={property.price} warehouseId={property.id} />
                    </div>

                </div >
            </main >

            <PrimeNestFooter />
        </div >
    );
}
