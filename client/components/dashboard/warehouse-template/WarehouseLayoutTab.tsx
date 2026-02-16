"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    ChevronRightIcon,
    ChevronLeftIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

// ── Service ──
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { authStorage } from "@/services/auth/auth-storage.service";

const warehouseService = new WarehouseTemplateService();

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────
interface LayoutBlock {
    id?: string;
    name: string;
    code: string;
    dimensions_length?: number | null;
    dimensions_width?: number | null;
    dimensions_height?: number | null;
    max_weight_capacity?: number | null;
    order?: number;
    is_active?: boolean;
}

interface LayoutShelf {
    id?: string;
    name: string;
    code: string;
    height?: number | null;
    total_weight_capacity?: number | null;
    order?: number;
    is_active?: boolean;
    blocks: LayoutBlock[];
    _count?: { blocks: number };
}

interface LayoutRack {
    id?: string;
    name: string;
    code: string;
    description?: string;
    dimensions_width?: number | null;
    dimensions_depth?: number | null;
    dimensions_height?: number | null;
    order?: number;
    is_active?: boolean;
    shelves: LayoutShelf[];
    _count?: { shelves: number };
    count?: { shelves: number };
}

interface LayoutRow {
    id?: string;
    name: string;
    code: string;
    description?: string;
    price_per_month?: number | string;
    order?: number;
    is_active?: boolean;
    racks: LayoutRack[];
    _count?: { racks: number };
}

interface WarehouseLayoutTabProps {
    warehouseId: string;
    data: Record<string, any>;
    onChange: (updates: Record<string, any>) => void;
}

// ────────────────────────────────────────────────
// Reusable list item
// ────────────────────────────────────────────────
function ListItem({
    name,
    meta,
    onClick,
    onDelete,
}: {
    name: string;
    meta: string;
    onClick: () => void;
    onDelete?: (e: React.MouseEvent) => void;
}) {
    return (
        <div
            className="flex items-center justify-between p-3 rounded-xl border bg-white hover:bg-muted/50 cursor-pointer transition-colors group"
            onClick={onClick}
        >
            <div>
                <div className="font-medium text-sm">{name}</div>
                <div className="text-xs text-muted-foreground">{meta}</div>
            </div>
            <div className="flex items-center gap-2">
                {onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(e);
                        }}
                    >
                        <TrashIcon className="w-4 h-4 text-destructive" />
                    </Button>
                )}
                <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════
