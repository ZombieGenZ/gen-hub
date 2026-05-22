"use client";

import React, { useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import type { FillLayerSpecification, LineLayerSpecification } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface VehiclePosition {
    sessionId: string;
    licensePlate: string;
    lat: number;
    lng: number;
    distanceM: number | null;
    geofence: "APPROACHING" | "ARRIVED" | null;
}

interface GpsLiveMapProps {
    warehouseCoords: { lat: number; lng: number } | null;
    warehouseName: string;
    vehiclePositions: VehiclePosition[];
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

export function GpsLiveMap({ warehouseCoords, warehouseName, vehiclePositions }: GpsLiveMapProps) {
    const geofenceData = useMemo(
        () =>
            warehouseCoords
                ? makeCircleGeoJSON(warehouseCoords.lng, warehouseCoords.lat, 500)
                : null,
        [warehouseCoords],
    );

    if (!MAPBOX_TOKEN) {
        return (
            <div className="h-64 rounded-xl border flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
                Thiếu NEXT_PUBLIC_MAPBOX_TOKEN trong .env
            </div>
        );
    }

    if (!warehouseCoords || !geofenceData) {
        return (
            <div className="h-64 rounded-xl border flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
                Kho chưa thiết lập tọa độ GPS — không thể hiển thị bản đồ
            </div>
        );
    }

    return (
        <div className="h-72 rounded-xl overflow-hidden border shadow-sm">
            <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{
                    latitude: warehouseCoords.lat,
                    longitude: warehouseCoords.lng,
                    zoom: 14,
                }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                style={{ width: "100%", height: "100%" }}
            >
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
                                <div className="text-[10px] text-gray-500 bg-white/80 px-1 rounded mt-0.5">
                                    {v.distanceM < 1000
                                        ? `${v.distanceM}m`
                                        : `${(v.distanceM / 1000).toFixed(1)}km`}
                                </div>
                            )}
                            <div className="w-0.5 h-2 bg-gray-400" />
                        </div>
                    </Marker>
                ))}
            </Map>
        </div>
    );
}
