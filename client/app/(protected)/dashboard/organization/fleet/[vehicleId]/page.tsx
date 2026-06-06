"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { io, type Socket } from "socket.io-client";
import { authStorage } from "@/services/auth/auth-storage.service";
import { FleetService } from "@/services/fleet/fleet.service";
import type { FleetVehicle, AssignedExport } from "@/services/fleet/fleet.types";
import {
    FLEET_VEHICLE_TYPE_LABELS,
    FLEET_STATUS_LABELS,
    FLEET_STATUS_COLORS,
    EXPORT_STATUS_LABELS,
    EXPORT_STATUS_COLORS,
} from "@/services/fleet/fleet.types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const fleetService = new FleetService();

// ── Types ──────────────────────────────────────────────────────────────────

type DeadlineRisk = "MISSED" | "HIGH" | "MEDIUM" | "LOW";

interface DriverLocation {
    session_id: string;
    license_plate: string;
    latitude: number;
    longitude: number;
    speed_kmh: number | null;
    recorded_at: string;
}

interface PriorityStop extends AssignedExport {
    sequence: number;
    deadlineRisk: DeadlineRisk;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function calcDeadlineRisk(required_date?: string): DeadlineRisk {
    if (!required_date) return "LOW";
    const diffH = (new Date(required_date).getTime() - Date.now()) / 3_600_000;
    if (diffH < 0) return "MISSED";
    if (diffH < 24) return "HIGH";
    if (diffH < 72) return "MEDIUM";
    return "LOW";
}

const RISK_PIN: Record<DeadlineRisk, string> = {
    MISSED: "#dc2626",
    HIGH: "#ea580c",
    MEDIUM: "#d97706",
    LOW: "#16a34a",
};

const RISK_LABEL: Record<DeadlineRisk, string> = {
    MISSED: "Trễ hạn",
    HIGH: "Nguy hiểm",
    MEDIUM: "Sát hạn",
    LOW: "Đúng hạn",
};

const RISK_CHIP: Record<DeadlineRisk, string> = {
    MISSED: "bg-red-100 text-red-700 border-red-200",
    HIGH: "bg-orange-100 text-orange-700 border-orange-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    LOW: "bg-green-100 text-green-700 border-green-200",
};

function fmtDeadline(required_date: string): string {
    const diffMs = new Date(required_date).getTime() - Date.now();
    const abs = Math.abs(diffMs);
    const h = Math.floor(abs / 3_600_000);
    const d = Math.floor(h / 24);
    const rh = h % 24;
    const str = d > 0 ? `${d} ngày${rh > 0 ? ` ${rh}h` : ""}` : `${h}h`;
    return diffMs < 0 ? `trễ ${str}` : `còn ${str}`;
}

function fmtDim(v: number | string) { return `${Number(v).toFixed(0)} cm`; }
function fmtKg(v: number | string) { return `${Number(v).toFixed(0)} kg`; }

async function geocodeAddress(address: string, token: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const encoded = encodeURIComponent(address);
        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?limit=1&language=vi&country=VN&access_token=${token}`,
        );
        const data = await res.json() as { features?: { center: [number, number] }[] };
        const c = data.features?.[0]?.center;
        return c ? { lat: c[1], lng: c[0] } : null;
    } catch { return null; }
}

async function fetchDirectionsRoute(
    waypoints: [number, number][],
    token: string,
): Promise<{ type: "LineString"; coordinates: [number, number][] } | null> {
    if (waypoints.length < 2) return null;
    // Mapbox Directions supports max 25 waypoints
    const capped = waypoints.slice(0, 25);
    try {
        const coords = capped.map(([lng, lat]) => `${lng},${lat}`).join(";");
        const res = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${token}`,
        );
        const data = await res.json() as {
            routes?: { geometry: { type: "LineString"; coordinates: [number, number][] } }[];
        };
        return data.routes?.[0]?.geometry ?? null;
    } catch { return null; }
}

// ── Map component ───────────────────────────────────────────────────────────

