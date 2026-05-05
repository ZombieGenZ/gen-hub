"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPinIcon,
    Square3Stack3DIcon,
    BuildingStorefrontIcon,
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
    ChevronDownIcon,
    BuildingOffice2Icon,
    UserGroupIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { LocationService } from '@/services/location/location.service';
import { Province } from '@/types/location/provinces.type';
import './HeroSearchBar.css';

const locationService = new LocationService();


const AREA_RANGES = [
    { id: 'all', label: 'Tất cả diện tích', min: 0, max: 999999 },
    { id: '100-300', label: '100m² - 300m²', min: 100, max: 300 },
    { id: '300-500', label: '300m² - 500m²', min: 300, max: 500 },
    { id: '500-1000', label: '500m² - 1,000m²', min: 500, max: 1000 },
    { id: '1000-2000', label: '1,000m² - 2,000m²', min: 1000, max: 2000 },
    { id: '2000+', label: 'Trên 2,000m²', min: 2000, max: 999999 },
];

const RENTAL_TYPES = [
    {
        id: 'full',
        label: 'Thuê nguyên kho',
        Icon: BuildingOffice2Icon,
        description: 'Độc quyền toàn bộ diện tích kho',
        iconBg: 'rental-icon-bg--teal',
    },
    {
        id: 'shared',
        label: 'Thuê chung',
        Icon: UserGroupIcon,
        description: 'Chia sẻ không gian với đơn vị khác',
        iconBg: 'rental-icon-bg--blue',
    }
];

interface HeroSearchBarProps {
    onSearch?: (filters: SearchFilters) => void;
    onOpenFilter?: () => void;
    className?: string;
    variant?: 'hero' | 'compact';
    initialValues?: Partial<SearchFilters>;
}

export interface SearchFilters {
    location: string | null;
    province_id: string | null;
    province_name: string | null;  // tên hiển thị
    areaRange: { min: number; max: number } | null;
    rentalType: string | null;
    /** Text user gõ tự do để tìm kiếm (gửi lên API như keywords) */
    keywords?: string | null;
}

type ActiveSection = 'location' | 'area' | 'rental' | null;

