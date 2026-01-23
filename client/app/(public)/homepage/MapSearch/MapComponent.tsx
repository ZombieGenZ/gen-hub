"use client";

import { useRouter } from 'next/navigation';
import React, { useRef, useState, useEffect } from 'react';
import Map, { Marker, MapRef, ViewStateChangeEvent, Popup } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import { Property } from '@/data/mockProperties';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X } from 'lucide-react';
import { ArrowsPointingOutIcon, PaperAirplaneIcon, CubeIcon } from '@heroicons/react/24/solid';
import Supercluster from 'supercluster';

// Constants
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const HO_CHI_MINH_CITY_COORDS = {
    latitude: 10.7769,
    longitude: 106.7009,
    zoom: 12,
} as const;

const CLUSTER_CONFIG = {
    radius: 40,
    maxZoom: 16,
} as const;

const EARTH_RADIUS_KM = 6371;
const AVERAGE_SPEED_KMH = 30;

const OVERLAY_TIMEOUT_MS = 2000;
const POPUP_OFFSET = 45;
const CARD_WIDTH_PX = 360;
const IMAGE_SIZE_PX = 120;

const TRANSPORT_HUBS = [
    { id: 'hub-1', type: 'port', name: 'Cảng Cát Lái', lat: 10.770, lng: 106.780 },
    { id: 'hub-2', type: 'airport', name: 'Sân bay TSN', lat: 10.814, lng: 106.666 },
] as const;

// Interfaces
interface MapComponentProps {
    properties: Property[];
    onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
    highlightedPropertyId?: number | string | null;
    onMarkerClick: (propertyId: number | string) => void;
    variant?: 'search' | 'detail';
    searchTrigger?: number;
}

