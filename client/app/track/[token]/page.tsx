"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { GpsService } from "@/services/gps/gps.service";
import type { GpsSessionInfo, GpsAiAnalysis } from "@/services/gps/gps.service";
import { DriverTrackingMap } from "@/components/track/DriverTrackingMap";
import type { RouteGeometry } from "@/components/track/DriverTrackingMap";

const gpsService = new GpsService();

const GPS_INTERVAL_MS = 30_000; // 30 giây

type TrackingStatus =
    | "loading"
    | "requesting_permission"
    | "tracking"
    | "no_gps"
    | "expired"
    | "error";

// Tính khoảng cách nhỏ nhất từ điểm tài xế đến route polyline (đơn vị: mét)
function minDistToRouteM(driverLat: number, driverLng: number, route: RouteGeometry): number {
    const cosLat = Math.cos(driverLat * Math.PI / 180);
    const mPerDegLng = cosLat * 111_320;
    const mPerDegLat = 110_540;
    let minDist = Infinity;
    const coords = route.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
        const x1 = (coords[i][0] - driverLng) * mPerDegLng;
        const y1 = (coords[i][1] - driverLat) * mPerDegLat;
        const x2 = (coords[i + 1][0] - driverLng) * mPerDegLng;
        const y2 = (coords[i + 1][1] - driverLat) * mPerDegLat;
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        let dist: number;
        if (lenSq === 0) {
            dist = Math.sqrt(x1 * x1 + y1 * y1);
        } else {
            const t = Math.max(0, Math.min(1, (-x1 * dx - y1 * dy) / lenSq));
            dist = Math.sqrt((x1 + t * dx) ** 2 + (y1 + t * dy) ** 2);
        }
        if (dist < minDist) minDist = dist;
    }
    return minDist;
}

