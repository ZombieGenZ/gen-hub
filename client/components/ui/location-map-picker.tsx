"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Map, { Marker, MapRef, ViewStateChangeEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MagnifyingGlassIcon, MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Default to Ho Chi Minh City
const DEFAULT_CENTER = { latitude: 10.7769, longitude: 106.7009 };
const DEFAULT_ZOOM = 12;

interface Suggestion {
    mapbox_id: string;
    name: string;
    full_address: string;
    place_formatted: string;
}

export interface LocationData {
    latitude: number;
    longitude: number;
    address_detail: string;
    province_name: string;
    district_name: string;
    ward_name: string;
    full_address: string;
}

interface LocationMapPickerProps {
    latitude?: number;
    longitude?: number;
    onLocationChange: (data: LocationData) => void;
    height?: string;
}

export function LocationMapPicker({
    latitude,
    longitude,
    onLocationChange,
    height = "320px",
}: LocationMapPickerProps) {
    const mapRef = useRef<MapRef>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const hasValidCoords = latitude && longitude && latitude !== 0 && longitude !== 0;

    const [viewState, setViewState] = useState({
        latitude: hasValidCoords ? latitude : DEFAULT_CENTER.latitude,
        longitude: hasValidCoords ? longitude : DEFAULT_CENTER.longitude,
        zoom: hasValidCoords ? 14 : DEFAULT_ZOOM,
    });

    const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(
        hasValidCoords ? { lat: latitude, lng: longitude } : null
    );

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Location detail state
    const [locationInfo, setLocationInfo] = useState<{
        province: string;
        district: string;
        ward: string;
        address: string;
    } | null>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync marker when external data changes (edit mode)
    useEffect(() => {
        if (hasValidCoords) {
            setMarkerPos({ lat: latitude, lng: longitude });
            setViewState((prev) => ({
                ...prev,
                latitude,
                longitude,
                zoom: 14,
            }));
        }
    }, [latitude, longitude]);

    // ── Mapbox Search Box API: Suggest ──
    const fetchSuggestions = useCallback(async (query: string) => {
        if (!query.trim() || !MAPBOX_TOKEN) {
            setSuggestions([]);
            return;
        }

        // Cancel previous request
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setIsSearching(true);
        try {
            const params = new URLSearchParams({
                q: query,
                access_token: MAPBOX_TOKEN,
                session_token: getSessionToken(),
                language: "vi",
                country: "VN",
                limit: "5",
                types: "address,poi,place,street,locality,neighborhood",
            });

            const res = await fetch(
                `https://api.mapbox.com/search/searchbox/v1/suggest?${params}`,
                { signal: abortRef.current.signal }
            );
            const data = await res.json();

            if (data.suggestions) {
                setSuggestions(data.suggestions);
                setShowDropdown(true);
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                console.error("Search suggest error:", err);
            }
        } finally {
            setIsSearching(false);
        }
    }, []);

    // ── Mapbox Search Box API: Retrieve (extracts province/district/ward) ──
    const retrieveLocation = useCallback(async (suggestion: Suggestion) => {
        if (!MAPBOX_TOKEN) return;

        try {
            const params = new URLSearchParams({
                access_token: MAPBOX_TOKEN,
                session_token: getSessionToken(),
                language: "vi",
            });

            const res = await fetch(
                `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?${params}`
            );
            const data = await res.json();

            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                const [lng, lat] = feature.geometry.coordinates;
                const roundedLat = parseFloat(lat.toFixed(6));
                const roundedLng = parseFloat(lng.toFixed(6));
                const context = feature.properties?.context || {};

                // Extract administrative data from Mapbox context
                const province = context.region?.name || "";
                const district = context.district?.name || context.place?.name || "";
                const ward = context.neighborhood?.name || context.locality?.name || "";
                const addressText = feature.properties?.full_address
                    || suggestion.full_address
                    || suggestion.place_formatted
                    || suggestion.name;

                setMarkerPos({ lat: roundedLat, lng: roundedLng });
                setSearchQuery(suggestion.name);
                setShowDropdown(false);
                setSuggestions([]);
                setLocationInfo({ province, district, ward, address: addressText });

                // Fly to location
                setViewState((prev) => ({
                    ...prev,
                    latitude: roundedLat,
                    longitude: roundedLng,
                    zoom: 16,
                }));

                onLocationChange({
                    latitude: roundedLat,
                    longitude: roundedLng,
                    address_detail: addressText,
                    province_name: province,
                    district_name: district,
                    ward_name: ward,
                    full_address: addressText,
                });
            }
        } catch (err) {
            console.error("Search retrieve error:", err);
        }
    }, [onLocationChange]);

    // ── Reverse geocode (when user clicks on map) ──
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        if (!MAPBOX_TOKEN) return;

        try {
            const params = new URLSearchParams({
                access_token: MAPBOX_TOKEN,
                language: "vi",
                types: "address,poi,place,locality,neighborhood",
            });

            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`
            );
            const data = await res.json();

            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                const context = feature.context || [];

                // Parse context array for administrative divisions
                let province = "";
                let district = "";
                let ward = "";

                for (const ctx of context) {
                    const id = ctx.id || "";
                    const text = ctx.text_vi || ctx.text || "";
                    if (id.startsWith("region")) province = text;
                    else if (id.startsWith("district")) district = text;
                    else if (id.startsWith("place")) {
                        if (!district) district = text;
                    }
                    else if (id.startsWith("neighborhood") || id.startsWith("locality")) {
                        if (!ward) ward = text;
                    }
                }

                const addressText = feature.place_name_vi || feature.place_name || "";

                setLocationInfo({ province, district, ward, address: addressText });
                setSearchQuery(feature.text_vi || feature.text || "");

                onLocationChange({
                    latitude: lat,
                    longitude: lng,
                    address_detail: addressText,
                    province_name: province,
                    district_name: district,
                    ward_name: ward,
                    full_address: addressText,
                });
            }
        } catch (err) {
            console.error("Reverse geocode error:", err);
            // Still update coordinates even if reverse geocode fails
            onLocationChange({
                latitude: lat,
                longitude: lng,
                address_detail: "",
                province_name: "",
                district_name: "",
                ward_name: "",
                full_address: "",
            });
        }
    }, [onLocationChange]);

    // Debounced search on input change
    const handleSearchInput = useCallback(
        (value: string) => {
            setSearchQuery(value);

            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (!value.trim()) {
                setSuggestions([]);
                setShowDropdown(false);
                return;
            }

            debounceRef.current = setTimeout(() => {
                fetchSuggestions(value);
            }, 300);
        },
        [fetchSuggestions]
    );

    // Clear search
    const handleClearSearch = useCallback(() => {
        setSearchQuery("");
        setSuggestions([]);
        setShowDropdown(false);
    }, []);

    // Click on map → place marker + reverse geocode
    const handleMapClick = useCallback(
        (event: any) => {
            const { lngLat } = event;
            const lat = parseFloat(lngLat.lat.toFixed(6));
            const lng = parseFloat(lngLat.lng.toFixed(6));
            setMarkerPos({ lat, lng });
            reverseGeocode(lat, lng);
        },
        [reverseGeocode]
    );

    // Drag marker → reverse geocode
    const handleMarkerDragEnd = useCallback(
        (event: any) => {
            const { lngLat } = event;
            const lat = parseFloat(lngLat.lat.toFixed(6));
            const lng = parseFloat(lngLat.lng.toFixed(6));
            setMarkerPos({ lat, lng });
            reverseGeocode(lat, lng);
        },
        [reverseGeocode]
    );

    if (!MAPBOX_TOKEN) {
        return (
            <div
                className="flex items-center justify-center bg-slate-100 border border-dashed border-slate-300"
                style={{ height, borderRadius: "16px" }}
            >
                <p className="text-slate-500 text-sm">
                    ⚠️ Thiếu NEXT_PUBLIC_MAPBOX_TOKEN trong .env.local
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* ── Search Bar ── */}
            <div ref={searchRef} className="relative">
                <div
                    className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2.5 transition-all focus-within:border-slate-400 focus-within:shadow-sm"
                    style={{ borderRadius: "12px" }}
                >
                    <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        onFocus={() => {
                            if (suggestions.length > 0) setShowDropdown(true);
                        }}
                        placeholder="Tìm kiếm địa điểm..."
                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                    {isSearching && (
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin shrink-0" />
                    )}
                    {searchQuery && !isSearching && (
                        <button
                            onClick={handleClearSearch}
                            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* ── Dropdown Suggestions ── */}
                {showDropdown && suggestions.length > 0 && (
                    <div
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl overflow-hidden z-50 animate-in slide-in-from-top-1 duration-150"
                        style={{ borderRadius: "12px" }}
                    >
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={suggestion.mapbox_id}
                                onClick={() => retrieveLocation(suggestion)}
                                className={`w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-slate-50 transition-colors ${index < suggestions.length - 1 ? "border-b border-slate-100" : ""
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <MapPinIcon className="w-4 h-4 text-red-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                        {suggestion.name}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                        {suggestion.full_address || suggestion.place_formatted}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Map ── */}
            <div
                className="relative overflow-hidden"
                style={{ height, borderRadius: "16px" }}
            >
                <Map
                    {...viewState}
                    onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
                    onClick={handleMapClick}
                    style={{ width: "100%", height: "100%" }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    ref={mapRef}
                    onLoad={() => mapRef.current?.resize()}
                >
                    {markerPos && (
                        <Marker
                            longitude={markerPos.lng}
                            latitude={markerPos.lat}
                            anchor="bottom"
                            draggable
                            onDragEnd={handleMarkerDragEnd}
                        >
                            {/* Custom pin */}
                            <div className="flex flex-col items-center animate-in zoom-in-50 duration-200">
                                <div className="w-8 h-8 rounded-full bg-red-500 border-[3px] border-white shadow-lg flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500 -mt-[2px]" />
                            </div>
                        </Marker>
                    )}
                </Map>

                {/* Instruction overlay */}
                {!markerPos && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full">
                            Tìm kiếm hoặc nhấn vào bản đồ để chọn vị trí
                        </div>
                    </div>
                )}
            </div>

            {/* ── Location Info ── */}
            {markerPos && (
                <div className="space-y-2">
                    {/* Province / District / Ward tags */}
                    {locationInfo && (locationInfo.province || locationInfo.district || locationInfo.ward) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {locationInfo.province && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium" style={{ borderRadius: "8px" }}>
                                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                    {locationInfo.province}
                                </span>
                            )}
                            {locationInfo.district && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium" style={{ borderRadius: "8px" }}>
                                    {locationInfo.district}
                                </span>
                            )}
                            {locationInfo.ward && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium" style={{ borderRadius: "8px" }}>
                                    {locationInfo.ward}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Address + Coordinates */}
                    <div className="flex items-center justify-between text-sm text-slate-600">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-500">Lat:</span>
                                <span className="font-semibold text-slate-800">{markerPos.lat}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-500">Lng:</span>
                                <span className="font-semibold text-slate-800">{markerPos.lng}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Session token (reuse within a session for billing optimization) ──
let _sessionToken: string | null = null;
function getSessionToken(): string {
    if (!_sessionToken) {
        _sessionToken = crypto.randomUUID();
    }
    return _sessionToken;
}
