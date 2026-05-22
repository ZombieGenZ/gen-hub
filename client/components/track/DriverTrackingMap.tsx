"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface DriverTrackingMapProps {
    warehouseLat: number;
    warehouseLng: number;
    warehouseName: string;
    driverLat: number | null;
    driverLng: number | null;
}

export function DriverTrackingMap({
    warehouseLat,
    warehouseLng,
    warehouseName,
    driverLat,
    driverLng,
}: DriverTrackingMapProps) {
    const mapRef = useRef<MapRef>(null);
    // Sau lần fit đầu tiên, bật auto-follow tài xế
    const [isFollowing, setIsFollowing] = useState(false);
    const hasFittedRef = useRef(false);

    // Lần đầu có vị trí tài xế: fit bounds để thấy cả 2 điểm, rồi bật follow
    useEffect(() => {
        if (hasFittedRef.current) return;
        if (driverLat === null || driverLng === null) return;
        const map = mapRef.current;
        if (!map) return;

        hasFittedRef.current = true;
        const minLat = Math.min(driverLat, warehouseLat);
        const maxLat = Math.max(driverLat, warehouseLat);
        const minLng = Math.min(driverLng, warehouseLng);
        const maxLng = Math.max(driverLng, warehouseLng);

        map.fitBounds(
            [[minLng, minLat], [maxLng, maxLat]],
            { padding: 70, maxZoom: 15, duration: 900 },
        );

        // Sau khi fit xong, bật follow
        setTimeout(() => setIsFollowing(true), 1000);
    }, [driverLat, driverLng, warehouseLat, warehouseLng]);

    // Auto-follow: di chuyển viewport đến vị trí tài xế mỗi khi có update
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

    // Khi user kéo map thủ công → tắt follow
    const handleDragStart = useCallback(() => {
        setIsFollowing(false);
    }, []);

    const handleRecenter = useCallback(() => {
        setIsFollowing(true);
    }, []);

    if (!MAPBOX_TOKEN) {
        return (
            <div className="h-44 rounded-xl border flex items-center justify-center bg-muted/30 text-xs text-muted-foreground">
                Chưa cấu hình bản đồ
            </div>
        );
    }

    return (
        <div className="relative h-44 rounded-xl overflow-hidden border shadow-sm">
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
                {/* Marker kho */}
                <Marker latitude={warehouseLat} longitude={warehouseLng} anchor="bottom">
                    <div className="flex flex-col items-center">
                        <div className="bg-teal-600 text-white text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shadow-md">
                            📦 {warehouseName}
                        </div>
                        <div className="w-px h-2 bg-teal-600" />
                    </div>
                </Marker>

                {/* Marker tài xế — cập nhật mỗi khi watchPosition fires */}
                {driverLat !== null && driverLng !== null && (
                    <Marker latitude={driverLat} longitude={driverLng} anchor="center">
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="text-[11px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium shadow-md whitespace-nowrap">
                                🚚 Bạn
                            </div>
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
                        </div>
                    </Marker>
                )}
            </Map>

            {/* Nút re-center — hiện khi user đã kéo map */}
            {!isFollowing && driverLat !== null && (
                <button
                    onClick={handleRecenter}
                    className="absolute bottom-2 right-2 z-10 bg-white text-blue-600 text-[11px] font-medium px-2.5 py-1.5 rounded-full shadow-md border border-blue-100 hover:bg-blue-50 transition-colors"
                >
                    📍 Theo dõi
                </button>
            )}

            {/* Badge trạng thái follow */}
            {isFollowing && driverLat !== null && (
                <div className="absolute bottom-2 right-2 z-10 bg-blue-600 text-white text-[10px] font-medium px-2 py-1 rounded-full shadow-md opacity-80">
                    ● Đang theo dõi
                </div>
            )}
        </div>
    );
}
