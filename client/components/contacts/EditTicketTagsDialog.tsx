"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useContactTags } from "@/hooks/contacts/use-contacts";
import { ContactTag } from "@/types/contact/contact.type";
import { CheckIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditTicketTagsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentTags: ContactTag[];
    onSave: (tagIds: string[]) => Promise<void>;
}

export function EditTicketTagsDialog({ open, onOpenChange, currentTags, onSave }: EditTicketTagsDialogProps) {
    const { data: allTags = [] } = useContactTags();
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setSelectedTagIds(currentTags.map(t => t.id));
            setSearch("");
        }
    }, [open, currentTags]);

    const filteredTags = allTags.filter(tag =>
        tag.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggleTag = (tagId: string) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await onSave(selectedTagIds);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save tags", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Quản lý nhãn dán</DialogTitle>
                    <DialogDescription>
                        Chọn các nhãn dán để phân loại ticket này.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm nhãn..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Tìm kiếm nhãn"
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {filteredTags.length === 0 ? (
                            <p className="text-center text-sm text-slate-500 py-4">
                                Không tìm thấy nhãn nào.
                            </p>
                        ) : (
                            filteredTags.map((tag) => {
                                const isSelected = selectedTagIds.includes(tag.id);
                                return (
                                    <div
                                        key={tag.id}
                                        onClick={() => toggleTag(tag.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                toggleTag(tag.id);
                                            }
                                        }}
                                        role="checkbox"
                                        aria-checked={isSelected}
                                        tabIndex={0}
                                        className={cn(
                                            "flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all",
                                            isSelected
                                                ? "bg-primary/5 border-primary shadow-sm"
                                                : "bg-white border-slate-100 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: tag.color || "#e2e8f0" }}
                                            />
                                            <span className={cn(
                                                "text-sm font-medium",
                                                isSelected ? "text-primary" : "text-slate-700"
                                            )}>
                                                {tag.name}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <CheckIcon className="w-4 h-4 text-primary" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
