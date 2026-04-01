"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RentalDurationTier, RentalDurationTierRequest, DurationUnit } from "@/types/rental-duration-tier/rental-duration-tier.type";

interface TierFormProps {
    initialData?: RentalDurationTier | null;
    onSubmit: (data: RentalDurationTierRequest) => Promise<void>;
    onCancel: () => void;
    isEdit?: boolean;
    loading?: boolean;
}

export function TierForm({ initialData, onSubmit, onCancel, isEdit = false, loading = false }: TierFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [durationValue, setDurationValue] = useState<number>(initialData?.duration_value || 1);
    const [durationUnit, setDurationUnit] = useState<DurationUnit>(initialData?.duration_unit || "MONTH");
    const [description, setDescription] = useState(initialData?.description || "");
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

    const handleSubmit = async () => {
        const payload: RentalDurationTierRequest = {
            name,
            duration_value: durationValue,
            duration_unit: durationUnit,
            description: description || undefined,
            is_active: isActive,
        };
        await onSubmit(payload);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-6">
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        1. Định danh gói thuê
                    </h3>

                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="tier-name">
                            Tên gói <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="tier-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ borderRadius: "12px" }}
                            className="bg-muted/30"
                        />
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                        <Label>
                            Thời hạn thuê <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center max-w-xs">
                            <Input
                                type="number"
                                min={1}
                                value={durationValue}
                                onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)}
                                style={{ borderRadius: "12px 0 0 12px" }}
                                className="bg-muted/30 w-24 font-semibold text-center"
                            />
                            <Select value={durationUnit} onValueChange={(val) => setDurationUnit(val as DurationUnit)}>
                                <SelectTrigger
                                    style={{ borderRadius: "0 12px 12px 0" }}
                                    className="w-32 -ml-[1px] bg-muted/50 font-medium"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MONTH">Tháng</SelectItem>
                                    <SelectItem value="YEAR">Năm</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        2. Mô tả & Trạng thái
                    </h3>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="tier-desc">Mô tả</Label>
                        <Textarea
                            id="tier-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả ngắn gọn về gói thuê này..."
                            rows={3}
                            style={{ borderRadius: "12px" }}
                            className="bg-muted/30 resize-none"
                        />
                    </div>

                    {/* Is Active */}
                    <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                        <div>
                            <p className="font-medium text-sm">Trạng thái hoạt động</p>
                            <p className="text-xs text-muted-foreground">
                                {isActive ? "Gói đang hiển thị cho khách hàng" : "Gói đang ẩn"}
                            </p>
                        </div>
                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                    style={{ borderRadius: "12px" }}
                >
                    Hủy
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !name.trim() || durationValue < 1}
                    className="gap-2 bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]"
                    style={{ borderRadius: "12px" }}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Đang lưu...
                        </>
                    ) : isEdit ? "Cập nhật" : "Tạo gói"}
                </Button>
            </div>
        </div>
    );
}
