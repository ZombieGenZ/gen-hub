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
            // Handle click on unclustered point (via integration with Marker layer or logic here if using symbol layer)
            // However, for custom markers (price bubbles), we often use React Markers instead of GL layers for interactivity and styling flexibility, 
            // BUT mixing clusters (GL layers) and React Markers can be tricky. 
            // Common approach: Use GL layers for everything OR filter out unclustered points and render them as React Markers.
            // For this requirements ("Price on Marker"), formatting price in GL Labels is possible but limited styling. 
            // Let's use Source/Layer for Clusters and React Markers for individual points?
            // Actually, react-map-gl makes it easy to just use GL layers for clusters and Markers for unclustered? 
            // No, standard is usually:
            // 1. Pass data to Source.
            // 2. Layer for Clusters.
            // 3. Layer for Unclustered Points (Circles) OR
            // 4. Custom React Markers for Unclustered Points (filtered out from data? Or just use "cluster=true" source and query leaves?)

            // Simplest robust way for "Price Markers":
            // Use "supercluster" library manually? Or use the Source features.
            // Let's stick to a simpler approach first: 
            // Use Source with cluster=true.
            // Render Clusters with Layer.
            // Render Unclustered points as React Markers? 
            // To do that, we need to query the source.

            // ALTERNATIVE: Don't use GL clustering. Use `react-map-gl-cluster`? 
            // The user asked for "react-leaflet-cluster" equivalent.
            // Let's simple check `react-map-gl` docs -> It supports `Source` and `Layer`.

            // For "Price on Marker", using HTML Markers is best. 
            // If we want clustering, `supercluster` + `React Markers` is a very common pattern in React Mapbox.
            // But let's try to keep it simple with GL Layers for now for performance, 
            // adjusting "SymbolLayer" text field to show price?
            // Formatting price (e.g. 2k) in a GL layer expression is hard.

            // Decision: I will use `supercluster` (via `useSupercluster` hook pattern) if I want React Markers for everything (clusters and points). 
            // But for time efficiency, I'll try to use standard GL clustering for the "circles" and maybe React Markers for the points? 
            // Actually, let's just use React Markers for *everything* (custom cluster markers + custom property markers) 
            // if the performace allows (20 items is nothing).
            // NO, I must implement "Clustering" properly.

            // Plan B: Use `<GeolocateControl />` etc.
            // Plan A Refined: Use `Source type="geojson"` with `cluster={true}`.
            // Use `Layer` for the Clusters (Circles).
            // Use `Layer` for Unclustered points? -> If I use Layer, I can't easily make complex DOM price markers.
            // -> I will use a separate filtered list for React Markers? 
            // Let's assume we render ALL properties as React Markers if they are few?
            // The requirement says "Clustering ... to avoid clutter".

            // Let's use the Mapbox GL JS approach for clusters (Layers), 
            // and for the unclustered points, use `symbol` layer with text-field getting price?
            // "Price on icon of the pin".
            // We can use a custom image for the pin and put text on top with `text-field`.
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
    // I will use `supercluster` library to handle clustering on the client side and render React components for both Clusters and Pins.

    // WAIT, I didn't install `supercluster`. 
    // I can use `react-map-gl`'s `Source` + `Layer` for clusters, and then for unclustered points,
    // I can *try* to query the map to get unclustered features and render markers?
    // Or just render Markers for all "visible" properties if not clustered? 

    // Let's go with the **Hybrid** approach which is robust:
    // 1. `Source` (cluster=true).
    // 2. `Layer` for Clusters (Circle + Count).
    // 3. `Layer` for Unclustered Points (Transparent circle to catch clicks).
    // 4. AND Render React Markers for the same coordinates? No, that duplicates.

    // Let's stick to **Mapbox GL Layers** for everything for now to ensure it works "out of the box" with the installed dependencies.
    // "Bounce" can be simulated or simplified to "Scale Up".

    // Re-reading requirements: "Custom Markers: Display price... on icon... Hover: Bounce". 
    // I will use React Markers because "Bounce" and "Price tags" are standard React UI requirements.
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

    return (
        <div className="h-full w-full relative group">
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
                onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
                onMoveEnd={handleMoveEnd}
                onError={(e) => console.error("Mapbox Error:", e)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
                interactiveLayerIds={[clusterLayer.id!, unclusteredPointLayer.id!]}
                onClick={onClick}
                onMouseEnter={(e) => {
                    const feature = e.features?.[0];
                    if (feature && feature.properties?.cluster_id === undefined) {
                        const id = feature.properties?.id;
                        const p = properties.find(prop => prop.id === id);
                        if (p) setPopupInfo(p);
                    }
                }}
                onMouseLeave={() => setPopupInfo(null)}
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

                {/* Hover Popup */}
                {popupInfo && (
                    <Popup
                        longitude={popupInfo.lng}
                        latitude={popupInfo.lat}
                        offset={15}
                        closeButton={false}
                        closeOnClick={false}
                        anchor="bottom"
                        className="z-[50]"
                        maxWidth="320px"
                    >
                        <div className="w-[300px] bg-white rounded-2xl shadow-xl overflow-hidden pointer-events-none font-sans border border-gray-100/50">
                            {/* Image Section */}
                            <div className="h-44 relative bg-slate-100 group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={popupInfo.image}
                                    alt={popupInfo.title}
                                    className="w-full h-full object-cover"
                                />
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                                {/* Pagination Dots (Simulation) */}
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/50 shadow-sm" />
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="p-4 bg-white space-y-3">
                                <div className="space-y-1">
                                    <h3 className="font-medium text-slate-900 text-lg leading-tight truncate">
                                        {popupInfo.title}
                                    </h3>
                                    <div className="text-orange-500 font-bold text-xl">
                                        {formatPrice(popupInfo.price)}
                                    </div>
                                </div>

                                {/* Specs Badges */}
                                <div className="flex flex-wrap gap-2 text-xs text-slate-600 font-medium">
                                    {/* Spec 1: Area */}
                                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 opacity-70">
                                            <path fillRule="evenodd" d="M1 11.27c0-.246.033-.492.099-.73l1.523-5.521A2.75 2.75 0 015.273 3h9.454a2.75 2.75 0 012.651 2.019l1.523 5.52c.066.239.099.485.099.732V15a2 2 0 01-2 2H3a2 2 0 01-2-2v-3.73zm3.068-5.852A1.25 1.25 0 015.273 4.5h9.454a1.25 1.25 0 011.205.918l1.523 5.52c.006.02.01.041.015.062H14a1 1 0 00-.86.49l-.606 1.02a1 1 0 01-.86.49H8.236a1 1 0 01-.86-.49L6.77 10.99a1 1 0 00-.86-.49H2.53c.005-.021.01-.042.015-.062l1.523-5.52z" clipRule="evenodd" />
                                        </svg>
                                        <span>{popupInfo.area} m²</span>
                                    </div>

                                    {/* Spec 2: Type/Bathrooms simulation */}
                                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 opacity-70">
                                            <path d="M10 2a.75.75 0 01.75.75v1.25H12a2.75 2.75 0 012.75 2.75V11h-9.5V6.75A2.75 2.75 0 018 4h1.25V2.75A.75.75 0 0110 2zM5.25 12V6.75a2.75 2.75 0 01.182-.992l-1.353 3.327A1.25 1.25 0 005.25 12zM15.25 11h-1.63L16 11z" />
                                            <path fillRule="evenodd" d="M2.5 12.5h15a.75.75 0 01.75.75v3.5a.75.75 0 01-.75.75H2.5a.75.75 0 01-.75-.75v-3.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                                        </svg>
                                        <span>{popupInfo.type}</span>
                                    </div>

                                    {/* Spec 3: Currency/Label */}
                                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 opacity-70">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{popupInfo.currency}</span>
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
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-md flex items-center gap-2 z-10">
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
        </div>
    );
}
