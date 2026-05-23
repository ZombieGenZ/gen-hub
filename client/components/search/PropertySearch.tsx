"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PropertyList from '@/app/(public)/homepage/MapSearch/PropertyList';
import MapComponent from '@/app/(public)/homepage/MapSearch/MapComponent';
import { Property, mapWarehouseToProperty } from '@/data/mockProperties';
import { publicWarehouseService } from '@/services/public-warehouse/public-warehouse.service';
import { MapIcon, ListBulletIcon } from '@heroicons/react/20/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
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
import { aiPluginService, type WarehouseRecommendationItem, type WarehouseRecommendationResponse } from '@/services/ai-plugin/ai-plugin.service';

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

    // Fetch warehouses from API với filter
        const fetchWarehouses = useCallback(async (params?: {
        keywords?: string;
        province_id?: string;
        rental_status?: string;
        page?: number;
    }) => {
        try {
            setIsLoading(true);
            const result = await publicWarehouseService.getPublicWarehouses({
                limit: 200, // Fetch more to allow map bound filtering
                ...params,
                province_id: undefined, // Bỏ filter cứng API để có thể zoom ra thấy pin khác
            });
            const items = result?.items || result || [];
            const mapped = Array.isArray(items) ? items.map(mapWarehouseToProperty) : [];
            setProperties(mapped);
            // Trigger map re-center after properties load
            setSearchTrigger(prev => prev + 1);
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
        province_id: null,
        province_name: null,
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

    // AI Recommendation state
    const [aiQuery, setAiQuery] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<WarehouseRecommendationResponse | null>(null);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);

    const handleAiRecommend = useCallback(async () => {
        if (!aiQuery.trim() || aiQuery.trim().length < 5) return;
        setAiLoading(true);
        setAiResult(null);
        try {
            const result = await aiPluginService.recommendWarehouses(aiQuery.trim());
            setAiResult(result);
        } catch {
            setAiResult({ extracted_filters: {}, recommendations: [], ai_note: 'Không thể kết nối AI. Vui lòng thử lại.' });
        } finally {
            setAiLoading(false);
        }
    }, [aiQuery]);

    // ─────────────────────────────────────────────
    // Hero Search Handler — writes to URL + re-fetches API
    // ─────────────────────────────────────────────
    const handleHeroSearch = (filters: SearchFilters) => {
        setHasSearched(true);
        setHeroFilters(filters);
        setBounds(null);
        // We will trigger map fitBounds after fetch completes

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

        // keywords từ text user gõ tự do (không chọn từ dropdown)
        const keywords = filters.keywords ?? undefined;
        const rentalStatus = filters.rentalType === 'full' ? 'AVAILABLE' : undefined;
        const locationId = filters.location;      // slug cho URL path
        const provinceId = filters.province_id ?? undefined; // UUID cho API

        // Persist keywords vào URL
        if (keywords) params.set('q', keywords);
        else params.delete('q');

        // Persist province_id vào URL
        if (provinceId) params.set('pid', provinceId);
        else params.delete('pid');

        if (locationId) {
            router.push(`/kho-bai/${locationId}?${params.toString()}`);
            setSelectedCities([locationId]);
        } else if (provinceId) {
            // Nếu chọn province từ dropdown nhưng không có slug thì dùng query
            router.push(`/kho-bai?${params.toString()}`);
            setSelectedCities([]);
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

        // Re-fetch từ API với filter mới (province_id ưu tiên, sau đó keywords)
        fetchWarehouses({ province_id: provinceId, keywords, rental_status: rentalStatus });

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
        // Map will not fit bounds on pure frontend filter unless we increment searchTrigger
        // We can increment it here because properties list is already available
        setSearchTrigger(prev => prev + 1);

        // Persist to URL
        const params = new URLSearchParams(searchParams.toString());
        serializeAdvancedToParams(filters, params);
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    // ─────────────────────────────────────────────
    // Clear All Filters
    // ─────────────────────────────────────────────
    const DEFAULT_ADVANCED: FilterState = {
        priceRange: [0, 500],
        amenities: [],
        ceilingHeight: null,
        floorLoadCapacity: 3,
        locationType: [],
        pcccLevel: [],
    };

    const handleClearAllFilters = useCallback(() => {
        // Reset hero filters
        setHeroFilters({ location: null, province_id: null, province_name: null, areaRange: null, rentalType: null });
        // Reset advanced filters
        setAdvancedFilters(DEFAULT_ADVANCED);
        setPriceRange([0, 500]);
        setAreaRange([0, 5000]);
        setSelectedTypes([]);
        setSelectedCities([]);
        setBounds(null);
        setCurrentPage(1);
        // Clear URL
        router.push('/kho-bai', { scroll: false });
        // Re-fetch tất cả
        fetchWarehouses();
    }, [router, fetchWarehouses]);

    const handleRemoveFilter = useCallback((key: string) => {
        const params = new URLSearchParams(searchParams.toString());
        switch (key) {
            case 'province':
                setHeroFilters(prev => ({ ...prev, location: null, province_id: null, province_name: null }));
                setSelectedCities([]);
                params.delete('pid');
                params.delete('q');
                router.push(`/kho-bai?${params.toString()}`, { scroll: false });
                fetchWarehouses({ keywords: undefined, province_id: undefined });
                break;
            case 'area':
                setHeroFilters(prev => ({ ...prev, areaRange: null }));
                setAreaRange([0, 5000]);
                params.delete('areaMin');
                params.delete('areaMax');
                router.replace(`?${params.toString()}`, { scroll: false });
                break;
            case 'rental':
                setHeroFilters(prev => ({ ...prev, rentalType: null }));
                setSelectedTypes([]);
                params.delete('type');
                router.replace(`?${params.toString()}`, { scroll: false });
                break;
            case 'price':
                setAdvancedFilters(prev => ({ ...prev, priceRange: [0, 500] }));
                setPriceRange([0, 500]);
                params.delete('priceMin');
                params.delete('priceMax');
                router.replace(`?${params.toString()}`, { scroll: false });
                break;
            case 'amenities':
                setAdvancedFilters(prev => ({ ...prev, amenities: [] }));
                params.delete('amenities');
                router.replace(`?${params.toString()}`, { scroll: false });
                break;
            case 'ceilH':
                setAdvancedFilters(prev => ({ ...prev, ceilingHeight: null }));
                params.delete('ceilH');
                router.replace(`?${params.toString()}`, { scroll: false });
                break;
            case 'floorLoad':
                setAdvancedFilters(prev => ({ ...prev, floorLoadCapacity: 3 }));
                params.delete('floorLoad');
                router.replace(`?${params.toString()}`, { scroll: false });
                break;
            case 'locType':
                setAdvancedFilters(prev => ({ ...prev, locationType: [] }));
                params.delete('locType');
                router.replace(`?${params.toString()}`, { scroll: false });
                break;
            case 'pccc':
                setAdvancedFilters(prev => ({ ...prev, pcccLevel: [] }));
                params.delete('pccc');
                router.replace(`?${params.toString()}`, { scroll: false });
                break;
        }
    }, [searchParams, router, fetchWarehouses]);

    // ─────────────────────────────────────────────
    // Compute active filter tags
    // ─────────────────────────────────────────────
    const activeFilterTags = useMemo(() => {
        const tags: { key: string; label: string }[] = [];

        if (heroFilters.province_name || heroFilters.location)
            tags.push({ key: 'province', label: `📍 ${heroFilters.province_name || heroFilters.location}` });

        if (heroFilters.areaRange)
            tags.push({ key: 'area', label: `📐 ${heroFilters.areaRange.min}–${heroFilters.areaRange.max} m²` });

        if (heroFilters.rentalType)
            tags.push({ key: 'rental', label: heroFilters.rentalType === 'full' ? '🏭 Thuê nguyên kho' : '🤝 Thuê chung' });

        if (advancedFilters.priceRange[0] > 0 || advancedFilters.priceRange[1] < 500)
            tags.push({ key: 'price', label: `💰 ${advancedFilters.priceRange[0]}–${advancedFilters.priceRange[1]} Tr` });

        if (advancedFilters.amenities.length > 0)
            tags.push({ key: 'amenities', label: `✨ ${advancedFilters.amenities.length} tiện nghi` });

        if (advancedFilters.ceilingHeight !== null)
            tags.push({ key: 'ceilH', label: `🏗️ Trần > ${advancedFilters.ceilingHeight}m` });

        if (advancedFilters.floorLoadCapacity !== 3)
            tags.push({ key: 'floorLoad', label: `⚖️ Tải trọng ${advancedFilters.floorLoadCapacity} tấn` });

        if (advancedFilters.locationType.length > 0)
            tags.push({ key: 'locType', label: `🗺️ ${advancedFilters.locationType.length} vị trí` });

        if (advancedFilters.pcccLevel.length > 0)
            tags.push({ key: 'pccc', label: `🔥 ${advancedFilters.pcccLevel.length} PCCC` });

        return tags;
    }, [heroFilters, advancedFilters]);

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

            // Restore province_id và re-fetch với province filter
            const pidParam = searchParams.get('pid');
            const qParam = searchParams.get('q');

            if (pidParam || qParam) {
                setHasSearched(true);
                if (pidParam) {
                    setHeroFilters(prev => ({ ...prev, province_id: pidParam }));
                }
                if (qParam) {
                    setHeroFilters(prev => ({ ...prev, keywords: qParam }));
                }
                fetchWarehouses({
                    province_id: pidParam ?? undefined,
                    keywords: qParam ?? undefined,
                });
            }
        }

    }, [searchParams, initialLocationSlug, parseAdvancedFromParams, fetchWarehouses]);

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
        /*
        // Bỏ filter cứng này để khi zoom map ra ngoài tỉnh đã chọn, 
        // người dùng vẫn thấy được kho ở tỉnh khác thông qua bounds filter
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
        */

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

                {/* ACTIVE FILTER TAGS */}
                {activeFilterTags.length > 0 && (
                    <div className="search-page__filter-tags">
                        <div className="search-page__filter-tags-inner">
                            {activeFilterTags.map(tag => (
                                <button
                                    key={tag.key}
                                    className="search-page__filter-tag"
                                    onClick={() => handleRemoveFilter(tag.key)}
                                    title={`Xóa lọc: ${tag.label}`}
                                >
                                    <span>{tag.label}</span>
                                    <XMarkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                </button>
                            ))}
                            {activeFilterTags.length > 1 && (
                                <button
                                    className="search-page__filter-tag search-page__filter-tag--clear-all"
                                    onClick={handleClearAllFilters}
                                >
                                    Xóa tất cả
                                </button>
                            )}
                        </div>
                    </div>
                )}

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
                        {/* AI Recommendation Panel */}
                        <div className="mx-4 mt-4 mb-2">
                            <button
                                onClick={() => setAiPanelOpen((v) => !v)}
                                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                AI Gợi ý kho phù hợp
                                <svg className={`w-3.5 h-3.5 transition-transform ${aiPanelOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {aiPanelOpen && (
                                <div className="mt-3 border rounded-xl p-4 bg-gradient-to-br from-primary/5 to-background space-y-3">
                                    <p className="text-xs text-muted-foreground">Mô tả nhu cầu của bạn bằng ngôn ngữ tự nhiên, AI sẽ phân tích và gợi ý kho phù hợp nhất.</p>
                                    <div className="flex gap-2">
                                        <textarea
                                            value={aiQuery}
                                            onChange={(e) => setAiQuery(e.target.value)}
                                            placeholder="Ví dụ: Tôi cần kho lạnh khoảng 500m² gần cảng, ngân sách 15 triệu/tháng, hàng thực phẩm đông lạnh..."
                                            rows={2}
                                            className="flex-1 text-sm border rounded-lg px-3 py-2 resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAiRecommend(); }}
                                        />
                                        <button
                                            onClick={handleAiRecommend}
                                            disabled={aiLoading || aiQuery.trim().length < 5}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
                                        >
                                            {aiLoading ? (
                                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            ) : 'Gợi ý'}
                                        </button>
                                    </div>

                                    {/* Extracted filter chips */}
                                    {aiResult && Object.values(aiResult.extracted_filters).some(Boolean) && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {aiResult.extracted_filters.province_name && (
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">📍 {aiResult.extracted_filters.province_name}</span>
                                            )}
                                            {(aiResult.extracted_filters.area_min || aiResult.extracted_filters.area_max) && (
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                                                    📐 {aiResult.extracted_filters.area_min ?? '?'}–{aiResult.extracted_filters.area_max ?? '?'} m²
                                                </span>
                                            )}
                                            {aiResult.extracted_filters.budget_max_monthly && (
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                                                    💰 ≤ {(aiResult.extracted_filters.budget_max_monthly / 1_000_000).toFixed(0)} tr/tháng
                                                </span>
                                            )}
                                            {aiResult.extracted_filters.is_cold_storage && (
                                                <span className="text-xs px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-full border border-cyan-200">❄️ Kho lạnh</span>
                                            )}
                                            {aiResult.extracted_filters.industry && (
                                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full border border-green-200">🏭 {aiResult.extracted_filters.industry}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Recommendations */}
                                    {aiResult && aiResult.recommendations.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI đề xuất cho bạn</p>
                                            {aiResult.recommendations.map((rec: WarehouseRecommendationItem) => (
                                                <div key={rec.warehouse_id} className="border rounded-xl p-3 bg-background shadow-sm space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm font-semibold line-clamp-1">{rec.name}</p>
                                                            {rec.address && <p className="text-xs text-muted-foreground line-clamp-1">📍 {rec.address}</p>}
                                                        </div>
                                                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                                                            rec.match_score >= 80 ? 'bg-green-100 text-green-800' :
                                                            rec.match_score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-muted-foreground'
                                                        }`}>
                                                            {rec.match_score}/100
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {rec.highlights.map((h, i) => (
                                                            <span key={i} className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{h}</span>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground italic line-clamp-2">{rec.match_reason}</p>
                                                    <div className="flex gap-2 pt-0.5">
                                                        <Link href={`/warehouse/${rec.warehouse_id}`} className="flex-1 text-center text-xs py-1.5 border rounded-lg hover:bg-muted/50 transition-colors">Xem chi tiết</Link>
                                                        <a href={rec.checkout_url} className="flex-1 text-center text-xs py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">Thuê ngay</a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {aiResult && aiResult.ai_note && (
                                        <p className="text-xs text-muted-foreground italic">{aiResult.ai_note}</p>
                                    )}

                                    {aiResult && aiResult.recommendations.length === 0 && !aiResult.ai_note && (
                                        <p className="text-xs text-muted-foreground text-center py-2">Không tìm được kho phù hợp với mô tả trên.</p>
                                    )}
                                </div>
                            )}
                        </div>

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
                                    targetProvince={heroFilters.province_name || heroFilters.location || null}
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
