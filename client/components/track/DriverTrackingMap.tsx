"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface RouteGeometry {
    type: "LineString";
    coordinates: [number, number][];
}

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
    onRouteUpdate?: (distanceM: number, durationSec: number, geometry: RouteGeometry) => void;
}

interface RouteResult {
    geometry: RouteGeometry;
    distance: number;
    duration: number;
}

async function fetchRoute(
    fromLng: number,
    fromLat: number,
    toLng: number,
    toLat: number,
    token: string,
    profile: "driving" | "driving-traffic" = "driving",
): Promise<RouteResult | null> {
    try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json() as {
            routes?: { geometry: RouteGeometry; distance: number; duration: number }[];
        };
        const route = data.routes?.[0];
        if (!route) return null;
        return { geometry: route.geometry, distance: route.distance, duration: route.duration };
    } catch {
        return null;
    }
}

function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6_371_000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    onRouteUpdate,
}: DriverTrackingMapProps) {
    const mapRef = useRef<MapRef>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const hasFittedRef = useRef(false);
    const [routeGeo, setRouteGeo] = useState<RouteGeometry | null>(null);
    const [driverRouteGeo, setDriverRouteGeo] = useState<RouteGeometry | null>(null);
    const lastDriverFetchRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
    const [showTraffic, setShowTraffic] = useState(false);
    // Keep callback ref to avoid adding it as effect dep (prevents spurious refetches)
    const onRouteUpdateRef = useRef(onRouteUpdate);
    useEffect(() => { onRouteUpdateRef.current = onRouteUpdate; }, [onRouteUpdate]);

    // Fetch route warehouse → delivery once when delivery coords available
    useEffect(() => {
        if (!MAPBOX_TOKEN || !deliveryLat || !deliveryLng) return;
        void fetchRoute(warehouseLng, warehouseLat, deliveryLng, deliveryLat, MAPBOX_TOKEN).then((r) => {
            if (r) setRouteGeo(r.geometry);
        });
    }, [warehouseLat, warehouseLng, deliveryLat, deliveryLng]);

    // Fetch route driver → warehouse (throttled: refetch only when moved >150m or 90s elapsed)
    useEffect(() => {
        if (!MAPBOX_TOKEN || driverLat === null || driverLng === null) return;

        const lastFetch = lastDriverFetchRef.current;
        const now = Date.now();
        if (lastFetch) {
            const moved = haversineDistanceM(lastFetch.lat, lastFetch.lng, driverLat, driverLng);
            if (moved < 150 && now - lastFetch.time < 90_000) return;
        }
        lastDriverFetchRef.current = { lat: driverLat, lng: driverLng, time: now };

        void fetchRoute(driverLng, driverLat, warehouseLng, warehouseLat, MAPBOX_TOKEN, "driving-traffic").then((r) => {
            if (!r) return;
            setDriverRouteGeo(r.geometry);
            onRouteUpdateRef.current?.(r.distance, r.duration, r.geometry);
        });
    }, [driverLat, driverLng, warehouseLat, warehouseLng]);

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
                <NavigationControl position="top-right" visualizePitch={false} />

                {/* Traffic layer từ Mapbox tileset */}
                {showTraffic && (
                    <Source id="mapbox-traffic" type="vector" url="mapbox://mapbox.mapbox-traffic-v1">
                        <Layer
                            id="traffic-layer"
                            type="line"
                            source-layer="traffic"
                            paint={{
                                "line-color": [
                                    "match", ["get", "congestion"],
                                    "severe",   "#c0392b",
                                    "heavy",    "#e67e22",
                                    "moderate", "#f1c40f",
                                    "#27ae60",
                                ],
                                "line-width": 3,
                                "line-opacity": 0.75,
                            }}
                            layout={{ "line-cap": "round", "line-join": "round" }}
                        />
                    </Source>
                )}

                {/* Route: tài xế → kho (xanh dương nét đứt, tính theo traffic) */}
                {driverRouteGeo && (
                    <Source
                        id="driver-route"
                        type="geojson"
                        data={{ type: "Feature", geometry: driverRouteGeo, properties: {} }}
                    >
                        <Layer
                            id="driver-route-casing"
                            type="line"
                            paint={{ "line-color": "#fff", "line-width": 6, "line-opacity": 0.6 }}
                            layout={{ "line-cap": "butt", "line-join": "round" }}
                        />
                        <Layer
                            id="driver-route-line"
                            type="line"
                            paint={{
                                "line-color": "#2563EB",
                                "line-width": 4,
                                "line-opacity": 0.9,
                                "line-dasharray": [2, 1.5],
                            }}
                            layout={{ "line-cap": "butt", "line-join": "round" }}
                        />
                    </Source>
                )}

                {/* Route: kho → điểm giao (teal liền) */}
                {routeGeo && (
                    <Source
                        id="route"
                        type="geojson"
                        data={{ type: "Feature", geometry: routeGeo, properties: {} }}
                    >
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

                {/* Warehouse marker */}
                <Marker latitude={warehouseLat} longitude={warehouseLng} anchor="bottom">
                    <div className="flex flex-col items-center">
                        <div className="bg-teal-600 text-white text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shadow-md">
                            📦 {warehouseName}
                        </div>
                        <div className="w-px h-2 bg-teal-600" />
                    </div>
                </Marker>

                {/* Delivery marker */}
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

            {/* Traffic toggle button */}
            <button
                onClick={() => setShowTraffic((v) => !v)}
                className={`absolute top-2 left-2 z-10 text-[11px] font-medium px-2.5 py-1.5 rounded-full shadow-md border transition-colors ${
                    showTraffic
                        ? "bg-orange-500 text-white border-orange-400"
                        : "bg-white/92 text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
            >
                🚦 Traffic
            </button>

            {/* Map legend */}
            {(driverRouteGeo || routeGeo || showTraffic) && (
                <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow text-[10px] space-y-0.5">
                    {driverRouteGeo && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 border-t-2 border-blue-600 border-dashed" />
                            <span className="text-gray-600">Tới kho</span>
                        </div>
                    )}
                    {routeGeo && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 border-t-2 border-teal-600" />
                            <span className="text-gray-600">Giao hàng</span>
                        </div>
                    )}
                    {showTraffic && (
                        <div className="flex items-center gap-1.5 pt-0.5 border-t border-gray-100">
                            <div className="flex gap-0.5">
                                <div className="w-2 h-2 rounded-full bg-[#27ae60]" />
                                <div className="w-2 h-2 rounded-full bg-[#f1c40f]" />
                                <div className="w-2 h-2 rounded-full bg-[#e67e22]" />
                                <div className="w-2 h-2 rounded-full bg-[#c0392b]" />
                            </div>
                            <span className="text-gray-600">Giao thông</span>
                        </div>
                    )}
                </div>
            )}

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
