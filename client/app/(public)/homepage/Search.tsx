"use client";

import React, { useState, useMemo, useEffect } from "react";
import MapComponent from "./MapSearch/MapComponent";
import PropertyList from "./MapSearch/PropertyList";
import { Property } from "@/data/mockProperties";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, FunnelIcon } from "@heroicons/react/20/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";

const warehouseService = new WarehouseTemplateService();

// Helper function to map Warehouse to Property
function mapWarehouseToProperty(warehouse: Warehouse): Property {
    const area = warehouse.length * warehouse.width;
    const price = parseFloat(warehouse.price_per_month);

    // Determine type based on warehouse characteristics
    let type: Property['type'] = 'Kho Thường';
    if (warehouse.is_cold_storage) {
        type = 'Kho Mát';
    } else if (warehouse.is_shared_warehouse) {
        type = 'Fulfillment';
    }

    return {
        id: warehouse.id,
        title: warehouse.name,
        price: price,
        currency: "VND",
        area: area,
        type: type,
        address: `${warehouse.address_detail}, ${warehouse.ward?.name || ''}`,
        image: warehouse.images?.[0]?.url || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        lat: parseFloat(warehouse.latitude),
        lng: parseFloat(warehouse.longitude),
        length: warehouse.length,
        width: warehouse.width,
        ceiling_height: parseFloat(warehouse.ceiling_height),
        max_load_capacity: warehouse.max_load_capacity || undefined,
        electricity: "3 Pha" // Default, could be mapped from warehouse data if available
    };
}

