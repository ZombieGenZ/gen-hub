"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, MagnifyingGlassIcon, MapPinIcon } from "@heroicons/react/24/outline";

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { LocationMapPicker, type LocationData } from "@/components/ui/location-map-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ── Service & types ──
import { UserService } from "@/services/user/user.service";
import { LocationService } from "@/services/location/location.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import type { User } from "@/types/user/user.type";
import type { Ward } from "@/types/location/wards.type";
import { useDebounce } from "@/hooks/use-debounce";

const userService = new UserService();
const locationService = new LocationService();

interface WarehouseOverviewTabProps {
    data: Record<string, any>;
    onChange: (updates: Record<string, any>) => void;
}

export function WarehouseOverviewTab({ data, onChange }: WarehouseOverviewTabProps) {

    const handleChange = (field: string, value: any) => {
        onChange({ [field]: value });
    };

    // ── Ward Picker state (declared early — used in handleLocationChange below) ──
    const [wardSearch, setWardSearch] = useState("");
    const [wardResults, setWardResults] = useState<Ward[]>([]);
    const [isSearchingWard, setIsSearchingWard] = useState(false);
    const [showWardDropdown, setShowWardDropdown] = useState(false);
    const debouncedWardSearch = useDebounce(wardSearch, 400);

    const currentWard: { id: string; name: string; province?: { name: string } } | null =
        data.ward_selected || data.ward || null;

    const handleLocationChange = async (locationData: LocationData) => {
        // 1. Immediately update coord + address text fields
        onChange({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            address_detail: locationData.full_address || locationData.address_detail,
            province_name: locationData.province_name,
            district_name: locationData.district_name,
            ward_name: locationData.ward_name,
        });

        // 2. Auto-lookup ward_id from DB — try sequential strategies
        // Strategy A: ward_name from Mapbox neighborhood/locality context (best case)
        let wardKeyword = locationData.ward_name?.trim() || "";

        // Strategy B: Parse full_address for "Phường X / Xã X / Thị trấn X" pattern
        if (!wardKeyword && locationData.full_address) {
            const wardMatch = locationData.full_address.match(
                /\b(Phường|Xã|Thị tr[aă]n|Thị xã)\s+([^,]+)/i
            );
            if (wardMatch) wardKeyword = wardMatch[0].trim();
        }

        // Strategy C: Vietnamese address format is usually "street, ward_name, postal, city..."
        // Grab the second segment (index 1) after splitting by comma
        if (!wardKeyword && locationData.full_address) {
            const parts = locationData.full_address.split(",").map((s) => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                const candidate = parts[1]; // e.g. "Bến Nghé", "Phường 14"
                // Only use if it's not a number (postal code) and not too long
                if (candidate && isNaN(Number(candidate)) && candidate.length < 40) {
                    wardKeyword = candidate;
                }
            }
        }

        if (wardKeyword) {
            try {
                const list: Ward[] = await locationService.getWards({ keywords: wardKeyword });

                // Match: exact → contains-either-way → first result
                const match =
                    list.find((w) => w.name.toLowerCase() === wardKeyword.toLowerCase()) ||
                    list.find(
                        (w) =>
                            w.name.toLowerCase().includes(wardKeyword.toLowerCase()) ||
                            wardKeyword.toLowerCase().includes(w.name.toLowerCase())
                    ) ||
                    list[0];

                if (match) {
                    onChange({ ward_id: match.id, ward_selected: match });
                    return;
                }
            } catch { /* silently ignore */ }
        }

        // Fallback: pre-fill search box so dropdown opens for manual pick
        if (wardKeyword) {
            setWardSearch(wardKeyword);
        }
    };
    useEffect(() => {
        if (!debouncedWardSearch.trim()) {
            setWardResults([]);
            setShowWardDropdown(false);
            return;
        }
        const search = async () => {
            setIsSearchingWard(true);
            try {
                const list: Ward[] = await locationService.getWards({ keywords: debouncedWardSearch });
                setWardResults(list);
                setShowWardDropdown(true);
            } catch {
                setWardResults([]);
            } finally {
                setIsSearchingWard(false);
            }
        };
        search();
    }, [debouncedWardSearch]);

    const handleSelectWard = (ward: Ward) => {
        onChange({ ward_id: ward.id, ward_selected: ward });
        setWardSearch("");
        setWardResults([]);
        setShowWardDropdown(false);
    };

    const handleClearWard = () => {
        onChange({ ward_id: "", ward_selected: null });
    };

    // ── Manager User Selector ──
    const [managerSearch, setManagerSearch] = useState("");
    const [managerResults, setManagerResults] = useState<User[]>([]);
    const [initialUsers, setInitialUsers] = useState<User[]>([]);
    const [isSearchingManager, setIsSearchingManager] = useState(false);
    const [isLoadingInitialUsers, setIsLoadingInitialUsers] = useState(true);
    const debouncedManagerSearch = useDebounce(managerSearch, 400);

    // Selected manager: from data.managers[0].user (API) or freshly picked via UI
    type ManagerUser = Pick<User, 'id' | 'name' | 'email'> & { avatar?: string };
    const selectedManager: ManagerUser | null =
        (data.manager_user as ManagerUser | undefined) ||
        (data.managers?.[0]?.user as ManagerUser | undefined) ||
        null;

    // Load initial list of users on mount
    useEffect(() => {
        const loadInitialUsers = async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;

            setIsLoadingInitialUsers(true);
            try {
                const results = await userService.searchUsers(token, "");
                setInitialUsers(results);
            } catch {
                setInitialUsers([]);
            } finally {
                setIsLoadingInitialUsers(false);
            }
        };
        loadInitialUsers();
    }, []);

    // Search users when typing
    useEffect(() => {
        if (!debouncedManagerSearch.trim()) {
            setManagerResults([]);
            return;
        }

        const searchUsers = async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;

            setIsSearchingManager(true);
            try {
                const results = await userService.searchUsers(token, debouncedManagerSearch);
                setManagerResults(results);
            } catch {
                setManagerResults([]);
            } finally {
                setIsSearchingManager(false);
            }
        };

        searchUsers();
    }, [debouncedManagerSearch]);

    // Display list: search results if searching, otherwise initial list
    const displayedUsers = debouncedManagerSearch.trim() ? managerResults : initialUsers;

    const handleSelectManager = (user: User) => {
        onChange({
            manager_user: user,
            manager_name: user.name,
            manager_email: user.email,
            manager_phone: "",
        });
        setManagerSearch("");
        setManagerResults([]);
    };

    const handleRemoveManager = () => {
        onChange({
            manager_user: null,
            manager_name: "",
            manager_email: "",
            manager_phone: "",
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map(w => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Left Column (2/3) ── */}
            <div className="lg:col-span-2 space-y-6">
                {/* Basic Info */}
                <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                    <CardHeader>
                        <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên kho *</Label>
                            <Input
                                id="name"
                                value={data.name || ""}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="Nhập tên kho..."
                                style={{ borderRadius: "12px" }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Mô tả</Label>
                            <Textarea
                                id="description"
                                value={data.description || ""}
                                onChange={(e) => handleChange("description", e.target.value)}
                                placeholder="Mô tả chi tiết..."
                                rows={3}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address_detail">Địa chỉ chi tiết</Label>
                            <Input
                                id="address_detail"
                                value={data.address_detail || ""}
                                onChange={(e) => handleChange("address_detail", e.target.value)}
                                placeholder="Tự điền khi chọn trên bản đồ, hoặc nhập tay..."
                                style={{ borderRadius: "12px" }}
                            />
                        </div>

                        {/* Dimensions — 3 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Chiều dài</Label>
                                <FormattedNumberInput
                                    value={data.length}
                                    onChange={(v) => handleChange("length", v)}
                                    suffix="m"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Chiều rộng</Label>
                                <FormattedNumberInput
                                    value={data.width}
                                    onChange={(v) => handleChange("width", v)}
                                    suffix="m"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Chiều cao trần</Label>
                                <FormattedNumberInput
                                    value={data.ceiling_height}
                                    onChange={(v) => handleChange("ceiling_height", v)}
                                    suffix="m"
                                />
                            </div>
                        </div>

                        {/* Block size + Price + Max Load — 4 columns */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Block dài</Label>
                                <FormattedNumberInput
                                    value={data.block_length}
                                    onChange={(v) => handleChange("block_length", v)}
                                    suffix="m"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Block rộng</Label>
                                <FormattedNumberInput
                                    value={data.block_width}
                                    onChange={(v) => handleChange("block_width", v)}
                                    suffix="m"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tải trọng tối đa</Label>
                                <FormattedNumberInput
                                    value={data.max_load_capacity}
                                    onChange={(v) => handleChange("max_load_capacity", v)}
                                    suffix="tấn"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Giá/tháng</Label>
                                <FormattedNumberInput
                                    value={data.price_per_month}
                                    onChange={(v) => handleChange("price_per_month", v)}
                                    suffix="đ"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Location */}
                <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                    <CardHeader>
                        <CardTitle className="text-lg">Vị trí</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Ward Picker */}
                        <div className="space-y-2">
                            <Label>Phường / Xã</Label>

                            {/* Current ward badge */}
                            {currentWard && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#0F766E]/20 bg-[#0F766E]/5">
                                    <MapPinIcon className="w-4 h-4 text-[#0F766E] flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium truncate">{currentWard.name}</span>
                                        {currentWard.province && (
                                            <span className="text-xs text-muted-foreground ml-1">— {currentWard.province.name}</span>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-6 w-6 rounded-full flex-shrink-0"
                                        onClick={handleClearWard}
                                    >
                                        <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                </div>
                            )}

                            {/* Search input */}
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm phường/xã..."
                                    value={wardSearch}
                                    onChange={(e) => setWardSearch(e.target.value)}
                                    className="pl-9"
                                    style={{ borderRadius: "12px" }}
                                />
                            </div>

                            {/* Dropdown results */}
                            {showWardDropdown && (
                                <div className="rounded-xl border divide-y max-h-[200px] overflow-y-auto">
                                    {isSearchingWard ? (
                                        <div className="px-4 py-3 text-sm text-muted-foreground text-center">Đang tìm...</div>
                                    ) : wardResults.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-muted-foreground text-center">Không tìm thấy kết quả</div>
                                    ) : (
                                        wardResults.map((ward) => (
                                            <button
                                                key={ward.id}
                                                className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
                                                onClick={() => handleSelectWard(ward)}
                                            >
                                                <MapPinIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                                <span className="font-medium">{ward.name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Map */}
                        <LocationMapPicker
                            latitude={data.latitude}
                            longitude={data.longitude}
                            onLocationChange={handleLocationChange}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* ── Right Column (1/3) ── */}
            <div className="space-y-6">
                {/* Status & Flags */}
                <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                    <CardHeader>
                        <CardTitle className="text-lg">Trạng thái & Loại</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="font-normal">Hoạt động</Label>
                            <Switch
                                checked={!!data.is_active}
                                onCheckedChange={(v) => handleChange("is_active", v)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label className="font-normal">Kho chia sẻ</Label>
                            <Switch
                                checked={!!data.is_shared_warehouse}
                                onCheckedChange={(v) => handleChange("is_shared_warehouse", v)}
                            />
                        </div>
                    </CardContent>
                </Card>



                <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                    <CardHeader>
                        <CardTitle className="text-lg">Quản lý kho</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Profile Card — shown when a manager is selected */}
                        {selectedManager && (
                            <div
                                className="flex items-center gap-3 p-3 rounded-xl border border-[#0F766E]/20 bg-[#0F766E]/5 transition-colors"
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={selectedManager.avatar} alt={selectedManager.name} />
                                    <AvatarFallback className="bg-[#0F766E] text-white text-sm font-medium">
                                        {getInitials(selectedManager.name || "?")}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{selectedManager.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{selectedManager.email}</div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full flex-shrink-0"
                                    onClick={handleRemoveManager}
                                >
                                    <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </div>
                        )}

                        {/* Search bar */}
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm người quản lý..."
                                value={managerSearch}
                                onChange={(e) => setManagerSearch(e.target.value)}
                                className="pl-9"
                                style={{ borderRadius: "12px" }}
                            />
                        </div>

                        {/* Inline user list */}
                        <div className="max-h-[280px] overflow-y-auto rounded-xl border divide-y">
                            {isSearchingManager || isLoadingInitialUsers ? (
                                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                    Đang tải...
                                </div>
                            ) : displayedUsers.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                    {managerSearch.trim() ? "Không tìm thấy user nào" : "Chưa có user"}
                                </div>
                            ) : (
                                displayedUsers.map((user) => {
                                    const isSelected = selectedManager?.id === user.id;
                                    return (
                                        <button
                                            key={user.id}
                                            className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors cursor-pointer ${isSelected
                                                ? "bg-[#0F766E]/5"
                                                : "hover:bg-muted/50"
                                                }`}
                                            onClick={() => handleSelectManager(user)}
                                        >
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                <AvatarFallback className="bg-[#0F766E]/10 text-[#0F766E] text-xs font-medium">
                                                    {getInitials(user.name || "?")}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{user.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                            </div>
                                            {isSelected && (
                                                <span className="text-xs text-[#0F766E] font-medium flex-shrink-0">Đã chọn</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
