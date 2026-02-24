"use client";

import React, { useState, useEffect } from "react";
import { ArrowRightIcon, XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

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
import { authStorage } from "@/services/auth/auth-storage.service";
import type { User } from "@/types/user/user.type";
import { useDebounce } from "@/hooks/use-debounce";

const userService = new UserService();

interface WarehouseOverviewTabProps {
    data: Record<string, any>;
    onChange: (updates: Record<string, any>) => void;
}

export function WarehouseOverviewTab({ data, onChange }: WarehouseOverviewTabProps) {

    const handleChange = (field: string, value: any) => {
        onChange({ [field]: value });
    };

    const handleLocationChange = (locationData: LocationData) => {
        onChange({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            address_detail: locationData.address_detail,
            province_name: locationData.province_name,
            district_name: locationData.district_name,
            ward_name: locationData.ward_name,
        });
    };

    // ── Manager User Selector ──
    const [managerSearch, setManagerSearch] = useState("");
    const [managerResults, setManagerResults] = useState<User[]>([]);
    const [initialUsers, setInitialUsers] = useState<User[]>([]);
    const [isSearchingManager, setIsSearchingManager] = useState(false);
    const [isLoadingInitialUsers, setIsLoadingInitialUsers] = useState(true);
    const debouncedManagerSearch = useDebounce(managerSearch, 400);

    // Selected manager (from data or selection)
    const selectedManager: User | null = data.manager_user || null;

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

                        {/* Block size + Price — 3 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <CardContent>
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