function formatCountdown(expiresAt: string): string {
    const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TrackingPage() {
    const params = useParams();
    const token = typeof params.token === "string" ? params.token : "";

    const [sessionInfo, setSessionInfo] = useState<GpsSessionInfo | null>(null);
    const [status, setStatus] = useState<TrackingStatus>("loading");
    const [lastSent, setLastSent] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState("");
    const [distanceM, setDistanceM] = useState<number | null>(null);
    const [geofence, setGeofence] = useState<"APPROACHING" | "ARRIVED" | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [speedKmh, setSpeedKmh] = useState<number | null>(null);
    const [panelExpanded, setPanelExpanded] = useState(false);
    const [roadDistanceM, setRoadDistanceM] = useState<number | null>(null);
    const [roadDurationSec, setRoadDurationSec] = useState<number | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [aiAnalysis, setAiAnalysis] = useState<GpsAiAnalysis | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const driverRouteGeoRef = useRef<RouteGeometry | null>(null);
    const slowStartTimeRef = useRef<number | null>(null);
    const gpsApiCountRef = useRef(0);
    const lastAiCallRef = useRef(0);

    const handleRouteUpdate = useCallback((distM: number, durSec: number, geometry: RouteGeometry) => {
        setRoadDistanceM(distM);
        setRoadDurationSec(durSec);
        driverRouteGeoRef.current = geometry;
    }, []);

    const watchIdRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastPositionRef = useRef<GeolocationPosition | null>(null);
    // Client-side rate limit — tránh spam server (server giới hạn 30s/request)
    const lastApiCallRef = useRef<number>(0);

    // Phát hiện bất thường từ GPS (pure client-side)
    useEffect(() => {
        if (status !== "tracking" || geofence === "ARRIVED") {
            setWarnings([]);
            slowStartTimeRef.current = null;
            return;
        }

        const next: string[] = [];

        // Tốc độ cao
        if (speedKmh !== null && speedKmh > 80) {
            next.push(`Đang chạy nhanh (${Math.round(speedKmh)} km/h)`);
        }

        // Dừng lâu bất thường — chỉ tính khi speedKmh < 2 liên tục >2.5 phút
        if (speedKmh !== null) {
            if (speedKmh < 2) {
                if (!slowStartTimeRef.current) {
                    slowStartTimeRef.current = Date.now();
                } else if (Date.now() - slowStartTimeRef.current > 150_000) {
                    next.push("Xe dừng lâu bất thường");
                }
            } else {
                slowStartTimeRef.current = null;
            }
        }

        // Lệch tuyến đường gợi ý
        if (driverCoords && driverRouteGeoRef.current && driverRouteGeoRef.current.coordinates.length > 1) {
            const offDist = minDistToRouteM(driverCoords.lat, driverCoords.lng, driverRouteGeoRef.current);
            if (offDist > 300) {
                next.push("Đang đi lệch tuyến đường gợi ý");
            }
        }

        setWarnings(next);
    }, [speedKmh, driverCoords, status, geofence]);

    // Lấy thông tin session + geocode delivery address
    useEffect(() => {
        if (!token) return;
        gpsService
            .getSessionInfo(token)
            .then((info) => {
                setSessionInfo(info);
                if (info.status !== "ACTIVE" || new Date(info.expires_at) <= new Date()) {
                    setStatus("expired");
                } else {
                    setStatus("requesting_permission");
                }
                // Geocode delivery address if present
                const addr = info.delivery?.address;
                const mbToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
                if (addr && mbToken) {
                    const encoded = encodeURIComponent(addr);
                    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?limit=1&language=vi&access_token=${mbToken}`)
                        .then((r) => r.json())
                        .then((data: { features?: { center: [number, number] }[] }) => {
                            const center = data.features?.[0]?.center;
                            if (center) setDeliveryCoords({ lat: center[1], lng: center[0] });
                        })
                        .catch(() => null);
                }
            })
            .catch((err: Error) => {
                setErrorMsg(err.message);
                setStatus("error");
            });
    }, [token]);

    // Đếm ngược thời gian hết hạn
    useEffect(() => {
        if (!sessionInfo?.expires_at) return;
        const tick = setInterval(() => {
            setCountdown(formatCountdown(sessionInfo.expires_at));
            if (new Date(sessionInfo.expires_at) <= new Date()) {
                setStatus("expired");
                clearInterval(tick);
            }
        }, 1000);
        setCountdown(formatCountdown(sessionInfo.expires_at));
        return () => clearInterval(tick);
    }, [sessionInfo?.expires_at]);

    // Bắt đầu theo dõi GPS khi status = "requesting_permission"
    useEffect(() => {
        if (status !== "requesting_permission") return;
        if (!("geolocation" in navigator)) {
            setStatus("no_gps");
            return;
        }

        // Gửi vị trí lên server — chỉ gọi khi đã qua 30s (rate limit)
        const postToServer = async (pos: GeolocationPosition) => {
            lastApiCallRef.current = Date.now();
            try {
                const result = await gpsService.postLocation({
                    token,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    speed: pos.coords.speed ?? undefined,
                });
                setLastSent(new Date());
                if (result.distance_to_warehouse_m !== undefined) {
                    setDistanceM(result.distance_to_warehouse_m);
                }
                if (result.geofence) setGeofence(result.geofence);

                gpsApiCountRef.current += 1;
                const now = Date.now();
                if (gpsApiCountRef.current >= 5 && now - lastAiCallRef.current >= 300_000) {
                    lastAiCallRef.current = now;
                    setAiLoading(true);
                    gpsService.getAiAnalysis(token)
                        .then((a) => setAiAnalysis(a))
                        .catch(() => null)
                        .finally(() => setAiLoading(false));
                }
            } catch {
                // bỏ qua lỗi mạng đơn lẻ
            }
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                setStatus("tracking");
                lastPositionRef.current = pos;

                // Cập nhật UI ngay lập tức — không phụ thuộc vào API
                setDriverCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                if (pos.coords.speed !== null) {
                    setSpeedKmh(pos.coords.speed * 3.6);
                }

                // Gửi lên server chỉ khi đã qua đủ 30s
                const elapsed = Date.now() - lastApiCallRef.current;
                if (elapsed >= GPS_INTERVAL_MS) {
                    void postToServer(pos);
                }
            },
            () => {
                setStatus("no_gps");
            },
            { enableHighAccuracy: true, timeout: 10_000 },
        );

        // Fallback: gửi lại mỗi 30s ngay cả khi vị trí không đổi
        intervalRef.current = setInterval(() => {
            if (lastPositionRef.current) {
                void postToServer(lastPositionRef.current);
            }
        }, GPS_INTERVAL_MS);

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [status, token]);

    // ── Render ──
    return (
        <div className="relative h-dvh w-screen overflow-hidden bg-gray-300">
            {/* Map fullscreen */}
            {sessionInfo?.warehouse?.latitude != null && sessionInfo?.warehouse?.longitude != null ? (
                <DriverTrackingMap
                    warehouseLat={sessionInfo.warehouse.latitude}
                    warehouseLng={sessionInfo.warehouse.longitude}
                    warehouseName={sessionInfo.warehouse.name}
                    driverLat={driverCoords?.lat ?? null}
                    driverLng={driverCoords?.lng ?? null}
                    deliveryLat={deliveryCoords?.lat ?? null}
                    deliveryLng={deliveryCoords?.lng ?? null}
                    deliveryAddress={sessionInfo.delivery?.address}
                    className="absolute inset-0"
                    recenterOffset="top-36 right-3"
                    onRouteUpdate={handleRouteUpdate}
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-teal-900" />
            )}

            {/* Top overlay */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 via-black/20 to-transparent">
                <div className="flex items-start justify-between px-4 pt-10 pb-10">
                    <div>
                        <p className="text-white font-bold text-[15px] drop-shadow">📍 GEN-HUB</p>
                        {sessionInfo?.warehouse?.name && (
                            <p className="text-white/75 text-xs mt-0.5 max-w-[200px] truncate drop-shadow">
                                {sessionInfo.warehouse.name}
                            </p>
                        )}
                    </div>
                    <div className="pointer-events-auto flex items-center gap-2">
                        {status === "tracking" && (
                            <div className="flex items-center gap-1.5 bg-green-500/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full shadow">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                GPS bật
                            </div>
                        )}
                        {aiLoading && (
                            <div className="bg-white/20 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-full shadow animate-pulse">
                                ✨ AI...
                            </div>
                        )}
                        {aiAnalysis && !aiLoading && (
                            <div className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shadow backdrop-blur-sm ${
                                aiAnalysis.risk_level === "HIGH" ? "bg-red-500/90 text-white" :
                                aiAnalysis.risk_level === "MEDIUM" ? "bg-yellow-400/90 text-yellow-900" :
                                "bg-green-500/90 text-white"
                            }`}>
                                {aiAnalysis.risk_level === "HIGH" ? "🔴" : aiAnalysis.risk_level === "MEDIUM" ? "🟡" : "🟢"} AI
                            </div>
                        )}
                        {status === "requesting_permission" && (
                            <div className="bg-blue-500/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow animate-pulse">
                                Kết nối GPS...
                            </div>
                        )}
                        {status === "no_gps" && (
                            <div className="bg-red-500/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow">
                                Mất GPS
                            </div>
                        )}
                        {(status === "expired" || status === "error") && (
                            <div className="bg-orange-500/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow">
                                {status === "expired" ? "Hết hạn" : "Lỗi"}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Warning banners — xuất hiện trên bottom panel khi có bất thường */}
            {warnings.length > 0 && status === "tracking" && geofence !== "ARRIVED" && (
                <div className="absolute bottom-0 left-0 right-0 z-[19] px-4 pb-8">
                    <div className="mb-2 space-y-1.5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 140px)" }}>
                        {warnings.map((w) => {
                            const isDanger = w.includes("nhanh");
                            return (
                                <div
                                    key={w}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg ${
                                        isDanger
                                            ? "bg-red-500/92 text-white backdrop-blur-sm"
                                            : "bg-yellow-400/95 text-yellow-900 backdrop-blur-sm"
                                    }`}
                                >
                                    <span>{isDanger ? "🔴" : "⚠️"}</span>
                                    <span className="flex-1">{w}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bottom info panel — collapsible bottom sheet */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-8">
                <div className={[
                    "bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border-2 transition-colors duration-500",
                    geofence === "ARRIVED" ? "border-green-400" :
                    geofence === "APPROACHING" ? "border-yellow-400" : "border-transparent",
                ].join(" ")}>

                    {/* Drag handle */}
                    <button
                        className="w-full flex justify-center pt-2.5 pb-1"
                        onClick={() => setPanelExpanded(v => !v)}
                        aria-label={panelExpanded ? "Thu gọn" : "Mở rộng thông tin"}
                    >
                        <div className="w-10 h-1 rounded-full bg-gray-300" />
                    </button>

                    {/* Always-visible header: biển số + chip trạng thái */}
                    <button
                        className="w-full bg-teal-600 px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-teal-700 transition-colors"
                        onClick={() => setPanelExpanded(v => !v)}
                    >
                        <span className="font-mono font-bold text-white text-xl tracking-widest">
                            {sessionInfo?.license_plate ?? "—"}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Chip khoảng cách — chỉ hiện khi thu gọn */}
                            {!panelExpanded && distanceM !== null && (
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                    geofence === "ARRIVED" ? "bg-green-400/80 text-white" :
                                    geofence === "APPROACHING" ? "bg-yellow-300 text-yellow-900" :
                                    "bg-white/20 text-white"
                                }`}>
                                    {geofence === "ARRIVED" ? "✅ Đến nơi" :
                                     distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${distanceM} m`}
                                </span>
                            )}
                            {/* Chip tốc độ — chỉ hiện khi thu gọn */}
                            {!panelExpanded && speedKmh !== null && speedKmh > 1 && (
                                <span className="text-[11px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                                    {speedKmh.toFixed(0)} km/h
                                </span>
                            )}
                            {/* ETA từ Mapbox — chỉ hiện khi thu gọn */}
                            {!panelExpanded && roadDurationSec !== null && geofence !== "ARRIVED" && (
                                <span className="text-[11px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                                    ~{roadDurationSec < 60 ? "<1" : Math.round(roadDurationSec / 60)} phút
                                </span>
                            )}
                            {/* Đếm ngược — chỉ hiện khi thu gọn */}
                            {!panelExpanded && countdown && status !== "expired" && (
                                <div className="text-right">
                                    <div className="text-teal-200 text-[9px] leading-none">hết hạn</div>
                                    <div className="font-mono text-white text-xs font-semibold leading-tight">{countdown}</div>
                                </div>
                            )}
                            <span className="text-white/60 text-sm ml-1">{panelExpanded ? "↓" : "↑"}</span>
                        </div>
                    </button>

                    {/* Expandable content */}
                    {panelExpanded && (
                        <div className="px-5 py-4 space-y-3">
                            {/* Đếm ngược */}
                            {countdown && status !== "expired" && (
                                <div className="flex items-center justify-between bg-teal-100 rounded-xl px-4 py-2.5">
                                    <span className="text-xs text-teal-700 font-medium">Còn hiệu lực</span>
                                    <span className="font-mono text-teal-900 text-sm font-bold">{countdown}</span>
                                </div>
                            )}

                            {/* Cảnh báo bất thường */}
                            {warnings.length > 0 && status === "tracking" && geofence !== "ARRIVED" && (
                                <div className="space-y-1.5">
                                    {warnings.map((w) => {
                                        const isDanger = w.includes("nhanh");
                                        return (
                                            <div key={w} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                                                isDanger ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800"
                                            }`}>
                                                <span>{isDanger ? "🔴" : "⚠️"}</span>
                                                <span>{w}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* AI phân tích hành trình */}
                            {(aiAnalysis || aiLoading) && (
                                <div className={`rounded-xl px-4 py-3 space-y-1.5 ${
                                    aiLoading ? "bg-gray-100" :
                                    aiAnalysis?.risk_level === "HIGH" ? "bg-red-100" :
                                    aiAnalysis?.risk_level === "MEDIUM" ? "bg-yellow-100" : "bg-green-100"
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-semibold ${
                                            aiLoading ? "text-gray-500" :
                                            aiAnalysis?.risk_level === "HIGH" ? "text-red-700" :
                                            aiAnalysis?.risk_level === "MEDIUM" ? "text-yellow-700" : "text-green-700"
                                        }`}>
                                            ✨ AI Phân tích
                                        </span>
                                        {aiAnalysis && !aiLoading && (
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(aiAnalysis.analyzed_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        )}
                                    </div>
                                    {aiLoading ? (
                                        <p className="text-xs text-gray-400 animate-pulse">Đang phân tích hành trình...</p>
                                    ) : aiAnalysis && (
                                        <>
                                            <p className={`text-xs font-medium ${
                                                aiAnalysis.risk_level === "HIGH" ? "text-red-800" :
                                                aiAnalysis.risk_level === "MEDIUM" ? "text-yellow-800" : "text-green-800"
                                            }`}>{aiAnalysis.summary}</p>
                                            {aiAnalysis.warnings.length > 0 && (
                                                <ul className="space-y-0.5">
                                                    {aiAnalysis.warnings.map((w, i) => (
                                                        <li key={i} className="text-[11px] text-gray-700 flex items-start gap-1">
                                                            <span className="shrink-0">•</span><span>{w}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {aiAnalysis.eta_note && (
                                                <p className="text-[11px] text-gray-600 italic">{aiAnalysis.eta_note}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Trạng thái chờ / lỗi */}
                            {(status === "loading" || status === "requesting_permission") && (
                                <p className="text-sm text-gray-400 text-center animate-pulse">
                                    {status === "loading" ? "Đang tải phiên..." : "Đang yêu cầu quyền GPS..."}
                                </p>
                            )}
                            {status === "no_gps" && (
                                <p className="text-sm text-red-500 text-center">
                                    Vui lòng cấp quyền vị trí cho trình duyệt
                                </p>
                            )}
                            {status === "expired" && (
                                <p className="text-sm text-orange-500 font-medium text-center">
                                    Phiên theo dõi đã hết hạn
                                </p>
                            )}
                            {status === "error" && (
                                <p className="text-sm text-red-500 text-center">
                                    {errorMsg || "Lỗi không xác định"}
                                </p>
                            )}

                            {/* Số liệu khi đang theo dõi */}
                            {status === "tracking" && (
                                <div className="flex gap-2">
                                    {distanceM !== null && (
                                        <div className={[
                                            "flex-1 rounded-xl py-2.5 text-center",
                                            geofence === "ARRIVED" ? "bg-green-100" :
                                            geofence === "APPROACHING" ? "bg-yellow-100" : "bg-gray-100",
                                        ].join(" ")}>
                                            {geofence === "ARRIVED" ? (
                                                <>
                                                    <div className="text-xl">✅</div>
                                                    <div className="text-xs text-green-700 font-medium">Đến nơi</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className={`font-bold text-sm ${geofence === "APPROACHING" ? "text-yellow-700" : "text-gray-700"}`}>
                                                        {distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${distanceM} m`}
                                                    </div>
                                                    <div className={`text-[11px] font-medium ${geofence === "APPROACHING" ? "text-yellow-600" : "text-gray-500"}`}>
                                                        {geofence === "APPROACHING" ? "Gần kho" : "đến kho"}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {speedKmh !== null && (
                                        <div className="flex-1 rounded-xl py-2.5 text-center bg-blue-100">
                                            <div className="font-bold text-sm text-blue-800">
                                                {speedKmh.toFixed(0)}<span className="text-xs font-normal"> km/h</span>
                                            </div>
                                            <div className="text-[11px] font-medium text-blue-600">Tốc độ</div>
                                        </div>
                                    )}
                                    {lastSent && (
                                        <div className="flex-1 rounded-xl py-2.5 text-center bg-gray-100">
                                            <div className="font-semibold text-xs text-gray-800">
                                                {lastSent.toLocaleTimeString("vi-VN", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    second: "2-digit",
                                                })}
                                            </div>
                                            <div className="text-[11px] font-medium text-gray-500">Gửi lúc</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Khoảng cách đường bộ + ETA từ Mapbox Directions (driving-traffic) */}
                            {status === "tracking" && (roadDistanceM !== null || roadDurationSec !== null) && geofence !== "ARRIVED" && (
                                <div className="flex gap-2">
                                    {roadDistanceM !== null && (
                                        <div className="flex-1 rounded-xl py-2.5 text-center bg-indigo-100">
                                            <div className="font-bold text-sm text-indigo-800">
                                                {roadDistanceM >= 1000
                                                    ? `${(roadDistanceM / 1000).toFixed(1)} km`
                                                    : `${Math.round(roadDistanceM)} m`}
                                            </div>
                                            <div className="text-[11px] font-medium text-indigo-600">Đường bộ</div>
                                        </div>
                                    )}
                                    {roadDurationSec !== null && (
                                        <div className="flex-1 rounded-xl py-2.5 text-center bg-violet-100">
                                            <div className="font-bold text-sm text-violet-800">
                                                {roadDurationSec < 60
                                                    ? "<1 phút"
                                                    : `~${Math.round(roadDurationSec / 60)} phút`}
                                            </div>
                                            <div className="text-[11px] font-medium text-violet-600">Dự kiến đến</div>
                                        </div>
                                    )}
                                    <div className="flex-1 rounded-xl py-2.5 text-center bg-sky-100 flex flex-col items-center justify-center">
                                        <div className="text-[10px] text-sky-500 font-medium leading-tight">Mapbox</div>
                                        <div className="text-[9px] text-sky-400 leading-tight">traffic</div>
                                    </div>
                                </div>
                            )}

                            {sessionInfo?.warehouse?.address && (
                                <p className="text-[11px] text-gray-500 text-center truncate">
                                    📦 {sessionInfo.warehouse.address}
                                </p>
                            )}
                            {sessionInfo?.delivery?.address && (
                                <p className="text-[11px] text-orange-500 text-center truncate font-medium">
                                    📍 {sessionInfo.delivery.address}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-center text-white/50 text-[10px] mt-3 drop-shadow">
                    Giữ trang mở để tiếp tục gửi vị trí
                </p>
            </div>
        </div>
    );
}
