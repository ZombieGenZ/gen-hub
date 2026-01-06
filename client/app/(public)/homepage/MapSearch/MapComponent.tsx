"use client";

import React, { useRef, useState, useEffect } from 'react';
import Map, { Marker, MapRef, ViewStateChangeEvent, Popup } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import { Property } from '@/data/mockProperties';
import 'mapbox-gl/dist/mapbox-gl.css';
import { BedDouble, Bath, X } from 'lucide-react';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/solid';

// Properties Map Component - Fixed Icons
interface MapComponentProps {
    properties: Property[];
    onBoundsChange: (bounds: { north: number; south: number; east: number; west: number }) => void;
    highlightedPropertyId: number | string | null;
    onMarkerClick: (propertyId: number | string) => void;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapComponent({ properties, onBoundsChange, highlightedPropertyId, onMarkerClick }: MapComponentProps) {
    const mapRef = useRef<MapRef>(null);

    // State for Clicked Property (Full Card)
    const [selectedInfo, setSelectedInfo] = useState<Property | null>(null);
    // State for Hovered Property (Price Only)
    const [hoverInfo, setHoverInfo] = useState<Property | null>(null);

    // Initial view state (Ho Chi Minh City)
    const [viewState, setViewState] = useState({
        latitude: 10.7769,
        longitude: 106.7009,
        zoom: 12
    });

    const [searchAsIMove, setSearchAsIMove] = useState(true);

    // Ctrl + Scroll implementation
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            setIsCtrlPressed(e.ctrlKey || e.metaKey);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            setIsCtrlPressed(e.ctrlKey || e.metaKey);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', () => setIsCtrlPressed(false));
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', () => setIsCtrlPressed(false));
        };
    }, []);

    const handleWheel = () => {
        if (!isCtrlPressed) {
            setShowOverlay(true);
            if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
            overlayTimeoutRef.current = setTimeout(() => setShowOverlay(false), 2000);
        } else {
            setShowOverlay(false);
        }
    };

    const handleMoveEnd = (evt: ViewStateChangeEvent) => {
        setViewState(evt.viewState);
        if (searchAsIMove && mapRef.current) {
            const bounds = mapRef.current.getBounds();
            if (bounds) {
                onBoundsChange({
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest()
                });
            }
        }
    };

    const handleMapClick = (event: mapboxgl.MapLayerMouseEvent) => {
        // Clear selection if clicking on the map background
        if (event.originalEvent.target && (event.originalEvent.target as HTMLElement).tagName.toLowerCase() === 'canvas') {
            setSelectedInfo(null);
        }
    };

    // Helper to format price
    const formatPrice = (price: number) => {
        if (price >= 1000000000) return `${(price / 1000000000).toFixed(1)} Tỷ`;
        if (price >= 1000000) return `${(price / 1000000).toFixed(0)} Tr`;
        return `${price}`;
    };

    return (
        <div className="h-full w-full relative group" onWheelCapture={handleWheel}>
            {!MAPBOX_TOKEN && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-[100] border-2 border-red-500">
                    <div className="text-center p-4">
                        <p className="text-red-500 font-bold text-lg">⚠️ Missing Mapbox Token</p>
                        <p className="text-slate-600 text-sm mt-2">Please add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local and <span className="font-bold">restart the server</span>.</p>
                    </div>
                </div>
            )}

            <Map
                {...viewState}
                scrollZoom={isCtrlPressed}
                onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
                onMoveEnd={handleMoveEnd}
                onError={(e: mapboxgl.ErrorEvent) => console.error("Mapbox Error:", e)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
                onClick={handleMapClick}
                ref={mapRef}
            >
                {/* Render Markers for ALL properties (No Clustering for now) */}
                {properties.map((p) => {
                    const isSelected = selectedInfo?.id === p.id;
                    const isHovered = hoverInfo?.id === p.id;
                    const isHighlighted = highlightedPropertyId === p.id;

                    // Determine styling based on state
                    const sizeClass = (isSelected || isHighlighted || isHovered) ? "scale-110 z-50" : "scale-100 z-10";
                    const pinColorClass = (isSelected || isHighlighted) ? "bg-slate-900 text-white" : "bg-white text-slate-900 hover:bg-slate-900 hover:text-white";

                    return (
                        <Marker
                            key={p.id}
                            longitude={p.lng}
                            latitude={p.lat}
                            anchor="bottom"
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                setSelectedInfo(p);
                                setHoverInfo(null);
                                mapRef.current?.easeTo({
                                    center: [p.lng, p.lat],
                                    duration: 500,
                                    offset: [0, 100] // Shift map up so popup fits
                                });
                                onMarkerClick(p.id);
                            }}
                        >
                            <div
                                className={`relative cursor-pointer transition-all duration-300 ease-out ${sizeClass}`}
                                onMouseEnter={() => setHoverInfo(p)}
                                onMouseLeave={() => setHoverInfo(null)}
                            >
                                {/* THE MARKER PIN */}
                                <div className={`
                                    flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white 
                                    ${pinColorClass}
                                    transition-colors duration-200
                                `}>
                                    <MapPinIcon className="w-5 h-5" />
                                </div>

                                {/* PRICE TOOLTIP (HOVER ONLY) - Rendered directly here for cleaner look */}
                                {(isHovered && !selectedInfo) && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                        <div className="bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                                            {formatPrice(p.price)}
                                            {/* Tiny Triangle Arrow */}
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                        </div>
                                    </div>
                                )}

                                {/* Highlight Ping */}
                                {isHighlighted && !isSelected && (
                                    <span className="absolute inset-0 -z-10 inline-flex h-full w-full rounded-full bg-teal-500 opacity-75 animate-ping"></span>
                                )}
                            </div>
                        </Marker>
                    );
                })}

                {/* CLICKED POPUP: Horizontal Card Layout */}
                {selectedInfo && (
                    <Popup
                        longitude={selectedInfo.lng}
                        latitude={selectedInfo.lat}
                        offset={45} // Increased offset to clear pin
                        closeButton={false}
                        closeOnClick={false}
                        anchor="bottom"
                        className="!z-[1000] custom-map-popup"
                        maxWidth="none" // Allow custom width
                    >
                        <div className="w-[360px] px-2 py-2 bg-white rounded-xl shadow-xl overflow-hidden font-sans border border-slate-100 flex animate-in fade-in zoom-in-95 duration-200">

                            {/* Left: Image */}
                            <div className="w-[120px] h-[120px] shrink-0 relative bg-slate-100 ">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={selectedInfo.image}
                                    alt={selectedInfo.title}
                                    className="w-full h-full object-cover rounded-xl"
                                />
                                <div className="absolute inset-0 bg-black/5" />
                            </div>

                            {/* Right: Content */}
                            <div className="flex-1 p-3 flex flex-col justify-between relative">

                                {/* Close Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInfo(null);
                                    }}
                                    className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {/* Title & Address */}
                                <div className="pr-6">
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">
                                        {selectedInfo.title}
                                    </h3>
                                </div>

                                {/* Price */}
                                <div className="mt-1">
                                    <p className="text-brand font-bold text-base">
                                        {formatPrice(selectedInfo.price)}/tháng
                                    </p>
                                </div>

                                {/* Stats Row */}
                                <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                                    <div className="flex items-center gap-1.5">
                                        <ArrowsPointingOutIcon className="w-5 h-5 text-slate-500" />
                                        <span>{selectedInfo.area} m²</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Popup>
                )}
            </Map>

            {/* Search as I move Toggle */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2 z-10 transition-transform hover:scale-105">
                <input
                    type="checkbox"
                    id="search-move"
                    checked={searchAsIMove}
                    onChange={e => setSearchAsIMove(e.target.checked)}
                    className="accent-teal-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="search-move" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Tìm khi di chuyển
                </label>
            </div>

            {/* Scroll Zoom Overlay */}
            {showOverlay && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none transition-opacity duration-300">
                    <p className="text-white text-xl font-medium px-6 py-3 bg-black/40 rounded-lg backdrop-blur-md">Giữ Ctrl + lăn chuột để zoom</p>
                </div>
            )}
        </div>
    );
}
