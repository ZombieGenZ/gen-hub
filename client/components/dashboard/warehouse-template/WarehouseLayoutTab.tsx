"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronRightIcon,
    ChevronLeftIcon,
    PlusIcon,
    TrashIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

// ── Service & Types ──
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { authStorage } from "@/services/auth/auth-storage.service";

const warehouseService = new WarehouseTemplateService();

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────
export interface LayoutBlock {
    id?: string;
    shelf_template_id?: string;
    name: string;
    code: string;
    description?: string | null;
    position_x?: number | null;
    position_y?: number | null;
    dimensions_length?: number | null;
    dimensions_width?: number | null;
    dimensions_height?: number | null;
    max_weight_capacity?: number | null;
    order?: number;
    is_active?: boolean;
}

export interface LayoutShelf {
    id?: string;
    rack_template_id?: string;
    name: string;
    code: string;
    description?: string | null;
    height?: number | null;
    total_weight_capacity?: number | null;
    is_active?: boolean;
    order?: number;
    blocks: LayoutBlock[];
    _count?: { blocks: number };
}

export interface LayoutRack {
    id?: string;
    row_template_id?: string;
    name: string;
    code: string;
    description?: string | null;
    position_x?: number | null;
    position_y?: number | null;
    position_rotation?: number | null;
    dimensions_width?: number | null;
    dimensions_depth?: number | null;
    dimensions_height?: number | null;
    order?: number;
    is_active?: boolean;
    shelves: LayoutShelf[];
    _count?: { shelves: number };
    count?: { shelves: number };
}

export interface LayoutRow {
    id?: string;
    warehouse_template_id?: string;
    name: string;
    code: string;
    description?: string | null;
    price_per_month?: number | string;
    order?: number;
    is_active?: boolean;
    racks: LayoutRack[];
    _count?: { racks: number };
}

interface WarehouseLayoutTabProps {
    warehouseId: string;
    data: Record<string, unknown>;
    onChange: (updates: Record<string, unknown>) => void;
}

