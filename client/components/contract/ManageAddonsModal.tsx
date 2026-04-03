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
import { Loader2, Sparkles } from "lucide-react";

interface AddonItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    is_monthly_payment?: boolean;
    unit?: string | null;
}

interface ManageAddonsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentAddonIds: string[];
    onSave: (addonIds: string[]) => Promise<void>;
}

const API = process.env.NEXT_PUBLIC_API_URL;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

export function ManageAddonsModal({
    open,
    onOpenChange,
    currentAddonIds,
    onSave,
}: ManageAddonsModalProps) {
    const [allAddons, setAllAddons] = useState<AddonItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSelectedIds(new Set(currentAddonIds));
        fetchAddons();
    }, [open, currentAddonIds]);

    const fetchAddons = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/public/addons/active`);
            if (res.ok) {
                const data = await res.json();
                const items = Array.isArray(data.data)
                    ? data.data
                    : data.data?.items || data.items || [];
                setAllAddons(items);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    const toggle = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(Array.from(selectedIds));
            onOpenChange(false);
        } catch {
            // error handled by parent
        } finally {
            setSaving(false);
        }
    };

    const hasChanges =
        selectedIds.size !== currentAddonIds.length ||
        !currentAddonIds.every((id) => selectedIds.has(id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand" />
                        Quản lý tiện ích
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-2 py-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : allAddons.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-8">
                            Không có tiện ích nào khả dụng
                        </p>
                    ) : (
                        allAddons.map((addon) => (
                            <label
                                key={addon.id}
                                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                            >
                                <Checkbox
                                    checked={selectedIds.has(addon.id)}
                                    onCheckedChange={() => toggle(addon.id)}
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
                                </div>
                            </label>
                        ))
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
