"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { authStorage } from "@/services/auth/auth-storage.service";
import { RoutePlanningService } from "@/services/route-planning/route-planning.service";
import type { RoutePlanResult, RouteStop, DeadlineRisk } from "@/services/route-planning/route-planning.types";
import {
    DEADLINE_RISK_LABELS,
    DEADLINE_RISK_COLORS,
} from "@/services/route-planning/route-planning.types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const routePlanningService = new RoutePlanningService();

// ── Constants ──────────────────────────────────────────────────────────────

const RISK_PIN_COLORS: Record<DeadlineRisk, string> = {
    LOW: "#16a34a",
    MEDIUM: "#d97706",
    HIGH: "#ea580c",
    MISSED: "#dc2626",
};

// ── Helpers ────────────────────────────────────────────────────────────────

// fmtTime: converts ISO to HH:MM; if referenceIso given, adds "+N ngày" when arrival is on a later calendar day
function fmtTime(iso: string, referenceIso?: string): string {
    try {
        const d = new Date(iso);
        const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        if (referenceIso) {
            const ref = new Date(referenceIso);
            const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const rDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
            const diffDays = Math.round((dDay.getTime() - rDay.getTime()) / 86_400_000);
            if (diffDays === 1) return `${timeStr} (hôm sau)`;
            if (diffDays > 1) return `${timeStr} (+${diffDays} ngày)`;
        }
        return timeStr;
    } catch {
        return iso;
    }
}

