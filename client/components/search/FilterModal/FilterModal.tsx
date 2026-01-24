"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    VideoCameraIcon,
    ShieldCheckIcon,
    CubeIcon,
    DocumentCheckIcon,
    FireIcon,
    ArrowsPointingOutIcon,
    ScaleIcon,
    TruckIcon,
    CpuChipIcon,
    BoltIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import './FilterModal.css';

// ============================================
// FILTER DATA
// ============================================
const AMENITY_GROUPS = [
    {
        id: 'security',
        title: 'An ninh',
        icon: ShieldCheckIcon,
        items: [
            { id: 'camera', label: 'Camera giám sát', icon: VideoCameraIcon },
            { id: 'guard', label: 'Bảo vệ 24/7', icon: ShieldCheckIcon },
        ]
    },
    {
        id: 'operations',
        title: 'Vận hành',
        icon: CubeIcon,
        items: [
            { id: 'dock_leveler', label: 'Dock Leveler', icon: TruckIcon },
            { id: 'forklift', label: 'Xe nâng (Forklift)', icon: CubeIcon },
            { id: 'pallet', label: 'Pallet có sẵn', icon: CubeIcon },
            { id: 'container_access', label: 'Xe container ra vào', icon: TruckIcon },
        ]
    },
    {
        id: 'legal',
        title: 'Pháp lý',
        icon: DocumentCheckIcon,
        items: [
            { id: 'vat_invoice', label: 'Xuất hóa đơn VAT', icon: DocumentCheckIcon },
            { id: 'pccc', label: 'PCCC nghiệm thu', icon: FireIcon },
        ]
    },
    {
        id: 'utilities',
        title: 'Tiện ích',
        icon: BoltIcon,
        items: [
            { id: 'electricity_3phase', label: 'Điện 3 pha', icon: BoltIcon },
            { id: 'backup_power', label: 'Máy phát điện backup', icon: CpuChipIcon },
        ]
    },
];

const CEILING_HEIGHT_OPTIONS = [
    { id: 'gt6m', label: '> 6m', value: 6 },
    { id: 'gt10m', label: '> 10m', value: 10 },
    { id: 'gt12m', label: '> 12m', value: 12 },
];

// ============================================
// INTERFACES
// ============================================
export interface FilterState {
    priceRange: [number, number];
    amenities: string[];
    ceilingHeight: number | null;
    floorLoadCapacity: number;
}

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    initialFilters?: Partial<FilterState>;
}

// ============================================
// DUAL RANGE SLIDER COMPONENT
// ============================================
interface DualRangeSliderProps {
    min: number;
    max: number;
    step: number;
    values: [number, number];
    onChange: (values: [number, number]) => void;
    formatLabel?: (value: number) => string;
}

function DualRangeSlider({
    min,
    max,
    step,
    values,
    onChange,
    formatLabel = (v) => v.toString()
}: DualRangeSliderProps) {
    const [localValues, setLocalValues] = useState(values);

    const getPercentage = (value: number) => ((value - min) / (max - min)) * 100;

    const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMin = Math.min(Number(e.target.value), localValues[1] - step);
        const newValues: [number, number] = [newMin, localValues[1]];
        setLocalValues(newValues);
        onChange(newValues);
    };

    const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMax = Math.max(Number(e.target.value), localValues[0] + step);
        const newValues: [number, number] = [localValues[0], newMax];
        setLocalValues(newValues);
        onChange(newValues);
    };

    return (
        <div className="filter-modal__range-slider">
            <div className="filter-modal__range-track">
                <div
                    className="filter-modal__range-fill"
                    style={{
                        left: `${getPercentage(localValues[0])}%`,
                        width: `${getPercentage(localValues[1]) - getPercentage(localValues[0])}%`
                    }}
                />
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={localValues[0]}
                onChange={handleMinChange}
                className="filter-modal__range-input filter-modal__range-input--min"
            />
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={localValues[1]}
                onChange={handleMaxChange}
                className="filter-modal__range-input filter-modal__range-input--max"
            />
            <div className="filter-modal__range-labels">
                <span className="filter-modal__range-label">{formatLabel(localValues[0])}</span>
                <span className="filter-modal__range-label">{formatLabel(localValues[1])}</span>
            </div>
        </div>
    );
}

// ============================================
// SINGLE SLIDER COMPONENT
// ============================================
interface SingleSliderProps {
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (value: number) => void;
    formatLabel?: (value: number) => string;
}

function SingleSlider({
    min,
    max,
    step,
    value,
    onChange,
    formatLabel = (v) => v.toString()
}: SingleSliderProps) {
    const [localValue, setLocalValue] = useState(value);
    const percentage = ((localValue - min) / (max - min)) * 100;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = Number(e.target.value);
        setLocalValue(newValue);
        onChange(newValue);
    };

    return (
        <div className="filter-modal__single-slider">
            <div className="filter-modal__single-track">
                <div
                    className="filter-modal__single-fill"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={localValue}
                onChange={handleChange}
                className="filter-modal__single-input"
            />
            <div className="filter-modal__single-value">
                {formatLabel(localValue)}
            </div>
        </div>
    );
}

