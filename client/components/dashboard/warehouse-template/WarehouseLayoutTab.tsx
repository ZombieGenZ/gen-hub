"use client";

import React, { useState } from "react";
import {
    ChevronRightIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";

interface WarehouseLayoutTabProps {
    warehouseId: string;
    data: Record<string, any>;
    onChange: (updates: Record<string, any>) => void;
}

export function WarehouseLayoutTab({ warehouseId, data, onChange }: WarehouseLayoutTabProps) {
    const rows = data.rows || [];

    // ── 4-level state ──
    const [sheetLevel, setSheetLevel] = useState<"row" | "rack" | "shelf" | "block" | null>(null);
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [selectedRack, setSelectedRack] = useState<any>(null);
    const [selectedShelf, setSelectedShelf] = useState<any>(null);
    const [selectedBlock, setSelectedBlock] = useState<any>(null);

    // ── Open handlers ──
    const openRow = (row: any) => {
        setSelectedRow(row);
        setSheetLevel("row");
    };

    const openRack = (rack: any) => {
        setSelectedRack(rack);
        setSheetLevel("rack");
    };

    const openShelf = (shelf: any) => {
        setSelectedShelf(shelf);
        setSheetLevel("shelf");
    };

    const openBlock = (block: any) => {
        setSelectedBlock(block);
        setSheetLevel("block");
    };

    const closeSheet = () => {
        setSheetLevel(null);
        setSelectedRow(null);
        setSelectedRack(null);
        setSelectedShelf(null);
        setSelectedBlock(null);
    };

    const addRow = () => {
        const newRow = {
            name: `Row ${rows.length + 1}`,
            code: `R-${rows.length + 1}`,
            order: rows.length + 1,
            is_active: true,
            racks: [],
        };
        onChange({ rows: [...rows, newRow] });
    };

    const deleteRow = (idx: number) => {
        const updated = rows.filter((_: any, i: number) => i !== idx);
        onChange({ rows: updated });
    };

    // ── Reusable list item ──
    const ListItem = ({ name, meta, onClick, onDelete }: { name: string; meta: string; onClick: () => void; onDelete?: (e: React.MouseEvent) => void }) => (
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
                        onClick={(e) => { e.stopPropagation(); onDelete(e); }}
                    >
                        <TrashIcon className="w-4 h-4 text-destructive" />
                    </Button>
                )}
                <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
            </div>
        </div>
    );

    return (
        <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Layout Structure ({rows.length} rows)</CardTitle>
                <Button
                    onClick={addRow}
                    size="sm"
                    className="bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1"
                    style={{ borderRadius: "12px" }}
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm Row
                </Button>
            </CardHeader>
            <CardContent>
                {rows.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] rounded-2xl bg-muted/30 border border-dashed border-muted-foreground/30">
                        <p className="text-muted-foreground text-sm">Chưa có row nào. Thêm row để bắt đầu cấu hình layout.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rows.map((row: any, idx: number) => (
                            <ListItem
                                key={row.id || idx}
                                name={row.name || `Row ${idx + 1}`}
                                meta={`${row.racks?.length || 0} racks • Code: ${row.code || "—"}`}
                                onClick={() => openRow(row)}
                                onDelete={() => deleteRow(idx)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>

            {/* ── Row Side Sheet ── */}
            <Sheet open={sheetLevel === "row" && !!selectedRow} onOpenChange={(open) => !open && closeSheet()}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{selectedRow?.name || "Row"}</SheetTitle>
                    </SheetHeader>
                    {selectedRow && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Tên Row</Label>
                                <Input value={selectedRow.name || ""} readOnly style={{ borderRadius: "12px" }} />
                            </div>
                            <div className="space-y-2">
                                <Label>Code</Label>
                                <Input value={selectedRow.code || ""} readOnly style={{ borderRadius: "12px" }} />
                            </div>

                            <div className="pt-4">
                                <h4 className="font-semibold text-sm mb-3">Racks ({selectedRow.racks?.length || 0})</h4>
                                <div className="space-y-2">
                                    {(selectedRow.racks || []).map((rack: any, rIdx: number) => (
                                        <ListItem
                                            key={rack.id || rIdx}
                                            name={rack.name || `Rack ${rIdx + 1}`}
                                            meta={`${rack.shelves?.length || 0} shelves`}
                                            onClick={() => openRack(rack)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Rack Side Sheet ── */}
            <Sheet
                open={sheetLevel === "rack" && !!selectedRack}
                onOpenChange={(open) => {
                    if (!open) { setSheetLevel("row"); setSelectedRack(null); }
                }}
            >
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{selectedRack?.name || "Rack"}</SheetTitle>
                    </SheetHeader>
                    {selectedRack && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Tên Rack</Label>
                                <Input value={selectedRack.name || ""} readOnly style={{ borderRadius: "12px" }} />
                            </div>
                            <div className="pt-4">
                                <h4 className="font-semibold text-sm mb-3">Shelves ({selectedRack.shelves?.length || 0})</h4>
                                <div className="space-y-2">
                                    {(selectedRack.shelves || []).map((shelf: any, sIdx: number) => (
                                        <ListItem
                                            key={shelf.id || sIdx}
                                            name={shelf.name || `Shelf ${sIdx + 1}`}
                                            meta={`${shelf.blocks?.length || 0} blocks`}
                                            onClick={() => openShelf(shelf)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Shelf Side Sheet ── */}
            <Sheet
                open={sheetLevel === "shelf" && !!selectedShelf}
                onOpenChange={(open) => {
                    if (!open) { setSheetLevel("rack"); setSelectedShelf(null); }
                }}
            >
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{selectedShelf?.name || "Shelf"}</SheetTitle>
                    </SheetHeader>
                    {selectedShelf && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Tên Shelf</Label>
                                <Input value={selectedShelf.name || ""} readOnly style={{ borderRadius: "12px" }} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Chiều cao (cm)</Label>
                                    <Input value={selectedShelf.height || ""} readOnly style={{ borderRadius: "12px" }} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tải trọng max (kg)</Label>
                                    <Input value={selectedShelf.max_weight_capacity || ""} readOnly style={{ borderRadius: "12px" }} />
                                </div>
                            </div>

                            <div className="pt-4">
                                <h4 className="font-semibold text-sm mb-3">Blocks ({selectedShelf.blocks?.length || 0})</h4>
                                <div className="space-y-2">
                                    {(selectedShelf.blocks || []).map((block: any, bIdx: number) => (
                                        <ListItem
                                            key={block.id || bIdx}
                                            name={block.name || `Block ${bIdx + 1}`}
                                            meta={`${block.dimensions_length}×${block.dimensions_width}×${block.dimensions_height}`}
                                            onClick={() => openBlock(block)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Block Side Sheet ── */}
            <Sheet
                open={sheetLevel === "block" && !!selectedBlock}
                onOpenChange={(open) => {
                    if (!open) { setSheetLevel("shelf"); setSelectedBlock(null); }
                }}
            >
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{selectedBlock?.name || "Block"}</SheetTitle>
                    </SheetHeader>
                    {selectedBlock && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Tên Block</Label>
                                <Input value={selectedBlock.name || ""} readOnly style={{ borderRadius: "12px" }} />
                            </div>
                            <div className="space-y-2">
                                <Label>Code</Label>
                                <Input value={selectedBlock.code || ""} readOnly style={{ borderRadius: "12px" }} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tải trọng max (kg)</Label>
                                    <Input value={selectedBlock.max_weight_capacity || ""} readOnly style={{ borderRadius: "12px" }} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kích thước (L×W×H)</Label>
                                    <Input value={`${selectedBlock.dimensions_length || 0}×${selectedBlock.dimensions_width || 0}×${selectedBlock.dimensions_height || 0}`} readOnly style={{ borderRadius: "12px" }} />
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </Card>
    );
}
