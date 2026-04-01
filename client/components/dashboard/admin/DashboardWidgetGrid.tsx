"use client";

import React, { useState, useEffect, useMemo, ReactNode } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
    Bars3Icon,
    EyeIcon,
    EyeSlashIcon,
    ArrowsPointingOutIcon,
    Cog6ToothIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
export interface DashboardWidget {
    id: string;
    title: string;
    component: React.ReactNode;
    /** Extra Tailwind class on the wrapper, e.g. "h-[380px]" */
    className?: string;
    visible: boolean;
}

export interface WidgetGroup {
    id: string;
    /** Widgets belonging to this group */
    widgetIds: string[];
}

const STORAGE_KEY = "admin-dashboard-widget-order-v2";

interface SavedState {
    groups: Record<string, string[]>;
    hidden: string[];
}

function loadSavedLayout(defaultGroups: WidgetGroup[]): SavedState {
    const defaultState: SavedState = {
        groups: Object.fromEntries(defaultGroups.map(g => [g.id, g.widgetIds])),
        hidden: [],
    };
    if (typeof window === "undefined") return defaultState;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed: SavedState = JSON.parse(saved);
            // Validate: ensure all widget IDs still exist
            const allDefault = defaultGroups.flatMap(g => g.widgetIds);
            const groups: Record<string, string[]> = {};
            for (const g of defaultGroups) {
                const savedOrder = parsed.groups?.[g.id];
                if (savedOrder) {
                    // Keep order from saved, but only valid IDs
                    const valid = savedOrder.filter(id => g.widgetIds.includes(id));
                    const newOnes = g.widgetIds.filter(id => !savedOrder.includes(id));
                    groups[g.id] = [...valid, ...newOnes];
                } else {
                    groups[g.id] = g.widgetIds;
                }
            }
            return {
                groups,
                hidden: (parsed.hidden || []).filter(id => allDefault.includes(id)),
            };
        }
    } catch { /* ignore */ }
    return defaultState;
}

function saveLayout(state: SavedState) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- Sortable Widget Wrapper ---
function SortableWidget({
    widget,
    isEditMode,
    onToggleVisibility,
}: {
    widget: DashboardWidget;
    isEditMode: boolean;
    onToggleVisibility: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: widget.id, disabled: !isEditMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative group/widget",
                widget.className,
                isDragging && "z-50 opacity-50 scale-[0.98]",
                !widget.visible && isEditMode && "opacity-100",
                !widget.visible && !isEditMode && "hidden",
                isEditMode && widget.visible && "ring-2 ring-dashed ring-primary/20 rounded-2xl",
            )}
        >
            {/* Edit Mode: Floating Control Pill */}
            {isEditMode && (
                <div className="absolute -top-3 left-4 z-20 flex items-center gap-0.5 bg-white border border-slate-200 shadow-lg rounded-full px-1.5 py-0.5">
                    <button
                        {...attributes}
                        {...listeners}
                        className="btn-raw cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100"
                        title="Kéo để sắp xếp"
                    >
                        <Bars3Icon className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <span className="text-[10px] font-semibold text-slate-500 px-1 select-none whitespace-nowrap">{widget.title}</span>
                    <button
                        onClick={() => onToggleVisibility(widget.id)}
                        className={cn(
                            "btn-raw p-1 rounded",
                            widget.visible ? "hover:bg-red-50 text-slate-400 hover:text-red-500" : "hover:bg-green-50 text-red-400 hover:text-green-600"
                        )}
                        title={widget.visible ? "Ẩn" : "Hiện"}
                    >
                        {widget.visible ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                    </button>
                </div>
            )}

            {/* Content */}
            {widget.visible && widget.component}

            {/* Hidden placeholder (only in edit mode) */}
            {!widget.visible && isEditMode && (
                <div className="h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3">
                    <EyeSlashIcon className="w-5 h-5 text-slate-300" />
                    <span className="text-xs text-slate-400 font-medium">{widget.title}</span>
                    <button
                        onClick={() => onToggleVisibility(widget.id)}
                        className="btn-raw text-[11px] text-primary font-semibold hover:underline"
                    >
                        Hiện lại
                    </button>
                </div>
            )}
        </div>
    );
}

// --- Sortable Group: renders a list of widgets inside a layout slot ---
function SortableGroup({
    groupId,
    widgetIds,
    allWidgets,
    isEditMode,
    onToggleVisibility,
}: {
    groupId: string;
    widgetIds: string[];
    allWidgets: Map<string, DashboardWidget>;
    isEditMode: boolean;
    onToggleVisibility: (id: string) => void;
}) {
    return (
        <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
            {widgetIds.map((id) => {
                const w = allWidgets.get(id);
                if (!w) return null;
                return (
                    <SortableWidget
                        key={id}
                        widget={w}
                        isEditMode={isEditMode}
                        onToggleVisibility={onToggleVisibility}
                    />
                );
            })}
        </SortableContext>
    );
}