export default function HeroSearchBar({
    onSearch,
    onOpenFilter,
    className,
    variant = 'hero',
    minified = false,
    initialValues,
}: HeroSearchBarProps & { minified?: boolean }) {
    const [activeSection, setActiveSection] = useState<ActiveSection>(null);

    // ── Province state (API) ──
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [provincesLoading, setProvincesLoading] = useState(false);

    // Fetch provinces khi mount — API không hỗ trợ limit, sẽ trả về tất cả
    useEffect(() => {
        setProvincesLoading(true);
        locationService
            .getProvinces()
            .then(setProvinces)
            .catch(() => setProvinces([]))
            .finally(() => setProvincesLoading(false));
    }, []);

    const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);

    useEffect(() => {
        if (!initialValues?.province_id || provinces.length === 0) return;
        const match = provinces.find(p => p.id === initialValues.province_id);
        if (match) setSelectedProvince(match);
    }, [initialValues?.province_id, provinces]);

    // Restore selected area từ initialValues
    const [selectedArea, setSelectedArea] = useState<typeof AREA_RANGES[0] | null>(() => {
        if (!initialValues?.areaRange) return null;
        return AREA_RANGES.find(
            a => a.min === initialValues.areaRange!.min && a.max === initialValues.areaRange!.max
        ) ?? null;
    });

    // Restore rental type từ initialValues
    const [selectedRental, setSelectedRental] = useState<typeof RENTAL_TYPES[0] | null>(() => {
        if (!initialValues?.rentalType) return null;
        return RENTAL_TYPES.find(r => r.id === initialValues.rentalType) ?? null;
    });

    const [locationSearch, setLocationSearch] = useState('');

    const searchBarRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
                setActiveSection(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Expand when clicking on minified version
    const handleExpandInfo = () => {
        setActiveSection('location');
    };

    const filteredProvinces = useMemo(() =>
        provinces.filter(p =>
            p.name.toLowerCase().includes(locationSearch.toLowerCase())
        ),
        [provinces, locationSearch]
    );

    const getProvinceTypeLabel = (type: string) => {
        if (type?.toLowerCase().includes('thành phố') || type === 'tp') return 'Thành phố';
        if (type?.toLowerCase().includes('tỉnh') || type === 'province') return 'Tỉnh';
        return type || 'Khu vực';
    };

    const handleSearch = () => {
        onSearch?.({
            location: selectedProvince?.slug || null,
            province_id: selectedProvince?.id || null,
            province_name: selectedProvince?.name || null,
            areaRange: selectedArea ? { min: selectedArea.min, max: selectedArea.max } : null,
            rentalType: selectedRental?.id || null,
            // Nếu user chọn tỉnh từ dropdown: không cần keywords
            // Nếu user gõ text không chọn: dùng locationSearch làm keywords
            keywords: selectedProvince ? null : (locationSearch.trim() || null),
        });
        setActiveSection(null);
    };

    const getLocationTypeLabel = (type: string) => {
        switch (type) {
            case 'district': return 'Quận/Huyện';
            case 'province': return 'Tỉnh/TP';
            case 'industrial': return 'KCN';
            case 'area': return 'Khu vực';
            default: return '';
        }
    };

    // MINIFIED RENDER
    if (minified && !activeSection) {
        return (
            <div
                className={cn(
                    "hero-search-bar hero-search-bar--minified",
                    className
                )}
                onClick={handleExpandInfo}
            >
                <div className="hero-search-bar__container hero-search-bar__container--minified">
                    <div className="flex items-center gap-4 pl-4 flex-1 overflow-hidden">
                        <span className="text-sm font-semibold truncate text-foreground border-r border-border pr-4">
                            {selectedProvince ? selectedProvince.name : "Khu vực bất kỳ"}
                        </span>
                        <span className="text-sm font-medium truncate text-foreground border-r border-border pr-4 hidden sm:block">
                            {selectedArea ? selectedArea.label : "Diện tích bất kỳ"}
                        </span>
                        <span className="text-sm font-medium truncate text-muted-foreground hidden md:block">
                            {selectedRental ? selectedRental.label : "Hình thức"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 pr-2">
                        {/* Filter Trigger in Minified */}
                        <div
                            className="p-2.5 rounded-full hover:bg-accent cursor-pointer transition-colors border border-transparent hover:border-border"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenFilter?.();
                            }}
                            title="Bộ lọc"
                        >
                            <AdjustmentsHorizontalIcon className="w-5 h-5 text-muted-foreground" />
                        </div>

                        {/* Search Button */}
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-sm">
                            <MagnifyingGlassIcon className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={searchBarRef}
            className={cn(
                "hero-search-bar",
                variant === 'compact' && "hero-search-bar--compact",
                activeSection && "hero-search-bar--active",
                className
            )}
        >
            <div className="hero-search-bar__container">
                {/* SECTION 1: KHU VỰC */}
                <div
                    className={cn(
                        "hero-search-bar__section",
                        "hero-search-bar__section--location",
                        activeSection === 'location' && "hero-search-bar__section--active"
                    )}
                    onClick={() => setActiveSection(activeSection === 'location' ? null : 'location')}
                >
                    <div className="hero-search-bar__section-icon">
                        <MapPinIcon className="w-5 h-5" />
                    </div>
                    <div className="hero-search-bar__section-content">
                        <span className="hero-search-bar__section-label">Khu vực</span>
                        {activeSection === 'location' ? (
                            <input
                                autoFocus
                                type="text"
                                placeholder="Tìm tỉnh / thành phố..."
                                className="hero-search-bar__input-inline"
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className="hero-search-bar__section-value">
                                {selectedProvince ? selectedProvince.name : "Tìm kiếm kho"}
                            </span>
                        )}
                    </div>
                    <ChevronDownIcon className={cn(
                        "hero-search-bar__section-arrow",
                        activeSection === 'location' && "hero-search-bar__section-arrow--open"
                    )} />
                </div>

                {/* DIVIDER */}
                <div className="hero-search-bar__divider" />

                {/* SECTION 2: DIỆN TÍCH */}
                <div
                    className={cn(
                        "hero-search-bar__section",
                        "hero-search-bar__section--area",
                        activeSection === 'area' && "hero-search-bar__section--active"
                    )}
                    onClick={() => setActiveSection(activeSection === 'area' ? null : 'area')}
                >
                    <div className="hero-search-bar__section-icon">
                        <Square3Stack3DIcon className="w-5 h-5" />
                    </div>
                    <div className="hero-search-bar__section-content">
                        <span className="hero-search-bar__section-label">Diện tích</span>
                        <span className="hero-search-bar__section-value text-sm font-semibold text-foreground">
                            {selectedArea ? selectedArea.label : "Diện tích"}
                        </span>
                    </div>
                    <ChevronDownIcon className={cn(
                        "hero-search-bar__section-arrow",
                        activeSection === 'area' && "hero-search-bar__section-arrow--open"
                    )} />
                </div>

                {/* DIVIDER */}
                <div className="hero-search-bar__divider" />

                {/* SECTION 3: HÌNH THỨC THUÊ */}
                <div
                    className={cn(
                        "hero-search-bar__section",
                        "hero-search-bar__section--rental",
                        activeSection === 'rental' && "hero-search-bar__section--active"
                    )}
                    onClick={() => setActiveSection(activeSection === 'rental' ? null : 'rental')}
                >
                    <div className="hero-search-bar__section-icon">
                        <BuildingStorefrontIcon className="w-5 h-5" />
                    </div>
                    <div className="hero-search-bar__section-content">
                        <span className="hero-search-bar__section-label">Hình thức</span>
                        <span className="hero-search-bar__section-value text-sm font-semibold text-foreground">
                            {selectedRental ? selectedRental.label : "Hình thức"}
                        </span>
                    </div>
                    <ChevronDownIcon className={cn(
                        "hero-search-bar__section-arrow",
                        activeSection === 'rental' && "hero-search-bar__section-arrow--open"
                    )} />
                </div>

                {/* SEARCH BUTTON */}
                <button
                    className="hero-search-bar__search-btn"
                    onClick={handleSearch}
                >
                    <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
                {/* FILTER BUTTON - SEPARATE */}
                <button
                    className="hero-search-bar__filter-btn"
                    onClick={onOpenFilter}
                    title="Bộ lọc nâng cao"
                >
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                </button>
            </div>

            {/* DROPDOWN PANELS */}
            <AnimatePresence>
                {activeSection === 'location' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="hero-search-bar__dropdown hero-search-bar__dropdown--location"
                    >
                        <div className="hero-search-bar__dropdown-list">
                            {provincesLoading ? (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        Đang tải khu vực...
                                    </div>
                                </div>
                            ) : filteredProvinces.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                    Không tìm thấy khu vực nào
                                </div>
                            ) : (
                                filteredProvinces.map((province) => (
                                    <div
                                        key={province.id}
                                        className={cn(
                                            "hero-search-bar__dropdown-item",
                                            selectedProvince?.id === province.id && "hero-search-bar__dropdown-item--selected"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Toggle: click lại để bỏ chọn
                                            if (selectedProvince?.id === province.id) {
                                                setSelectedProvince(null);
                                            } else {
                                                setSelectedProvince(province);
                                            }
                                            setActiveSection(null);
                                            setLocationSearch('');
                                        }}
                                    >
                                        <div className="hero-search-bar__dropdown-item-icon">
                                            <MapPinIcon className="w-4 h-4" />
                                        </div>
                                        <div className="hero-search-bar__dropdown-item-content">
                                            <span className="hero-search-bar__dropdown-item-name">{province.name}</span>
                                            <span className="hero-search-bar__dropdown-item-meta">
                                                {getProvinceTypeLabel(province.type)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {/* Xóa chọn */}
                        {selectedProvince && (
                            <button
                                className="hero-search-bar__dropdown-clear"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProvince(null);
                                }}
                            >
                                Xóa lựa chọn
                            </button>
                        )}
                    </motion.div>
                )}

                {activeSection === 'area' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="hero-search-bar__dropdown hero-search-bar__dropdown--area"
                    >
                        <div className="hero-search-bar__dropdown-title">Chọn khoảng diện tích</div>
                        <div className="hero-search-bar__area-grid">
                            {AREA_RANGES.map((area) => (
                                <button
                                    key={area.id}
                                    className={cn(
                                        "hero-search-bar__area-option",
                                        selectedArea?.id === area.id && "hero-search-bar__area-option--selected"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Toggle: click lại để bỏ chọn
                                        if (selectedArea?.id === area.id) {
                                            setSelectedArea(null);
                                        } else {
                                            setSelectedArea(area);
                                        }
                                        setActiveSection(null);
                                    }}
                                >
                                    {area.label}
                                </button>
                            ))}
                        </div>
                        {selectedArea && (
                            <button
                                className="hero-search-bar__dropdown-clear"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedArea(null);
                                }}
                            >
                                Xóa lựa chọn
                            </button>
                        )}
                    </motion.div>
                )}

                {activeSection === 'rental' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="hero-search-bar__dropdown hero-search-bar__dropdown--rental"
                    >
                        <div className="hero-search-bar__dropdown-title">Hình thức thuê kho</div>
                        <div className="hero-search-bar__rental-list">
                            {RENTAL_TYPES.map((rental) => (
                                <button
                                    key={rental.id}
                                    className={cn(
                                        "hero-search-bar__rental-option",
                                        selectedRental?.id === rental.id && "hero-search-bar__rental-option--selected"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Toggle: click lại để bỏ chọn
                                        if (selectedRental?.id === rental.id) {
                                            setSelectedRental(null);
                                        } else {
                                            setSelectedRental(rental);
                                        }
                                        setActiveSection(null);
                                    }}
                                >
                                    <span className={cn("hero-search-bar__rental-icon", rental.iconBg)}>
                                        <rental.Icon className="w-5 h-5" />
                                    </span>
                                    <div className="hero-search-bar__rental-content">
                                        <span className="hero-search-bar__rental-label">{rental.label}</span>
                                        <span className="hero-search-bar__rental-desc">{rental.description}</span>
                                    </div>
                                    {selectedRental?.id === rental.id && (
                                        <span className="hero-search-bar__rental-check">
                                            <CheckIcon className="w-4 h-4" strokeWidth={2.5} />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        {selectedRental && (
                            <button
                                className="hero-search-bar__dropdown-clear"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRental(null);
                                }}
                            >
                                Xóa lựa chọn
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