function fmtDateTime(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString("vi-VN", {
            day: "2-digit", month: "2-digit",
            hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

// fmtMinutes: converts minutes to human-readable, supporting days / hours / minutes
function fmtMinutes(min: number): string {
    const total = Math.round(Math.abs(min));
    if (total === 0) return "0 phút";
    if (total < 60) return `${total} phút`;
    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const minutes = total % 60;
    if (days > 0) {
        if (hours > 0) return `${days} ngày ${hours}h`;
        return `${days} ngày`;
    }
    if (minutes > 0) return `${hours}h ${minutes}p`;
    return `${hours} giờ`;
}

// fmtBuffer: formats deadline buffer for display (handles large positive and negative values)
function fmtBuffer(minutes: number): string {
    if (minutes < 0) return `trễ ${fmtMinutes(-minutes)}`;
    return `còn ${fmtMinutes(minutes)}`;
}

async function geocodeAddress(
    address: string,
    token: string,
): Promise<{ lat: number; lng: number } | null> {
    try {
        const encoded = encodeURIComponent(address);
        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?limit=1&language=vi&country=VN&access_token=${token}`,
        );
        const data = await res.json() as { features?: { center: [number, number] }[] };
        const center = data.features?.[0]?.center;
        return center ? { lat: center[1], lng: center[0] } : null;
    } catch {
        return null;
    }
}

async function fetchMultiStopRoute(
    waypoints: [number, number][],
    token: string,
): Promise<{ type: "LineString"; coordinates: [number, number][] } | null> {
    if (waypoints.length < 2) return null;
    try {
        const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(";");
        const res = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${token}`,
        );
        const data = await res.json() as {
            routes?: { geometry: { type: "LineString"; coordinates: [number, number][] } }[];
        };
        return data.routes?.[0]?.geometry ?? null;
    } catch {
        return null;
    }
}

// ── Sub-components ──────────────────────────────────────────────────────────

function DeadlineBadge({ risk }: { risk: DeadlineRisk }) {
    return (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${DEADLINE_RISK_COLORS[risk]}`}>
            {DEADLINE_RISK_LABELS[risk]}
        </span>
    );
}

function StopCard({ stop, isLast, departureAfterLoading }: { stop: RouteStop; isLast: boolean; departureAfterLoading?: string }) {
    const isLate = stop.deadline_risk === "MISSED";
    const isHigh = stop.deadline_risk === "HIGH";
    const hasDeadline = Boolean(stop.required_date);

    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 ${
                    isLate ? "bg-red-100 text-red-700 ring-2 ring-red-400" :
                    isHigh ? "bg-orange-100 text-orange-700 ring-2 ring-orange-400" :
                    "bg-primary/10 text-primary"
                }`}>
                    {stop.sequence}
                </div>
                {!isLast && <div className="w-0.5 bg-border flex-1 my-1 min-h-[28px]" />}
            </div>

            <div className={`flex-1 pb-4 rounded-xl border p-3 mb-1 ${
                isLate ? "border-red-200 bg-red-50/40" :
                isHigh ? "border-orange-200 bg-orange-50/40" :
                "border-border bg-card"
            }`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{stop.export_code}</span>
                        {stop.partner_name && (
                            <span className="text-xs text-muted-foreground">{stop.partner_name}</span>
                        )}
                    </div>
                    <DeadlineBadge risk={stop.deadline_risk} />
                </div>

                {stop.delivery_address && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                        <svg className="w-3 h-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {stop.delivery_address}
                    </p>
                )}

                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-muted-foreground">Di chuyển:</span>
                        <span className="font-medium">{fmtMinutes(stop.travel_time_minutes)}</span>
                        {stop.distance_km > 0 && (
                            <span className="text-muted-foreground">({stop.distance_km.toFixed(1)} km)</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-muted-foreground">Ước đến:</span>
                        <span className={`font-semibold ${isLate ? "text-red-600" : isHigh ? "text-orange-600" : "text-foreground"}`}>
                            {fmtTime(stop.estimated_arrival, departureAfterLoading)}
                        </span>
                    </div>
                    {hasDeadline && (
                        <div className="flex items-center gap-1 col-span-2">
                            <svg className="w-3 h-3 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-muted-foreground">Yêu cầu trước:</span>
                            <span className="font-medium">{fmtDateTime(stop.required_date!)}</span>
                            {stop.deadline_buffer_minutes != null && (
                                <span className={`ml-1 ${
                                    stop.deadline_buffer_minutes < 0 ? "text-red-600" :
                                    stop.deadline_buffer_minutes < 60 ? "text-orange-600" :
                                    "text-green-600"
                                }`}>
                                    ({fmtBuffer(stop.deadline_buffer_minutes)})
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Route Map ───────────────────────────────────────────────────────────────

function RoutePlanMap({
    result,
    warehouseLat,
    warehouseLng,
    warehouseName,
    currentExportId,
}: {
    result: RoutePlanResult;
    warehouseLat?: number | null;
    warehouseLng?: number | null;
    warehouseName?: string;
    currentExportId?: string;
}) {
    const mapRef = useRef<MapRef>(null);
    const hasFittedRef = useRef(false);
    const [stopCoords, setStopCoords] = useState<Record<string, { lat: number; lng: number }>>({});
    const [routeGeo, setRouteGeo] = useState<{ type: "LineString"; coordinates: [number, number][] } | null>(null);
    const [geocodingDone, setGeocodingDone] = useState(false);

    // Geocode all delivery addresses when result changes
    useEffect(() => {
        if (!MAPBOX_TOKEN) return;
        hasFittedRef.current = false;
        setRouteGeo(null);
        setGeocodingDone(false);
        setStopCoords({});

        const run = async () => {
            const coords: Record<string, { lat: number; lng: number }> = {};
            for (const stop of result.route) {
                if (stop.delivery_address) {
                    const c = await geocodeAddress(stop.delivery_address, MAPBOX_TOKEN!);
                    if (c) coords[stop.export_id] = c;
                }
            }
            setStopCoords(coords);
            setGeocodingDone(true);
        };
        void run();
    }, [result]);

    // Fetch route line once geocoding is done
    useEffect(() => {
        if (!geocodingDone || !MAPBOX_TOKEN) return;

        const run = async () => {
            const waypoints: [number, number][] = [];
            if (warehouseLat && warehouseLng) waypoints.push([warehouseLng, warehouseLat]);
            for (const stop of result.route) {
                const c = stopCoords[stop.export_id];
                if (c) waypoints.push([c.lng, c.lat]);
            }
            const geo = await fetchMultiStopRoute(waypoints, MAPBOX_TOKEN!);
            setRouteGeo(geo);
        };
        void run();
    }, [geocodingDone, stopCoords, result, warehouseLat, warehouseLng]);

    // Fit map bounds once route geometry is ready
    useEffect(() => {
        if (hasFittedRef.current || !routeGeo || !mapRef.current) return;
        const coords = routeGeo.coordinates;
        if (coords.length === 0) return;
        const lngs = coords.map(([lng]) => lng);
        const lats = coords.map(([, lat]) => lat);
        hasFittedRef.current = true;
        mapRef.current.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 60, maxZoom: 14, duration: 800 },
        );
    }, [routeGeo]);

    if (!MAPBOX_TOKEN) return null;

    const hasWarehouse = Boolean(warehouseLat && warehouseLng);
    const geocodedCount = Object.keys(stopCoords).length;
    const isLoading = !geocodingDone;

    const initialCenter = hasWarehouse
        ? { latitude: warehouseLat!, longitude: warehouseLng! }
        : { latitude: 10.8231, longitude: 106.6297 };

    return (
        <div className="space-y-2">
            <div className="relative rounded-xl overflow-hidden border shadow-sm" style={{ height: 340 }}>
                <Map
                    ref={mapRef}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{ ...initialCenter, zoom: 11 }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    style={{ width: "100%", height: "100%" }}
                    attributionControl={false}
                >
                    {/* Route line */}
                    {routeGeo && (
                        <Source id="route-plan" type="geojson" data={{ type: "Feature", geometry: routeGeo, properties: {} }}>
                            <Layer
                                id="route-plan-line"
                                type="line"
                                paint={{ "line-color": "#2563eb", "line-width": 3.5, "line-opacity": 0.85 }}
                                layout={{ "line-cap": "round", "line-join": "round" }}
                            />
                        </Source>
                    )}

                    {/* Warehouse start marker */}
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

                    {/* Glow circle for current export stop */}
                    {result.route.map((stop) => {
                        if (stop.export_id !== currentExportId) return null;
                        const c = stopCoords[stop.export_id];
                        if (!c) return null;
                        return (
                            <Source
                                key={`pulse-${stop.export_id}`}
                                id="current-stop-pulse"
                                type="geojson"
                                data={{ type: "Feature", geometry: { type: "Point", coordinates: [c.lng, c.lat] }, properties: {} }}
                            >
                                <Layer
                                    id="current-stop-pulse-ring"
                                    type="circle"
                                    paint={{
                                        "circle-radius": 22,
                                        "circle-color": "#7c3aed",
                                        "circle-opacity": 0.15,
                                        "circle-stroke-width": 2,
                                        "circle-stroke-color": "#7c3aed",
                                        "circle-stroke-opacity": 0.55,
                                    }}
                                />
                            </Source>
                        );
                    })}

                    {/* Delivery stop markers */}
                    {result.route.map((stop) => {
                        const c = stopCoords[stop.export_id];
                        if (!c) return null;
                        const isCurrent = stop.export_id === currentExportId;
                        const color = isCurrent ? "#7c3aed" : RISK_PIN_COLORS[stop.deadline_risk];
                        return (
                            <Marker key={stop.export_id} latitude={c.lat} longitude={c.lng} anchor="bottom">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md whitespace-nowrap ${
                                            isCurrent ? "ring-2 ring-violet-300 ring-offset-1 scale-110" : ""
                                        }`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {isCurrent ? "★ " : ""}{stop.sequence}. {stop.export_code}
                                    </div>
                                    <div className="w-px h-2" style={{ backgroundColor: color }} />
                                </div>
                            </Marker>
                        );
                    })}
                </Map>

                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                        <div className="bg-white rounded-full px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2 shadow">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Đang tải tọa độ...
                        </div>
                    </div>
                )}
            </div>

            {/* Map legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground px-1">
                {hasWarehouse && (
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                        Kho xuất phát
                    </span>
                )}
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
                    Đúng giờ
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                    Sát giờ
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-600 inline-block" />
                    Nguy hiểm
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                    Trễ hạn
                </span>
                {geocodingDone && geocodedCount < result.route.length && (
                    <span className="text-amber-600">
                        ⚠ {result.route.length - geocodedCount}/{result.route.length} địa chỉ không tìm thấy trên bản đồ
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Main Panel ──────────────────────────────────────────────────────────────

interface RoutePlanningPanelProps {
    fleetVehicleId: string;
    exportIds?: string[];
    currentExportId?: string;
    warehouseLat?: number | null;
    warehouseLng?: number | null;
    warehouseName?: string;
    assignedExports?: { id: string; status: string }[];
}

export function RoutePlanningPanel({
    fleetVehicleId,
    exportIds,
    currentExportId,
    warehouseLat,
    warehouseLng,
    warehouseName,
    assignedExports,
}: RoutePlanningPanelProps) {
    const isVehicleInDelivery = (assignedExports ?? []).some((e) => e.status === "SHIPPED");
    const [result, setResult] = useState<RoutePlanResult | null>(null);
    const [computing, setComputing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [departureTime, setDepartureTime] = useState(() => {
        const now = new Date();
        now.setSeconds(0, 0);
        return now.toISOString().slice(0, 16);
    });

    const handlePlan = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        setComputing(true);
        setError(null);
        try {
            const res = await routePlanningService.plan(token, {
                fleet_vehicle_id: fleetVehicleId,
                export_ids: exportIds,
                departure_time: new Date(departureTime).toISOString(),
            });
            setResult(res);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Không thể tính lộ trình";
            try { setError((JSON.parse(msg) as { message?: string }).message ?? msg); }
            catch { setError(msg); }
        } finally {
            setComputing(false);
        }
    }, [fleetVehicleId, exportIds, departureTime]);

    return (
        <div className="border rounded-2xl overflow-hidden bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Lộ trình giao hàng thông minh</p>
                        <p className="text-xs text-muted-foreground">
                            {result
                                ? `${result.route.length} điểm giao · AI: ${result.ai_available ? "✓" : "rule-based"}`
                                : "Tính toán thứ tự giao hàng tối ưu"}
                        </p>
                    </div>
                </div>
                {result && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        result.deadline_warnings.length > 0
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                    }`}>
                        {result.deadline_warnings.length > 0
                            ? `${result.deadline_warnings.length} cảnh báo`
                            : "Đúng hạn"}
                    </span>
                )}
            </div>

            <div className="p-5 space-y-4">
                {/* In-delivery info banner */}
                {isVehicleInDelivery && (
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                        <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="font-semibold">Xe đang giao hàng</p>
                            <p className="text-xs text-blue-700 mt-0.5">
                                Bạn vẫn có thể tính toán và xem lộ trình. Tuy nhiên nút <span className="font-medium">Áp dụng lộ trình</span> sẽ bị khóa cho đến khi xe hoàn tất chuyến hiện tại.
                            </p>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Giờ xuất phát dự kiến
                        </label>
                        <input
                            type="datetime-local"
                            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                            value={departureTime}
                            onChange={(e) => setDepartureTime(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handlePlan}
                        disabled={computing}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
                    >
                        {computing ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Đang tính...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                {result ? "Tính lại lộ trình" : "Tính lộ trình"}
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
                )}

                {result && (
                    <>
                        {/* Summary stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Bốc xếp hàng</p>
                                <p className="text-lg font-bold text-primary mt-0.5">{fmtMinutes(result.loading_time_minutes)}</p>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Xuất phát (sau bốc)</p>
                                <p className="text-lg font-bold mt-0.5">{fmtTime(result.departure_after_loading)}</p>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Tổng thời gian lộ trình</p>
                                <p className="text-lg font-bold mt-0.5">{fmtMinutes(result.total_route_time_minutes)}</p>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Số điểm giao</p>
                                <p className="text-lg font-bold mt-0.5">{result.route.length}</p>
                            </div>
                        </div>

                        {/* Deadline warnings */}
                        {result.deadline_warnings.length > 0 && (
                            <div className="space-y-2">
                                {result.deadline_warnings.map((w) => (
                                    <div key={w.export_id} className={`flex gap-2 rounded-xl p-3 text-xs ${
                                        w.deadline_risk === "MISSED"
                                            ? "bg-red-50 border border-red-200 text-red-800"
                                            : "bg-orange-50 border border-orange-200 text-orange-800"
                                    }`}>
                                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span>{w.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Map */}
                        <RoutePlanMap
                            result={result}
                            warehouseLat={warehouseLat}
                            warehouseLng={warehouseLng}
                            warehouseName={warehouseName}
                            currentExportId={currentExportId}
                        />

                        {/* Timeline */}
                        <div>
                            {/* Warehouse start */}
                            <div className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <div className="w-0.5 bg-border flex-1 my-1 min-h-[20px]" />
                                </div>
                                <div className="pb-3 pt-1 flex-1">
                                    <p className="text-xs font-semibold text-blue-700">{result.warehouse_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Bốc xếp hàng {fmtMinutes(result.loading_time_minutes)} · Xuất phát {fmtTime(result.departure_after_loading)}
                                    </p>
                                </div>
                            </div>

                            {/* Delivery stops */}
                            {result.route.map((stop, idx) => (
                                <StopCard
                                    key={stop.export_id}
                                    stop={stop}
                                    isLast={idx === result.route.length - 1}
                                    departureAfterLoading={result.departure_after_loading}
                                />
                            ))}
                        </div>

                        {/* Algorithm chip */}
                        <div className={`text-xs rounded-xl px-3 py-2 flex items-center gap-2 ${
                            result.ai_available
                                ? "bg-blue-50 border border-blue-200 text-blue-700"
                                : "bg-muted/30 text-muted-foreground"
                        }`}>
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="font-mono">{result.algorithm_used}</span>
                            {!result.ai_available && (
                                <span className="text-muted-foreground">(AI không khả dụng — dùng rule-based)</span>
                            )}
                        </div>

                        {/* Apply route button */}
                        <div className="flex justify-end">
                            <button
                                disabled={isVehicleInDelivery}
                                title={isVehicleInDelivery ? "Xe đang giao hàng — hoàn tất chuyến hiện tại trước khi áp dụng lộ trình mới" : undefined}
                                className="px-4 py-2 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 disabled:bg-green-600"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Áp dụng lộ trình
                                {isVehicleInDelivery && (
                                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </>
                )}

                {/* Empty state */}
                {!result && !computing && !error && (
                    <div className="text-center py-8 text-muted-foreground">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
                            <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        </div>
                        <p className="text-sm">Nhấn "Tính lộ trình" để tối ưu thứ tự giao hàng theo deadline.</p>
                        <p className="text-xs mt-1">AI sẽ tính thời gian bốc xếp hàng, hiển thị bản đồ lộ trình và cảnh báo nếu có nguy cơ trễ hạn.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
