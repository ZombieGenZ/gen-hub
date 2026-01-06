"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PropertyList from '@/app/(public)/homepage/MapSearch/PropertyList';
import MapComponent from '@/app/(public)/homepage/MapSearch/MapComponent';
import { Property, mockProperties } from '@/data/mockProperties';
import { MagnifyingGlassIcon, MapIcon, ListBulletIcon, XMarkIcon, FunnelIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Snowflake, Truck, Package, RotateCcw, MapPin, ShieldCheck } from "lucide-react";

export default function PropertySearch() {
    const [properties] = useState<Property[]>(mockProperties);
    const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
    const [highlightedPropertyId, setHighlightedPropertyId] = useState<number | null>(null);
    const [showMapMobile, setShowMapMobile] = useState(false);

    // Derived state for the drawer
    const selectedProperty = useMemo(() =>
        properties.find(p => p.id === highlightedPropertyId),
        [properties, highlightedPropertyId]);

    const searchParams = useSearchParams();

    // Advanced Filter State
    const [searchText, setSearchText] = useState("");
    const [priceRange, setPriceRange] = useState([0, 500]); // 0 - 500 Million
    const [areaRange, setAreaRange] = useState([0, 5000]); // 0 - 5000 m2
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);

    // Sync from URL
    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam) {
            switch (typeParam) {
                case 'kho-mat':
                    setSelectedTypes(['cold']);
                    break;
                case 'kho-thuong':
                    setSelectedTypes(['standard']);
                    break;
                case 'kho-ngoai-quan':
                    setSelectedTypes(['bonded']);
                    break;
                default:
                    setSelectedTypes([]);
                    break;
            }
        } else {
            setSelectedTypes([]);
        }
    }, [searchParams]);

    // Filter properties based on map bounds AND search/filters
    const filteredProperties = useMemo(() => {
        let result = properties;

        // 1. Text Search (Title or Address)
        if (searchText) {
            const lowerText = searchText.toLowerCase();
            result = result.filter(p =>
                p.title.toLowerCase().includes(lowerText) ||
                p.address.toLowerCase().includes(lowerText)
            );
        }

        // 2. Price Range
        if (priceRange[0] > 0 || priceRange[1] < 500) {
            result = result.filter(p => p.price >= priceRange[0] * 1000000 && p.price <= priceRange[1] * 1000000);
        }

        // 3. Area Range
        if (areaRange[0] > 0 || areaRange[1] < 5000) {
            result = result.filter(p => p.area >= areaRange[0] && p.area <= areaRange[1]);
        }

        // 4. Advanced Filters (Type & City)
        if (selectedTypes.length > 0) {
            result = result.filter(p => {
                const isCold = selectedTypes.includes('cold') && p.is_cold_storage;
                const isShared = selectedTypes.includes('shared') && p.is_shared_warehouse;
                const isBonded = selectedTypes.includes('bonded') && p.type === 'Kho Ngoại Quan';

                // Standard usually implies General/Standard warehouse (Kho Thường).
                // Ensure we don't accidentally include Cold or Shared or Bonded if they are distinct in user's mind.
                // However, our data model puts type="Kho Thường" for standard.
                // Bonded items (id 4) has type="Kho Ngoại Quan".
                const isStandard = selectedTypes.includes('standard') && p.type === 'Kho Thường';

                return isCold || isShared || isStandard || isBonded;
            });
        }
        if (selectedCities.length > 0) {
            result = result.filter(p => selectedCities.some(city => p.province_name?.includes(city)));
        }

        // 5. Map Bounds Filter - ONLY for List View if needed, 
        if (bounds) {
            result = result.filter(p =>
                p.lat <= bounds.north &&
                p.lat >= bounds.south &&
                p.lng <= bounds.east &&
                p.lng >= bounds.west
            );
        }
        return result;
    }, [properties, bounds, searchText, priceRange, areaRange, selectedTypes, selectedCities]);

    const mapProperties = useMemo(() => {
        let result = properties;
        if (searchText) {
            const lowerText = searchText.toLowerCase();
            result = result.filter(p =>
                p.title.toLowerCase().includes(lowerText) ||
                p.address.toLowerCase().includes(lowerText)
            );
        }

        // Advanced Filters (Type & City) - Apply to Map too
        if (selectedTypes.length > 0) {
            result = result.filter(p => {
                const isCold = selectedTypes.includes('cold') && p.is_cold_storage;
                const isShared = selectedTypes.includes('shared') && p.is_shared_warehouse;
                const isBonded = selectedTypes.includes('bonded') && p.type === 'Kho Ngoại Quan';
                const isStandard = selectedTypes.includes('standard') && p.type === 'Kho Thường';
                return isCold || isShared || isStandard || isBonded;
            });
        }
        if (selectedCities.length > 0) {
            result = result.filter(p => selectedCities.some(city => p.province_name?.includes(city)));
        }

        // Apply Price & Area to Map? Usually yes
        if (priceRange[0] > 0 || priceRange[1] < 500) {
            result = result.filter(p => p.price >= priceRange[0] * 1000000 && p.price <= priceRange[1] * 1000000);
        }
        if (areaRange[0] > 0 || areaRange[1] < 5000) {
            result = result.filter(p => p.area >= areaRange[0] && p.area <= areaRange[1]);
        }

        return result;
    }, [properties, searchText, priceRange, areaRange, selectedTypes, selectedCities]);

    return (
        <div className="flex flex-col min-h-screen font-sans relative">
            {/* Sticky Filter Bar Container */}
            <div className={`sticky top-0 z-30 flex flex-col shrink-0 ${showMapMobile ? 'hidden lg:flex' : 'flex'}`}>

                {/* 2. Actual Filter Bar */}
                <div className="bg-[#fafafa] max-w-[1440px] w-full mx-auto">
                    <div className="max-w-[1440px] w-full mx-auto px-4 lg:px-6 py-3 flex items-center gap-3">
                        {/* 1. Search Input */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm kho bãi, khu công nghiệp..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F766E] outline-none text-slate-700 shadow-sm text-sm"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>

                        {/* 2. Filters Group */}
                        <div className="hidden md:flex gap-2 items-center">

                            {/* Price Filter */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="rounded-xl bg-white border-slate-200 shadow-sm hover:bg-slate-50 min-w-[100px] justify-between h-10 px-3 text-sm whitespace-nowrap">
                                        <span className="truncate">
                                            {priceRange[0] === 0 && priceRange[1] === 500
                                                ? "Giá"
                                                : `${priceRange[0]} - ${priceRange[1]} Tr`
                                            }
                                        </span>
                                        <ChevronDownIcon className="w-4 h-4 ml-1 opacity-50 shrink-0" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-5" align="end">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold leading-none">Mức Giá (Triệu/Tháng)</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Từ {priceRange[0]} triệu đến {priceRange[1]} triệu
                                        </p>
                                        <Slider
                                            defaultValue={[0, 500]}
                                            max={500}
                                            step={10}
                                            value={priceRange}
                                            onValueChange={setPriceRange}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Area Filter */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="rounded-xl bg-white border-slate-200 shadow-sm hover:bg-slate-50 min-w-[100px] justify-between h-10 px-3 text-sm whitespace-nowrap">
                                        <span className="truncate">
                                            {areaRange[0] === 0 && areaRange[1] === 5000
                                                ? "Diện tích"
                                                : `${areaRange[0]} - ${areaRange[1]} m²`
                                            }
                                        </span>
                                        <ChevronDownIcon className="w-4 h-4 ml-1 opacity-50 shrink-0" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-5" align="end">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold leading-none">Diện Tích (m²)</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Từ {areaRange[0]} m² đến {areaRange[1]} m²
                                        </p>
                                        <Slider
                                            defaultValue={[0, 5000]}
                                            max={5000}
                                            step={50}
                                            value={areaRange}
                                            onValueChange={setAreaRange}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Advanced Filter Modal */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-md h-10 px-4 gap-2 shrink-0">
                                        <FunnelIcon className="w-4 h-4" />
                                        <span>Lọc</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-[600px] p-0 overflow-hidden bg-white gap-0 rounded-3xl border-none shadow-2xl">
                                    <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                        <DialogTitle className="text-xl font-bold text-slate-900">Bộ Lọc Nâng Cao</DialogTitle>
                                        <DialogDescription className="text-slate-500">
                                            Tùy chỉnh tìm kiếm kho bãi theo nhu cầu của bạn
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
                                        {/* 1. Warehouse Types as Cards */}
                                        <div className="space-y-4">
                                            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 uppercase tracking-wider">
                                                <Package className="w-4 h-4 text-[#0F766E]" />
                                                Loại Hình Kho
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {[
                                                    { id: 'standard', label: 'Kho Thường', icon: Package },
                                                    { id: 'cold', label: 'Kho Mát / Lạnh', icon: Snowflake },
                                                    { id: 'shared', label: 'Fulfillment', icon: Truck },
                                                    { id: 'bonded', label: 'Kho Ngoại Quan', icon: ShieldCheck },
                                                ].map((type) => {
                                                    const isSelected = selectedTypes.includes(type.id);
                                                    const Icon = type.icon;
                                                    return (
                                                        <div
                                                            key={type.id}
                                                            onClick={() => {
                                                                if (isSelected) setSelectedTypes(selectedTypes.filter(t => t !== type.id));
                                                                else setSelectedTypes([...selectedTypes, type.id]);
                                                            }}
                                                            className={`
                                                                relative cursor-pointer group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200
                                                                ${isSelected
                                                                    ? 'border-[#0F766E] bg-[#0F766E]/5'
                                                                    : 'border-slate-100 bg-white hover:border-[#0F766E]/30 hover:shadow-md'
                                                                }
                                                            `}
                                                        >
                                                            <div className={`p-3 rounded-full transition-colors ${isSelected ? 'bg-[#0F766E] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-[#0F766E]/10 group-hover:text-[#0F766E]'}`}>
                                                                <Icon className="w-6 h-6" />
                                                            </div>
                                                            <span className={`font-medium text-sm text-center ${isSelected ? 'text-[#0F766E]' : 'text-slate-600'}`}>
                                                                {type.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* 2. Locations as Tags */}
                                        <div className="space-y-4">
                                            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 uppercase tracking-wider">
                                                <MapPin className="w-4 h-4 text-[#0F766E]" />
                                                Khu Vực Phổ Biến
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {['Hồ Chí Minh', 'Hà Nội', 'Bình Dương', 'Đồng Nai', 'Long An', 'Bắc Ninh', 'Hải Phòng', 'Đà Nẵng'].map((city) => {
                                                    const isSelected = selectedCities.includes(city);
                                                    return (
                                                        <div
                                                            key={city}
                                                            onClick={() => {
                                                                if (isSelected) setSelectedCities(selectedCities.filter(c => c !== city));
                                                                else setSelectedCities([...selectedCities, city]);
                                                            }}
                                                            className={`
                                                                cursor-pointer px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 select-none
                                                                ${isSelected
                                                                    ? 'border-[#0F766E] bg-[#0F766E] text-white shadow-md shadow-[#0F766E]/20'
                                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#0F766E] hover:text-[#0F766E]'
                                                                }
                                                            `}
                                                        >
                                                            {city}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-row gap-3 items-center justify-between sm:justify-between w-full">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setSelectedTypes([]);
                                                setSelectedCities([]);
                                            }}
                                            className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-2 h-11 px-4"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            <span className="hidden sm:inline">Đặt lại</span>
                                        </Button>
                                        <DialogClose asChild>
                                            <Button className="flex-1 sm:flex-none shadow-lg shadow-[#0F766E]/20 bg-[#0F766E] hover:bg-[#0D655D] text-white rounded-xl px-8 h-11 font-medium transition-all hover:scale-105 active:scale-95">
                                                Áp dụng {selectedTypes.length + selectedCities.length > 0 ? `(${selectedTypes.length + selectedCities.length})` : ''}
                                            </Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content: List Left, Map Right */}
            <div className={`flex-1 max-w-360 w-full mx-auto p-4 lg:p-6 ${showMapMobile ? 'p-0 h-[calc(100vh-80px)]' : ''}`}>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative items-start h-full">

                    {/* List Area (3/5) - Hidden on Mobile if Map is shown */}
                    <div className={`lg:col-span-3 flex flex-col ${showMapMobile ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="sticky top-[60px] z-20 bg-[#F8FAFC] p-4 mb-2 flex items-baseline justify-between transition-all">
                            <h2 className="font-bold text-xl text-slate-900">
                                {filteredProperties.length} Kho bãi tại Hồ Chí Minh
                            </h2>
                            <span className="text-sm text-slate-500">Sắp xếp: Mới nhất</span>
                        </div>

                        <PropertyList
                            properties={filteredProperties}
                            onHover={(id) => setHighlightedPropertyId(id ? Number(id) : null)}
                            highlightedPropertyId={highlightedPropertyId}
                            variant="grid"
                        />
                    </div>

                    {/* Map Area (2/5) - Sticky on Desktop, Full on Mobile */}
                    <div className={`
                        lg:block lg:col-span-2 lg:h-[calc(100vh-200px)] lg:sticky lg:top-[80px] lg:rounded-2xl lg:overflow-hidden lg:border lg:border-slate-200 lg:shadow-md
                        ${showMapMobile ? 'fixed left-0 right-0 top-[88px] h-[calc(100vh-88px)] z-40 block w-full bg-slate-100' : 'hidden'}
                    `}>
                        <MapComponent
                            properties={mapProperties}
                            onBoundsChange={setBounds}
                            highlightedPropertyId={highlightedPropertyId}
                            onMarkerClick={(id) => {
                                setHighlightedPropertyId(Number(id));
                                // Desktop: Scroll to list
                                if (!showMapMobile && window.innerWidth >= 1024) {
                                    const element = document.getElementById(`property-card-${id}`);
                                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                                // Mobile: Drawer handles it via selectedProperty state
                            }}
                        />
                    </div>

                </div>
            </div>

            {/* Floating Toggle Button (Mobile Only) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden">
                <button
                    onClick={() => setShowMapMobile(!showMapMobile)}
                    className="bg-slate-900 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 font-medium hover:bg-slate-800 transition-all active:scale-95"
                >
                    {showMapMobile ? (
                        <>
                            <ListBulletIcon className="w-5 h-5" />
                            Danh sách
                        </>
                    ) : (
                        <>
                            <MapIcon className="w-5 h-5" />
                            Bản đồ
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