export function PrimeNestSearch() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
    const [highlightedPropertyId, setHighlightedPropertyId] = useState<number | string | null>(null);

    // Filter State
    const [searchText, setSearchText] = useState("");
    const [priceRange, setPriceRange] = useState([0, 500]); // 0 - 500 Million
    const [areaRange, setAreaRange] = useState([0, 5000]); // 0 - 5000 m2

    // Fetch warehouses from API (Public - No Auth Required)
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                setLoading(true);
                setError(null);

                // Direct API call without authentication for public access
                const API_URL = process.env.NEXT_PUBLIC_API_URL;
                console.log('🔍 Fetching from:', `${API_URL}/warehouse-templates`);
                const query = new URLSearchParams({
                    limit: '100',
                    is_active: 'true'
                });

                const response = await fetch(`${API_URL}/warehouse-templates?${query.toString()}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    // No Authorization header for public endpoint
                });

                console.log('📡 Response status:', response.status);

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ API Response:', result);
                    const data = result.data;

                    if (data && Array.isArray(data)) {
                        console.log(`📦 Found ${data.length} warehouses`);
                        const mappedProperties = data.map(mapWarehouseToProperty);
                        setProperties(mappedProperties);
                    } else {
                        console.warn('⚠️ No data in response');
                        setError('Database chưa có dữ liệu kho');
                    }
                } else {
                    const errorText = await response.text();
                    console.error('❌ API Error:', response.status, errorText);
                    setError(`Lỗi API: ${response.status}`);
                    setProperties([]);
                }
            } catch (err) {
                console.error("💥 Fetch error:", err);
                setError(err instanceof Error ? err.message : 'Không thể kết nối server');
                setProperties([]);
            } finally {
                setLoading(false);
            }
        };

        fetchWarehouses();
    }, []);

    // Filter properties based on map bounds AND search/filters
    const filteredProperties = useMemo(() => {
        let result = properties;

        // 1. Text Search (Title or Address)
        if (searchText) {
            const lowerText = searchText.toLowerCase();
            result = result.filter((p: Property) =>
                p.title.toLowerCase().includes(lowerText) ||
                p.address.toLowerCase().includes(lowerText)
            );
        }

        // 2. Price Filter (Range)
        result = result.filter((p: Property) => {
            const priceInMillion = p.price / 1000000;
            return priceInMillion >= priceRange[0] && priceInMillion <= priceRange[1];
        });

        // 3. Area Filter (Range)
        result = result.filter((p: Property) => p.area >= areaRange[0] && p.area <= areaRange[1]);

        // 4. Map Bounds Filter (Final Step)
        if (!bounds) return result;
        return result.filter((p: Property) =>
            p.lat <= bounds.north &&
            p.lat >= bounds.south &&
            p.lng <= bounds.east &&
            p.lng >= bounds.west
        );
    }, [properties, bounds, searchText, priceRange, areaRange]);

    // Properties for the map (Ignore Bounds, respect other filters)
    const mapProperties = useMemo(() => {
        let result = properties;

        if (searchText) {
            const lowerText = searchText.toLowerCase();
            result = result.filter((p: Property) =>
                p.title.toLowerCase().includes(lowerText) ||
                p.address.toLowerCase().includes(lowerText)
            );
        }

        // Price Filter (Range)
        result = result.filter((p: Property) => {
            const priceInMillion = p.price / 1000000;
            return priceInMillion >= priceRange[0] && priceInMillion <= priceRange[1];
        });

        // Area Filter (Range)
        result = result.filter((p: Property) => p.area >= areaRange[0] && p.area <= areaRange[1]);

        return result;
    }, [properties, searchText, priceRange, areaRange]);

    if (loading) {
        return (
            <section className="py-12 bg-gray-50 text-slate-900 border-b border-gray-200">
                <div className="max-w-[1440px] mx-auto px-4 md:px-6">
                    <div className="flex justify-center items-center h-[800px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F766E]"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-12  text-slate-900 border-b border-gray-200">
            <div className="max-w-[1440px] mx-auto px-4 md:px-6">

                <div className="mb-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-2">
                        {filteredProperties.length} Kho Tìm Thấy
                    </h2>
                    <p className="text-slate-600">
                        Kéo thả bản đồ để tìm kiếm khu vực bạn quan tâm
                    </p>
                </div>

                {/* Main Content: Map & List */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px] mb-12">

                    {/* Map Area (2/3) */}
                    <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0 h-full flex flex-col">

                        {/* Search & Filter Bar Floating on Map */}
                        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col pointer-events-none">
                            <div className="flex flex-col md:flex-row gap-3 pointer-events-auto w-full max-w-5xl mx-auto">

                                {/* 1. Search Input - Wide */}
                                <div className="flex-1 relative shadow-lg rounded-full">
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm kho bãi, khu công nghiệp..."
                                        className="w-full pl-12 pr-4 py-3 bg-white rounded-full border border-slate-200 focus:ring-2 focus:ring-[#0F766E] outline-none text-slate-700 shadow-sm"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                    />
                                    <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                </div>

                                {/* 2. Filters Group */}
                                <div className="flex gap-2 items-center overflow-x-auto pb-2 md:pb-0 scrollbar-hide">

                                    {/* Price Filter */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="rounded-full bg-white border-slate-200 shadow-sm hover:bg-slate-50 min-w-[100px] justify-between h-12 px-4 whitespace-nowrap">
                                                <span className="truncate">
                                                    {priceRange[0] === 0 && priceRange[1] === 500
                                                        ? "Giá"
                                                        : `${priceRange[0]} - ${priceRange[1]} Tỷ`
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
                                                    className="mt-2"
                                                />
                                                <div className="flex justify-between mt-2 text-xs text-slate-400">
                                                    <span>0</span>
                                                    <span>500+</span>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Area Filter */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="rounded-full bg-white border-slate-200 shadow-sm hover:bg-slate-50 min-w-[120px] justify-between h-12 px-4 whitespace-nowrap">
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
                                                <h4 className="font-semibold leading-none">Diện tích (m²)</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Từ {areaRange[0]} m² đến {areaRange[1]} m²
                                                </p>
                                                <Slider
                                                    defaultValue={[0, 5000]}
                                                    max={5000}
                                                    step={50}
                                                    value={areaRange}
                                                    onValueChange={setAreaRange}
                                                    className="mt-2"
                                                />
                                                <div className="flex justify-between mt-2 text-xs text-slate-400">
                                                    <span>0</span>
                                                    <span>5000+</span>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Main Filter Button (Black) */}
                                    <Button className="rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md h-12 px-6 gap-2 shrink-0">
                                        <FunnelIcon className="w-4 h-4" />
                                        <span>Lọc</span>
                                    </Button>

                                </div>
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
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="overflow-y-auto flex-1 p-4">
                            <PropertyList
                                properties={filteredProperties}
                                onHover={setHighlightedPropertyId}
                                highlightedPropertyId={highlightedPropertyId}
                                variant="vertical"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
