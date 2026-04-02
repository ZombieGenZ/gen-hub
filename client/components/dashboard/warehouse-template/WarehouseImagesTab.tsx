"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { toast } from "sonner";
import {
    TrashIcon,
    ArrowUpTrayIcon,
    XMarkIcon,
    ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const warehouseService = new WarehouseTemplateService();
const IMG_API = process.env.NEXT_PUBLIC_API_URL;

interface WarehouseImagesTabProps {
    warehouseId: string;
}

export function WarehouseImagesTab({ warehouseId }: WarehouseImagesTabProps) {
    const [images, setImages] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [reordering, setReordering] = useState(false);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Load images ──
    const fetchImages = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            const data = await warehouseService.getWarehouseTemplateById(token, warehouseId);
            const imgs = (data?.images || []).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
            setImages(imgs);
        } catch { }
    }, [warehouseId]);

    useEffect(() => { fetchImages(); }, [fetchImages]);

    // ── Upload ──
    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const token = authStorage.getAccessToken();
        if (!token) return;

        setUploading(true);
        try {
            await warehouseService.uploadImages(token, warehouseId, Array.from(files));
            toast.success(`Đã tải lên ${files.length} ảnh`);
            await fetchImages();
        } catch {
            toast.error("Upload thất bại.");
        } finally {
            setUploading(false);
        }
    };

    // ── Delete single ──
    const handleDeleteSingle = async (imageId: string) => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            await warehouseService.deleteImage(token, warehouseId, imageId);
            toast.success("Đã xóa ảnh.");
            await fetchImages();
        } catch {
            toast.error("Xóa thất bại.");
        }
    };

    // ── Bulk delete ──
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            await warehouseService.deleteManyImages(token, warehouseId, selectedIds);
            toast.success(`Đã xóa ${selectedIds.length} ảnh.`);
            setSelectedIds([]);
            await fetchImages();
        } catch {
            toast.error("Xóa thất bại.");
        }
    };

    // ── Toggle selection ──
    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // ── Drag & Drop reorder ──
    const handleDragStart = (idx: number) => {
        setDragIdx(idx);
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === idx) return;
        setDragOverIdx(idx);
    };

    const handleDragLeave = () => {
        setDragOverIdx(null);
    };

    const handleDrop = (e: React.DragEvent, dropIdx: number) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === dropIdx) {
            setDragIdx(null);
            setDragOverIdx(null);
            return;
        }

        const reordered = [...images];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(dropIdx, 0, moved);
        setImages(reordered);
        setDragIdx(null);
        setDragOverIdx(null);

        // Save new order to API
        saveReorder(reordered);
    };

    const handleDragEnd = () => {
        setDragIdx(null);
        setDragOverIdx(null);
    };

    const saveReorder = async (reordered: any[]) => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        setReordering(true);
        try {
            const orderPayload = reordered.map((img, idx) => ({
                id: img.id,
                order: idx + 1,
            }));
            await warehouseService.reorderImages(token, warehouseId, orderPayload);
            toast.success("Đã cập nhật thứ tự ảnh.");
        } catch {
            toast.error("Cập nhật thứ tự thất bại.");
            await fetchImages(); // rollback
        } finally {
            setReordering(false);
        }
    };

    return (
        <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">Images ({images.length})</CardTitle>
                    {reordering && (
                        <span className="text-xs text-muted-foreground animate-pulse">Đang lưu thứ tự...</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {images.length > 1 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ArrowsUpDownIcon className="w-4 h-4" />
                            <span>Kéo thả để sắp xếp</span>
                        </div>
                    )}
                    {selectedIds.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            className="gap-1"
                            style={{ borderRadius: "12px" }}
                        >
                            <TrashIcon className="w-4 h-4" />
                            Xóa {selectedIds.length} ảnh
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Upload zone */}
                <div
                    className="flex flex-col items-center justify-center h-[140px] rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
                >
                    <ArrowUpTrayIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                        {uploading ? "Đang tải lên..." : "Kéo thả ảnh vào đây hoặc click để chọn"}
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUpload(e.target.files)}
                    />
                </div>

                {/* Gallery with drag-and-drop reorder */}
                {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {images.map((img, idx) => (
                            <div
                                key={img.id}
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, idx)}
                                onDragEnd={handleDragEnd}
                                className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${dragIdx === idx
                                    ? "opacity-40 scale-95"
                                    : dragOverIdx === idx
                                        ? "border-primary ring-2 ring-primary/30 scale-105"
                                        : selectedIds.includes(img.id)
                                            ? "border-primary ring-2 ring-primary/20"
                                            : "border-transparent hover:border-muted-foreground/20"
                                    }`}
                            >
                                <img
                                    src={img.url?.startsWith("http") ? img.url : `${IMG_API}${img.url}`}
                                    alt={img.original_name}
                                    className="w-full aspect-square object-cover pointer-events-none"
                                />
                                {/* Order badge */}
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                                    {idx + 1}
                                </div>
                                {/* Checkbox */}
                                <div className="absolute top-2 right-2">
                                    <Checkbox
                                        checked={selectedIds.includes(img.id)}
                                        onCheckedChange={() => toggleSelect(img.id)}
                                        className="bg-white/90 border-white/50"
                                    />
                                </div>
                                {/* Delete button */}
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute bottom-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteSingle(img.id)}
                                    aria-label="Xóa ảnh"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
