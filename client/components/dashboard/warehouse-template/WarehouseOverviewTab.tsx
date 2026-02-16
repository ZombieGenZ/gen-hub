"use client";

import React from "react";

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { LocationMapPicker, type LocationData } from "@/components/ui/location-map-picker";

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
                            <Label className="font-normal">Kho lạnh</Label>
                            <Switch
                                checked={!!data.is_cold_storage}
                                onCheckedChange={(v) => handleChange("is_cold_storage", v)}
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

                {/* Environmental */}
                <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                    <CardHeader>
                        <CardTitle className="text-lg">Môi trường</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nhiệt độ min</Label>
                            <FormattedNumberInput
                                value={data.min_temperature}
                                onChange={(v) => handleChange("min_temperature", v)}
                                suffix="°C"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nhiệt độ max</Label>
                            <FormattedNumberInput
                                value={data.max_temperature}
                                onChange={(v) => handleChange("max_temperature", v)}
                                suffix="°C"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Độ ẩm min</Label>
                            <FormattedNumberInput
                                value={data.min_humidity}
                                onChange={(v) => handleChange("min_humidity", v)}
                                suffix="%"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Độ ẩm max</Label>
                            <FormattedNumberInput
                                value={data.max_humidity}
                                onChange={(v) => handleChange("max_humidity", v)}
                                suffix="%"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Manager */}
                <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                    <CardHeader>
                        <CardTitle className="text-lg">Quản lý kho</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Họ tên</Label>
                            <Input
                                value={data.manager_name || ""}
                                onChange={(e) => handleChange("manager_name", e.target.value)}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Điện thoại</Label>
                            <Input
                                value={data.manager_phone || ""}
                                onChange={(e) => handleChange("manager_phone", e.target.value)}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={data.manager_email || ""}
                                onChange={(e) => handleChange("manager_email", e.target.value)}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
