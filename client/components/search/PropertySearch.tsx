"use client";

import React, { useState, useMemo } from 'react';
import PropertyList from '@/app/(public)/homepage/MapSearch/PropertyList';
import MapComponent from '@/app/(public)/homepage/MapSearch/MapComponent';
import { Property, mockProperties } from '@/data/mockProperties';
import { MagnifyingGlassIcon, MapIcon, ListBulletIcon, XMarkIcon } from '@heroicons/react/20/solid';

export default function PropertySearch() {
    const [properties] = useState<Property[]>(mockProperties);
    const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
    const [highlightedPropertyId, setHighlightedPropertyId] = useState<number | null>(null);
    const [showMapMobile, setShowMapMobile] = useState(false);

    // Derived state for the drawer
    const selectedProperty = useMemo(() =>
        properties.find(p => p.id === highlightedPropertyId),
        [properties, highlightedPropertyId]);

    // Filter Filters State
    const [searchText, setSearchText] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterPrice, setFilterPrice] = useState("all");
    const [filterArea, setFilterArea] = useState("all");

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

        // 2. Type Filter
        if (filterType !== "all") {
            result = result.filter(p => p.type === filterType);
        }

        // 3. Price Filter
        if (filterPrice !== "all") {
            if (filterPrice === "under_50m") result = result.filter(p => p.price < 50000000);
            else if (filterPrice === "50m_100m") result = result.filter(p => p.price >= 50000000 && p.price <= 100000000);
            else if (filterPrice === "over_100m") result = result.filter(p => p.price > 100000000);
        }

        // 4. Area Filter
        if (filterArea !== "all") {
            if (filterArea === "under_500") result = result.filter(p => p.area < 500);
            else if (filterArea === "500_1000") result = result.filter(p => p.area >= 500 && p.area <= 1000);
            else if (filterArea === "over_1000") result = result.filter(p => p.area > 1000);
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
    }, [properties, bounds, searchText, filterType, filterPrice, filterArea]);

    const mapProperties = useMemo(() => {
        let result = properties;
        if (searchText) {
            const lowerText = searchText.toLowerCase();
            result = result.filter(p =>
                p.title.toLowerCase().includes(lowerText) ||
                p.address.toLowerCase().includes(lowerText)
            );
        }
        if (filterType !== "all") result = result.filter(p => p.type === filterType);
        if (filterPrice !== "all") {
            if (filterPrice === "under_50m") result = result.filter(p => p.price < 50000000);
            else if (filterPrice === "50m_100m") result = result.filter(p => p.price >= 50000000 && p.price <= 100000000);
            else if (filterPrice === "over_100m") result = result.filter(p => p.price > 100000000);
        }
        return result;
    }, [properties, searchText, filterType, filterPrice]);

    return (
        <div className="flex flex-col min-h-screen font-sans relative">
            {/* Sticky Filter Bar Container */}
            <div className={`sticky top-0 z-30 flex flex-col shrink-0 ${showMapMobile ? 'hidden lg:flex' : 'flex'}`}>

                {/* 2. Actual Filter Bar */}
                <div className="bg-[#F8FAFC] max-w-[1440px] w-full mx-auto">
                    <div className="max-w-[1440px] w-full mx-auto px-4 lg:px-6 h-16 flex items-center gap-4">
                        <div className="flex-1 bg-slate-100 h-10 rounded-full px-4 flex items-center text-slate-500 text-sm gap-2">
                            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
                            <span>Tìm kiếm kho bãi, khu công nghiệp...</span>
                        </div>
                        <div className="hidden md:flex gap-2">
                            <button className="px-4 py-2 border border-slate-200 rounded-full text-sm font-medium hover:bg-slate-50">Giá</button>
                            <button className="px-4 py-2 border border-slate-200 rounded-full text-sm font-medium hover:bg-slate-50">Diện tích</button>
                            <button className="px-4 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800">Lọc</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content: List Left, Map Right */}
            <div className={`flex-1 max-w-[1440px] w-full mx-auto p-4 lg:p-6 ${showMapMobile ? 'p-0 h-[calc(100vh-80px)]' : ''}`}>
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
                            onHover={setHighlightedPropertyId}
                            highlightedPropertyId={highlightedPropertyId}
                            variant="grid"
                        />
                    </div>

                    {/* Map Area (2/5) - Sticky on Desktop, Full on Mobile */}
                    <div className={`
                        lg:block lg:col-span-2 lg:h-[calc(100vh-200px)] lg:sticky lg:top-[80px] lg: lg:rounded-2xl lg:overflow-hidden lg:border lg:border-slate-200 lg:shadow-md
                        ${showMapMobile ? 'fixed left-0 right-0 top-[88px] h-[calc(100vh-88px)] z-40 block w-full bg-slate-100' : 'hidden'}
                    `}>
                        <MapComponent
                            properties={mapProperties}
                            onBoundsChange={setBounds}
                            highlightedPropertyId={highlightedPropertyId}
                            onMarkerClick={(id) => {
                                setHighlightedPropertyId(id);
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
