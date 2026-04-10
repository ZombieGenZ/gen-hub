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
        !currentAddonIds.every((id) => selectedAddonIds.has(id)) ||
        selectedAmenityIds.size !== currentAmenityIds.length ||
        !currentAmenityIds.every((id) => selectedAmenityIds.has(id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">
                        Quản lý Dịch vụ Thêm
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        Dịch vụ đăng ký quá 2 ngày không thể hủy bỏ.
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 py-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {/* Addons Section */}
                            {allAddons.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                                        Dịch vụ bổ sung
                                    </h4>
                                    {allAddons.map((addon) => {
                                        const isLocked = lockedAddonIds.includes(addon.id) && selectedAddonIds.has(addon.id);
                                        return (
                                            <label
                                                key={addon.id}
                                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                                            >
                                                <Checkbox
                                                    checked={selectedAddonIds.has(addon.id)}
                                                    onCheckedChange={() => toggleAddon(addon.id)}
                                                    disabled={isLocked}
                                                    className="mt-0.5"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-medium">{addon.name}</span>
                                                        <span className="text-sm font-semibold text-brand shrink-0">
                                                            {formatCurrency(addon.price)}
                                                            {addon.is_monthly_payment && (
                                                                <span className="text-xs text-muted-foreground font-normal">/tháng</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {addon.description && (
                                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                            {addon.description}
                                                        </p>
                                                    )}
                                                    {isLocked && (
                                                        <p className="text-[10px] text-amber-600 mt-0.5">
                                                            Đã quá 2 ngày — không thể hủy
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Amenities Section */}
                            {allAmenities.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                                        Tiện ích
                                    </h4>
                                    {allAmenities.map((amenity) => (
                                        <label
                                            key={amenity.id}
                                            className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                                        >
                                            <Checkbox
                                                checked={selectedAmenityIds.has(amenity.id)}
                                                onCheckedChange={() => toggleAmenity(amenity.id)}
                                                className="mt-0.5"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium">{amenity.name}</span>
                                                {amenity.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                        {amenity.description}
                                                    </p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
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

                <DialogFooter className="gap-2">
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
