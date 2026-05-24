"use client";

import React, { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { TruckIcon } from "@heroicons/react/24/outline";
import { GpsSessionCreateDialog } from "@/components/gps/GpsSessionCreateDialog";
import { io, Socket } from "socket.io-client";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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

async function geocodeAddress(address: string, token: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const encoded = encodeURIComponent(address);
        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?limit=1&language=vi&access_token=${token}`,
        );
        const data = await res.json() as { features?: { center: [number, number] }[] };
        const center = data.features?.[0]?.center;
        return center ? { lat: center[1], lng: center[0] } : null;
    } catch {
        return null;
    }
}

interface DriverLocation {
    session_id: string;
    license_plate: string;
    latitude: number;
    longitude: number;
    speed_kmh: number | null;
    recorded_at: string;
}

interface OutboundRouteMapProps {
    exportId: string;
    warehouseTemplateId?: string | null;
    warehouseLat?: number | null;
    warehouseLng?: number | null;
    warehouseName?: string;
    deliveryAddress?: string | null;
}

export function OutboundRouteMap({
    exportId,
    warehouseTemplateId,
    warehouseLat,
    warehouseLng,
    warehouseName,
    deliveryAddress,
}: OutboundRouteMapProps) {
    const mapRef = useRef<MapRef>(null);
    const socketRef = useRef<Socket | null>(null);
    const hasFittedRef = useRef(false);

    const [routeGeo, setRouteGeo] = useState<RouteGeometry | null>(null);
    const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);

    // Geocode delivery address
    useEffect(() => {
        if (!deliveryAddress || !MAPBOX_TOKEN) return;
        void geocodeAddress(deliveryAddress, MAPBOX_TOKEN).then(setDeliveryCoords);
    }, [deliveryAddress]);

    // Fetch route once we have both ends
    useEffect(() => {
        if (!MAPBOX_TOKEN || !warehouseLat || !warehouseLng) return;
        const toLat = deliveryCoords?.lat;
        const toLng = deliveryCoords?.lng;
        if (!toLat || !toLng) return;
        void fetchRoute(warehouseLng, warehouseLat, toLng, toLat, MAPBOX_TOKEN).then(setRouteGeo);
    }, [warehouseLat, warehouseLng, deliveryCoords]);

    // Fit map to show all markers once we have data
    useEffect(() => {
        if (hasFittedRef.current) return;
        if (!warehouseLat || !warehouseLng) return;
        const map = mapRef.current;
        if (!map) return;

        const lats = [warehouseLat, deliveryCoords?.lat, driverLocation?.latitude].filter((v): v is number => v != null);
        const lngs = [warehouseLng, deliveryCoords?.lng, driverLocation?.longitude].filter((v): v is number => v != null);
        if (lats.length < 2) return;

        hasFittedRef.current = true;
        map.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 80, maxZoom: 14, duration: 800 },
        );
    }, [warehouseLat, warehouseLng, deliveryCoords, driverLocation]);

    // Subscribe to driver location events via WebSocket
    useEffect(() => {
        const wsUrl = API_URL.replace(/^http/, "ws");
        const socket = io(wsUrl, { transports: ["websocket"], reconnectionAttempts: 3 });
        socketRef.current = socket;

        socket.on(`outbound:${exportId}:driver-location`, (payload: DriverLocation) => {
            setDriverLocation(payload);
            // Fly to driver position
            mapRef.current?.flyTo({
                center: [payload.longitude, payload.latitude],
                zoom: 14,
                duration: 600,
            });
        });

        return () => { socket.disconnect(); };
    }, [exportId]);

    if (!MAPBOX_TOKEN) {
        return (
            <div className="flex items-center justify-center h-64 text-sm text-muted-foreground bg-muted/30 rounded-2xl">
                Chưa cấu hình Mapbox token
            </div>
        );
    }

    const hasWarehouse = warehouseLat != null && warehouseLng != null;

    return (
        <div className="space-y-4">
            {/* Map */}
            <div className="relative rounded-2xl overflow-hidden border shadow-sm" style={{ height: 420 }}>
                {hasWarehouse ? (
                    <Map
                        ref={mapRef}
                        mapboxAccessToken={MAPBOX_TOKEN}
                        initialViewState={{
                            latitude: warehouseLat!,
                            longitude: warehouseLng!,
                            zoom: 12,
                        }}
                        mapStyle="mapbox://styles/mapbox/streets-v12"
                        style={{ width: "100%", height: "100%" }}
                        attributionControl={false}
                    >
                        {/* Route line */}
                        {routeGeo && (
                            <Source id="route" type="geojson" data={{ type: "Feature", geometry: routeGeo, properties: {} }}>
                                <Layer
                                    id="route-line"
                                    type="line"
                                    paint={{ "line-color": "#0F766E", "line-width": 4, "line-opacity": 0.85 }}
                                    layout={{ "line-cap": "round", "line-join": "round" }}
                                />
                            </Source>
                        )}

                        {/* Warehouse marker (A) */}
                        <Marker latitude={warehouseLat!} longitude={warehouseLng!} anchor="bottom">
                            <div className="flex flex-col items-center">
                                <div className="bg-teal-600 text-white text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shadow-md">
                                    📦 {warehouseName ?? "Kho"}
                                </div>
                                <div className="w-px h-2 bg-teal-600" />
                            </div>
                        </Marker>

                        {/* Delivery marker (B) */}
                        {deliveryCoords && (
                            <Marker latitude={deliveryCoords.lat} longitude={deliveryCoords.lng} anchor="bottom">
                                <div className="flex flex-col items-center">
                                    <div className="bg-orange-500 text-white text-[11px] px-2 py-0.5 rounded-full font-medium shadow-md max-w-[180px] truncate">
                                        📍 {deliveryAddress ?? "Điểm giao"}
                                    </div>
                                    <div className="w-px h-2 bg-orange-500" />
                                </div>
                            </Marker>
                        )}

                        {/* Driver realtime marker */}
                        {driverLocation && (
                            <Marker latitude={driverLocation.latitude} longitude={driverLocation.longitude} anchor="center">
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="text-[11px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium shadow-md whitespace-nowrap">
                                        🚚 {driverLocation.license_plate}
                                    </div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
                                </div>
                            </Marker>
                        )}
                    </Map>
                ) : (
                    <div className="flex items-center justify-center h-full bg-muted/30 text-sm text-muted-foreground">
                        Kho chưa có tọa độ GPS. Vui lòng cập nhật vị trí kho trong cài đặt.
                    </div>
                )}

                {/* Driver status overlay */}
                {driverLocation && (
                    <div className="absolute top-3 left-3 z-10 bg-blue-600/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {driverLocation.license_plate}
                        {driverLocation.speed_kmh != null && ` · ${driverLocation.speed_kmh} km/h`}
                    </div>
                )}
            </div>

            {/* Info row */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 text-sm">
                    {deliveryAddress && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="text-orange-500">📍</span>
                            <span className="truncate max-w-[300px]">{deliveryAddress}</span>
                        </div>
                    )}
                    {!deliveryAddress && (
                        <span className="text-muted-foreground text-sm">Phiếu xuất này chưa có địa chỉ giao hàng</span>
                    )}
                </div>

                {warehouseTemplateId && (
                    <Button
                        onClick={() => setDialogOpen(true)}
                        size="sm"
                        className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl"
                    >
                        <TruckIcon className="w-4 h-4" />
                        Tạo link GPS cho tài xế
                    </Button>
                )}
            </div>

            {warehouseTemplateId && (
                <GpsSessionCreateDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    warehouseId={warehouseTemplateId}
                    defaultExportId={exportId}
                />
            )}
        </div>
    );
}