export function WarehouseLayoutTab({ warehouseId, data, onChange }: WarehouseLayoutTabProps) {
    // ── Local rows state (mutable copy for editing) ──
    const [rows, setRows] = useState<LayoutRow[]>([]);
    const [loadingRows, setLoadingRows] = useState(true);
    const [savingLayout, setSavingLayout] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // ── Sheet navigation ──
    const [sheetLevel, setSheetLevel] = useState<"row" | "rack" | "shelf" | "block" | null>(null);
    const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
    const [selectedRackIdx, setSelectedRackIdx] = useState<number | null>(null);
    const [selectedShelfIdx, setSelectedShelfIdx] = useState<number | null>(null);
    const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(null);

    // ── Loading states for lazy-load ──
    const [loadingRacks, setLoadingRacks] = useState(false);
    const [loadingShelves, setLoadingShelves] = useState(false);

    // ── Current selections (derived) ──
    const selectedRow = selectedRowIdx !== null ? rows[selectedRowIdx] : null;
    const selectedRack = selectedRow && selectedRackIdx !== null ? selectedRow.racks[selectedRackIdx] : null;
    const selectedShelf = selectedRack && selectedShelfIdx !== null ? selectedRack.shelves[selectedShelfIdx] : null;

    // ────────────────────────────────────────────
    // Fetch rows on mount
    // ────────────────────────────────────────────
    const fetchRows = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token || !warehouseId) return;

        setLoadingRows(true);
        try {
            const res = await warehouseService.getWarehouseRow(warehouseId, token);
            const rowsData: LayoutRow[] = (Array.isArray(res) ? res : res?.data || res?.items || []).map(
                (r: any, idx: number) => ({
                    ...r,
                    racks: r.racks || [],
                    order: r.order ?? idx + 1,
                })
            );
            setRows(rowsData);
        } catch {
            // If no rows yet, start empty
            setRows([]);
        } finally {
            setLoadingRows(false);
        }
    }, [warehouseId]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    // ────────────────────────────────────────────
    // Lazy-load racks when opening a row
    // ────────────────────────────────────────────
    const openRow = useCallback(async (idx: number) => {
        setSelectedRowIdx(idx);
        setSelectedRackIdx(null);
        setSelectedShelfIdx(null);
        setSheetLevel("row");

        const row = rows[idx];
        if (row.id && (!row.racks || row.racks.length === 0) && (row._count?.racks || 0) > 0) {
            const token = authStorage.getAccessToken();
            if (!token) return;

            setLoadingRacks(true);
            try {
                const res = await warehouseService.getWarehouseRack(row.id, warehouseId, token);
                const racksData: LayoutRack[] = (Array.isArray(res) ? res : res?.data || res?.items || []).map(
                    (r: any, rIdx: number) => ({
                        ...r,
                        shelves: r.shelves || [],
                        order: r.order ?? rIdx + 1,
                    })
                );
                setRows(prev => {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], racks: racksData };
                    return updated;
                });
            } catch { /* silent */ } finally {
                setLoadingRacks(false);
            }
        }
    }, [rows, warehouseId]);

    // ────────────────────────────────────────────
    // Lazy-load shelves when opening a rack
    // ────────────────────────────────────────────
    const openRack = useCallback(async (rackIdx: number) => {
        setSelectedRackIdx(rackIdx);
        setSelectedShelfIdx(null);
        setSheetLevel("rack");

        if (selectedRowIdx === null) return;
        const row = rows[selectedRowIdx];
        const rack = row?.racks[rackIdx];
        if (!rack) return;

        const shelfCount = rack._count?.shelves || rack.count?.shelves || 0;
        if (rack.id && (!rack.shelves || rack.shelves.length === 0) && shelfCount > 0) {
            const token = authStorage.getAccessToken();
            if (!token) return;

            setLoadingShelves(true);
            try {
                const res = await warehouseService.getWarehouseShelf(rack.id, row.id!, warehouseId, token);
                const shelvesData: LayoutShelf[] = (Array.isArray(res) ? res : res?.data || res?.items || []).map(
                    (s: any, sIdx: number) => ({
                        ...s,
                        blocks: s.blocks || [],
                        order: s.order ?? sIdx + 1,
                    })
                );
                setRows(prev => {
                    const updated = [...prev];
                    const updatedRow = { ...updated[selectedRowIdx!] };
                    const updatedRacks = [...updatedRow.racks];
                    updatedRacks[rackIdx] = { ...updatedRacks[rackIdx], shelves: shelvesData };
                    updatedRow.racks = updatedRacks;
                    updated[selectedRowIdx!] = updatedRow;
                    return updated;
                });
            } catch { /* silent */ } finally {
                setLoadingShelves(false);
            }
        }
    }, [rows, selectedRowIdx, warehouseId]);

    const openShelf = (shelfIdx: number) => {
        setSelectedShelfIdx(shelfIdx);
        setSheetLevel("shelf");
    };

    const closeSheet = () => {
        setSheetLevel(null);
        setSelectedRowIdx(null);
        setSelectedRackIdx(null);
        setSelectedShelfIdx(null);
        setSelectedBlockIdx(null);
    };

    const goBack = (to: "row" | "rack" | "shelf" | null) => {
        if (to === null) closeSheet();
        else setSheetLevel(to);
        if (to === "row") { setSelectedRackIdx(null); setSelectedShelfIdx(null); }
        if (to === "rack") { setSelectedShelfIdx(null); }
    };

    // ────────────────────────────────────────────
    // Row CRUD
    // ────────────────────────────────────────────
    const addRow = () => {
        const newRow: LayoutRow = {
            name: `Row ${rows.length + 1}`,
            code: `R-${rows.length + 1}`,
            order: rows.length + 1,
            is_active: true,
            racks: [],
        };
        setRows(prev => [...prev, newRow]);
        setIsDirty(true);
    };

    const deleteRow = (idx: number) => {
        setRows(prev => prev.filter((_, i) => i !== idx));
        setIsDirty(true);
    };

    const updateRow = (idx: number, updates: Partial<LayoutRow>) => {
        setRows(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...updates };
            return updated;
        });
        setIsDirty(true);
    };

    // ────────────────────────────────────────────
    // Rack CRUD
    // ────────────────────────────────────────────
    const addRack = (rowIdx: number) => {
        const row = rows[rowIdx];
        const rackCount = row.racks.length;
        const newRack: LayoutRack = {
            name: `Rack ${rackCount + 1}`,
            code: `${row.code}-RK${rackCount + 1}`,
            order: rackCount + 1,
            is_active: true,
            shelves: [],
        };
        updateRow(rowIdx, { racks: [...row.racks, newRack] });
    };

    const deleteRack = (rowIdx: number, rackIdx: number) => {
        const row = rows[rowIdx];
        const updatedRacks = row.racks.filter((_, i) => i !== rackIdx);
        updateRow(rowIdx, { racks: updatedRacks });
        // If we deleted the selected rack, close the rack sheet
        if (selectedRackIdx === rackIdx) {
            setSelectedRackIdx(null);
            setSheetLevel("row");
        }
    };

    const updateRack = (rowIdx: number, rackIdx: number, updates: Partial<LayoutRack>) => {
        const row = rows[rowIdx];
        const updatedRacks = [...row.racks];
        updatedRacks[rackIdx] = { ...updatedRacks[rackIdx], ...updates };
        updateRow(rowIdx, { racks: updatedRacks });
    };

    // ────────────────────────────────────────────
    // Shelf CRUD
    // ────────────────────────────────────────────
    const addShelf = (rowIdx: number, rackIdx: number) => {
        const rack = rows[rowIdx].racks[rackIdx];
        const shelfCount = rack.shelves.length;
        const newShelf: LayoutShelf = {
            name: `Shelf ${shelfCount + 1}`,
            code: `${rack.code}-SH${shelfCount + 1}`,
            order: shelfCount + 1,
            is_active: true,
            blocks: [],
        };
        updateRack(rowIdx, rackIdx, { shelves: [...rack.shelves, newShelf] });
    };

    const deleteShelf = (rowIdx: number, rackIdx: number, shelfIdx: number) => {
        const rack = rows[rowIdx].racks[rackIdx];
        const updatedShelves = rack.shelves.filter((_, i) => i !== shelfIdx);
        updateRack(rowIdx, rackIdx, { shelves: updatedShelves });
        if (selectedShelfIdx === shelfIdx) {
            setSelectedShelfIdx(null);
            setSheetLevel("rack");
        }
    };

    const updateShelf = (rowIdx: number, rackIdx: number, shelfIdx: number, updates: Partial<LayoutShelf>) => {
        const rack = rows[rowIdx].racks[rackIdx];
        const updatedShelves = [...rack.shelves];
        updatedShelves[shelfIdx] = { ...updatedShelves[shelfIdx], ...updates };
        updateRack(rowIdx, rackIdx, { shelves: updatedShelves });
    };

    // ────────────────────────────────────────────
    // Save Layout
    // ────────────────────────────────────────────
    const handleSaveLayout = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        setSavingLayout(true);
        try {
            // Build payload: strip unnecessary fields
            const payload = {
                rows: rows.map((row, rIdx) => ({
                    ...(row.id ? { id: row.id } : {}),
                    name: row.name,
                    code: row.code,
                    description: row.description || "",
                    price_per_month: typeof row.price_per_month === "string"
                        ? parseFloat(row.price_per_month) || 0
                        : row.price_per_month || 0,
                    order: rIdx + 1,
                    is_active: row.is_active ?? true,
                    racks: row.racks.map((rack, rkIdx) => ({
                        ...(rack.id ? { id: rack.id } : {}),
                        name: rack.name,
                        code: rack.code,
                        description: rack.description || "",
                        dimensions_width: rack.dimensions_width || null,
                        dimensions_depth: rack.dimensions_depth || null,
                        dimensions_height: rack.dimensions_height || null,
                        order: rkIdx + 1,
                        is_active: rack.is_active ?? true,
                        shelves: rack.shelves.map((shelf, sIdx) => ({
                            ...(shelf.id ? { id: shelf.id } : {}),
                            name: shelf.name,
                            code: shelf.code,
                            height: shelf.height || null,
                            total_weight_capacity: shelf.total_weight_capacity || null,
                            order: sIdx + 1,
                            is_active: shelf.is_active ?? true,
                            blocks: shelf.blocks.map((block, bIdx) => ({
                                ...(block.id ? { id: block.id } : {}),
                                name: block.name,
                                code: block.code,
                                dimensions_length: block.dimensions_length || null,
                                dimensions_width: block.dimensions_width || null,
                                dimensions_height: block.dimensions_height || null,
                                max_weight_capacity: block.max_weight_capacity || null,
                                order: bIdx + 1,
                                is_active: block.is_active ?? true,
                            })),
                        })),
                    })),
                })),
            };

            await warehouseService.upsertLayout(token, warehouseId, payload);
            toast.success("Đã lưu layout thành công!");
            setIsDirty(false);
            // Refetch to get server-generated IDs
            await fetchRows();
        } catch (err) {
            toast.error("Lưu layout thất bại. Vui lòng thử lại.");
        } finally {
            setSavingLayout(false);
        }
    };

    // ════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════
    return (
        <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Layout Structure ({rows.length} rows)</CardTitle>
                <div className="flex items-center gap-2">
                    {isDirty && (
                        <Button
                            onClick={handleSaveLayout}
                            disabled={savingLayout}
                            size="sm"
                            className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1"
                            style={{ borderRadius: "12px" }}
                        >
                            {savingLayout ? "Đang lưu..." : "Lưu Layout"}
                        </Button>
                    )}
                    <Button
                        onClick={addRow}
                        size="sm"
                        variant={isDirty ? "outline" : "default"}
                        className={isDirty ? "gap-1" : "bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1"}
                        style={{ borderRadius: "12px" }}
                    >
                        <PlusIcon className="w-4 h-4" />
                        Thêm Row
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loadingRows ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full rounded-xl" />
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] rounded-2xl bg-muted/30 border border-dashed border-muted-foreground/30 gap-3">
                        <p className="text-muted-foreground text-sm">Chưa có row nào. Thêm row để bắt đầu cấu hình layout.</p>
                        <Button
                            onClick={addRow}
                            size="sm"
                            className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1"
                            style={{ borderRadius: "12px" }}
                        >
                            <PlusIcon className="w-4 h-4" />
                            Thêm Row đầu tiên
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rows.map((row, idx) => (
                            <ListItem
                                key={row.id || `new-${idx}`}
                                name={row.name || `Row ${idx + 1}`}
                                meta={`${row.racks?.length || row._count?.racks || 0} racks • Code: ${row.code || "—"}`}
                                onClick={() => openRow(idx)}
                                onDelete={() => deleteRow(idx)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>

            {/* ══════════════════════════════════════════
                ROW Sheet
               ══════════════════════════════════════════ */}
            <Sheet open={sheetLevel === "row" && selectedRowIdx !== null} onOpenChange={(open) => !open && closeSheet()}>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{selectedRow?.name || "Row"}</SheetTitle>
                    </SheetHeader>
                    {selectedRow && selectedRowIdx !== null && (
                        <div className="space-y-4 py-4">
                            {/* Editable fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tên Row</Label>
                                    <Input
                                        value={selectedRow.name}
                                        onChange={(e) => updateRow(selectedRowIdx, { name: e.target.value })}
                                        style={{ borderRadius: "12px" }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Code</Label>
                                    <Input
                                        value={selectedRow.code}
                                        onChange={(e) => updateRow(selectedRowIdx, { code: e.target.value })}
                                        style={{ borderRadius: "12px" }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Giá thuê / tháng</Label>
                                <FormattedNumberInput
                                    value={typeof selectedRow.price_per_month === "string"
                                        ? parseFloat(selectedRow.price_per_month) || 0
                                        : selectedRow.price_per_month || 0}
                                    onChange={(v) => updateRow(selectedRowIdx, { price_per_month: v })}
                                    suffix="đ"
                                />
                            </div>

                            {/* Racks list */}
                            <div className="pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-sm">Racks ({selectedRow.racks?.length || 0})</h4>
                                    <Button
                                        onClick={() => addRack(selectedRowIdx)}
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 h-7 text-xs"
                                        style={{ borderRadius: "12px" }}
                                    >
                                        <PlusIcon className="w-3 h-3" />
                                        Thêm Rack
                                    </Button>
                                </div>
                                {loadingRacks ? (
                                    <div className="space-y-2">
                                        {Array.from({ length: 2 }).map((_, i) => (
                                            <Skeleton key={i} className="h-12 w-full rounded-xl" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {(selectedRow.racks || []).map((rack, rIdx) => (
                                            <ListItem
                                                key={rack.id || `new-rack-${rIdx}`}
                                                name={rack.name || `Rack ${rIdx + 1}`}
                                                meta={`${rack.shelves?.length || rack._count?.shelves || rack.count?.shelves || 0} shelves • ${rack.code || "—"}`}
                                                onClick={() => openRack(rIdx)}
                                                onDelete={() => deleteRack(selectedRowIdx, rIdx)}
                                            />
                                        ))}
                                        {(selectedRow.racks || []).length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-4">
                                                Chưa có rack. Nhấn "Thêm Rack" để tạo.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ══════════════════════════════════════════
                RACK Sheet
               ══════════════════════════════════════════ */}
            <Sheet
                open={sheetLevel === "rack" && selectedRackIdx !== null}
                onOpenChange={(open) => {
                    if (!open) goBack("row");
                }}
            >
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full"
                                onClick={() => goBack("row")}
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </Button>
                            <SheetTitle>{selectedRack?.name || "Rack"}</SheetTitle>
                        </div>
                    </SheetHeader>
                    {selectedRack && selectedRowIdx !== null && selectedRackIdx !== null && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tên Rack</Label>
                                    <Input
                                        value={selectedRack.name}
                                        onChange={(e) => updateRack(selectedRowIdx, selectedRackIdx, { name: e.target.value })}
                                        style={{ borderRadius: "12px" }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Code</Label>
                                    <Input
                                        value={selectedRack.code}
                                        onChange={(e) => updateRack(selectedRowIdx, selectedRackIdx, { code: e.target.value })}
                                        style={{ borderRadius: "12px" }}
                                    />
                                </div>
                            </div>

                            {/* Dimensions */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-xs">Rộng (cm)</Label>
                                    <FormattedNumberInput
                                        value={selectedRack.dimensions_width}
                                        onChange={(v) => updateRack(selectedRowIdx, selectedRackIdx, { dimensions_width: v })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Sâu (cm)</Label>
                                    <FormattedNumberInput
                                        value={selectedRack.dimensions_depth}
                                        onChange={(v) => updateRack(selectedRowIdx, selectedRackIdx, { dimensions_depth: v })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Cao (cm)</Label>
                                    <FormattedNumberInput
                                        value={selectedRack.dimensions_height}
                                        onChange={(v) => updateRack(selectedRowIdx, selectedRackIdx, { dimensions_height: v })}
                                    />
                                </div>
                            </div>

                            {/* Shelves list */}
                            <div className="pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-sm">Shelves ({selectedRack.shelves?.length || 0})</h4>
                                    <Button
                                        onClick={() => addShelf(selectedRowIdx, selectedRackIdx)}
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 h-7 text-xs"
                                        style={{ borderRadius: "12px" }}
                                    >
                                        <PlusIcon className="w-3 h-3" />
                                        Thêm Shelf
                                    </Button>
                                </div>
                                {loadingShelves ? (
                                    <div className="space-y-2">
                                        {Array.from({ length: 2 }).map((_, i) => (
                                            <Skeleton key={i} className="h-12 w-full rounded-xl" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {(selectedRack.shelves || []).map((shelf, sIdx) => (
                                            <ListItem
                                                key={shelf.id || `new-shelf-${sIdx}`}
                                                name={shelf.name || `Shelf ${sIdx + 1}`}
                                                meta={`${shelf.blocks?.length || shelf._count?.blocks || 0} blocks • ${shelf.code || "—"}`}
                                                onClick={() => openShelf(sIdx)}
                                                onDelete={() => deleteShelf(selectedRowIdx, selectedRackIdx, sIdx)}
                                            />
                                        ))}
                                        {(selectedRack.shelves || []).length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-4">
                                                Chưa có shelf. Nhấn "Thêm Shelf" để tạo.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ══════════════════════════════════════════
                SHELF Sheet
               ══════════════════════════════════════════ */}
            <Sheet
                open={sheetLevel === "shelf" && selectedShelfIdx !== null}
                onOpenChange={(open) => {
                    if (!open) goBack("rack");
                }}
            >
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full"
                                onClick={() => goBack("rack")}
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </Button>
                            <SheetTitle>{selectedShelf?.name || "Shelf"}</SheetTitle>
                        </div>
                    </SheetHeader>
                    {selectedShelf && selectedRowIdx !== null && selectedRackIdx !== null && selectedShelfIdx !== null && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tên Shelf</Label>
                                    <Input
                                        value={selectedShelf.name}
                                        onChange={(e) => updateShelf(selectedRowIdx, selectedRackIdx, selectedShelfIdx, { name: e.target.value })}
                                        style={{ borderRadius: "12px" }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Code</Label>
                                    <Input
                                        value={selectedShelf.code}
                                        onChange={(e) => updateShelf(selectedRowIdx, selectedRackIdx, selectedShelfIdx, { code: e.target.value })}
                                        style={{ borderRadius: "12px" }}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Chiều cao (cm)</Label>
                                    <FormattedNumberInput
                                        value={selectedShelf.height}
                                        onChange={(v) => updateShelf(selectedRowIdx, selectedRackIdx, selectedShelfIdx, { height: v })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tải trọng max (kg)</Label>
                                    <FormattedNumberInput
                                        value={selectedShelf.total_weight_capacity}
                                        onChange={(v) => updateShelf(selectedRowIdx, selectedRackIdx, selectedShelfIdx, { total_weight_capacity: v })}
                                    />
                                </div>
                            </div>

                            {/* Blocks list (read-only for now) */}
                            <div className="pt-4">
                                <h4 className="font-semibold text-sm mb-3">Blocks ({selectedShelf.blocks?.length || 0})</h4>
                                <div className="space-y-2">
                                    {(selectedShelf.blocks || []).map((block, bIdx) => (
                                        <div
                                            key={block.id || `block-${bIdx}`}
                                            className="flex items-center justify-between p-3 rounded-xl border bg-white"
                                        >
                                            <div>
                                                <div className="font-medium text-sm">{block.name || `Block ${bIdx + 1}`}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {block.dimensions_length}×{block.dimensions_width}×{block.dimensions_height} • {block.max_weight_capacity || "—"} kg
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(selectedShelf.blocks || []).length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">
                                            Chưa có block nào.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </Card>
    );
}