// ────────────────────────────────────────────────
// Reusable list item
// ────────────────────────────────────────────────
function ListItem({
    name,
    meta,
    onClick,
    onDelete,
    isActive = true,
}: {
    name: string;
    meta: string;
    onClick: () => void;
    onDelete?: (e: React.MouseEvent) => void;
    isActive?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between p-3 rounded-xl border transition-colors group cursor-pointer ${
                isActive ? "bg-white hover:bg-muted/50" : "bg-muted/20 opacity-60 hover:bg-muted/30"
            }`}
            onClick={onClick}
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <div className="font-medium text-sm truncate">{name}</div>
                    {!isActive && <span className="text-[10px] bg-muted px-1.5 rounded text-muted-foreground uppercase font-bold">Inactive</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{meta}</div>
            </div>
            <div className="flex items-center gap-2 ml-4">
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
    const [rows, setRows] = useState<LayoutRow[]>([]);
    const [loadingRows, setLoadingRows] = useState(true);
    const [processing, setProcessing] = useState(false);

    // ── Sheet navigation ──
    const [sheetLevel, setSheetLevel] = useState<"row" | "rack" | "shelf" | "block" | null>(null);
    const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
    const [selectedRackIdx, setSelectedRackIdx] = useState<number | null>(null);
    const [selectedShelfIdx, setSelectedShelfIdx] = useState<number | null>(null);
    const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(null);

    // ── Loading states ──
    const [loadingRacks, setLoadingRacks] = useState(false);
    const [loadingShelves, setLoadingShelves] = useState(false);
    const [loadingBlocks, setLoadingBlocks] = useState(false);

    // ── Current selections (derived) ──
    const selectedRow = selectedRowIdx !== null ? rows[selectedRowIdx] : null;
    const selectedRack = selectedRow && selectedRackIdx !== null ? selectedRow.racks[selectedRackIdx] : null;
    const selectedShelf = selectedRack && selectedShelfIdx !== null ? selectedRack.shelves[selectedShelfIdx] : null;
    const selectedBlock = selectedShelf && selectedBlockIdx !== null ? selectedShelf.blocks[selectedBlockIdx] : null;

    // ────────────────────────────────────────────
    // Fetch Methods
    // ────────────────────────────────────────────
    const fetchRows = async (silent = false) => {
        const token = authStorage.getAccessToken();
        if (!token || !warehouseId) return;

        if (!silent) setLoadingRows(true);
        try {
            const res = await warehouseService.getWarehouseRow(warehouseId, token);
            const rawData = (Array.isArray(res) ? res : res?.data || res?.items || []) as LayoutRow[];
            const rowsData: LayoutRow[] = rawData.map(
                (r, idx) => ({
                    ...r,
                    racks: r.racks || [],
                    order: r.order ?? idx + 1,
                })
            );
            setRows(rowsData);
        } catch {
            setRows([]);
        } finally {
            if (!silent) setLoadingRows(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, [warehouseId]);

    const loadRacks = async (rowIdx: number, silent = false) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        if (!token || !row?.id) return;

        if (!silent) setLoadingRacks(true);
        try {
            const res = await warehouseService.getWarehouseRack(row.id, warehouseId, token);
            const rawData = (Array.isArray(res) ? res : res?.data || res?.items || []) as LayoutRack[];
            const racksData: LayoutRack[] = rawData.map(
                (r, rIdx) => ({
                    ...r,
                    shelves: r.shelves || [],
                    order: r.order ?? rIdx + 1,
                })
            );
            setRows(prev => {
                const updated = [...prev];
                updated[rowIdx] = { ...updated[rowIdx], racks: racksData };
                return updated;
            });
        } catch { /* silent */ } finally {
            if (!silent) setLoadingRacks(false);
        }
    };

    const loadShelves = async (rowIdx: number, rackIdx: number, silent = false) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        const rack = row?.racks[rackIdx];
        if (!token || !row?.id || !rack?.id) return;

        if (!silent) setLoadingShelves(true);
        try {
            const res = await warehouseService.getWarehouseShelf(rack.id, row.id, warehouseId, token);
            const rawData = (Array.isArray(res) ? res : res?.data || res?.items || []) as LayoutShelf[];
            const shelvesData: LayoutShelf[] = rawData.map(
                (s, sIdx) => ({
                    ...s,
                    blocks: s.blocks || [],
                    order: s.order ?? sIdx + 1,
                })
            );
            setRows(prev => {
                const updated = [...prev];
                const updatedRow = { ...updated[rowIdx] };
                const updatedRacks = [...updatedRow.racks];
                updatedRacks[rackIdx] = { ...updatedRacks[rackIdx], shelves: shelvesData };
                updatedRow.racks = updatedRacks;
                updated[rowIdx] = updatedRow;
                return updated;
            });
        } catch { /* silent */ } finally {
            if (!silent) setLoadingShelves(false);
        }
    };

    const loadBlocks = async (rowIdx: number, rackIdx: number, shelfIdx: number, silent = false) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        const rack = row?.racks[rackIdx];
        const shelf = rack?.shelves[shelfIdx];
        if (!token || !row?.id || !rack?.id || !shelf?.id) return;

        if (!silent) setLoadingBlocks(true);
        try {
            const res = await warehouseService.getWarehouseBlock(shelf.id, rack.id, row.id, warehouseId, token);
            const rawData = (Array.isArray(res) ? res : res?.data || res?.items || []) as LayoutBlock[];
            const blocksData: LayoutBlock[] = rawData.map(
                (b, bIdx) => ({
                    ...b,
                    order: b.order ?? bIdx + 1,
                })
            );
            setRows(prev => {
                const updated = [...prev];
                const updatedRow = { ...updated[rowIdx] };
                const updatedRacks = [...updatedRow.racks];
                const updatedShelves = [...updatedRacks[rackIdx].shelves];
                updatedShelves[shelfIdx] = { ...updatedShelves[shelfIdx], blocks: blocksData };
                updatedRacks[rackIdx].shelves = updatedShelves;
                updatedRow.racks = updatedRacks;
                updated[rowIdx] = updatedRow;
                return updated;
            });
        } catch { /* silent */ } finally {
            if (!silent) setLoadingBlocks(false);
        }
    };

    // ────────────────────────────────────────────
    // Navigation
    // ────────────────────────────────────────────
    const openRow = (idx: number) => {
        setSelectedRowIdx(idx);
        setSelectedRackIdx(null);
        setSelectedShelfIdx(null);
        setSelectedBlockIdx(null);
        setSheetLevel("row");
        loadRacks(idx);
    };

    const openRack = (idx: number) => {
        setSelectedRackIdx(idx);
        setSelectedShelfIdx(null);
        setSelectedBlockIdx(null);
        setSheetLevel("rack");
        if (selectedRowIdx !== null) loadShelves(selectedRowIdx, idx);
    };

    const openShelf = (idx: number) => {
        setSelectedShelfIdx(idx);
        setSelectedBlockIdx(null);
        setSheetLevel("shelf");
        if (selectedRowIdx !== null && selectedRackIdx !== null) loadBlocks(selectedRowIdx, selectedRackIdx, idx);
    };

    const openBlock = (idx: number) => {
        setSelectedBlockIdx(idx);
        setSheetLevel("block");
    };

    const closeSheet = () => {
        setSheetLevel(null);
        setSelectedRowIdx(null);
        setSelectedRackIdx(null);
        setSelectedShelfIdx(null);
        setSelectedBlockIdx(null);
    };

    const goBack = (to: "row" | "rack" | "shelf" | null) => {
        setSheetLevel(to);
        if (to === "row") { setSelectedRackIdx(null); setSelectedShelfIdx(null); setSelectedBlockIdx(null); }
        if (to === "rack") { setSelectedShelfIdx(null); setSelectedBlockIdx(null); }
        if (to === "shelf") { setSelectedBlockIdx(null); }
        if (to === null) closeSheet();
    };

    // ────────────────────────────────────────────
    // CRUD Handlers (Individual API Calls)
    // ────────────────────────────────────────────

    // ROW
    const onAddRow = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        setProcessing(true);
        try {
            await warehouseService.createRow(token, {
                warehouse_template_id: warehouseId,
                name: `Row ${rows.length + 1}`,
                code: `R${rows.length + 1}`,
                price_per_month: 0,
                is_active: true,
            });
            toast.success("Đã thêm Row mới");
            fetchRows(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const onUpdateRow = async (idx: number, updates: Partial<LayoutRow>) => {
        const token = authStorage.getAccessToken();
        const row = rows[idx];
        if (!token || !row.id) return;
        try {
            await warehouseService.updateRow(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id,
                name: updates.name || row.name,
                description: updates.description || row.description || "",
                price_per_month: updates.price_per_month !== undefined ? Number(updates.price_per_month) : Number(row.price_per_month),
            });
            setRows(prev => {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...updates };
                return updated;
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
            toast.error("Lỗi cập nhật Row: " + message);
        }
    };

    const onDeleteRow = async (idx: number) => {
        const token = authStorage.getAccessToken();
        const row = rows[idx];
        if (!token || !row.id || !confirm("Bạn có chắc chắn muốn xóa Row này và toàn bộ Rack bên trong?")) return;
        try {
            await warehouseService.deleteRow(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id
            });
            toast.success("Đã xóa Row");
            setRows(prev => prev.filter((_, i) => i !== idx));
            if (selectedRowIdx === idx) closeSheet();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
            toast.error("Lỗi xóa Row: " + message);
        }
    };

    // RACK
    const onAddRack = async (rowIdx: number) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        if (!token || !row.id) return;
        setProcessing(true);
        try {
            await warehouseService.createRack(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id,
                name: `Rack ${row.racks.length + 1}`,
                code: `${row.code}-RK${row.racks.length + 1}`,
                description: "",
            });
            toast.success("Đã thêm Rack");
            loadRacks(rowIdx, true);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const onUpdateRack = async (rowIdx: number, rackIdx: number, updates: Partial<LayoutRack>) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        const rack = row.racks[rackIdx];
        if (!token || !row.id || !rack.id) return;
        try {
            await warehouseService.updateRack(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id,
                rack_template_id: rack.id,
                name: updates.name || rack.name,
                description: updates.description || rack.description || "",
            });
            setRows(prev => {
                const updated = [...prev];
                const updatedRacks = [...updated[rowIdx].racks];
                updatedRacks[rackIdx] = { ...updatedRacks[rackIdx], ...updates };
                updated[rowIdx] = { ...updated[rowIdx], racks: updatedRacks };
                return updated;
            });
        } catch {
            toast.error("Lỗi cập nhật Rack");
        }
    };

    const onDeleteRack = async (rowIdx: number, rackIdx: number) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        const rack = row.racks[rackIdx];
        if (!token || !row.id || !rack.id || !confirm("Xóa Rack này?")) return;
        try {
            await warehouseService.deleteRack(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id,
                rack_template_id: rack.id,
            });
            toast.success("Đã xóa Rack");
            loadRacks(rowIdx, true);
            if (selectedRackIdx === rackIdx) goBack("row");
        } catch {
            toast.error("Lỗi xóa Rack");
        }
    };

    // SHELF
    const onAddShelf = async (rowIdx: number, rackIdx: number) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        const rack = row.racks[rackIdx];
        if (!token || !row.id || !rack.id) return;
        setProcessing(true);
        try {
            await warehouseService.createShelf(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id,
                rack_template_id: rack.id,
                name: `Shelf ${rack.shelves.length + 1}`,
                code: `${rack.code}-S${rack.shelves.length + 1}`,
            });
            toast.success("Đã thêm Shelf");
            loadShelves(rowIdx, rackIdx, true);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const onUpdateShelf = async (rowIdx: number, rackIdx: number, shelfIdx: number, updates: Partial<LayoutShelf>) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        const rack = row.racks[rackIdx];
        const shelf = rack.shelves[shelfIdx];
        if (!token || !row.id || !rack.id || !shelf.id) return;
        try {
            await warehouseService.updateShelf(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id,
                rack_template_id: rack.id,
                shelf_template_id: shelf.id,
                name: updates.name || shelf.name,
                description: updates.description || shelf.description || "",
            });
            setRows(prev => {
                const updated = [...prev];
                const updatedRacks = [...updated[rowIdx].racks];
                const updatedShelves = [...updatedRacks[rackIdx].shelves];
                updatedShelves[shelfIdx] = { ...updatedShelves[shelfIdx], ...updates };
                updatedRacks[rackIdx] = { ...updatedRacks[rackIdx], shelves: updatedShelves };
                updated[rowIdx] = { ...updated[rowIdx], racks: updatedRacks };
                return updated;
            });
        } catch {
            toast.error("Lỗi cập nhật Shelf");
        }
    };

    const onDeleteShelf = async (rowIdx: number, rackIdx: number, shelfIdx: number) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        const rack = row.racks[rackIdx];
        const shelf = rack.shelves[shelfIdx];
        if (!token || !row.id || !rack.id || !shelf.id || !confirm("Xóa Shelf này?")) return;
        try {
            await warehouseService.deleteShelf(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id,
                rack_template_id: rack.id,
                shelf_template_id: shelf.id,
            });
            toast.success("Đã xóa Shelf");
            loadShelves(rowIdx, rackIdx, true);
            if (selectedShelfIdx === shelfIdx) goBack("rack");
        } catch {
            toast.error("Lỗi xóa Shelf");
        }
    };

    // BLOCK
    const onAddBlock = async (rowIdx: number, rackIdx: number, shelfIdx: number) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        const rack = row.racks[rackIdx];
        const shelf = rack.shelves[shelfIdx];
        if (!token || !row.id || !rack.id || !shelf.id) return;
        setProcessing(true);
        try {
            await warehouseService.createBlock(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id,
                rack_template_id: rack.id,
                shelf_template_id: shelf.id,
                name: `Block ${shelf.blocks.length + 1}`,
                code: `${shelf.code}-B${shelf.blocks.length + 1}`,
            });
            toast.success("Đã thêm Block");
            loadBlocks(rowIdx, rackIdx, shelfIdx, true);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const onUpdateBlock = async (rowIdx: number, rackIdx: number, shelfIdx: number, blockIdx: number, updates: Partial<LayoutBlock>) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        const rack = row.racks[rackIdx];
        const shelf = rack.shelves[shelfIdx];
        const block = shelf.blocks[blockIdx];
        if (!token || !row.id || !rack.id || !shelf.id || !block.id) return;
        try {
            await warehouseService.updateBlock(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id,
                rack_template_id: rack.id,
                shelf_template_id: shelf.id,
                block_template_id: block.id,
                name: updates.name || block.name,
                description: updates.description || block.description || "",
            });
            setRows(prev => {
                const updated = [...prev];
                const updatedRacks = [...updated[rowIdx].racks];
                const updatedShelves = [...updatedRacks[rackIdx].shelves];
                const updatedBlocks = [...updatedShelves[shelfIdx].blocks];
                updatedBlocks[blockIdx] = { ...updatedBlocks[blockIdx], ...updates };
                updatedShelves[shelfIdx] = { ...updatedShelves[shelfIdx], blocks: updatedBlocks };
                updatedRacks[rackIdx] = { ...updatedRacks[rackIdx], shelves: updatedShelves };
                updated[rowIdx] = { ...updated[rowIdx], racks: updatedRacks };
                return updated;
            });
        } catch {
            toast.error("Lỗi cập nhật Block");
        }
    };

    const onDeleteBlock = async (rowIdx: number, rackIdx: number, shelfIdx: number, blockIdx: number) => {
        const token = authStorage.getAccessToken();
        const row = rows[rowIdx];
        const rack = row.racks[rackIdx];
        const shelf = rack.shelves[shelfIdx];
        const block = shelf.blocks[blockIdx];
        if (!token || !row.id || !rack.id || !shelf.id || !block.id || !confirm("Xóa Block này?")) return;
        try {
            await warehouseService.deleteBlock(token, {
                warehouse_template_id: warehouseId,
                row_template_id: row.id,
                rack_template_id: rack.id,
                shelf_template_id: shelf.id,
                block_template_id: block.id,
            });
            toast.success("Đã xóa Block");
            loadBlocks(rowIdx, rackIdx, shelfIdx, true);
            if (selectedBlockIdx === blockIdx) goBack("shelf");
        } catch {
            toast.error("Lỗi xóa Block");
        }
    };

    // ════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════
    return (
        <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Cấu trúc kho ({rows.length} rows)</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => fetchRows()}>
                        <ArrowPathIcon className={`w-4 h-4 ${loadingRows ? "animate-spin" : ""}`} />
                    </Button>
                </div>
                <Button
                    onClick={onAddRow}
                    disabled={processing}
                    size="sm"
                    className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1"
                    style={{ borderRadius: "12px" }}
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm Row
                </Button>
            </CardHeader>
            <CardContent>
                {loadingRows ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full rounded-xl" />
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-50 rounded-2xl bg-muted/30 border border-dashed border-muted-foreground/30 gap-3">
                        <p className="text-muted-foreground text-sm text-center px-4">Chưa có Row nào. Thêm Row để bắt đầu cấu hình layout.</p>
                        <Button
                            onClick={onAddRow}
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
                                key={row.id || `row-${idx}`}
                                name={row.name || `Row ${idx + 1}`}
                                meta={`${row._count?.racks || row.racks?.length || 0} racks • ${row.code || "No Code"} • ${Number(row.price_per_month).toLocaleString()}đ`}
                                isActive={row.is_active}
                                onClick={() => openRow(idx)}
                                onDelete={() => onDeleteRow(idx)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>

            {/* ══════════════════════════════════════════
                ROW Sheet
               ══════════════════════════════════════════ */}
            <Sheet open={sheetLevel === "row" && selectedRowIdx !== null} onOpenChange={(open) => !open && closeSheet()}>
                <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Quản lý Row</SheetTitle>
                    </SheetHeader>
                    {selectedRow && selectedRowIdx !== null && (
                        <div className="space-y-6 py-4">
                            <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Tên Row</Label>
                                        <Input
                                            value={selectedRow.name}
                                            onChange={(e) => onUpdateRow(selectedRowIdx, { name: e.target.value })}
                                            className="h-9"
                                            style={{ borderRadius: "10px" }}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Mã Row</Label>
                                        <Input
                                            value={selectedRow.code}
                                            disabled
                                            className="h-9 bg-muted/50"
                                            style={{ borderRadius: "10px" }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Giá thuê mặc định (đ/tháng)</Label>
                                    <FormattedNumberInput
                                        value={Number(selectedRow.price_per_month)}
                                        onChange={(v) => onUpdateRow(selectedRowIdx, { price_per_month: v })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Mô tả</Label>
                                    <Textarea
                                        value={selectedRow.description || ""}
                                        onChange={(e) => onUpdateRow(selectedRowIdx, { description: e.target.value })}
                                        placeholder="Ghi chú về dãy này..."
                                        rows={2}
                                        style={{ borderRadius: "10px" }}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Trạng thái hoạt động</Label>
                                    <Switch
                                        checked={selectedRow.is_active}
                                        onCheckedChange={(v) => onUpdateRow(selectedRowIdx, { is_active: v })}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-sm">Danh sách Rack ({selectedRow.racks?.length || 0})</h4>
                                    <Button
                                        onClick={() => onAddRack(selectedRowIdx)}
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 h-8 text-xs border-[#0F766E]/30 text-[#0F766E] hover:bg-[#0F766E]/5"
                                        style={{ borderRadius: "10px" }}
                                        disabled={processing}
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                        Thêm Rack
                                    </Button>
                                </div>
                                {loadingRacks ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-12 w-full rounded-xl" />
                                        <Skeleton className="h-12 w-full rounded-xl" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedRow.racks.map((rack, rIdx) => (
                                            <ListItem
                                                key={rack.id || `rack-${rIdx}`}
                                                name={rack.name}
                                                meta={`${rack.count?.shelves || rack._count?.shelves || 0} shelves • ${rack.code}`}
                                                isActive={rack.is_active}
                                                onClick={() => openRack(rIdx)}
                                                onDelete={() => onDeleteRack(selectedRowIdx, rIdx)}
                                            />
                                        ))}
                                        {selectedRow.racks.length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-6 bg-muted/20 rounded-xl border border-dashed">
                                                Chưa có Rack nào trong dãy này.
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
            <Sheet open={sheetLevel === "rack" && selectedRackIdx !== null} onOpenChange={(open) => !open && goBack("row")}>
                <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                    <SheetHeader>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => goBack("row")}>
                                <ChevronLeftIcon className="w-4 h-4" />
                            </Button>
                            <SheetTitle>Quản lý Rack</SheetTitle>
                        </div>
                    </SheetHeader>
                    {selectedRack && selectedRowIdx !== null && selectedRackIdx !== null && (
                        <div className="space-y-6 py-4">
                            <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Tên Rack</Label>
                                        <Input
                                            value={selectedRack.name}
                                            onChange={(e) => onUpdateRack(selectedRowIdx, selectedRackIdx, { name: e.target.value })}
                                            className="h-9"
                                            style={{ borderRadius: "10px" }}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Mã Rack</Label>
                                        <Input value={selectedRack.code} disabled className="h-9 bg-muted/50" style={{ borderRadius: "10px" }} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase text-muted-foreground">W (cm)</Label>
                                        <Input type="number" value={selectedRack.dimensions_width || ""} onChange={(e) => onUpdateRack(selectedRowIdx, selectedRackIdx, { dimensions_width: Number(e.target.value) })} className="h-8 text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase text-muted-foreground">D (cm)</Label>
                                        <Input type="number" value={selectedRack.dimensions_depth || ""} onChange={(e) => onUpdateRack(selectedRowIdx, selectedRackIdx, { dimensions_depth: Number(e.target.value) })} className="h-8 text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase text-muted-foreground">H (cm)</Label>
                                        <Input type="number" value={selectedRack.dimensions_height || ""} onChange={(e) => onUpdateRack(selectedRowIdx, selectedRackIdx, { dimensions_height: Number(e.target.value) })} className="h-8 text-xs" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-sm">Danh sách Shelf ({selectedRack.shelves?.length || 0})</h4>
                                    <Button
                                        onClick={() => onAddShelf(selectedRowIdx, selectedRackIdx)}
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 h-8 text-xs"
                                        style={{ borderRadius: "10px" }}
                                        disabled={processing}
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                        Thêm Shelf
                                    </Button>
                                </div>
                                {loadingShelves ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-12 w-full rounded-xl" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedRack.shelves.map((shelf, sIdx) => (
                                            <ListItem
                                                key={shelf.id || `shelf-${sIdx}`}
                                                name={shelf.name}
                                                meta={`${shelf._count?.blocks || 0} blocks • ${shelf.code}`}
                                                isActive={shelf.is_active}
                                                onClick={() => openShelf(sIdx)}
                                                onDelete={() => onDeleteShelf(selectedRowIdx, selectedRackIdx, sIdx)}
                                            />
                                        ))}
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
            <Sheet open={sheetLevel === "shelf" && selectedShelfIdx !== null} onOpenChange={(open) => !open && goBack("rack")}>
                <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                    <SheetHeader>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => goBack("rack")}>
                                <ChevronLeftIcon className="w-4 h-4" />
                            </Button>
                            <SheetTitle>Quản lý Shelf</SheetTitle>
                        </div>
                    </SheetHeader>
                    {selectedShelf && selectedRowIdx !== null && selectedRackIdx !== null && selectedShelfIdx !== null && (
                        <div className="space-y-6 py-4">
                            <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Tên Shelf</Label>
                                        <Input value={selectedShelf.name} onChange={(e) => onUpdateShelf(selectedRowIdx, selectedRackIdx, selectedShelfIdx, { name: e.target.value })} className="h-9" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Mã Shelf</Label>
                                        <Input value={selectedShelf.code} disabled className="h-9 bg-muted/50" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Chiều cao (cm)</Label>
                                        <Input type="number" value={selectedShelf.height || ""} onChange={(e) => onUpdateShelf(selectedRowIdx, selectedRackIdx, selectedShelfIdx, { height: Number(e.target.value) })} className="h-9" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Tải trọng (kg)</Label>
                                        <Input type="number" value={selectedShelf.total_weight_capacity || ""} onChange={(e) => onUpdateShelf(selectedRowIdx, selectedRackIdx, selectedShelfIdx, { total_weight_capacity: Number(e.target.value) })} className="h-9" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-sm">Danh sách Block ({selectedShelf.blocks?.length || 0})</h4>
                                    <Button onClick={() => onAddBlock(selectedRowIdx, selectedRackIdx, selectedShelfIdx)} size="sm" variant="outline" className="gap-1 h-8 text-xs" style={{ borderRadius: "10px" }} disabled={processing}>
                                        <PlusIcon className="w-3.5 h-3.5" />
                                        Thêm Block
                                    </Button>
                                </div>
                                {loadingBlocks ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-12 w-full rounded-xl" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedShelf.blocks.map((block, bIdx) => (
                                            <ListItem
                                                key={block.id || `block-${bIdx}`}
                                                name={block.name}
                                                meta={`${block.dimensions_length}x${block.dimensions_width}x${block.dimensions_height} • ${block.max_weight_capacity}kg`}
                                                isActive={block.is_active}
                                                onClick={() => openBlock(bIdx)}
                                                onDelete={() => onDeleteBlock(selectedRowIdx, selectedRackIdx, selectedShelfIdx, bIdx)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ══════════════════════════════════════════
                BLOCK Sheet
               ══════════════════════════════════════════ */}
            <Sheet open={sheetLevel === "block" && selectedBlockIdx !== null} onOpenChange={(open) => !open && goBack("shelf")}>
                <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                    <SheetHeader>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => goBack("shelf")}>
                                <ChevronLeftIcon className="w-4 h-4" />
                            </Button>
                            <SheetTitle>Quản lý Block</SheetTitle>
                        </div>
                    </SheetHeader>
                    {selectedBlock && selectedRowIdx !== null && selectedRackIdx !== null && selectedShelfIdx !== null && selectedBlockIdx !== null && (
                        <div className="space-y-6 py-4">
                            <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Tên Block</Label>
                                        <Input value={selectedBlock.name} onChange={(e) => onUpdateBlock(selectedRowIdx, selectedRackIdx, selectedShelfIdx, selectedBlockIdx, { name: e.target.value })} className="h-9" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Mã Block</Label>
                                        <Input value={selectedBlock.code} disabled className="h-9 bg-muted/50" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase text-muted-foreground">L (cm)</Label>
                                        <Input type="number" value={selectedBlock.dimensions_length || ""} onChange={(e) => onUpdateBlock(selectedRowIdx, selectedRackIdx, selectedShelfIdx, selectedBlockIdx, { dimensions_length: Number(e.target.value) })} className="h-8 text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase text-muted-foreground">W (cm)</Label>
                                        <Input type="number" value={selectedBlock.dimensions_width || ""} onChange={(e) => onUpdateBlock(selectedRowIdx, selectedRackIdx, selectedShelfIdx, selectedBlockIdx, { dimensions_width: Number(e.target.value) })} className="h-8 text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase text-muted-foreground">H (cm)</Label>
                                        <Input type="number" value={selectedBlock.dimensions_height || ""} onChange={(e) => onUpdateBlock(selectedRowIdx, selectedRackIdx, selectedShelfIdx, selectedBlockIdx, { dimensions_height: Number(e.target.value) })} className="h-8 text-xs" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Tải trọng tối đa (kg)</Label>
                                    <Input type="number" value={selectedBlock.max_weight_capacity || ""} onChange={(e) => onUpdateBlock(selectedRowIdx, selectedRackIdx, selectedShelfIdx, selectedBlockIdx, { max_weight_capacity: Number(e.target.value) })} className="h-9" />
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </Card>
    );
}
