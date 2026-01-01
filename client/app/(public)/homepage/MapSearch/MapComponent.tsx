"use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
import Map, { Marker, Source, Layer, MapRef, ViewStateChangeEvent, Popup } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import { Property } from '@/data/mockProperties';
import { clusterLayer, clusterCountLayer, unclusteredPointLayer } from './map-style';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapComponentProps {
    properties: Property[];
    onBoundsChange: (bounds: { north: number; south: number; east: number; west: number }) => void;
    highlightedPropertyId: number | null;
    onMarkerClick: (propertyId: number) => void;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapComponent({ properties, onBoundsChange, highlightedPropertyId, onMarkerClick }: MapComponentProps) {
    const mapRef = useRef<MapRef>(null);
    const [popupInfo, setPopupInfo] = useState<Property | null>(null);

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

    const geojson = useMemo(() => {
        return {
            type: 'FeatureCollection',
            features: properties.map((p) => ({
                type: 'Feature',
                properties: {
                    id: p.id,
                    price: p.price,
                    currency: p.currency,
                    type: p.type,
                    cluster: false,
                },
                geometry: {
                    type: 'Point',
                    coordinates: [p.lng, p.lat]
                }
            }))
        };
    }, [properties]);

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

    const onClick = (event: mapboxgl.MapLayerMouseEvent) => {
        if (!mapRef.current) return;
        const feature = event.features?.[0];
        if (!feature) return;

        const clusterId = feature.properties?.cluster_id;
        const mapboxSource = mapRef.current.getSource('properties') as mapboxgl.GeoJSONSource;

        if (clusterId) {
            mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err || zoom === null || zoom === undefined) return;
                mapRef.current?.easeTo({
                    center: (feature.geometry as any).coordinates,
                    zoom: zoom,
                    duration: 500
                });
            });
        } else {
            // Handle click on unclustered point
            const coordinates = (feature.geometry as any).coordinates.slice();
            const id = feature.properties?.id;

            // Auto focus/center on the clicked pin
            mapRef.current?.easeTo({
                center: coordinates,
                duration: 500,
                // zoom: 14 // Optional: zoom in if needed, but keeping current zoom is usually better context
            });

            if (id && onMarkerClick) {
                onMarkerClick(id);
            }
        }
    };

    // Helper to format price
    const formatPrice = (price: number) => {
        if (price >= 1000000000) return `${(price / 1000000000).toFixed(1)}Tỷ`;
        if (price >= 1000000) return `${(price / 1000000).toFixed(0)} Triệu`;
        return `${price}`;
    };

    // To implement "Price on Marker" with Mapbox GL Layers only (performant):
    // 1. Add "formatted_price" to properties in GeoJSON.
    // 2. Use 'text-field': ['get', 'formatted_price'] in the symbol layer.

    // However, the user wants "Custom Markers: Display price ... on icon ... Hover: Bounce".
    // "Bounce" animation is hard with GL Layers. 
    // React Markers are much better for "Bounce" and "Hover" interaction.
    // Given the number of items (real estate search usually paginates or limits to ~50-100), 
    // using **React Markers** for *everything* including clusters is often acceptable and easier for "Custom UI".
    // I will implement client-side clustering using `supercluster` which is a standard companion to `react-map-gl`? 
    // I didn't install `supercluster` and `use-supercluster`. 
    // I will assume for now that I can just use `react-map-gl` Markers for the raw properties if the count is low, 
    // OR just simple `Source` clustering for the *Circles* and standard GL styles. 
    // I'll try to use React Markers for *individual* properties and only use GL clustering for the *groups*?
    // Unclustered points in the Source will be hidden?

    // Actually, `react-map-gl` documentation examples often show using `Source` and `Layer` for clusters, 
    // and using `filter: ['!', ['has', 'point_count']]` for the unclustered layer.

    // Let's just use React Markers for the 10-20 items mock data. 
    // I'll skip clustering *implementation details* (complex supercluster) for this first step and focus on the Price Markers.
    // I will add a TODO for clustering or use a simple `react-map-gl` trick if available.
    // Wait, the prompt requirements explicitly asked for "Clustering".
    // I will try to use the `Source` native clustering and render clusters as Layers.
    // Then I will render the *Unclustered* points as detailed React Markers? 
    // No, you can't easily mix "Source handles clustering" and "React renders unclustered markers" because Source logic is inside the Mapbox engine.

    // OK, I will use `npm install supercluster use-supercluster` to do it the "React Way".
    // Wait, I cannot install more packages without asking?
    // "Propose a command...". I can auto-run safe commands.
    // I'll stick to `mapbox-gl` native clustering features with `Layer` styling.
    // It's powerful enough to show "Price" using `text-field` and "Circle" for background.

    // I'll create `map-style.ts` for the layer definitions.

    const geoJsonSource: any = {
        type: 'FeatureCollection',
        features: properties.map(p => ({
            type: 'Feature',
            properties: {
                id: p.id,
                price: formatPrice(p.price),
                full_price: p.price,
                selected: p.id === highlightedPropertyId
            },
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
        }))
    };

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
                interactiveLayerIds={[clusterLayer.id!, unclusteredPointLayer.id!]}
                onClick={onClick}
                onMouseEnter={(e: mapboxgl.MapLayerMouseEvent) => {
                    // Disable hover popup on touch devices/mobile checks usually done via width
                    if (window.innerWidth < 768) return;

                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                        timeoutRef.current = null;
                    }
                    const feature = e.features?.[0];
                    if (feature && feature.properties?.cluster_id === undefined) {
                        const id = feature.properties?.id;
                        const p = properties.find(prop => prop.id === id);
                        if (p) setPopupInfo(p);
                    }
                }}
                onMouseLeave={() => {
                    // Disable hover popup logic on mobile
                    if (window.innerWidth < 768) return;

                    timeoutRef.current = setTimeout(() => {
                        setPopupInfo(null);
                    }, 150);
                }}
                ref={mapRef}
                cursor={popupInfo ? 'pointer' : 'auto'}
            >
                <Source
                    id="properties"
                    type="geojson"
                    data={geoJsonSource}
                    cluster={true}
                    clusterMaxZoom={14}
                    clusterRadius={50}
                >
                    <Layer {...clusterLayer} />
                    <Layer {...clusterCountLayer} />
                    <Layer {...unclusteredPointLayer} />
                </Source>

                {/* Popup (Responsive) */}
                {popupInfo && (
                    <Popup
                        longitude={popupInfo.lng}
                        latitude={popupInfo.lat}
                        offset={15}
                        closeButton={false}
                        closeOnClick={false}
                        anchor="bottom"
                        className="!z-[9999] custom-map-popup"
                        maxWidth="450px"
                    >
                        <div
                            className="w-[280px] xs:w-[300px] md:w-[420px] bg-white rounded-lg shadow-xl overflow-hidden font-sans border border-slate-200 flex flex-col md:flex-row relative h-auto md:h-[160px]"
                            onMouseEnter={() => {
                                if (timeoutRef.current) {
                                    clearTimeout(timeoutRef.current);
                                    timeoutRef.current = null;
                                }
                            }}
                            onMouseLeave={() => {
                                // Only auto-close on hover for desktop
                                if (window.innerWidth >= 768) {
                                    timeoutRef.current = setTimeout(() => {
                                        setPopupInfo(null);
                                    }, 150);
                                }
                            }}
                        >
                            {/* Close Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPopupInfo(null);
                                }}
                                className="absolute top-2 right-2 text-white md:text-slate-400 md:hover:text-slate-600 z-10 p-1 bg-black/20 md:bg-transparent rounded-full"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Image Section */}
                            <div className="w-full h-[140px] md:w-[140px] md:h-full relative bg-slate-100 shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={popupInfo.image}
                                    alt={popupInfo.title}
                                    className="w-full h-full object-cover"
                                />
                                {/* Mobile Badge Overlay */}
                                <div className="absolute top-2 left-2 md:hidden">
                                    <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-[10px] font-bold text-slate-800 shadow-sm border border-slate-100">{popupInfo.type}</span>
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 p-3 flex flex-col justify-between min-w-0 gap-2 md:gap-0">
                                {/* Title */}
                                <div>
                                    <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 md:pr-6">
                                        {popupInfo.title}
                                    </h3>
                                </div>

                                {/* Price & Area Row */}
                                <div className="flex items-end justify-between mt-1">
                                    <div>
                                        <div className="text-blue-600 font-bold text-lg leading-none">
                                            {formatPrice(popupInfo.price)}
                                        </div>
                                        <div className="text-slate-400 text-xs mt-0.5">
                                            {(popupInfo.price / 1000000).toFixed(1)} Tr/m2
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-slate-700 font-bold text-base leading-none">
                                            {popupInfo.area} m²
                                        </div>
                                        <div className="text-slate-400 text-[10px] uppercase font-medium mt-0.5">
                                            {/* Simulate Year/Rooms */}
                                            Năm 2024
                                        </div>
                                    </div>
                                </div>

                                {/* Address / Extra Info */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <span className="text-[10px] text-blue-500 font-medium uppercase">
                                            Vừa xong
                                        </span>
                                    </div>

                                    {/* Action Dots */}
                                    <div className="flex gap-0.5 text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Popup>
                )}

                {/* Highlighted Marker (Bounce Effect for List Hover) using React Marker for animation */}
                {highlightedPropertyId && (() => {
                    const p = properties.find(p => p.id === highlightedPropertyId);
                    if (p && p.id !== popupInfo?.id) { // Don't show if popup is open for same item to avoid double rendering issues
                        return (
                            <Marker longitude={p.lng} latitude={p.lat} anchor="bottom">
                                <span className="relative flex h-6 w-6">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0F766E] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-6 w-6 bg-[#0F766E] border-2 border-white"></span>
                                </span>
                            </Marker>
                        );
                    }
                    return null;
                })()}

            </Map>

            {/* Search as I move Toggle */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-md flex items-center gap-2 z-10">
                <input
                    type="checkbox"
                    id="search-move"
                    checked={searchAsIMove}
                    onChange={e => setSearchAsIMove(e.target.checked)}
                    className="accent-[#0F766E]"
                />
                <label htmlFor="search-move" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    Tìm khi di chuyển
                </label>
            </div>

            {/* Scroll Zoom Overlay */}
            {showOverlay && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none transition-opacity duration-300">
                    <p className="text-white text-2xl font-bold px-4 text-center drop-shadow-sm">Sử dụng ctrl + cuộn để thu phóng bản đồ</p>
                </div>
            )}
        </div>
    );
}