// ============================================
// MAIN FILTER MODAL COMPONENT
// ============================================
export default function FilterModal({
    isOpen,
    onClose,
    onApply,
    initialFilters
}: FilterModalProps) {
    const [priceRange, setPriceRange] = useState<[number, number]>(
        initialFilters?.priceRange || [0, 500]
    );
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
        initialFilters?.amenities || []
    );
    const [ceilingHeight, setCeilingHeight] = useState<number | null>(
        initialFilters?.ceilingHeight || null
    );
    const [floorLoad, setFloorLoad] = useState<number>(
        initialFilters?.floorLoadCapacity || 3
    );

    const toggleAmenity = useCallback((id: string) => {
        setSelectedAmenities(prev =>
            prev.includes(id)
                ? prev.filter(a => a !== id)
                : [...prev, id]
        );
    }, []);

    const handleReset = () => {
        setPriceRange([0, 500]);
        setSelectedAmenities([]);
        setCeilingHeight(null);
        setFloorLoad(3);
    };

    const handleApply = () => {
        onApply({
            priceRange,
            amenities: selectedAmenities,
            ceilingHeight,
            floorLoadCapacity: floorLoad,
        });
        onClose();
    };

    const activeFilterCount = [
        priceRange[0] > 0 || priceRange[1] < 500,
        selectedAmenities.length > 0,
        ceilingHeight !== null,
        floorLoad !== 3,
    ].filter(Boolean).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="filter-modal__backdrop"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
                        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                        exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="filter-modal"
                    >
                        {/* Header */}
                        <div className="filter-modal__header">
                            <button className="filter-modal__close-btn" onClick={onClose}>
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                            <h2 className="filter-modal__title">Bộ lọc</h2>
                            <div style={{ width: 40 }} /> {/* Spacer for centering */}
                        </div>

                        {/* Content */}
                        <div className="filter-modal__content">
                            {/* PRICE RANGE SECTION */}
                            <section className="filter-modal__section">
                                <div className="filter-modal__section-header">
                                    <h3 className="filter-modal__section-title">
                                        <span className="filter-modal__section-icon">💰</span>
                                        Khoảng giá thuê
                                    </h3>
                                    <span className="filter-modal__section-subtitle">
                                        Triệu VNĐ / tháng
                                    </span>
                                </div>
                                <DualRangeSlider
                                    min={0}
                                    max={500}
                                    step={10}
                                    values={priceRange}
                                    onChange={setPriceRange}
                                    formatLabel={(v) => v === 500 ? '500+ Tr' : `${v} Tr`}
                                />
                            </section>

                            {/* AMENITIES SECTION */}
                            <section className="filter-modal__section">
                                <div className="filter-modal__section-header">
                                    <h3 className="filter-modal__section-title">
                                        <span className="filter-modal__section-icon">✨</span>
                                        Tiện nghi & Pháp lý
                                    </h3>
                                </div>

                                <div className="filter-modal__amenity-groups">
                                    {AMENITY_GROUPS.map((group) => (
                                        <div key={group.id} className="filter-modal__amenity-group">
                                            <h4 className="filter-modal__amenity-group-title">
                                                <group.icon className="w-4 h-4" />
                                                {group.title}
                                            </h4>
                                            <div className="filter-modal__amenity-list">
                                                {group.items.map((item) => (
                                                    <button
                                                        key={item.id}
                                                        className={cn(
                                                            "filter-modal__amenity-btn",
                                                            selectedAmenities.includes(item.id) && "filter-modal__amenity-btn--selected"
                                                        )}
                                                        onClick={() => toggleAmenity(item.id)}
                                                    >
                                                        <item.icon className="filter-modal__amenity-icon" />
                                                        <span>{item.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* TECHNICAL SPECS SECTION */}
                            <section className="filter-modal__section">
                                <div className="filter-modal__section-header">
                                    <h3 className="filter-modal__section-title">
                                        <span className="filter-modal__section-icon">📐</span>
                                        Đặc điểm kỹ thuật
                                    </h3>
                                </div>

                                {/* Ceiling Height */}
                                <div className="filter-modal__spec-row">
                                    <div className="filter-modal__spec-label">
                                        <ArrowsPointingOutIcon className="w-5 h-5" />
                                        <span>Trần cao</span>
                                    </div>
                                    <div className="filter-modal__spec-options">
                                        {CEILING_HEIGHT_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.id}
                                                className={cn(
                                                    "filter-modal__spec-btn",
                                                    ceilingHeight === opt.value && "filter-modal__spec-btn--selected"
                                                )}
                                                onClick={() => setCeilingHeight(
                                                    ceilingHeight === opt.value ? null : opt.value
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Floor Load Capacity */}
                                <div className="filter-modal__spec-row filter-modal__spec-row--slider">
                                    <div className="filter-modal__spec-label">
                                        <ScaleIcon className="w-5 h-5" />
                                        <span>Tải trọng sàn (tấn/m²)</span>
                                    </div>
                                    <SingleSlider
                                        min={1}
                                        max={10}
                                        step={0.5}
                                        value={floorLoad}
                                        onChange={setFloorLoad}
                                        formatLabel={(v) => `${v} tấn`}
                                    />
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="filter-modal__footer">
                            <button
                                className="filter-modal__reset-btn"
                                onClick={handleReset}
                            >
                                Xóa tất cả
                            </button>
                            <button
                                className="filter-modal__apply-btn"
                                onClick={handleApply}
                            >
                                Hiển thị kết quả
                                {activeFilterCount > 0 && (
                                    <span className="filter-modal__count-badge">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
