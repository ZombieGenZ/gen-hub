"use client";

import React, { useMemo, useRef, useEffect, useCallback } from "react";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef, FillLayerSpecification, LineLayerSpecification } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface VehiclePosition {
    sessionId: string;
    licensePlate: string;
    lat: number;
    lng: number;
    distanceM: number | null;
    geofence: "APPROACHING" | "ARRIVED" | null;
    speedKmh: number | null;
}

interface GpsLiveMapProps {
    warehouseCoords: { lat: number; lng: number } | null;
    warehouseName: string;
    vehiclePositions: VehiclePosition[];
    className?: string;
}

function makeCircleGeoJSON(lng: number, lat: number, radiusM: number, steps = 64) {
    const R = 6371000;
    const coords = Array.from({ length: steps }, (_, i) => {
        const angle = (i / steps) * 2 * Math.PI;
        const dLat = (radiusM * Math.cos(angle) / R) * (180 / Math.PI);
        const dLng =
            (radiusM * Math.sin(angle) / R) *
            (180 / Math.PI) /
            Math.cos((lat * Math.PI) / 180);
        return [lng + dLng, lat + dLat];
    });
    coords.push(coords[0]);
    return {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [coords] },
        properties: {},
    };
}

const geofenceFillLayer: FillLayerSpecification = {
    id: "geofence-fill",
    type: "fill",
    source: "geofence",
    paint: { "fill-color": "#0ea5e9", "fill-opacity": 0.1 },
};

const geofenceBorderLayer: LineLayerSpecification = {
    id: "geofence-border",
    type: "line",
    source: "geofence",
    paint: { "line-color": "#0ea5e9", "line-width": 2, "line-opacity": 0.5 },
};

const FALLBACK_CLS = "h-[58vh] min-h-[420px] rounded-xl border shadow-sm";

