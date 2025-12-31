"use client";

import React, { useRef, useMemo } from 'react';
import Map, { Source, Layer, MapRef, ViewStateChangeEvent, Popup } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import { Property } from '@/data/mockProperties';
import { clusterLayer, clusterCountLayer, unclusteredPointLayer } from '@/app/(public)/homepage/MapSearch/map-style';
import 'mapbox-gl/dist/mapbox-gl.css';

interface SearchMapProps {
    properties: Property[];
    selectedPropertyId: number | null;
    onSelectProperty: (property: Property | null) => void;
    viewState: { latitude: number; longitude: number; zoom: number };
    onViewStateChange: (viewState: { latitude: number; longitude: number; zoom: number }) => void;
    className?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function SearchMap({
    properties,
    selectedPropertyId,
    onSelectProperty,
    viewState,
    onViewStateChange,
    className
}: SearchMapProps) {
    const mapRef = useRef<MapRef>(null);

    const geoJsonSource: any = useMemo(() => ({
        type: 'FeatureCollection',
        features: properties.map(p => ({
            type: 'Feature',
            properties: {
                id: p.id,
                price: p.price,
                // ...other props if needed for logic
            },
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
        }))
    }), [properties]);

    const selectedProperty = useMemo(() =>
        properties.find(p => p.id === selectedPropertyId),
        [properties, selectedPropertyId]);

    const onClick = (event: mapboxgl.MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature) {
            // Clicked on empty map -> deselect
            onSelectProperty(null);
            return;
        }

        const clusterId = feature.properties?.cluster_id;
        if (clusterId && mapRef.current) {
            const mapboxSource = mapRef.current.getSource('properties') as mapboxgl.GeoJSONSource;
            mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err || zoom === null || zoom === undefined) return;
                mapRef.current?.easeTo({
                    center: (feature.geometry as any).coordinates,
                    zoom: zoom,
                    duration: 500
                });
            });
        } else {
            // Clicked on a property point
            const id = feature.properties?.id;
            const p = properties.find(prop => prop.id === id);
            if (p) onSelectProperty(p);
        }
    };

    const handleMouseEnter = (e: mapboxgl.MapLayerMouseEvent) => {
        if (e.features?.length) {
            // mapRef.current.getCanvas().style.cursor = 'pointer';
        }
    };

    const [showZoomHint, setShowZoomHint] = React.useState(false);
    const [isCtrlPressed, setIsCtrlPressed] = React.useState(false);
    const zoomHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control' || e.key === 'Meta') {
                setIsCtrlPressed(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control' || e.key === 'Meta') {
                setIsCtrlPressed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleWheelCapture = (e: React.WheelEvent) => {
        if (!isCtrlPressed) {
            // If user scrolls without Ctrl, show hint and DO NOT stop propagation (let Mapbox ignore it via scrollZoom=false)
            // Actually, if we don't stop it, the page effectively scrolls? 
            // Mapbox usually prevents default if it captures it. But if scrollZoom=false, Mapbox ignores it.
            // We want to show the hint.

            setShowZoomHint(true);

            if (zoomHintTimeoutRef.current) {
                clearTimeout(zoomHintTimeoutRef.current);
            }
            zoomHintTimeoutRef.current = setTimeout(() => {
                setShowZoomHint(false);
            }, 2000);
        } else {
            setShowZoomHint(false);
        }
    };

    return (
        <div
            className={`relative w-full h-full ${className}`}
            onWheelCapture={handleWheelCapture}
        >
            {!MAPBOX_TOKEN && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-[100] border-2 border-red-500">
                    <div className="text-center p-4">
                        <p className="text-red-500 font-bold">⚠️ Missing Mapbox Token</p>
                    </div>
                </div>
            )}

            {/* Cooperative Gestures Hint Overlay */}
            {showZoomHint && (
                <div className="absolute inset-0 bg-black/70 z-[60] flex items-center justify-center pointer-events-none transition-opacity duration-300 animate-in fade-in">
                    <p className="text-white text-2xl font-bold">
                        Sử dụng ctrl + cuộn để thu phóng bản đồ
                    </p>
                </div>
            )}

            <Map
                {...viewState}
                onMove={(evt: ViewStateChangeEvent) => onViewStateChange(evt.viewState)}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
                interactiveLayerIds={[clusterLayer.id!, unclusteredPointLayer.id!]}
                onClick={onClick}
                onMouseEnter={handleMouseEnter}
                cursor={selectedProperty ? 'default' : 'pointer'}
                ref={mapRef}
                padding={{ top: 50, bottom: 50, left: 50, right: 50 }}
                scrollZoom={isCtrlPressed}
                dragPan={true}
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

                {/* Desktop Popup */}
                {selectedProperty && (
                    <Popup
                        longitude={selectedProperty.lng}
                        latitude={selectedProperty.lat}
                        offset={15}
                        closeButton={false}
                        closeOnClick={false}
                        onClose={() => onSelectProperty(null)}
                        anchor="bottom"
                        maxWidth="320px"
                        className="custom-map-popup hidden md:block" // Hidden on mobile
                    >
                        <div className="w-[300px] bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
                            <div className="h-40 relative bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={selectedProperty.image}
                                    alt={selectedProperty.title}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    className="absolute top-2 right-2 bg-white/80 p-1 rounded-full hover:bg-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectProperty(null);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-3">
                                <h4 className="font-bold text-slate-800 truncate">{selectedProperty.title}</h4>
                                <div className="text-blue-600 font-bold">
                                    {selectedProperty.price >= 1000000000
                                        ? `${(selectedProperty.price / 1000000000).toFixed(1)} Tỷ`
                                        : `${(selectedProperty.price / 1000000).toFixed(0)} Triệu`}
                                </div>
                                <p className="text-xs text-slate-500 truncate">{selectedProperty.address}</p>
                            </div>
                        </div>
                    </Popup>
                )}
            </Map>
        </div>
    );
}
