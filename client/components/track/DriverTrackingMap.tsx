"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface DriverTrackingMapProps {
    warehouseLat: number;
    warehouseLng: number;
    warehouseName: string;
    driverLat: number | null;
    driverLng: number | null;
    deliveryLat?: number | null;
    deliveryLng?: number | null;
    deliveryAddress?: string | null;
    className?: string;
    recenterOffset?: string;
}

interface RouteGeometry {
    type: "LineString";
    coordinates: [number, number][];
}

async function fetchRoute(
    fromLng: number,
    fromLat: number,
    toLng: number,
    toLat: number,
    token: string,
): Promise<RouteGeometry | null> {
    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json() as { routes?: { geometry: RouteGeometry }[] };
        return data.routes?.[0]?.geometry ?? null;
    } catch {
        return null;
    }
}

export function DriverTrackingMap({
    warehouseLat,
    warehouseLng,
    warehouseName,
    driverLat,
    driverLng,
    deliveryLat,
    deliveryLng,
    deliveryAddress,
    className,
    recenterOffset,
}: DriverTrackingMapProps) {
    const mapRef = useRef<MapRef>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const hasFittedRef = useRef(false);
    const [routeGeo, setRouteGeo] = useState<RouteGeometry | null>(null);

    // Fetch route warehouse → delivery once when delivery coords available
    useEffect(() => {
        if (!MAPBOX_TOKEN || !deliveryLat || !deliveryLng) return;
        void fetchRoute(warehouseLng, warehouseLat, deliveryLng, deliveryLat, MAPBOX_TOKEN).then(setRouteGeo);
    }, [warehouseLat, warehouseLng, deliveryLat, deliveryLng]);

    // First time we have driver position: fit bounds to show all markers
    useEffect(() => {
        if (hasFittedRef.current) return;
        if (driverLat === null || driverLng === null) return;
        const map = mapRef.current;
        if (!map) return;

        hasFittedRef.current = true;
        const lats = [driverLat, warehouseLat, deliveryLat].filter((v): v is number => v != null);
        const lngs = [driverLng, warehouseLng, deliveryLng].filter((v): v is number => v != null);

        map.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 80, maxZoom: 15, duration: 900 },
        );
        setTimeout(() => setIsFollowing(true), 1000);
    }, [driverLat, driverLng, warehouseLat, warehouseLng, deliveryLat, deliveryLng]);

    // Auto-follow driver position
    useEffect(() => {
        if (!isFollowing) return;
        if (driverLat === null || driverLng === null) return;
        mapRef.current?.flyTo({
            center: [driverLng, driverLat],
            zoom: 15,
            duration: 500,
            essential: true,
        });
    }, [driverLat, driverLng, isFollowing]);

    const handleDragStart = useCallback(() => setIsFollowing(false), []);
    const handleRecenter = useCallback(() => setIsFollowing(true), []);

    if (!MAPBOX_TOKEN) {
        return (
            <div className="h-44 rounded-xl border flex items-center justify-center bg-muted/30 text-xs text-muted-foreground">
                Chưa cấu hình bản đồ
            </div>
        );
    }

    return (
        <div className={className ?? "relative h-44 rounded-xl overflow-hidden border shadow-sm"}>
            <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{
                    latitude: warehouseLat,
                    longitude: warehouseLng,
                    zoom: 13,
                }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                style={{ width: "100%", height: "100%" }}
                attributionControl={false}
                onDragStart={handleDragStart}
            >
                {/* Route line: warehouse → delivery */}
                {routeGeo && (
                    <Source id="route" type="geojson" data={{ type: "Feature", geometry: routeGeo, properties: {} }}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                "line-color": "#0F766E",
                                "line-width": 4,
                                "line-opacity": 0.85,
                            }}
                            layout={{ "line-cap": "round", "line-join": "round" }}
                        />
                    </Source>
                )}

                {/* Warehouse marker (A) */}
                <Marker latitude={warehouseLat} longitude={warehouseLng} anchor="bottom">
                    <div className="flex flex-col items-center">
                        <div className="bg-teal-600 text-white text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shadow-md">
                            📦 {warehouseName}
                        </div>
                        <div className="w-px h-2 bg-teal-600" />
                    </div>
                </Marker>

                {/* Delivery marker (B) */}
                {deliveryLat != null && deliveryLng != null && (
                    <Marker latitude={deliveryLat} longitude={deliveryLng} anchor="bottom">
                        <div className="flex flex-col items-center">
                            <div className="bg-orange-500 text-white text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shadow-md max-w-[180px] truncate">
                                📍 {deliveryAddress ?? "Điểm giao"}
                            </div>
                            <div className="w-px h-2 bg-orange-500" />
                        </div>
                    </Marker>
                )}

                {/* Driver marker */}
                {driverLat !== null && driverLng !== null && (
                    <Marker latitude={driverLat} longitude={driverLng} anchor="center">
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="text-[11px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium shadow-md whitespace-nowrap">
                                🚚 Tài xế
                            </div>
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
                        </div>
                    </Marker>
                )}
            </Map>

            {/* Re-center button */}
            {!isFollowing && driverLat !== null && (
                <button
                    onClick={handleRecenter}
                    className={`absolute ${recenterOffset ?? "bottom-2 right-2"} z-10 bg-white text-blue-600 text-[11px] font-medium px-2.5 py-1.5 rounded-full shadow-md border border-blue-100 hover:bg-blue-50 transition-colors`}
                >
                    📍 Theo dõi
                </button>
            )}

            {isFollowing && driverLat !== null && (
                <div className="absolute bottom-2 right-2 z-10 bg-blue-600 text-white text-[10px] font-medium px-2 py-1 rounded-full shadow-md opacity-80">
                    ● Đang theo dõi
                </div>
            )}
        </div>
    );
}
