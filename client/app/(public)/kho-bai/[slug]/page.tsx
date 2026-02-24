"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Property, mapWarehouseToProperty } from '@/data/mockProperties';
import { publicWarehouseService } from '@/services/public-warehouse/public-warehouse.service';
import { PrimeNestHeader } from '@/app/(public)/homepage/Header';
import { PrimeNestFooter } from '@/app/(public)/homepage/Footer';
import MapComponent from '@/app/(public)/homepage/MapSearch/MapComponent';
import PropertySearch from '@/components/search/PropertySearch';
import SearchHeader from "@/components/search/SearchHeader";
import { FilterModal } from '@/components/search/FilterModal';
import { SearchFilters } from '@/components/search/HeroSearchBar';
import '../kho-bai.css';

import {
    MapPinIcon,
    CheckIcon,
    SunIcon,
    ChevronRightIcon,
    ArrowUpIcon,
    CubeIcon,
    BuildingOffice2Icon,
    Squares2X2Icon,
    PhoneIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { WarehouseBookingPanel } from '@/components/warehouse/WarehouseBookingPanel';

const PRIMARY_COLOR = "#0F766E"; // GenHub Teal

export default function WarehouseDynamicPage() {
    const params = useParams();
    const router = useRouter();

    const slug = params.slug as string;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isId = !isNaN(Number(slug)) || UUID_REGEX.test(slug);

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
                    setProperty(mapped);
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
                        {property.max_load_capacity && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium">
                                <CubeIcon className="w-4 h-4 text-slate-500" />
                                <span>{property.max_load_capacity} Tấn/m²</span>
                            </div>
                        )}
                        {property.ceiling_height && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium">
                                <ArrowUpIcon className="w-4 h-4 text-slate-500" />
                                <span>Trần {property.ceiling_height}m</span>
                            </div>
                        )}
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
                            {galleryImages.length > 5 && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none group-hover:bg-black/50 transition-colors">
                                    <span className="text-white font-bold text-lg">+{galleryImages.length - 5} ảnh</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Main Content Split */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* LEFT COLUMN: Details (8 cols) */}
                    <div className="lg:col-span-8 space-y-10">

                        {/* Manager Info */}
                        <div className="flex items-center justify-between pb-8 border-b border-slate-200 dark:border-slate-800">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {property.manager_name ? `Quản lý: ${property.manager_name}` : 'Quản lý bởi GenHub Logistics'}
                                </h2>
                                {(property.manager_phone || property.manager_email) && (
                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                                        {property.manager_phone && (
                                            <a href={`tel:${property.manager_phone}`} className="flex items-center gap-1.5 hover:text-[#0F766E] transition-colors">
                                                <PhoneIcon className="w-4 h-4" />
                                                <span>{property.manager_phone}</span>
                                            </a>
                                        )}
                                        {property.manager_email && (
                                            <a href={`mailto:${property.manager_email}`} className="flex items-center gap-1.5 hover:text-[#0F766E] transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                </svg>
                                                <span>{property.manager_email}</span>
                                            </a>
                                        )}
                                    </div>
                                )}
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
                                        <li className="flex justify-between"><span>Diện tích:</span> <span className="font-medium text-slate-900 dark:text-white">{property.area.toLocaleString()} m²</span></li>
                                        <li className="flex justify-between"><span>Kích thước:</span> <span className="font-medium text-slate-900 dark:text-white">{property.length} x {property.width} m</span></li>
                                        {property.max_load_capacity && (
                                            <li className="flex justify-between"><span>Tải trọng sàn:</span> <span className="font-medium text-slate-900 dark:text-white">{property.max_load_capacity} Tấn/m²</span></li>
                                        )}
                                        {property.total_weight_capacity && (
                                            <li className="flex justify-between"><span>Tổng tải trọng:</span> <span className="font-medium text-slate-900 dark:text-white">{property.total_weight_capacity} Tấn</span></li>
                                        )}
                                        {property.ceiling_height && (
                                            <li className="flex justify-between"><span>Chiều cao trần:</span> <span className="font-medium text-slate-900 dark:text-white">{property.ceiling_height}m</span></li>
                                        )}
                                    </ul>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                        <Squares2X2Icon className="w-4 h-4 text-[#0F766E]" /> Thông tin kho
                                    </h4>
                                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                        <li className="flex justify-between"><span>Loại kho:</span> <span className="font-medium text-slate-900 dark:text-white">{property.type}</span></li>
                                        <li className="flex justify-between"><span>Trạng thái:</span> <span className="font-medium text-slate-900 dark:text-white">{property.rental_status === 'AVAILABLE' ? 'Đang trống' : property.rental_status === 'RENTED' ? 'Đã cho thuê' : property.rental_status || 'Đang trống'}</span></li>
                                        <li className="flex justify-between"><span>Kích thước ô:</span> <span className="font-medium text-slate-900 dark:text-white">{property.block_length} x {property.block_width} m</span></li>
                                    </ul>
                                </div>


                            </div>
                        </section>

                        {/* Description */}
                        <section>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Mô tả kho</h3>
                            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                                {property.description ? (
                                    <p className="leading-relaxed whitespace-pre-line">{property.description}</p>
                                ) : (
                                    <p className="leading-relaxed text-slate-400 italic">Chưa có mô tả cho kho này.</p>
                                )}
                            </div>
                        </section>

                        <Separator className="bg-slate-100" />

                        {/* Amenities */}
                        <section>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Tiện ích & Hạ tầng</h3>
                            {property.amenities && property.amenities.length > 0 ? (
                                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                    {property.amenities.map((item, i) => (
                                        <div key={item.id || i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium">
                                            <CheckIcon className="w-6 h-6 text-[#0F766E]" />
                                            <span>{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 dark:text-slate-500 italic">Chưa cập nhật tiện ích cho kho này.</p>
                            )}
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
                        <WarehouseBookingPanel price={property.price} warehouseId={property.id} rows={property.rows} />
                    </div>

                </div >
            </main >

            <PrimeNestFooter />
        </div >
    );
}
