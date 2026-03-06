"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ImageIcon, Loader2 } from "lucide-react";

interface CreateOrganizationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: CreateOrgFormData) => Promise<void>;
    owners?: { id: string; name: string; email: string }[];
}

export interface CreateOrgFormData {
    name: string;
    slug: string;
    logo?: File | null;
    owner_id?: string;
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
}

export function CreateOrganizationDialog({
    open,
    onOpenChange,
    onSubmit,
    owners = [],
}: CreateOrganizationDialogProps) {
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [ownerId, setOwnerId] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!slugManuallyEdited) {
            setSlug(generateSlug(name));
        }
    }, [name, slugManuallyEdited]);

    useEffect(() => {
        if (!open) {
            setName("");
            setSlug("");
            setSlugManuallyEdited(false);
            setOwnerId("");
            setLogoFile(null);
            setLogoPreview(null);
        }
    }, [open]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await onSubmit({ name, slug, logo: logoFile, owner_id: ownerId || undefined });
            onOpenChange(false);
        } catch (err) {
            console.error("Failed to create organization:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tạo tổ chức</DialogTitle>
                    <DialogDescription>
                        Tạo tổ chức mới trong hệ thống
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-5">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="org-name" className="text-sm font-medium">
                            Tên tổ chức
                        </Label>
                        <Input
                            id="org-name"
                            placeholder="Nhập tên tổ chức..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Logo Upload */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium">Logo</p>
                            <label className="text-sm text-primary cursor-pointer hover:underline">
                                Tải ảnh lên
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleLogoChange}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Slug */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="org-slug" className="text-sm font-medium">
                                Slug
                            </Label>
                            <span className="text-xs text-muted-foreground">Tùy chọn</span>
                        </div>
                        <Input
                            id="org-slug"
                            placeholder="my-org"
                            value={slug}
                            onChange={(e) => {
                                setSlug(e.target.value);
                                setSlugManuallyEdited(true);
                            }}
                        />
                    </div>

                    {/* Owner */}
                    {owners.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Chủ sở hữu</Label>
                            <Select value={ownerId} onValueChange={setOwnerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn chủ sở hữu" />
                                </SelectTrigger>
                                <SelectContent>
                                    {owners.map((owner) => (
                                        <SelectItem key={owner.id} value={owner.id}>
                                            {owner.name} ({owner.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </DialogBody>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!name.trim() || loading}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Tạo tổ chức
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
