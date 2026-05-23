"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { GpsService } from "@/services/gps/gps.service";
import type { GpsSessionInfo } from "@/services/gps/gps.service";
import { DriverTrackingMap } from "@/components/track/DriverTrackingMap";

const gpsService = new GpsService();

const GPS_INTERVAL_MS = 30_000; // 30 giây

type TrackingStatus =
    | "loading"
    | "requesting_permission"
    | "tracking"
    | "no_gps"
    | "expired"
    | "error";

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

    const watchIdRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastPositionRef = useRef<GeolocationPosition | null>(null);
    // Client-side rate limit — tránh spam server (server giới hạn 30s/request)
    const lastApiCallRef = useRef<number>(0);

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
                    recenterOffset="top-20 right-3"
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
                    <div className="pointer-events-auto">
                        {status === "tracking" && (
                            <div className="flex items-center gap-1.5 bg-green-500/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full shadow">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                GPS bật
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

            {/* Bottom info panel */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-8">
                <div className={[
                    "bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border-2 transition-colors duration-500",
                    geofence === "ARRIVED" ? "border-green-400" :
                    geofence === "APPROACHING" ? "border-yellow-400" : "border-transparent",
                ].join(" ")}>
                    {/* Biển số + đếm ngược */}
                    <div className="bg-teal-600 px-5 py-3 flex items-center justify-between gap-4">
                        <span className="font-mono font-bold text-white text-xl tracking-widest">
                            {sessionInfo?.license_plate ?? "—"}
                        </span>
                        {countdown && status !== "expired" && (
                            <div className="text-right shrink-0">
                                <div className="text-teal-200 text-[10px] leading-none">Còn hiệu lực</div>
                                <div className="font-mono text-white text-sm font-semibold leading-tight mt-0.5">
                                    {countdown}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-4 space-y-3">
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
                                        geofence === "ARRIVED" ? "bg-green-50" :
                                        geofence === "APPROACHING" ? "bg-yellow-50" : "bg-gray-50",
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
                                                <div className={`text-[11px] ${geofence === "APPROACHING" ? "text-yellow-500" : "text-gray-400"}`}>
                                                    {geofence === "APPROACHING" ? "Gần kho" : "đến kho"}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                                {speedKmh !== null && (
                                    <div className="flex-1 rounded-xl py-2.5 text-center bg-blue-50">
                                        <div className="font-bold text-sm text-blue-700">
                                            {speedKmh.toFixed(0)}<span className="text-xs font-normal"> km/h</span>
                                        </div>
                                        <div className="text-[11px] text-blue-400">Tốc độ</div>
                                    </div>
                                )}
                                {lastSent && (
                                    <div className="flex-1 rounded-xl py-2.5 text-center bg-gray-50">
                                        <div className="font-medium text-xs text-gray-600">
                                            {lastSent.toLocaleTimeString("vi-VN", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                            })}
                                        </div>
                                        <div className="text-[11px] text-gray-400">Gửi lúc</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {sessionInfo?.warehouse?.address && (
                            <p className="text-[11px] text-gray-400 text-center truncate">
                                📦 {sessionInfo.warehouse.address}
                            </p>
                        )}
                        {sessionInfo?.delivery?.address && (
                            <p className="text-[11px] text-orange-500 text-center truncate font-medium">
                                📍 {sessionInfo.delivery.address}
                            </p>
                        )}
                    </div>
                </div>

                <p className="text-center text-white/50 text-[10px] mt-3 drop-shadow">
                    Giữ trang mở để tiếp tục gửi vị trí
                </p>
            </div>
        </div>
    );
}