// --- Props ---
export interface DashboardWidgetGridProps {
    widgets: DashboardWidget[];
    /** Define the layout. Each group is a "slot" rendered inside your custom layout. */
    groups: WidgetGroup[];
    /**
     * Render function: you control the outer grid/layout structure.
     * `renderedGroups` is a map from group ID -> ReactNode (the sortable widgets for that group).
     */
    renderLayout: (renderedGroups: Record<string, ReactNode>, isEditMode: boolean) => ReactNode;
}

export function DashboardWidgetGrid({ widgets, groups: defaultGroups, renderLayout }: DashboardWidgetGridProps) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [groupState, setGroupState] = useState<Record<string, string[]>>({});
    const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);

    const widgetMap = useMemo(() => {
        const m = new Map<string, DashboardWidget>();
        for (const w of widgets) m.set(w.id, w);
        return m;
    }, [widgets]);

    // Load on mount
    useEffect(() => {
        const saved = loadSavedLayout(defaultGroups);
        setGroupState(saved.groups);
        setHiddenWidgets(saved.hidden);
        setMounted(true);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // Find which group an item belongs to
    function findGroup(itemId: string): string | null {
        for (const [gid, ids] of Object.entries(groupState)) {
            if (ids.includes(itemId)) return gid;
        }
        return null;
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeGroup = findGroup(active.id as string);
        const overGroup = findGroup(over.id as string);

        // Only allow reorder within same group
        if (activeGroup && activeGroup === overGroup) {
            setGroupState((prev) => {
                const ids = [...prev[activeGroup]];
                const oldIdx = ids.indexOf(active.id as string);
                const newIdx = ids.indexOf(over.id as string);
                const newIds = arrayMove(ids, oldIdx, newIdx);
                const next = { ...prev, [activeGroup]: newIds };
                saveLayout({ groups: next, hidden: hiddenWidgets });
                return next;
            });
        }
    }

    function toggleVisibility(id: string) {
        setHiddenWidgets((prev) => {
            const next = prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id];
            saveLayout({ groups: groupState, hidden: next });
            return next;
        });
    }

    function resetLayout() {
        const defaultState: Record<string, string[]> = Object.fromEntries(
            defaultGroups.map(g => [g.id, g.widgetIds])
        );
        setGroupState(defaultState);
        setHiddenWidgets([]);
        saveLayout({ groups: defaultState, hidden: [] });
    }

    // Hydration guard
    if (!mounted) {
        const defaultRendered: Record<string, ReactNode> = {};
        for (const g of defaultGroups) {
            defaultRendered[g.id] = (
                <>{g.widgetIds.map((id) => {
                    const w = widgetMap.get(id);
                    return w ? <div key={id} className={w.className}>{w.component}</div> : null;
                })}</>
            );
        }
        return <>{renderLayout(defaultRendered, false)}</>;
    }

    // Build enriched widget map with visibility
    const enrichedMap = new Map<string, DashboardWidget>();
    for (const [id, w] of widgetMap) {
        enrichedMap.set(id, { ...w, visible: !hiddenWidgets.includes(id) });
    }

    // Render groups
    const renderedGroups: Record<string, ReactNode> = {};
    for (const [groupId, ids] of Object.entries(groupState)) {
        renderedGroups[groupId] = (
            <SortableGroup
                groupId={groupId}
                widgetIds={ids}
                allWidgets={enrichedMap}
                isEditMode={isEditMode}
                onToggleVisibility={toggleVisibility}
            />
        );
    }

    const visibleCount = widgets.length - hiddenWidgets.length;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-4">
                {/* Edit Mode Bar */}
                <div className="flex items-center justify-end gap-3">
                    <AnimatePresence>
                        {isEditMode && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="flex items-center gap-2"
                            >
                                <span className="text-[11px] text-slate-500 font-medium">
                                    {visibleCount}/{widgets.length} widgets
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[11px] font-semibold border-slate-200 rounded-lg"
                                    onClick={resetLayout}
                                >
                                    Đặt lại mặc định
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Button
                        variant={isEditMode ? "default" : "outline"}
                        size="sm"
                        className={cn(
                            "gap-1.5 h-8 text-xs font-semibold rounded-lg transition-all",
                            isEditMode
                                ? "bg-primary text-white shadow-md"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                        onClick={() => setIsEditMode(!isEditMode)}
                    >
                        {isEditMode ? (
                            <><XMarkIcon className="w-3.5 h-3.5" /> Xong</>
                        ) : (
                            <><Cog6ToothIcon className="w-3.5 h-3.5" /> Tùy chỉnh Dashboard</>
                        )}
                    </Button>
                </div>

                {/* Layout provided by consumer */}
                {renderLayout(renderedGroups, isEditMode)}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeId ? (
                    <div className="bg-white/90 backdrop-blur border-2 border-primary/30 rounded-2xl p-5 shadow-2xl">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <ArrowsPointingOutIcon className="w-5 h-5" />
                            {enrichedMap.get(activeId)?.title}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