function VehicleDeliveryMap({
    stops,
    stopCoords,
    geocodingDone,
    routeGeo,
    warehouseLat,
    warehouseLng,
    warehouseName,
    driverLocations,
}: {
    stops: PriorityStop[];
    stopCoords: Record<string, { lat: number; lng: number }>;
    geocodingDone: boolean;
    routeGeo: { type: "LineString"; coordinates: [number, number][] } | null;
    warehouseLat?: number | null;
    warehouseLng?: number | null;
    warehouseName?: string;
    driverLocations: Record<string, DriverLocation>;
}) {
    const mapRef = useRef<MapRef>(null);
    const hasFittedRef = useRef(false);

    useEffect(() => {
        if (hasFittedRef.current || !mapRef.current) return;

        const allCoords: [number, number][] = [];
        if (routeGeo) {
            allCoords.push(...routeGeo.coordinates);
        } else {
            Object.values(stopCoords).forEach((c) => allCoords.push([c.lng, c.lat]));
            if (warehouseLat && warehouseLng) allCoords.push([warehouseLng, warehouseLat]);
        }
        Object.values(driverLocations).forEach((d) => allCoords.push([d.longitude, d.latitude]));

        if (allCoords.length < 1) return;
        hasFittedRef.current = true;

        if (allCoords.length === 1) {
            mapRef.current.flyTo({ center: allCoords[0], zoom: 13, duration: 800 });
        } else {
            const lngs = allCoords.map(([lng]) => lng);
            const lats = allCoords.map(([, lat]) => lat);
            mapRef.current.fitBounds(
                [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
                { padding: 80, maxZoom: 14, duration: 800 },
            );
        }
    }, [routeGeo, geocodingDone, stopCoords, driverLocations, warehouseLat, warehouseLng]);

    if (!MAPBOX_TOKEN) {
        return (
            <div className="flex items-center justify-center h-64 bg-muted/20 rounded-2xl text-sm text-muted-foreground">
                Chưa cấu hình Mapbox token
            </div>
        );
    }

    const hasWarehouse = Boolean(warehouseLat && warehouseLng);
    const driverCount = Object.keys(driverLocations).length;
    const geocodedCount = Object.keys(stopCoords).length;
    const isLoadingRoute = geocodingDone && geocodedCount > 0 && !routeGeo;

    return (
        <div className="space-y-2">
            <div className="relative rounded-2xl overflow-hidden border shadow-sm" style={{ height: 480 }}>
                <Map
                    ref={mapRef}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{ latitude: 10.8231, longitude: 106.6297, zoom: 10 }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    style={{ width: "100%", height: "100%" }}
                    attributionControl={false}
                >
                    {/* Actual road route from Mapbox Directions */}
                    {routeGeo && (
                        <Source id="vehicle-route" type="geojson" data={{ type: "Feature", geometry: routeGeo, properties: {} }}>
                            <Layer
                                id="vehicle-route-line"
                                type="line"
                                paint={{ "line-color": "#6366f1", "line-width": 4, "line-opacity": 0.85 }}
                                layout={{ "line-cap": "round", "line-join": "round" }}
                            />
                        </Source>
                    )}

                    {/* Warehouse origin marker */}
                    {hasWarehouse && (
                        <Marker latitude={warehouseLat!} longitude={warehouseLng!} anchor="bottom">
                            <div className="flex flex-col items-center">
                                <div className="bg-teal-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shadow-md">
                                    📦 {warehouseName ?? "Kho"}
                                </div>
                                <div className="w-px h-2 bg-teal-600" />
                            </div>
                        </Marker>
                    )}

                    {/* Priority-colored delivery stop markers */}
                    {stops.map((stop) => {
                        const c = stopCoords[stop.id];
                        if (!c) return null;
                        const color = RISK_PIN[stop.deadlineRisk];
                        const isShipped = stop.status === "SHIPPED";
                        return (
                            <Marker key={stop.id} latitude={c.lat} longitude={c.lng} anchor="bottom">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md whitespace-nowrap flex items-center gap-1 ${
                                            isShipped ? "ring-2 ring-white ring-offset-1" : ""
                                        }`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {isShipped && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />}
                                        {stop.sequence}. {stop.code}
                                    </div>
                                    <div className="w-px h-2" style={{ backgroundColor: color }} />
                                </div>
                            </Marker>
                        );
                    })}

                    {/* Live GPS driver markers */}
                    {Object.entries(driverLocations).map(([exportId, loc]) => (
                        <Marker key={`driver-${exportId}`} latitude={loc.latitude} longitude={loc.longitude} anchor="center">
                            <div className="flex flex-col items-center gap-0.5">
                                <div className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold shadow-md whitespace-nowrap">
                                    🚚 {loc.license_plate}
                                    {loc.speed_kmh != null && ` · ${loc.speed_kmh} km/h`}
                                </div>
                                <div className="relative">
                                    <span className="absolute inline-flex h-3 w-3 rounded-full bg-blue-400 opacity-75 animate-ping" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border-2 border-white shadow" />
                                </div>
                            </div>
                        </Marker>
                    ))}
                </Map>

                {/* Loading overlay */}
                {(!geocodingDone || isLoadingRoute) && (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                        <div className="bg-white rounded-full px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2 shadow">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            {!geocodingDone ? "Đang tải tọa độ..." : "Đang tính lộ trình thực tế..."}
                        </div>
                    </div>
                )}

                {/* Badges */}
                {driverCount > 0 && (
                    <div className="absolute top-3 left-3 z-10 bg-blue-600/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {driverCount} tài xế đang hoạt động
                    </div>
                )}
                {routeGeo && (
                    <div className="absolute top-3 right-3 z-10 bg-indigo-600/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Lộ trình thực tế
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground px-1">
                {hasWarehouse && (
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                        Kho xuất phát
                    </span>
                )}
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
                    Đúng hạn
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    Sát hạn ({"<"}3 ngày)
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-600 inline-block" />
                    Nguy hiểm ({"<"}24h)
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                    Trễ hạn
                </span>
                {geocodingDone && geocodedCount < stops.length && (
                    <span className="text-amber-600">
                        ⚠ {stops.length - geocodedCount}/{stops.length} địa chỉ không tìm thấy
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function VehicleDetailPage() {
    const params = useParams();
    const vehicleId = params.vehicleId as string;
    const [vehicle, setVehicle] = useState<FleetVehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stopCoords, setStopCoords] = useState<Record<string, { lat: number; lng: number }>>({});
    const [geocodingDone, setGeocodingDone] = useState(false);
    const [routeGeo, setRouteGeo] = useState<{ type: "LineString"; coordinates: [number, number][] } | null>(null);
    const [driverLocations, setDriverLocations] = useState<Record<string, DriverLocation>>({});
    const socketRef = useRef<Socket | null>(null);

    const fetchVehicle = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const v = await fleetService.getById(token, vehicleId);
            setVehicle(v);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không thể tải thông tin xe");
        } finally {
            setLoading(false);
        }
    }, [vehicleId]);

    useEffect(() => { void fetchVehicle(); }, [fetchVehicle]);

    // Sort exports by deadline urgency (EDF — earliest deadline first, nulls last)
    const priorityStops: PriorityStop[] = useMemo(() => {
        const exps = vehicle?.exports?.filter((e) => e.status !== "CANCELLED") ?? [];
        const sorted = [...exps].sort((a, b) => {
            if (!a.required_date && !b.required_date) return 0;
            if (!a.required_date) return 1;
            if (!b.required_date) return -1;
            return new Date(a.required_date).getTime() - new Date(b.required_date).getTime();
        });
        return sorted.map((exp, idx) => ({
            ...exp,
            sequence: idx + 1,
            deadlineRisk: calcDeadlineRisk(exp.required_date),
        }));
    }, [vehicle]);

    // Geocode all delivery addresses sequentially
    useEffect(() => {
        if (!vehicle?.exports?.length || !MAPBOX_TOKEN) {
            setGeocodingDone(true);
            return;
        }
        setGeocodingDone(false);
        setStopCoords({});
        setRouteGeo(null);

        const run = async () => {
            const coords: Record<string, { lat: number; lng: number }> = {};
            for (const exp of vehicle.exports ?? []) {
                if (exp.delivery_address) {
                    const c = await geocodeAddress(exp.delivery_address, MAPBOX_TOKEN!);
                    if (c) coords[exp.id] = c;
                }
            }
            setStopCoords(coords);
            setGeocodingDone(true);
        };
        void run();
    }, [vehicle]);

    // Fetch Mapbox Directions route once geocoding completes
    // Route: warehouse → stops in priority order (EDF)
    useEffect(() => {
        if (!geocodingDone || !MAPBOX_TOKEN) return;
        const wh = vehicle?.warehouse;
        const whLat = wh?.latitude ? Number(wh.latitude) : null;
        const whLng = wh?.longitude ? Number(wh.longitude) : null;

        const run = async () => {
            const waypoints: [number, number][] = [];
            if (whLat && whLng) waypoints.push([whLng, whLat]);
            for (const stop of priorityStops) {
                const c = stopCoords[stop.id];
                if (c) waypoints.push([c.lng, c.lat]);
            }
            if (waypoints.length >= 2) {
                const geo = await fetchDirectionsRoute(waypoints, MAPBOX_TOKEN!);
                setRouteGeo(geo);
            }
        };
        void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geocodingDone, stopCoords]);

    // Subscribe to live GPS for all exports on this vehicle
    useEffect(() => {
        if (!vehicle?.exports?.length) return;
        const wsUrl = API_URL.replace(/^http/, "ws");
        const socket = io(wsUrl, { transports: ["websocket"], reconnectionAttempts: 3 });
        socketRef.current = socket;
        for (const exp of vehicle.exports) {
            socket.on(`outbound:${exp.id}:driver-location`, (payload: DriverLocation) => {
                setDriverLocations((prev) => ({ ...prev, [exp.id]: payload }));
            });
        }
        return () => { socket.disconnect(); };
    }, [vehicle]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px] text-muted-foreground text-sm">
                Đang tải...
            </div>
        );
    }

    if (error || !vehicle) {
        return (
            <div className="p-6 space-y-4">
                <Link href="/dashboard/organization/fleet" className="text-sm text-primary hover:underline flex items-center gap-1">
                    ← Quay lại danh sách xe
                </Link>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {error ?? "Không tìm thấy xe"}
                </div>
            </div>
        );
    }

    const wh = vehicle.warehouse;
    const warehouseLat = wh?.latitude ? Number(wh.latitude) : null;
    const warehouseLng = wh?.longitude ? Number(wh.longitude) : null;
    const shippedCount = vehicle.exports?.filter((e) => e.status === "SHIPPED").length ?? 0;
    const missedCount = priorityStops.filter((s) => s.deadlineRisk === "MISSED").length;
    const highCount = priorityStops.filter((s) => s.deadlineRisk === "HIGH").length;

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <Link href="/dashboard/organization/fleet" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 w-fit">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Danh sách xe
            </Link>

            {/* Vehicle header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{vehicle.name}</h1>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="font-mono text-sm text-muted-foreground">{vehicle.license_plate}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-sm text-muted-foreground">{FLEET_VEHICLE_TYPE_LABELS[vehicle.vehicle_type]}</span>
                            {wh?.name && (
                                <>
                                    <span className="text-muted-foreground">·</span>
                                    <span className="text-sm text-muted-foreground">{wh.name}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${FLEET_STATUS_COLORS[vehicle.status]}`}>
                        {FLEET_STATUS_LABELS[vehicle.status]}
                    </span>
                    {shippedCount > 0 && (
                        <span className="text-sm px-3 py-1.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            {shippedCount} đang giao
                        </span>
                    )}
                    {missedCount > 0 && (
                        <span className="text-sm px-3 py-1.5 rounded-full font-medium bg-red-100 text-red-700 border border-red-200">
                            {missedCount} trễ hạn
                        </span>
                    )}
                    {highCount > 0 && missedCount === 0 && (
                        <span className="text-sm px-3 py-1.5 rounded-full font-medium bg-orange-100 text-orange-700 border border-orange-200">
                            {highCount} nguy hiểm
                        </span>
                    )}
                </div>
            </div>

            {/* Cargo specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Khoang hàng (D×R×C)</p>
                    <p className="text-sm font-semibold mt-0.5 font-mono">
                        {fmtDim(vehicle.cargo_length)} × {fmtDim(vehicle.cargo_width)} × {fmtDim(vehicle.cargo_height)}
                    </p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Tải trọng tối đa</p>
                    <p className="text-sm font-semibold mt-0.5">{fmtKg(vehicle.max_weight_kg)}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Điểm giao hàng</p>
                    <p className="text-sm font-bold mt-0.5">{priorityStops.length}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">GPS thời gian thực</p>
                    <p className={`text-sm font-semibold mt-0.5 ${Object.keys(driverLocations).length > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                        {Object.keys(driverLocations).length > 0
                            ? `${Object.keys(driverLocations).length} xe đang phát`
                            : "Chưa có"}
                    </p>
                </div>
            </div>

            {/* Map */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Bản đồ lộ trình</h2>
                    {geocodingDone && (
                        <span className="text-xs text-muted-foreground">
                            {Object.keys(stopCoords).length}/{priorityStops.length} địa điểm
                            {routeGeo && " · lộ trình thực tế"}
                        </span>
                    )}
                </div>
                {priorityStops.length === 0 ? (
                    <div className="flex items-center justify-center h-48 bg-muted/20 rounded-2xl text-sm text-muted-foreground">
                        Xe này hiện không có phiếu xuất nào đang giao.
                    </div>
                ) : (
                    <VehicleDeliveryMap
                        stops={priorityStops}
                        stopCoords={stopCoords}
                        geocodingDone={geocodingDone}
                        routeGeo={routeGeo}
                        warehouseLat={warehouseLat}
                        warehouseLng={warehouseLng}
                        warehouseName={wh?.name}
                        driverLocations={driverLocations}
                    />
                )}
            </div>

            {/* Priority sequence panel */}
            {priorityStops.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold">Thứ tự ưu tiên giao hàng</h2>
                        <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                            Theo hạn giao sớm nhất (EDF)
                        </span>
                    </div>

                    <div className="space-y-2">
                        {priorityStops.map((stop) => {
                            const risk = stop.deadlineRisk;
                            const isShipped = stop.status === "SHIPPED";
                            return (
                                <div
                                    key={stop.id}
                                    className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                                        risk === "MISSED" ? "border-red-200 bg-red-50/40" :
                                        risk === "HIGH"   ? "border-orange-200 bg-orange-50/40" :
                                        risk === "MEDIUM" ? "border-amber-200 bg-amber-50/20" :
                                        "border-border bg-card"
                                    }`}
                                >
                                    {/* Sequence number */}
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white mt-0.5"
                                        style={{ backgroundColor: RISK_PIN[risk] }}
                                    >
                                        {stop.sequence}
                                    </div>

                                    {/* Stop info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-xs font-bold text-primary">{stop.code}</span>
                                            {stop.partner?.name && (
                                                <span className="text-xs text-muted-foreground">{stop.partner.name}</span>
                                            )}
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${EXPORT_STATUS_COLORS[stop.status]}`}>
                                                {EXPORT_STATUS_LABELS[stop.status]}
                                            </span>
                                            {isShipped && (
                                                <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    Đang trên đường
                                                </span>
                                            )}
                                        </div>
                                        {stop.delivery_address && (
                                            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                                                <svg className="w-3 h-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="truncate">{stop.delivery_address}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Deadline details */}
                                    <div className="text-right shrink-0 space-y-1">
                                        {stop.required_date ? (
                                            <>
                                                <div>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold border ${RISK_CHIP[risk]}`}>
                                                        {RISK_LABEL[risk]}
                                                    </span>
                                                </div>
                                                <p className={`text-[11px] font-semibold ${
                                                    risk === "MISSED" ? "text-red-600" :
                                                    risk === "HIGH"   ? "text-orange-600" :
                                                    risk === "MEDIUM" ? "text-amber-600" :
                                                    "text-green-700"
                                                }`}>
                                                    {fmtDeadline(stop.required_date)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {new Date(stop.required_date).toLocaleDateString("vi-VN", {
                                                        day: "2-digit", month: "2-digit", year: "numeric",
                                                    })}
                                                </p>
                                            </>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Không có hạn</span>
                                        )}
                                        <div>
                                            <Link
                                                href={`/dashboard/organization/outbound/${stop.id}`}
                                                className="text-[11px] text-primary hover:underline"
                                            >
                                                Xem chi tiết →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Notes */}
            {vehicle.notes && (
                <div className="bg-muted/20 rounded-xl px-4 py-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Ghi chú: </span>
                    {vehicle.notes}
                </div>
            )}
        </div>
    );
}