export function GpsLiveMap({ warehouseCoords, warehouseName, vehiclePositions, className }: GpsLiveMapProps) {
    const mapRef = useRef<MapRef>(null);

    const geofenceData = useMemo(
        () =>
            warehouseCoords
                ? makeCircleGeoJSON(warehouseCoords.lng, warehouseCoords.lat, 500)
                : null,
        [warehouseCoords],
    );

    // Fit map to show warehouse + all active vehicles
    const fitAll = useCallback(() => {
        if (!mapRef.current || !warehouseCoords) return;
        if (vehiclePositions.length === 0) {
            mapRef.current.flyTo({
                center: [warehouseCoords.lng, warehouseCoords.lat],
                zoom: 15,
                duration: 600,
            });
            return;
        }
        const lngs = [warehouseCoords.lng, ...vehiclePositions.map((v) => v.lng)];
        const lats = [warehouseCoords.lat, ...vehiclePositions.map((v) => v.lat)];
        mapRef.current.fitBounds(
            [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 90, maxZoom: 15, duration: 800 },
        );
    }, [warehouseCoords, vehiclePositions]);

    // Auto-fit whenever vehicle positions update
    useEffect(() => {
        const t = setTimeout(fitAll, 400);
        return () => clearTimeout(t);
    }, [fitAll]);

    if (!MAPBOX_TOKEN) {
        return (
            <div className={`flex items-center justify-center bg-muted/30 text-sm text-muted-foreground ${className ?? FALLBACK_CLS}`}>
                Thiếu NEXT_PUBLIC_MAPBOX_TOKEN trong .env
            </div>
        );
    }

    if (!warehouseCoords || !geofenceData) {
        return (
            <div className={`flex items-center justify-center bg-muted/30 text-sm text-muted-foreground ${className ?? FALLBACK_CLS}`}>
                Kho chưa thiết lập tọa độ GPS — không thể hiển thị bản đồ
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className ?? FALLBACK_CLS}`}>
            <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{
                    latitude: warehouseCoords.lat,
                    longitude: warehouseCoords.lng,
                    zoom: 14,
                }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                style={{ width: "100%", height: "100%" }}
                attributionControl={false}
            >
                <NavigationControl position="bottom-right" />

                {/* Geofence circle 500m */}
                <Source id="geofence" type="geojson" data={geofenceData}>
                    <Layer {...geofenceFillLayer} />
                    <Layer {...geofenceBorderLayer} />
                </Source>

                {/* Warehouse marker */}
                <Marker latitude={warehouseCoords.lat} longitude={warehouseCoords.lng} anchor="bottom">
                    <div className="flex flex-col items-center">
                        <div className="bg-teal-600 text-white text-xs px-2.5 py-1 rounded-full shadow-md font-medium whitespace-nowrap">
                            📦 {warehouseName}
                        </div>
                        <div className="w-0.5 h-2 bg-teal-600" />
                    </div>
                </Marker>

                {/* Vehicle markers */}
                {vehiclePositions.map((v) => (
                    <Marker key={v.sessionId} latitude={v.lat} longitude={v.lng} anchor="bottom">
                        <div className="flex flex-col items-center">
                            <div
                                className={`text-xs px-2.5 py-1 rounded-full shadow-md font-mono font-bold whitespace-nowrap ${
                                    v.geofence === "ARRIVED"
                                        ? "bg-green-500 text-white"
                                        : v.geofence === "APPROACHING"
                                        ? "bg-yellow-400 text-yellow-900"
                                        : "bg-white text-gray-800 border border-gray-200"
                                }`}
                            >
                                🚚 {v.licensePlate}
                            </div>
                            {v.distanceM !== null && (
                                <div className="text-[10px] text-gray-600 bg-white/85 px-1.5 rounded mt-0.5 font-medium shadow-sm">
                                    {v.distanceM < 1000
                                        ? `${v.distanceM}m`
                                        : `${(v.distanceM / 1000).toFixed(1)}km`}
                                </div>
                            )}
                            {v.speedKmh !== null && v.speedKmh > 0 && (
                                <div className="text-[10px] text-blue-600 bg-white/90 px-1.5 rounded mt-0.5 font-medium shadow-sm">
                                    {v.speedKmh} km/h
                                </div>
                            )}
                            <div className="w-0.5 h-2 bg-gray-400" />
                        </div>
                    </Marker>
                ))}
            </Map>

            {/* Fit-all button — top left */}
            <button
                onClick={fitAll}
                className="absolute top-2 left-2 z-20 bg-white/92 backdrop-blur-sm text-gray-700 text-xs font-medium px-2.5 py-1.5 rounded-lg shadow border border-gray-200 hover:bg-white transition-colors"
            >
                🎯 Xem tất cả
            </button>

            {/* Vehicle legend overlay — bottom left, above nav controls */}
            {vehiclePositions.length > 0 && (
                <div className="absolute bottom-10 left-2 z-20 flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {vehiclePositions.map((v) => (
                        <div
                            key={v.sessionId}
                            className={`flex items-center gap-2 text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow backdrop-blur-sm whitespace-nowrap ${
                                v.geofence === "ARRIVED"
                                    ? "bg-green-500/92 text-white"
                                    : v.geofence === "APPROACHING"
                                    ? "bg-yellow-400/92 text-yellow-900"
                                    : "bg-white/92 text-gray-700 border border-gray-200"
                            }`}
                        >
                            <span className="font-mono font-bold">{v.licensePlate}</span>
                            {v.distanceM !== null && (
                                <span className="opacity-80">
                                    {v.distanceM < 1000
                                        ? `${v.distanceM}m`
                                        : `${(v.distanceM / 1000).toFixed(1)}km`}
                                </span>
                            )}
                            {v.speedKmh !== null && v.speedKmh > 0 && (
                                <span className="opacity-75">{v.speedKmh} km/h</span>
                            )}
                            {v.geofence === "ARRIVED" && <span>✅</span>}
                            {v.geofence === "APPROACHING" && <span>🔄</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Geofence radius badge — top right */}
            <div className="absolute top-2 right-2 z-20 bg-sky-500/85 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-lg shadow">
                🔵 Geofence 500m
            </div>
        </div>
    );
}
