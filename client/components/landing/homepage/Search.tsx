"use client";

import React, { useState, useMemo } from "react";
import MapComponent from "./MapSearch/MapComponent";
import PropertyList from "./MapSearch/PropertyList";
import { mockProperties, Property } from "@/data/mockProperties";

export function PrimeNestSearch() {
    const [properties] = useState<Property[]>(mockProperties);
    const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
    const [highlightedPropertyId, setHighlightedPropertyId] = useState<number | null>(null);

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

        // 5. Map Bounds Filter (Final Step)
        if (!bounds) return result;
        return result.filter(p =>
            p.lat <= bounds.north &&
            p.lat >= bounds.south &&
            p.lng <= bounds.east &&
            p.lng >= bounds.west
        );
    }, [properties, bounds, searchText, filterType, filterPrice, filterArea]);

    // Properties passed to Map: Should include filtered results to hide markers not matching filters
    // However, clustering usually works on the full dataset unless we update the source.
    // If we only pass 'filteredProperties' to the map, markers outside the bounds are already gone (by logic).
    // But markers INSIDE the bounds that don't match the filters should also disappear.
    // So passing 'filteredProperties' to MapComponent is correct for visual consistency.
    // BUT 'filteredProperties' currently includes Bounds check. 
    // If we zoom out, we want to see new markers. The 'bounds' dependency in 'filteredProperties' makes it circular if we pass it back to map?
    // No. MapComponent expects 'properties'. If we give it only 'filteredProperties', it will only render those.
    // Wait, if we use 'filteredProperties' which is strictly inside the CURRENT bounds, 
    // then when users pan the map, the bounds change -> filteredProperties update -> map source updates. This works.

    // HOWEVER, for smooth UX, usually we want to filter by Checkboxes/Search GLOBALLY, 
    // but Bounds filter is just for the "List View". The Map should ideally show all matching "Filters" even if outside bounds?
    // No, standard behavior: 
    // Map shows: All properties matching Search/Filters.
    // List shows: All properties matching Search/Filters AND currently visible in Map Bounds.

    const mapProperties = useMemo(() => {
        // Properties for the map (Ignore Bounds, respect other filters)
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
        if (filterArea !== "all") {
            if (filterArea === "under_500") result = result.filter(p => p.area < 500);
            else if (filterArea === "500_1000") result = result.filter(p => p.area >= 500 && p.area <= 1000);
            else if (filterArea === "over_1000") result = result.filter(p => p.area > 1000);
        }
        return result;
    }, [properties, searchText, filterType, filterPrice, filterArea]);


    return (
        <section className="py-12 bg-gray-50 text-slate-900 border-b border-gray-200">
            <div className="max-w-[1440px] mx-auto px-4 md:px-6">

                <div className="mb-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-2">
                        {filteredProperties.length} Bất Động Sản Tìm Thấy
                    </h2>
                    <p className="text-slate-600">
                        Kéo thả bản đồ để tìm kiếm khu vực bạn quan tâm
                    </p>
                </div>

                {/* Main Content: Map & List */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px] mb-12">

                    {/* Map Area (2/3) */}
                    <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0 h-full flex flex-col">

                        {/* Search & Filter Bar Floating on Map (or just Header of Map) */}
                        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 pointer-events-none">
                            <div className="flex gap-2 pointer-events-auto">
                                {/* Search Input */}
                                <div className="flex-1 relative shadow-lg rounded-lg">
                                    <input
                                        type="text"
                                        placeholder="Tìm theo địa điểm, tên kho..."
                                        className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border-none focus:ring-2 focus:ring-[#0F766E] outline-none text-slate-700 shadow-sm"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                    />
                                    <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>

                                {/* Filters Button (Could trigger a modal or dropdown, but let's keep inline for desktop if space allows?) 
                                    Per user request "phần cho nó nút filter bên cạnh nút search" 
                                    Let's put the selects physically next to it or in a row below if narrow. 
                                */}
                                <select
                                    className="px-4 py-3 bg-white rounded-lg border-none shadow-lg text-slate-700 focus:ring-2 focus:ring-[#0F766E] outline-none cursor-pointer hidden md:block"
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                >
                                    <option value="all">Loại Kho</option>
                                    <option value="Kho Mát">Kho Mát</option>
                                    <option value="Kho Thường">Kho Thường</option>
                                    <option value="Fulfillment">Fulfillment</option>
                                    <option value="Kho Ngoại Quan">Ngoại Quan</option>
                                </select>

                                <select
                                    className="px-4 py-3 bg-white rounded-lg border-none shadow-lg text-slate-700 focus:ring-2 focus:ring-[#0F766E] outline-none cursor-pointer hidden lg:block"
                                    value={filterPrice}
                                    onChange={(e) => setFilterPrice(e.target.value)}
                                >
                                    <option value="all">Mức Giá</option>
                                    <option value="under_50m">&lt; 50 Triệu</option>
                                    <option value="50m_100m">50 - 100 Triệu</option>
                                    <option value="over_100m">&gt; 100 Triệu</option>
                                </select>
                            </div>

                            {/* Mobile/Tablet responsive filters row if needed, or keeping it clean */}
                            <div className="flex gap-2 pointer-events-auto md:hidden overflow-x-auto pb-2">
                                <select
                                    className="px-4 py-2 bg-white rounded-lg shadow-md text-sm whitespace-nowrap"
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                >
                                    <option value="all">Loại Kho</option>
                                    <option value="Kho Mát">Kho Mát</option>
                                    <option value="Kho Thường">Kho Thường</option>
                                </select>
                                <select
                                    className="px-4 py-2 bg-white rounded-lg shadow-md text-sm whitespace-nowrap"
                                    value={filterPrice}
                                    onChange={(e) => setFilterPrice(e.target.value)}
                                >
                                    <option value="all">Mức Giá</option>
                                    <option value="under_50m">&lt; 50 Tr</option>
                                </select>
                            </div>

                        </div>

                        <MapComponent
                            properties={mapProperties}
                            onBoundsChange={setBounds}
                            highlightedPropertyId={highlightedPropertyId}
                            onMarkerClick={(id) => {
                                setHighlightedPropertyId(id);
                                const element = document.getElementById(`property-card-${id}`);
                                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                        />
                    </div>

                    {/* List Area (1/3) - Scrollable */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col p-4">
                        <PropertyList
                            properties={filteredProperties}
                            onHover={setHighlightedPropertyId}
                            highlightedPropertyId={highlightedPropertyId}
                        />
                    </div>
                </div>

                {/* Additional Filters Panel (Bottom - Optional now that we have inline filters) */}
                {/* Keeping it simple as requested: "Nut filter ben canh nut search" */}
            </div>
        </section>
    );
}
