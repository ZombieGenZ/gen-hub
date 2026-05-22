"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { GpsService } from "@/services/gps/gps.service";
import type { GpsSessionInfo } from "@/services/gps/gps.service";

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

    const watchIdRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastPositionRef = useRef<GeolocationPosition | null>(null);

    // Lấy thông tin session
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

        const sendPosition = async (pos: GeolocationPosition) => {
            lastPositionRef.current = pos;
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
                // bỏ qua lỗi gửi vị trí đơn lẻ
            }
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                setStatus("tracking");
                void sendPosition(pos);
            },
            () => {
                setStatus("no_gps");
            },
            { enableHighAccuracy: true, timeout: 10_000 },
        );

        // Gửi lại mỗi 30s ngay cả khi vị trí không đổi
        intervalRef.current = setInterval(() => {
            if (lastPositionRef.current) {
                void sendPosition(lastPositionRef.current);
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
    const bgColor =
        geofence === "ARRIVED"
            ? "bg-green-50"
            : geofence === "APPROACHING"
            ? "bg-yellow-50"
            : "bg-gray-50";

    return (
        <div className={`min-h-screen ${bgColor} flex flex-col items-center justify-center p-6`}>
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-teal-600 px-6 py-5 text-white text-center">
                    <div className="text-2xl mb-1">📍</div>
                    <h1 className="text-lg font-bold">GEN-HUB Tracking</h1>
                    {sessionInfo?.warehouse && (
                        <p className="text-teal-100 text-sm mt-1 truncate">
                            {sessionInfo.warehouse.name}
                        </p>
                    )}
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* Biển số */}
                    {sessionInfo?.license_plate && (
                        <div className="text-center">
                            <span className="inline-block bg-gray-100 font-mono font-bold text-xl px-4 py-2 rounded-lg tracking-widest">
                                {sessionInfo.license_plate}
                            </span>
                        </div>
                    )}

                    {/* Địa chỉ kho */}
                    {sessionInfo?.warehouse?.address && (
                        <p className="text-xs text-center text-muted-foreground">
                            {sessionInfo.warehouse.address}
                        </p>
                    )}

                    {/* Trạng thái GPS */}
                    <div className="rounded-xl border p-4 text-center space-y-1">
                        {status === "loading" && (
                            <p className="text-sm text-gray-500">Đang tải...</p>
                        )}
                        {status === "requesting_permission" && (
                            <p className="text-sm text-blue-600 animate-pulse">
                                Đang yêu cầu quyền GPS...
                            </p>
                        )}
                        {status === "tracking" && (
                            <>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block" />
                                    <span className="text-sm font-medium text-green-700">
                                        Đang gửi vị trí
                                    </span>
                                </div>
                                {lastSent && (
                                    <p className="text-xs text-gray-400">
                                        Cập nhật lúc:{" "}
                                        {lastSent.toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </p>
                                )}
                            </>
                        )}
                        {status === "no_gps" && (
                            <p className="text-sm text-red-500">
                                Không thể truy cập GPS. Vui lòng cấp quyền vị trí cho trình duyệt.
                            </p>
                        )}
                        {status === "expired" && (
                            <p className="text-sm text-orange-500 font-medium">
                                Phiên theo dõi đã hết hạn.
                            </p>
                        )}
                        {status === "error" && (
                            <p className="text-sm text-red-500">{errorMsg || "Lỗi không xác định"}</p>
                        )}
                    </div>

                    {/* Khoảng cách đến kho */}
                    {distanceM !== null && status === "tracking" && (
                        <div
                            className={`rounded-xl p-3 text-center text-sm font-medium ${
                                geofence === "ARRIVED"
                                    ? "bg-green-100 text-green-700"
                                    : geofence === "APPROACHING"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                        >
                            {geofence === "ARRIVED" ? (
                                <span>✅ Đã đến khu vực kho</span>
                            ) : geofence === "APPROACHING" ? (
                                <span>🚚 Gần kho — còn {distanceM}m</span>
                            ) : (
                                <span>Cách kho {(distanceM / 1000).toFixed(1)} km</span>
                            )}
                        </div>
                    )}

                    {/* Đếm ngược hết hạn */}
                    {countdown && status !== "expired" && (
                        <div className="text-center">
                            <p className="text-xs text-gray-400">Còn hiệu lực</p>
                            <p className="font-mono text-lg font-semibold text-gray-700">
                                {countdown}
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-5 text-center">
                    <p className="text-xs text-gray-300">
                        Giữ trang này mở để tiếp tục gửi vị trí
                    </p>
                </div>
            </div>
        </div>
    );
}
