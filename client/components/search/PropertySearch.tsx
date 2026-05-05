"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PropertyList from '@/app/(public)/homepage/MapSearch/PropertyList';
import MapComponent from '@/app/(public)/homepage/MapSearch/MapComponent';
import { Property, mapWarehouseToProperty } from '@/data/mockProperties';
import { publicWarehouseService } from '@/services/public-warehouse/public-warehouse.service';
import { MapIcon, ListBulletIcon } from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { HeroSearchBar, SearchFilters } from '@/components/search/HeroSearchBar';
import { FilterModal, FilterState } from '@/components/search/FilterModal';
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserData } from "@/types/user/user.type";
import UserDropdown from "@/components/ui/UserDropdown";
import SearchHeader from "@/components/search/SearchHeader";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    BuildingOffice2Icon,
    SparklesIcon,
    CubeIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Menu, MenuItem, HoveredLink } from "@/components/ui/navbar-menu";
import { UserService } from "@/services/user/user.service";

const HEADER_HEIGHT = 80;
const userService = new UserService();

interface PropertySearchProps {
    initialLocationSlug?: string;
}

export default function PropertySearch({ initialLocationSlug }: PropertySearchProps) {
    const router = useRouter();
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
    const [highlightedPropertyId, setHighlightedPropertyId] = useState<number | null>(null);
    const [showMapMobile, setShowMapMobile] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Auth State
    const [isLogin, setIsLogin] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);
    const [active, setActive] = useState<string | null>(null);

    // Fetch warehouses from API
    const fetchWarehouses = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await publicWarehouseService.getPublicWarehouses({
                limit: 24,
            });
            const items = result?.items || result || [];
            const mapped = Array.isArray(items) ? items.map(mapWarehouseToProperty) : [];
            setProperties(mapped);
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
            setProperties([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    useEffect(() => {
        const initAuth = async () => {
            const isAuthenticated = authStorage.isAuthenticated();
            setIsLogin(isAuthenticated);
            try {
                const accessToken = authStorage.getAccessToken();
                const refreshToken = authStorage.getRefreshToken();

                if (!isAuthenticated || !accessToken || !refreshToken) {
                    setUser(null);
                    return;
                }

                const userData = await userService.getUser(accessToken, refreshToken);
                setUser(userData);
            } catch (error) {
                console.error('Failed to get user data:', error);
                setUser(null);
            }
        };

        initAuth();
    }, []);

    const searchParams = useSearchParams();

    // ─────────────────────────────────────────────
    // Helpers: parse & serialize advanced filters to URL
    // ─────────────────────────────────────────────
    const parseAdvancedFromParams = useCallback((params: URLSearchParams): FilterState => {
        const priceMin = Number(params.get('priceMin') ?? 0);
        const priceMax = Number(params.get('priceMax') ?? 500);
        const amenities = params.get('amenities') ? params.get('amenities')!.split(',').filter(Boolean) : [];
        const ceilingHeight = params.get('ceilH') ? Number(params.get('ceilH')) : null;
        const floorLoad = Number(params.get('floorLoad') ?? 3);
        const locationType = params.get('locType') ? params.get('locType')!.split(',').filter(Boolean) : [];
        const pcccLevel = params.get('pccc') ? params.get('pccc')!.split(',').filter(Boolean) : [];
        return {
            priceRange: [priceMin, priceMax],
            amenities,
            ceilingHeight,
            floorLoadCapacity: floorLoad,
            locationType,
            pcccLevel,
        };
    }, []);

    const serializeAdvancedToParams = useCallback((filters: FilterState, params: URLSearchParams) => {
        if (filters.priceRange[0] > 0) params.set('priceMin', String(filters.priceRange[0]));
        else params.delete('priceMin');

        if (filters.priceRange[1] < 500) params.set('priceMax', String(filters.priceRange[1]));
        else params.delete('priceMax');

        if (filters.amenities.length > 0) params.set('amenities', filters.amenities.join(','));
        else params.delete('amenities');

        if (filters.ceilingHeight !== null) params.set('ceilH', String(filters.ceilingHeight));
        else params.delete('ceilH');

        if (filters.floorLoadCapacity !== 3) params.set('floorLoad', String(filters.floorLoadCapacity));
        else params.delete('floorLoad');

        if (filters.locationType.length > 0) params.set('locType', filters.locationType.join(','));
        else params.delete('locType');

        if (filters.pcccLevel.length > 0) params.set('pccc', filters.pcccLevel.join(','));
        else params.delete('pccc');
    }, []);

    // ─────────────────────────────────────────────
    // Filter Modal State
    // ─────────────────────────────────────────────
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Hero Search Bar Filters
    const [heroFilters, setHeroFilters] = useState<SearchFilters>({
        location: initialLocationSlug || null,
        areaRange: null,
        rentalType: null,
    });

    // Advanced Filter State (from FilterModal) - initialized from URL
    const [advancedFilters, setAdvancedFilters] = useState<FilterState>(() =>
        parseAdvancedFromParams(new URLSearchParams(
            typeof window !== 'undefined' ? window.location.search : ''
        ))
    );

    // Legacy filter state (synced from URL)
    const [searchText, setSearchText] = useState("");
    const [priceRange, setPriceRange] = useState<[number, number]>(
        () => advancedFilters.priceRange
    );
    const [areaRange, setAreaRange] = useState([0, 5000]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);

    // Track if search has been performed
    const [hasSearched, setHasSearched] = useState(false);
    const [searchTrigger, setSearchTrigger] = useState(0);

    // ─────────────────────────────────────────────
    // Hero Search Handler — writes to URL
    // ─────────────────────────────────────────────
    const handleHeroSearch = (filters: SearchFilters) => {
        setHasSearched(true);
        setHeroFilters(filters);
        setBounds(null);
        setSearchTrigger(prev => prev + 1);

        const params = new URLSearchParams(searchParams.toString());
        params.delete('location');

        if (filters.areaRange) {
            params.set('areaMin', filters.areaRange.min.toString());
            params.set('areaMax', filters.areaRange.max.toString());
        } else {
            params.delete('areaMin');
            params.delete('areaMax');
        }

        if (filters.rentalType) params.set('type', filters.rentalType);
        else params.delete('type');

        // Advanced filters carried over when navigating
        serializeAdvancedToParams(advancedFilters, params);

        if (filters.location) {
            router.push(`/kho-bai/${filters.location}?${params.toString()}`);
            setSelectedCities([filters.location]);
        } else {
            router.push(`/kho-bai?${params.toString()}`);
            setSelectedCities([]);
        }

        if (filters.areaRange) setAreaRange([filters.areaRange.min, filters.areaRange.max]);
        if (filters.rentalType) {
            switch (filters.rentalType) {
                case 'shared': setSelectedTypes(['shared']); break;
                case 'fulfillment': setSelectedTypes(['fulfillment']); break;
                default: setSelectedTypes([]);
            }
        }

        document.getElementById('search-list-container')?.scrollIntoView({ behavior: 'smooth' });
    };

    // Scroll Detection for Minified Search Bar
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ─────────────────────────────────────────────
    // Advanced Filter Handler — writes to URL
    // ─────────────────────────────────────────────
    const handleApplyFilters = (filters: FilterState) => {
        setAdvancedFilters(filters);
        setPriceRange(filters.priceRange);
        setBounds(null);
        setSearchTrigger(prev => prev + 1);

        // Persist to URL
        const params = new URLSearchParams(searchParams.toString());
        serializeAdvancedToParams(filters, params);
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    // Scroll to top when page changes
    useEffect(() => {
        if (currentPage > 1) window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    // ─────────────────────────────────────────────
    // Restore full state from URL on mount / navigation
    // ─────────────────────────────────────────────
    const isFirstSync = useRef(true);

    useEffect(() => {
        const typeParam = searchParams.get('type');
        const locationParam = searchParams.get('location');
        const areaMinParam = searchParams.get('areaMin');
        const areaMaxParam = searchParams.get('areaMax');

        // Hero search params
        if (typeParam || locationParam || areaMinParam || areaMaxParam || initialLocationSlug) {
            setHasSearched(true);
            setSearchTrigger(prev => prev + 1);
            setBounds(null);
        }

        if (typeParam) {
            switch (typeParam) {
                case 'kho-thuong': case 'standard': setSelectedTypes(['standard']); break;
                case 'kho-ngoai-quan': case 'bonded': setSelectedTypes(['bonded']); break;
                case 'kho-chung': case 'shared': setSelectedTypes(['shared']); break;
                case 'fulfillment': setSelectedTypes(['fulfillment']); break;
                default: setSelectedTypes([]); break;
            }
        } else {
            setSelectedTypes([]);
        }

        if (areaMinParam && areaMaxParam) {
            setAreaRange([Number(areaMinParam), Number(areaMaxParam)]);
        }

        if (initialLocationSlug) {
            setSelectedCities([initialLocationSlug]);
            setHeroFilters(prev => ({ ...prev, location: initialLocationSlug }));
        } else if (locationParam) {
            setSelectedCities([locationParam]);
            setHeroFilters(prev => ({ ...prev, location: locationParam }));
        }

        // Restore hero bar area/rental
        if (areaMinParam && areaMaxParam) {
            setHeroFilters(prev => ({
                ...prev,
                areaRange: { min: Number(areaMinParam), max: Number(areaMaxParam) }
            }));
        }
        if (typeParam) {
            setHeroFilters(prev => ({ ...prev, rentalType: typeParam }));
        }

        // Restore advanced filters from URL (only on first sync to avoid override)
        if (isFirstSync.current) {
            isFirstSync.current = false;
            const restored = parseAdvancedFromParams(new URLSearchParams(searchParams.toString()));
            setAdvancedFilters(restored);
            setPriceRange(restored.priceRange);
        }

    }, [searchParams, initialLocationSlug, parseAdvancedFromParams]);

    // Filter properties
    const filteredProperties = useMemo(() => {
        let result = properties;

        if (searchText) {
            const lowerText = searchText.toLowerCase();
            result = result.filter(p =>
                p.title.toLowerCase().includes(lowerText) ||
                p.address.toLowerCase().includes(lowerText)
            );
        }

        if (priceRange[0] > 0 || priceRange[1] < 500) {
            result = result.filter(p => p.price >= priceRange[0] * 1000000 && p.price <= priceRange[1] * 1000000);
        }

        if (areaRange[0] > 0 || areaRange[1] < 5000) {
            result = result.filter(p => p.area >= areaRange[0] && p.area <= areaRange[1]);
        }

        if (selectedTypes.length > 0) {
            result = result.filter(p => {
                const isShared = selectedTypes.includes('shared') && p.is_shared_warehouse;
                const isBonded = selectedTypes.includes('bonded') && p.type === 'Kho Ngoại Quan';
                const isStandard = selectedTypes.includes('standard') && p.type === 'Kho Thường' && !p.is_shared_warehouse;
                return isShared || isStandard || isBonded;
            });
        }
        if (selectedCities.length > 0) {
            result = result.filter(p => selectedCities.some(city => {
                if (!p.province_name) return false;
                // Normalize property province name to match slug format
                // Simple normalization: remove accents, lowercase, replace spaces with dashes
                const normalizedProvince = p.province_name
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
                    .toLowerCase()
                    .replace(/\s+/g, '-');

                return normalizedProvince.includes(city.toLowerCase());
            }));
        }

        // Apply Map Bounds Filter if available
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

    const ITEMS_PER_PAGE = 12;
    const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
    const displayedProperties = filteredProperties.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Generate pagination array
    const paginationRange = useMemo(() => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let l: number | undefined;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        for (const i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    }, [currentPage, totalPages]);

    const mapProperties = filteredProperties;

    return (
        <>
            <div className="search-page bg-background">
                {/* HERO SEARCH BAR - Sticky at top */}
                <SearchHeader
                    onSearch={handleHeroSearch}
                    onOpenFilter={() => setIsFilterModalOpen(true)}
                    isScrolled={isScrolled}
                    initialSearchValues={heroFilters}
                />

                {/* FILTER MODAL */}
                <FilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={handleApplyFilters}
                    initialFilters={advancedFilters}
                />

                {/* Main Container - Chứa cả List và Map */}
                <div className="search-page__main-container">

                    {/* LIST COLUMN - Quyết định chiều cao của container */}
                    <div
                        id="search-list-container"
                        className={cn(
                            "search-page__list-column",
                            !hasSearched ? "max-w-[1440px] mx-auto" : "",
                            showMapMobile ? "search-page__list-column--hidden-mobile" : ""
                        )}
                    >
                        {/* Header info */}
                        <div className="search-page__list-header">
                            {filteredProperties.length > 0 ? (
                                <div className="search-page__list-info">
                                    <h1 className="search-page__list-title">
                                        {filteredProperties.length} kho bãi tại khu vực tìm kiếm
                                        <span className="search-page__list-page-indicator">(Trang {currentPage})</span>
                                    </h1>
                                    <p className="search-page__list-subtitle">
                                        Hãy kiểm tra thông tin chi tiết trước khi đặt lịch xem.
                                    </p>
                                </div>
                            ) : null}
                        </div>

                        {/* Property Grid */}
                        <div className="search-page__list-content">
                            {isLoading ? (
                                <div className={cn(
                                    "grid gap-6",
                                    !hasSearched
                                        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                                )}>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="flex flex-col gap-3 p-2 rounded-xl">
                                            <div className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
                                            <div className="flex flex-col gap-2 px-0.5">
                                                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                                                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                                                <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
                                            </div>
                                            <div className="h-5 w-1/3 rounded bg-muted animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                            <PropertyList
                                properties={displayedProperties}
                                onHover={(id) => setHighlightedPropertyId(id ? Number(id) : null)}
                                highlightedPropertyId={highlightedPropertyId}
                                variant="grid"
                                // Adjust columns if map is hidden
                                className={!hasSearched ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : ""}
                            />
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="search-page__pagination">
                            {paginationRange.map((page, index) => {
                                if (page === '...') {
                                    return (
                                        <span key={index} className="search-page__pagination-btn search-page__pagination-btn--ellipsis">
                                            ...
                                        </span>
                                    );
                                }
                                const pageNum = Number(page);
                                return (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={cn(
                                            "search-page__pagination-btn",
                                            currentPage === pageNum
                                                ? "search-page__pagination-btn--active bg-gray-900 text-white hover:bg-gray-800"
                                                : "search-page__pagination-btn--default hover:bg-gray-100"
                                        )}
                                    >
                                        {page}
                                    </button>
                                );
                            })}

                            <button
                                className={"search-page__pagination-btn search-page__pagination-btn--next " + (currentPage >= totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100")}
                                onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)}
                                disabled={currentPage >= totalPages}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* MAP COLUMN - Sticky trong phạm vi container */}
                    {/* ONLY SHOW IF SEARCHED */}
                    {hasSearched && (
                        <div
                            className={cn(
                                "search-page__map-column",
                                showMapMobile ? "search-page__map-column--mobile-fullscreen" : ""
                            )}
                            style={{
                                // CSS custom properties cho sticky positioning
                                '--header-height': `${HEADER_HEIGHT}px`,
                            } as React.CSSProperties}
                        >
                            <div className="search-page__map-content">
                                <MapComponent
                                    properties={mapProperties}
                                    onBoundsChange={setBounds}
                                    highlightedPropertyId={highlightedPropertyId}
                                    onMarkerClick={(id) => {
                                        setHighlightedPropertyId(Number(id));
                                        if (!showMapMobile && window.innerWidth >= 1024) {
                                            const element = document.getElementById(`property-card-${id}`);
                                            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                    }}
                                    searchTrigger={searchTrigger}
                                />
                            </div>

                            {/* Close button for mobile fullscreen map */}
                            {showMapMobile && (
                                <button
                                    onClick={() => setShowMapMobile(false)}
                                    className="search-page__map-close-btn"
                                    aria-label="Đóng bản đồ"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Toggle Button - Fixed at bottom - ONLY SHOW IF SEARCHED */}
            {hasSearched && (
                <div className="search-page__mobile-toggle">
                    <button
                        onClick={() => setShowMapMobile(!showMapMobile)}
                        className="search-page__mobile-toggle-btn"
                    >
                        {showMapMobile ? (
                            <>
                                <ListBulletIcon className="w-5 h-5" />
                                <span>Danh sách</span>
                            </>
                        ) : (
                            <>
                                <MapIcon className="w-5 h-5" />
                                <span>Bản đồ</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </>
    );
}