export default function MapComponent({ properties, onBoundsChange, highlightedPropertyId, onMarkerClick, variant = 'search', searchTrigger }: MapComponentProps) {
    const router = useRouter();
    const mapRef = useRef<MapRef>(null);

    const [isMapLoaded, setIsMapLoaded] = useState(false);

    // Explicit resize to ensure map renders correctly if container size changes
    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.resize();
        }
    }, []);

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

    // --- SUPERCLUSTER SETUP ---
    const [clusters, setClusters] = useState<any[]>([]);
    const superclusterRef = useRef<Supercluster>(new Supercluster({
        radius: 40, // Cluster radius in pixels
        maxZoom: 16 // Max zoom to cluster points on
    }));

    // 1. Load points into Supercluster
    useEffect(() => {
        const points = properties.map(p => ({
            type: 'Feature' as const,
            properties: { cluster: false, propertyId: p.id, ...p },
            geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] }
        }));
        superclusterRef.current.load(points);
        // Force update immediately
        if (mapRef.current && isMapLoaded) {
            const bounds = mapRef.current.getBounds();
            if (bounds) {
                const zoom = mapRef.current.getZoom();
                const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [number, number, number, number];
                setClusters(superclusterRef.current.getClusters(bbox, Math.round(zoom)));
            }
        }
    }, [properties, isMapLoaded]);

    // 2. Update clusters on map move
    useEffect(() => {
        const update = () => {
            if (!mapRef.current || !isMapLoaded) return;
            const bounds = mapRef.current.getBounds();
            if (!bounds) return;

            const zoom = mapRef.current.getZoom();
            const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [number, number, number, number];

            // Get clusters
            const results = superclusterRef.current.getClusters(bbox, Math.round(zoom));
            setClusters(results);
        };

        update();
        // Debounce? For now direct call is usually fine for smooth UI
    }, [viewState, isMapLoaded]);
    // ---------------------------

    // Auto-Fit Bounds on Search Trigger
    useEffect(() => {
        if (!searchTrigger || !isMapLoaded || properties.length === 0 || !mapRef.current) return;

        const lats = properties.map(p => p.lat);
        const lngs = properties.map(p => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        // Fit bounds with some padding
        mapRef.current.fitBounds(
            [[minLng, minLat], [maxLng, maxLat]],
            { padding: 80, duration: 1000 }
        );
    }, [searchTrigger, isMapLoaded]); // Only trigger when explicit search happens (searchTrigger changes) or map loads

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
        // Only trigger search if move was initiated by user (avoids loop with fitBounds)
        if (searchAsIMove && mapRef.current && (evt as any).originalEvent) {
            const bounds = mapRef.current.getBounds();
            if (bounds) {
                onBoundsChange?.({
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
            // Only clear in search mode to keep context in detail mode
            if (variant === 'search') {
                setSelectedInfo(null);
            }
        }
    };

    // Auto-select in detail mode
    useEffect(() => {
        if (variant === 'detail' && properties.length > 0) {
            setSelectedInfo(properties[0]);
            // Also center map on it
            setViewState(prev => ({
                ...prev,
                latitude: properties[0].lat,
                longitude: properties[0].lng,
                zoom: 13
            }));
        }
    }, [variant, properties]);

    // 3. Handle Connectivity Lines & Markers (Imperative)
    const hubMarkersRef = useRef<mapboxgl.Marker[]>([]);

    useEffect(() => {
        // Access the native Mapbox instance via getMap()
        const map = mapRef.current?.getMap();
        if (!map) return;

        // Function to update or add layers
        const updateLayers = () => {
            if (!map.getStyle()) return; // Map style not loaded yet

            // --- 1. LINES REMOVED (User request: highlight đường đến không dùng line) ---
            // We rely on the Markers and Overlay Card to show context.
            if (map.getLayer('route-line')) map.removeLayer('route-line');
            if (map.getSource('connectivity-lines')) map.removeSource('connectivity-lines');

            // --- 2. MARKERS RE-ADDED (User request: giữ Hub markers) ---
            // Clear existing markers
            hubMarkersRef.current.forEach(marker => marker.remove());
            hubMarkersRef.current = [];

            if (variant === 'detail' && selectedInfo) {
                TRANSPORT_HUBS.forEach(hub => {
                    // Calculate distance inline using Haversine formula
                    const dLat = (hub.lat - selectedInfo.lat) * (Math.PI / 180);
                    const dLon = (hub.lng - selectedInfo.lng) * (Math.PI / 180);
                    const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(selectedInfo.lat * (Math.PI / 180)) * Math.cos(hub.lat * (Math.PI / 180)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const distance = EARTH_RADIUS_KM * c;

                    // SVG Icons as strings
                    const portIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`;
                    const planeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`;

                    const iconSvg = hub.type === 'port' ? portIcon : planeIcon;
                    const markerElement = document.createElement('div');
                    markerElement.className = 'flex flex-col items-center relative';
                    markerElement.style.cssText = 'width: 32px; height: 32px;';
                    markerElement.innerHTML = `
                        <div class="${hub.type === 'port' ? 'text-blue-600' : 'text-sky-500'} relative drop-shadow-md flex justify-center items-center w-8 h-8">
                            ${iconSvg}
                        </div>
                        <div class="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap border border-slate-200">
                            ${hub.name} (${distance.toFixed(1)} km)
                        </div>
                    `;

                    const marker = new mapboxgl.Marker({ element: markerElement, anchor: 'bottom' })
                        .setLngLat([hub.lng, hub.lat])
                        .addTo(map);

                    hubMarkersRef.current.push(marker);
                });
            }
        };

        // Try updating immediately
        if (map.isStyleLoaded()) {
            updateLayers();
        } else {
            map.once('style.load', updateLayers);
        }

    }, [variant, selectedInfo]);

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
                onLoad={() => {
                    if (mapRef.current) {
                        // Resizing is often needed when map mounts in previously hidden container
                        mapRef.current.resize();
                        setIsMapLoaded(true);

                        // Initial Cluster Load
                        const bounds = mapRef.current.getBounds();
                        if (bounds) {
                            const zoom = mapRef.current.getZoom();
                            const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [number, number, number, number];
                            setClusters(superclusterRef.current.getClusters(bbox, Math.round(zoom)));
                        }
                    }
                }}
            >
                {/* Render CLUSTERS and MARKERS */}
                {clusters.map((cluster) => {
                    const [lng, lat] = cluster.geometry.coordinates;
                    const { cluster: isCluster, point_count: pointCount } = cluster.properties;

                    if (isCluster) {
                        return (
                            <Marker
                                key={`cluster-${cluster.id}`}
                                longitude={lng}
                                latitude={lat}
                            >
                                <div
                                    className="flex items-center justify-center bg-[#0F766E] text-white rounded-full shadow-xl border-2 border-white cursor-pointer hover:scale-110 transition-transform hover:bg-[#0D655D]"
                                    style={{
                                        width: `${32 + (pointCount > 99 ? 20 : pointCount > 10 ? 10 : 0)}px`,
                                        height: `${32 + (pointCount > 99 ? 20 : pointCount > 10 ? 10 : 0)}px`
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const expansionZoom = Math.min(
                                            superclusterRef.current.getClusterExpansionZoom(cluster.id),
                                            20
                                        );

                                        mapRef.current?.easeTo({
                                            center: [lng, lat],
                                            zoom: expansionZoom,
                                            duration: 500
                                        });
                                    }}
                                >
                                    <span className="font-bold text-xs">{pointCount > 99 ? '99+' : pointCount}</span>
                                </div>
                            </Marker>
                        );
                    }

                    // --- LEAF NODE (Individual Property) ---
                    const p = cluster.properties; // Contains all original P data
                    const isSelected = selectedInfo?.id === p.id;
                    const isHovered = hoverInfo?.id === p.id;
                    const isHighlighted = highlightedPropertyId === p.id;

                    // Airbnb-style badge styling
                    const badgeBaseClass = "px-2.5 py-1.5 rounded-full font-semibold text-sm shadow-lg border transition-all duration-200 cursor-pointer select-none";
                    const badgeColorClass = (isSelected || isHighlighted)
                        ? "bg-slate-900 text-white border-slate-900 scale-110"
                        : (isHovered
                            ? "bg-slate-900 text-white border-slate-900 scale-105"
                            : "bg-white text-slate-900 border-slate-300 hover:border-slate-900 hover:scale-105");

                    return (
                        <Marker
                            key={`leaf-${p.id}`}
                            longitude={lng}
                            latitude={lat}
                            anchor="center"
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                setSelectedInfo(p);
                                setHoverInfo(null);
                                mapRef.current?.easeTo({
                                    center: [lng, lat],
                                    duration: 500,
                                    offset: [0, 100]
                                });
                                onMarkerClick(p.id);
                            }}
                        >
                            <div
                                className={`relative ${badgeBaseClass} ${badgeColorClass}`}
                                onMouseEnter={() => setHoverInfo(p)}
                                onMouseLeave={() => setHoverInfo(null)}
                            >
                                {formatPrice(p.price)}

                                {/* Highlight Ping */}
                                {isHighlighted && !isSelected && (
                                    <span className="absolute inset-0 -z-10 inline-flex h-full w-full rounded-full bg-teal-500 opacity-75 animate-ping"></span>
                                )}
                            </div>
                        </Marker>
                    );
                })}

                {/* CLICKED POPUP: Horizontal Card Layout - ONLY IN SEARCH MODE */}
                {selectedInfo && variant !== 'detail' && (
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
                        <div
                            className="w-[360px] px-2 py-2 bg-white rounded-xl shadow-xl overflow-hidden font-sans border border-slate-100 flex animate-in fade-in zoom-in-95 duration-200 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => router.push(`/kho-bai/${selectedInfo.id}`)}
                        >

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

            {/* Search as I move Toggle - ONLY IN SEARCH MODE */}
            {variant === 'search' && (
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
            )}

            {/* Scroll Zoom Overlay */}
            {showOverlay && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none transition-opacity duration-300">
                    <p className="text-white text-xl font-medium px-6 py-3 bg-black/40 rounded-lg backdrop-blur-md">Giữ Ctrl + lăn chuột để zoom</p>
                </div>
            )}
            {/* Context Layers for Detail View */}
            {variant === 'detail' && selectedInfo && (
                <>
                </>
            )}

            {/* FLOATING DISTANCE PANEL (Detail Mode Only) */}
            {(variant === 'detail' && selectedInfo) && (
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur shadow-xl rounded-xl border border-slate-200 p-4 z-50 max-w-[280px] animate-in slide-in-from-left duration-300">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Trọng điểm</h4>
                    <div className="space-y-3">
                        {/* Use Helper inside render if component state allows, but here we can recalc or reuse logic */}
                        {[
                            { name: 'Cảng Cát Lái', lat: 10.770, lng: 106.780, type: 'port', icon: CubeIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { name: 'Sân bay TSN', lat: 10.814, lng: 106.666, type: 'airport', icon: PaperAirplaneIcon, color: 'text-sky-600', bg: 'bg-sky-50' }
                        ].map(hub => {
                            // Haversine calc (inline for now as helper is inside effect scope - ideally move outside)
                            const R = 6371;
                            const dLat = (hub.lat - selectedInfo.lat) * (Math.PI / 180);
                            const dLon = (hub.lng - selectedInfo.lng) * (Math.PI / 180);
                            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                Math.cos(selectedInfo.lat * (Math.PI / 180)) * Math.cos(hub.lat * (Math.PI / 180)) *
                                Math.sin(dLon / 2) * Math.sin(dLon / 2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            const dist = R * c;
                            const time = Math.round((dist / 30) * 60); // 30km/h avg speed

                            return (
                                <div key={hub.name} className="flex items-center justify-between group cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg ${hub.bg} flex items-center justify-center ${hub.color}`}>
                                            <hub.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{hub.name}</p>
                                            <p className="text-xs text-slate-500">{hub.type === 'port' ? 'Cửa ngõ xuất khẩu' : 'Vận chuyển hàng không'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-900 text-sm">{dist.toFixed(1)} km</p>
                                        <p className={`text-xs font-medium ${dist < 10 ? 'text-green-600' : 'text-orange-600'}`}>{time} phút</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
}
