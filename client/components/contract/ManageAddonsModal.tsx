"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { authStorage } from "@/services/auth/auth-storage.service";

interface ServiceItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    is_monthly_payment?: boolean;
    unit?: string | null;
}

interface AmenityItem {
    id: string;
    name: string;
    description?: string;
    icon?: string;
}

interface ManageAddonsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentAddonIds: string[];
    currentAmenityIds: string[];
    /** Addon IDs that were registered more than 2 days ago (cannot be removed) */
    lockedAddonIds?: string[];
    onSave: (addonIds: string[], amenityIds: string[]) => Promise<void>;
}

const API = process.env.NEXT_PUBLIC_API_URL;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

export function ManageAddonsModal({
    open,
    onOpenChange,
    currentAddonIds,
    currentAmenityIds,
    lockedAddonIds = [],
    onSave,
}: ManageAddonsModalProps) {
    const [allAddons, setAllAddons] = useState<ServiceItem[]>([]);
    const [allAmenities, setAllAmenities] = useState<AmenityItem[]>([]);
    const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
    const [selectedAmenityIds, setSelectedAmenityIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSelectedAddonIds(new Set(currentAddonIds));
        setSelectedAmenityIds(new Set(currentAmenityIds));
        fetchServices();
    }, [open, currentAddonIds, currentAmenityIds]);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const [addonsRes, amenitiesRes] = await Promise.all([
                fetch(`${API}/public/addons/active`),
                fetch(`${API}/amenities/active`, { headers }),
            ]);

            if (addonsRes.ok) {
                const data = await addonsRes.json();
                const items = Array.isArray(data.data)
                    ? data.data
                    : data.data?.items || data.items || [];
                setAllAddons(items);
            }

            if (amenitiesRes.ok) {
                const data = await amenitiesRes.json();
                const items = Array.isArray(data.data)
                    ? data.data
                    : data.data?.items || data.items || [];
                setAllAmenities(items);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    const toggleAddon = (id: string) => {
        // Don't allow unchecking locked addons (registered > 2 days ago)
        if (lockedAddonIds.includes(id) && selectedAddonIds.has(id)) return;
        setSelectedAddonIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAmenity = (id: string) => {
        setSelectedAmenityIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(Array.from(selectedAddonIds), Array.from(selectedAmenityIds));
            onOpenChange(false);
        } catch {
            // error handled by parent
        } finally {
            setSaving(false);
        }
    };

    const hasChanges =
        selectedAddonIds.size !== currentAddonIds.length ||
        !currentAddonIds.every((id) => selectedAddonIds.has(id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">
                        Quản lý Dịch vụ Thêm
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                        Dịch vụ đăng ký quá 2 ngày không thể hủy bỏ.
                    </p>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-6 px-4 py-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {/* Addons Section - Editable */}
                            {allAddons.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Dịch vụ bổ sung
                                        </h4>
                                        <span className="h-px flex-1 bg-border" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {allAddons.map((addon) => {
                                            const isLocked = lockedAddonIds.includes(addon.id) && selectedAddonIds.has(addon.id);
                                            const isChecked = selectedAddonIds.has(addon.id);
                                            return (
                                                <label
                                                    key={addon.id}
                                                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                                                        isChecked
                                                            ? "border-brand/40 bg-brand/5 shadow-sm"
                                                            : "hover:bg-accent/50 hover:border-border"
                                                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={() => toggleAddon(addon.id)}
                                                        disabled={isLocked}
                                                        className="mt-0.5 shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                                            <span className="text-sm font-medium leading-tight">{addon.name}</span>
                                                            <span className="text-xs font-semibold text-brand shrink-0 whitespace-nowrap">
                                                                {formatCurrency(addon.price)}
                                                                {addon.is_monthly_payment && (
                                                                    <span className="text-[10px] text-muted-foreground font-normal">/tháng</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        {addon.description && (
                                                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                                                                {addon.description}
                                                            </p>
                                                        )}
                                                        {isLocked && (
                                                            <p className="text-[10px] text-amber-600 mt-1 font-medium">
                                                                Đã quá 2 ngày — không thể hủy
                                                            </p>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Amenities Section - Read-only (part of warehouse template) */}
                            {allAmenities.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Tiện ích kho (có sẵn)
                                        </h4>
                                        <span className="h-px flex-1 bg-border" />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground -mt-1">
                                        Các tiện ích đi kèm kho bãi, không thể thay đổi qua hợp đồng.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {allAmenities.map((amenity) => {
                                            const isIncluded = selectedAmenityIds.has(amenity.id);
                                            return (
                                                <div
                                                    key={amenity.id}
                                                    className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                                                        isIncluded
                                                            ? "border-emerald-200/60 bg-emerald-50/50 dark:bg-emerald-900/10"
                                                            : "border-dashed opacity-50"
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 mt-0.5 shrink-0 rounded-sm border flex items-center justify-center ${
                                                        isIncluded ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30"
                                                    }`}>
                                                        {isIncluded && <span className="text-[10px]">✓</span>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm font-medium">{amenity.name}</span>
                                                        {amenity.description && (
                                                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                                                                {amenity.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {allAddons.length === 0 && allAmenities.length === 0 && (
                                <p className="text-center text-muted-foreground text-sm py-8">
                                    Không có dịch vụ nào khả dụng
                                </p>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !hasChanges}>
                        {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                        Lưu thay đổi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
