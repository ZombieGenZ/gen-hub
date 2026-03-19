import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Snowflake, Truck, Package, RotateCcw, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
const MapComponent = dynamic(() => import("./MapSearch/MapComponent"), { ssr: false });
import PropertyList from "./MapSearch/PropertyList";
import { Property, mapWarehouseToProperty } from "@/data/mockProperties";
import { publicWarehouseService } from "@/services/public-warehouse/public-warehouse.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, FunnelIcon } from "@heroicons/react/20/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Breadcrumb as FilterChips } from "@/components/filter-chips-breadcrumb";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";



export function PrimeNestSearch() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
    const [highlightedPropertyId, setHighlightedPropertyId] = useState<number | string | null>(null);

    // Filter State
    const [searchText, setSearchText] = useState("");
    const [priceRange, setPriceRange] = useState([0, 500]);
    const [areaRange, setAreaRange] = useState([0, 5000]);

    // Advanced Filters State
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);

    // Active Filters Calculation
    const activeFilters = useMemo(() => {
        const filters = [];
        if (priceRange[0] > 0 || priceRange[1] < 500) {
            filters.push({ id: 'price', name: 'Giá', value: `${priceRange[0]} - ${priceRange[1]} Triệu` });
        }
        if (areaRange[0] > 0 || areaRange[1] < 5000) {
            filters.push({ id: 'area', name: 'Diện tích', value: `${areaRange[0]} - ${areaRange[1]} m²` });
        }
        selectedTypes.forEach(type => {
            const label = type === 'shared' ? 'Fulfillment' : 'Kho Thường';
            filters.push({ id: `type-${type}`, name: 'Loại', value: label });
        });
        selectedCities.forEach(city => {
            filters.push({ id: `city-${city}`, name: 'Khu vực', value: city });
        });
        return filters;
    }, [priceRange, areaRange, selectedTypes, selectedCities]);

    const handleRemoveFilter = (id: string) => {
        if (id === 'price') setPriceRange([0, 500]);
        if (id === 'area') setAreaRange([0, 5000]);
        if (id.startsWith('type-')) {
            const type = id.replace('type-', '');
            setSelectedTypes(prev => prev.filter(t => t !== type));
        }
        if (id.startsWith('city-')) {
            const city = id.replace('city-', '');
            setSelectedCities(prev => prev.filter(c => c !== city));
        }
    };

    const handleClearAll = () => {
        setSearchText("");
        setPriceRange([0, 500]);
        setAreaRange([0, 5000]);
        setSelectedTypes([]);
        setSelectedCities([]);
    };

    // Fetch warehouses from API
    const fetchWarehouses = useCallback(async () => {
        try {
            setLoading(true);
            const result = await publicWarehouseService.getPublicWarehouses({
                limit: 100,
            });
            const items = result?.items || result || [];
            const mapped = Array.isArray(items) ? items.map(mapWarehouseToProperty) : [];
            setProperties(mapped);
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
            setError('Không thể tải danh sách kho');
            setProperties([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

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

        // 4. Advanced Filters (Type & City)
        if (selectedTypes.length > 0) {
            result = result.filter(p => {
                const isShared = selectedTypes.includes('shared') && p.is_shared_warehouse;
                const isStandard = selectedTypes.includes('standard') && !p.is_shared_warehouse;
                return isShared || isStandard;
            });
        }

        if (selectedCities.length > 0) {
            result = result.filter(p => selectedCities.some(city => p.province_name?.includes(city)));
        }

        if (selectedTypes.length > 0) {
            result = result.filter(p => {
                const isShared = selectedTypes.includes('shared') && p.is_shared_warehouse;
                const isStandard = selectedTypes.includes('standard') && !p.is_shared_warehouse;
                return isShared || isStandard;
            });
        }

        if (selectedCities.length > 0) {
            result = result.filter(p => selectedCities.some(city => p.province_name?.includes(city)));
        }

        // 4. Map Bounds Filter (Final Step)
        if (!bounds) return result;
        return result.filter((p: Property) =>
            p.lat <= bounds.north &&
            p.lat >= bounds.south &&
            p.lng <= bounds.east &&
            p.lng >= bounds.west
        );
    }, [properties, bounds, searchText, priceRange, areaRange, selectedTypes, selectedCities]);

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

        if (selectedTypes.length > 0) {
            result = result.filter(p => {
                const isShared = selectedTypes.includes('shared') && p.is_shared_warehouse;
                const isStandard = selectedTypes.includes('standard') && !p.is_shared_warehouse;
                return isShared || isStandard;
            });
        }
        if (selectedCities.length > 0) {
            result = result.filter(p => selectedCities.some(city => p.province_name?.includes(city)));
        }

        return result;
    }, [properties, searchText, priceRange, areaRange, selectedTypes, selectedCities]);

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
        <section className="py-12 text-foreground border-b border-border">
            <div className="max-w-[1440px] mx-auto px-4 md:px-6">

                <div className="mb-8 text-center pt-8 sm:pt-0">
                    <h2 className="text-[32px] leading-[130%] md:text-4xl font-bold mb-2">
                        {filteredProperties.length} Kho Tìm Thấy
                    </h2>
                    <p className="text-slate-600">
                        Kéo thả bản đồ để tìm kiếm khu vực bạn quan tâm
                    </p>
                </div>

                {/* Main Content: Map & List */}
                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 h-auto lg:h-[700px] mb-12">

                    {/* Map Area (2/3) */}
                    <div className="lg:col-span-2 bg-card rounded-3xl overflow-hidden border border-border shadow-sm relative z-0 h-[500px] lg:h-full flex flex-col shrink-0">

                        {/* Search & Filter Bar Floating on Map */}
                        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col pointer-events-none">
                            <div className="flex flex-col md:flex-row gap-3 pointer-events-auto w-full max-w-5xl mx-auto">

                                {/* 1. Search Input - Wide */}
                                <div className="flex-1 relative shadow-lg rounded-xl">
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm kho bãi, khu công nghiệp..."
                                        className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F766E] outline-none text-slate-700 shadow-sm"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                    />
                                    <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                </div>

                                {/* 2. Filters Group */}
                                <div className="flex gap-2 items-center overflow-x-auto overflow-y-hidden pb-2 md:pb-0 scrollbar-hide">

                                    {/* Price Filter */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="rounded-xl bg-white border-slate-200 shadow-sm hover:bg-slate-50 min-w-[max-content] md:min-w-[100px] justify-between h-12 px-4 whitespace-nowrap">
                                                <span className="truncate">
                                                    {priceRange[0] === 0 && priceRange[1] === 500
                                                        ? "Giá"
                                                        : `${priceRange[0]} - ${priceRange[1]} Triệu`
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
                                                    showTooltip={true}
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
                                            <Button variant="outline" className="rounded-xl bg-white border-slate-200 shadow-sm hover:bg-slate-50 min-w-[120px] justify-between h-12 px-4 whitespace-nowrap">
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
                                                    showTooltip={true}
                                                />
                                                <div className="flex justify-between mt-2 text-xs text-slate-400">
                                                    <span>0</span>
                                                    <span>5000+</span>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Advanced Filter Sheet */}
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-md h-12 px-6 gap-2 shrink-0">
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
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        {[
                                                            { id: 'standard', label: 'Kho Thường', icon: Package },
                                                            { id: 'shared', label: 'Fulfillment', icon: Truck },
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

                            {/* Active Filter Chips Row - Integrated inside Search Bar */}
                            {activeFilters.length > 0 && (
                                <div className="mt-3 pointer-events-auto flex justify-center md:justify-start w-full max-w-5xl mx-auto">
                                    <FilterChips
                                        filters={activeFilters}
                                        onRemove={handleRemoveFilter}
                                        onClear={handleClearAll}
                                        className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm"
                                    />
                                </div>
                            )}
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
                        {/* Filter Chips Overlay */}

                    </div>

                    {/* List Area (1/3) - Scrollable */}
                    <div className="lg:col-span-1 bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col h-[500px] lg:h-full shrink-0">
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
        </section >
    );
}
