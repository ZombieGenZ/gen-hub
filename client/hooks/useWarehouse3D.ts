'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { authStorage } from '@/services/auth/auth-storage.service';
import { warehouseService } from '@/services/warehouse/warehouse.service';
import type { WarehouseLayout, InventoryStockItem, LayoutRack, LayoutShelf } from '@/services/warehouse/warehouse.types';
import {
    RackConfig, BoxItem, WarehouseState, BoxCategory,
    categoryColors, WarehouseStats, FillRateStatus, getFillRateStatus,
} from '@/types/warehouse';
import { useToast } from '@/contexts/ToastContext';
// ────────────────────────────────────────────────
// Query Keys
// ────────────────────────────────────────────────

export const warehouseKeys = {
    all: ['warehouse-3d'] as const,
    layout: (id: string) => [...warehouseKeys.all, 'layout', id] as const,
    stock: (id: string) => [...warehouseKeys.all, 'stock', id] as const,
    warehouses: () => [...warehouseKeys.all, 'list'] as const,
};

// ────────────────────────────────────────────────
// Helper: get token
// ────────────────────────────────────────────────

function getToken(): string {
    return authStorage.getAccessToken() || '';
}

// ────────────────────────────────────────────────
// Transform: DB Layout + Stock → 3D types
// ────────────────────────────────────────────────

const RACK_COLORS = ['#0066ff', '#0088ff', '#00aaff', '#0044dd', '#0055cc'];

// Defaults khi DB chưa có dimension data
const DEFAULT_RACK_WIDTH = 2.8;
const DEFAULT_RACK_DEPTH = 1.1;
const DEFAULT_RACK_HEIGHT = 1.2;

/**
 * Phân loại product theo tên/sku → BoxCategory (dùng để tô màu 3D)
 */
function inferCategory(productName: string, sku: string): BoxCategory {
    const text = `${productName} ${sku}`.toLowerCase();
    if (text.match(/điện|electronic|phone|laptop|máy|cable|pin/)) return 'electronics';
    if (text.match(/thực phẩm|food|đồ ăn|nước|rice|milk|snack/)) return 'food';
    if (text.match(/quần|áo|clothing|vải|giày|dép|fashion/)) return 'clothing';
    if (text.match(/kính|glass|fragile|dễ vỡ|gốm|sứ/)) return 'fragile';
    if (text.match(/sắt|thép|heavy|nặng|cement|xi\s?măng|gạch/)) return 'heavy';
    return 'standard';
}

/**
 * Metadata about row rental status returned alongside 3D data
 */
export interface RowRentalInfo {
    rowId: string;
    rowName: string;
    isRented: boolean;
    rackIds: string[];
}

/**
 * Transform layout + stock → { racks, boxes, rowRentalInfo }
 */
export function transformLayoutTo3D(
    layout: WarehouseLayout,
    stock: InventoryStockItem[],
): { racks: RackConfig[]; boxes: BoxItem[]; rowRentalInfo: RowRentalInfo[] } {
    const racks: RackConfig[] = [];
    const boxes: BoxItem[] = [];
    const rowRentalInfo: RowRentalInfo[] = [];

    // Index: block_id → inventory items
    const stockByBlock = new Map<string, InventoryStockItem[]>();
    for (const item of stock) {
        const list = stockByBlock.get(item.block_id) || [];
        list.push(item);
        stockByBlock.set(item.block_id, list);
    }

    let rackIndex = 0;

    for (const row of layout.rows) {
        const rowX = row.position_x ?? 0;
        const rowZ = row.position_y ?? 0;
        const rowRackIds: string[] = [];

        for (const rack of row.racks) {
            const shelfCount = rack.shelves.length || 1;
            const maxBlocksPerShelf = Math.max(
                ...rack.shelves.map(s => s.blocks.length),
                1,
            );

            const rackW = rack.dimensions_width ?? DEFAULT_RACK_WIDTH * maxBlocksPerShelf;
            const rackH = rack.dimensions_height ?? DEFAULT_RACK_HEIGHT * shelfCount;
            const rackD = rack.dimensions_depth ?? DEFAULT_RACK_DEPTH;

            const cellW = rackW / maxBlocksPerShelf;
            const cellH = rackH / shelfCount;

            const rackConfig: RackConfig = {
                id: rack.id,
                name: rack.name || `Kệ ${rack.code}`,
                position: {
                    x: rowX + (rack.position_x ?? rackIndex * 12),
                    y: 0,
                    z: rowZ + (rack.position_y ?? 0),
                },
                rows: 1,         // depth = 1 row deep
                columns: maxBlocksPerShelf,
                levels: shelfCount,
                cellWidth: cellW,
                cellHeight: cellH,
                cellDepth: rackD,
                color: RACK_COLORS[rackIndex % RACK_COLORS.length],
                rowId: row.id,
                isRowRented: row.is_rented,
            };

            racks.push(rackConfig);
            rowRackIds.push(rack.id);

            // Map shelves → levels (bottom-up), blocks → columns
            rack.shelves.forEach((shelf: LayoutShelf, shelfIdx: number) => {
                shelf.blocks.forEach((block, blockIdx: number) => {
                    const items = stockByBlock.get(block.id);
                    if (!items || items.length === 0) return;

                    items.forEach((inv, itemIndex) => {
                        const category = inferCategory(inv.product_name, inv.sku);
                        const BOX_HEIGHT = 0.6;
                        const STACK_GAP = 0.05;
                        const box: BoxItem = {
                            id: inv.id,
                            name: `${inv.sku || inv.product_name}${inv.batch_code ? ` #${inv.batch_code}` : ''}`,
                            productName: inv.product_name,
                            rackId: rack.id,
                            row: 0,
                            column: blockIdx,
                            level: shelfIdx,
                            position: {
                                x: rackConfig.position.x + blockIdx * cellW + cellW / 2,
                                y: shelfIdx * cellH + cellH / 2 + itemIndex * (BOX_HEIGHT + STACK_GAP),
                                z: rackConfig.position.z + rackD / 2,
                            },
                            color: categoryColors[category],
                            category,
                            weight: (inv.product_weight || 0.1) * inv.quantity_on_hand,
                            quantity: inv.quantity_on_hand,
                            createdAt: new Date(inv.created_at),
                        };
                        boxes.push(box);
                    });
                });
            });

            rackIndex++;
        }

        rowRentalInfo.push({
            rowId: row.id,
            rowName: row.name || row.code,
            isRented: row.is_rented,
            rackIds: rowRackIds,
        });
    }

    // ─── Private warehouse fallback: generate default 3-4 mockup racks ───
    // If no real rows/racks exist, create placeholder racks so the user
    // can visualize the warehouse space (kho riêng with no layout yet).
    if (racks.length === 0 && layout.length > 0 && layout.width > 0) {
        const MOCKUP_ROW_COUNT = layout.width >= 60 ? 4 : 3;
        const warehouseL = layout.length;
        const warehouseW = layout.width;
        const rowSpacing = warehouseW / (MOCKUP_ROW_COUNT + 1);

        for (let r = 0; r < MOCKUP_ROW_COUNT; r++) {
            const racksPerRow = Math.max(1, Math.floor(warehouseL / 14));
            for (let c = 0; c < racksPerRow; c++) {
                const mockId = `mockup-row${r}-rack${c}`;
                racks.push({
                    id: mockId,
                    name: `Dãy ${r + 1} - Kệ ${c + 1}`,
                    position: {
                        x: 4 + c * 12,
                        y: 0,
                        z: rowSpacing * (r + 1),
                    },
                    rows: 1,
                    columns: 4,
                    levels: 3,
                    cellWidth: DEFAULT_RACK_WIDTH,
                    cellHeight: DEFAULT_RACK_HEIGHT,
                    cellDepth: DEFAULT_RACK_DEPTH,
                    color: '#5588cc',
                    rowId: `mockup-row-${r}`,
                    isRowRented: false,
                });
            }
        }
    }

    return { racks, boxes, rowRentalInfo };
}

// ────────────────────────────────────────────────
// Hook interface
// ────────────────────────────────────────────────

interface UseWarehouse3DOptions {
    warehouseId: string | null;
    /** Bật WebSocket realtime updates (default true) */
    realtime?: boolean;
}

/**
 * Hook kết nối 3D warehouse visualization với backend API.
 *
 * Thay thế useWarehouse (local-only) khi có warehouseId thực.
 * - Fetch layout (rows → racks → shelves → blocks) via React Query
 * - Fetch inventory stock → transform thành boxes 3D
 * - WebSocket listener tự invalidate khi có thay đổi
 * - Giữ nguyên API tương thích với WarehouseScene props
 */
export function useWarehouse3D({ warehouseId, realtime = true }: UseWarehouse3DOptions) {
    const queryClient = useQueryClient();
    const socketRef = useRef<Socket | null>(null);

    // ─── UI-only state (ko cần persist) ─────────
    const { showToast } = useToast();
    const [uiState, setUiState] = useState({
        showBackground: true,
        showAxes: true,
        showGrid: true,
        selectedBox: null as string | null,
        selectedRack: null as string | null,
        viewMode: 'default' as 'default' | 'category' | 'heatmap',
        searchQuery: '',
        filterCategory: 'all' as BoxCategory | 'all',
        isDragMode: false,
        rackModalOpen: false,
        focusedRackId: null as string | null,
        focusedBoxId: null as string | null,
        visibleRackIds: null as string[] | null,
        fillRateFilter: null as FillRateStatus | null,
    });

    // ─── Data queries ───────────────────────────

    const {
        data: layout,
        isLoading: layoutLoading,
        error: layoutError,
    } = useQuery<WarehouseLayout>({
        queryKey: warehouseKeys.layout(warehouseId || ''),
        queryFn: async () => {
            const token = getToken();
            if (!token || !warehouseId) throw new Error('Chưa đăng nhập hoặc chưa chọn kho');
            return warehouseService.getLayout(token, warehouseId);
        },
        enabled: !!warehouseId,
        staleTime: 5 * 60 * 1000,       // 5 phút
        refetchOnWindowFocus: false,
    });

    const {
        data: stock,
        isLoading: stockLoading,
        error: stockError,
    } = useQuery<InventoryStockItem[]>({
        queryKey: warehouseKeys.stock(warehouseId || ''),
        queryFn: async () => {
            const token = getToken();
            if (!token || !warehouseId) return [];
            return warehouseService.getInventoryStock(token, warehouseId);
        },
        enabled: !!warehouseId,
        staleTime: 2 * 60 * 1000,       // 2 phút
        refetchOnWindowFocus: false,
    });

    // ─── Transform DB → 3D ──────────────────────

    const { racks, boxes, rowRentalInfo } = useMemo(() => {
        if (!layout) return { racks: [], boxes: [], rowRentalInfo: [] };
        return transformLayoutTo3D(layout, stock ?? []);
    }, [layout, stock]);

    // ─── Dimming logic for shared warehouses ─────
    // Racks belonging to rows that are NOT rented by the current user
    // will be dimmed in the 3D view. For kho chung, this highlights
    // only the rows that the customer has registered.
    const dimmedRackIds = useMemo(() => {
        // If any row is rented, this is a shared warehouse view
        const hasRentedRows = rowRentalInfo.some(r => r.isRented);
        const hasNonRentedRows = rowRentalInfo.some(r => !r.isRented);
        
        // Only apply dimming when there's a mix (shared warehouse scenario)
        if (!hasRentedRows || !hasNonRentedRows) return [];
        
        // Collect rack IDs from non-rented rows → these get dimmed
        const dimmed: string[] = [];
        for (const ri of rowRentalInfo) {
            if (!ri.isRented) {
                dimmed.push(...ri.rackIds);
            }
        }
        return dimmed;
    }, [rowRentalInfo]);

    // ─── Stats ──────────────────────────────────

    const stats: WarehouseStats = useMemo(() => {
        const totalCapacity = racks.reduce(
            (sum, rack) => sum + rack.rows * rack.columns * rack.levels,
            0,
        );

        const occupiedBlocks = new Set(boxes.map(b => `${b.rackId}-${b.row}-${b.column}-${b.level}`)).size;
        const fillRate = totalCapacity > 0 ? (occupiedBlocks / totalCapacity) * 100 : 0;

        const categoryBreakdown = boxes.reduce((acc, box) => {
            acc[box.category] = (acc[box.category] || 0) + 1;
            return acc;
        }, {} as Record<BoxCategory, number>);

        return {
            totalRacks: racks.length,
            totalBoxes: boxes.length,
            totalCapacity,
            usedCapacity: occupiedBlocks,
            fillRate,
            categoryBreakdown,
        };
    }, [racks, boxes]);

    // ─── WebSocket realtime invalidation ────────

    useEffect(() => {
        if (!realtime || !warehouseId) return;

        const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const token = getToken();

        const socket = io(wsUrl, {
            transports: ['websocket'],
            auth: { token },
            autoConnect: true,
        });

        socketRef.current = socket;

        // Khi có bất kỳ inventory/warehouse thay đổi → refetch
        const invalidateAll = () => {
            queryClient.invalidateQueries({ queryKey: warehouseKeys.layout(warehouseId) });
            queryClient.invalidateQueries({ queryKey: warehouseKeys.stock(warehouseId) });
        };

        socket.on('inbound:putaway-confirmed', invalidateAll);
        socket.on('outbound:shipped', invalidateAll);
        socket.on('outbound:shipment-completed', invalidateAll);
        socket.on('warehouse:updated', invalidateAll);
        socket.on(`warehouse:${warehouseId}:inventory-updated`, invalidateAll);
        socket.on('shelf:updated', invalidateAll);
        socket.on('rack:updated', invalidateAll);
        socket.on('row:updated', invalidateAll);

        return () => {
            socket.off('inbound:putaway-confirmed', invalidateAll);
            socket.off('outbound:shipped', invalidateAll);
            socket.off('outbound:shipment-completed', invalidateAll);
            socket.off('warehouse:updated', invalidateAll);
            socket.off(`warehouse:${warehouseId}:inventory-updated`, invalidateAll);
            socket.off('shelf:updated', invalidateAll);
            socket.off('rack:updated', invalidateAll);
            socket.off('row:updated', invalidateAll);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [realtime, warehouseId, queryClient]);

    // ─── UI actions (giữ tương thích với useWarehouse) ──────

    const selectBox = useCallback((id: string) => {
        setUiState(prev => ({
            ...prev,
            selectedBox: prev.selectedBox === id ? null : id,
        }));
    }, []);

    const selectRack = useCallback((id: string) => {
        setUiState(prev => ({
            ...prev,
            selectedRack: prev.selectedRack === id ? null : id,
        }));
    }, []);

    const clearSelection = useCallback(() => {
        setUiState(prev => ({ ...prev, selectedBox: null, selectedRack: null }));
    }, []);

    const setViewMode = useCallback((mode: 'default' | 'category' | 'heatmap') => {
        setUiState(prev => ({ ...prev, viewMode: mode }));
        showToast(`Chế độ xem: ${mode === 'default' ? 'Mặc định' : mode === 'category' ? 'Theo loại' : 'Nhiệt'}`, "success");
    }, []);

    const setSearchQuery = useCallback((query: string) => {
        setUiState(prev => ({ ...prev, searchQuery: query }));
    }, []);

    const setFilterCategory = useCallback((cat: BoxCategory | 'all') => {
        setUiState(prev => ({ ...prev, filterCategory: cat }));
    }, []);

    const toggleAxes = useCallback(() => {
        setUiState(prev => ({ ...prev, showAxes: !prev.showAxes }));
    }, []);

    const toggleGrid = useCallback(() => {
        setUiState(prev => ({ ...prev, showGrid: !prev.showGrid }));
    }, []);

    const toggleDragMode = useCallback(() => {
        setUiState(prev => ({ ...prev, isDragMode: !prev.isDragMode }));
    }, []);

    const openRackModal = useCallback((rackId: string) => {
        setUiState(prev => ({ ...prev, rackModalOpen: true, focusedRackId: rackId }));
    }, []);

    const closeRackModal = useCallback(() => {
        setUiState(prev => ({ ...prev, rackModalOpen: false, focusedRackId: null }));
    }, []);

    const showOnlyRack = useCallback((rackId: string) => {
        setUiState(prev => ({ ...prev, visibleRackIds: [rackId] }));
    }, []);

    const showAllRacks = useCallback(() => {
        setUiState(prev => ({ ...prev, visibleRackIds: null }));
    }, []);

    const setFillRateFilter = useCallback((status: FillRateStatus | null) => {
        setUiState(prev => ({ ...prev, fillRateFilter: status }));
    }, []);

    const focusOnBox = useCallback((boxId: string) => {
        setUiState(prev => ({ ...prev, focusedBoxId: boxId }));
    }, []);

    const clearBoxFocus = useCallback(() => {
        setUiState(prev => ({ ...prev, focusedBoxId: null }));
    }, []);

    const createBackground = useCallback(() => {
        setUiState(prev => ({ ...prev, showBackground: true }));
    }, []);

    const removeBackground = useCallback(() => {
        setUiState(prev => ({ ...prev, showBackground: false }));
    }, []);

    // ─── Computed helpers ────────────────────────

    const getRackStats = useCallback((rackId: string) => {
        const rack = racks.find(r => r.id === rackId);
        if (!rack) return null;

        const rackBoxes = boxes.filter(b => b.rackId === rackId);
        const capacity = rack.rows * rack.columns * rack.levels;
        const occupiedBlocks = new Set(rackBoxes.map(b => `${b.row}-${b.column}-${b.level}`)).size;
        const fillRate = capacity > 0 ? occupiedBlocks / capacity : 0;

        const categories: Partial<Record<BoxCategory, number>> = {};
        let totalWeight = 0;
        for (const b of rackBoxes) {
            categories[b.category] = (categories[b.category] || 0) + 1;
            totalWeight += b.weight || 0;
        }

        return {
            capacity,
            boxCount: rackBoxes.length,
            fillRate,
            status: getFillRateStatus(fillRate),
            categories,
            totalWeight,
        };
    }, [racks, boxes]);

    const getVisibleRackIdsByFillRate = useCallback(() => {
        if (!uiState.fillRateFilter) return null;
        return racks
            .filter(r => {
                const s = getRackStats(r.id);
                return s && s.status === uiState.fillRateFilter;
            })
            .map(r => r.id);
    }, [racks, uiState.fillRateFilter, getRackStats]);

    const getRackPosition = useCallback((rackId: string) => {
        return racks.find(r => r.id === rackId)?.position ?? null;
    }, [racks]);

    const getBoxById = useCallback((boxId: string) => {
        return boxes.find(b => b.id === boxId) ?? null;
    }, [boxes]);

    // ─── Force refresh ──────────────────────────

    const refresh = useCallback(() => {
        if (!warehouseId) return;
        queryClient.invalidateQueries({ queryKey: warehouseKeys.layout(warehouseId) });
        queryClient.invalidateQueries({ queryKey: warehouseKeys.stock(warehouseId) });
        showToast('Đang làm mới dữ liệu kho...', "success");
    }, [warehouseId, queryClient]);

    // ─── Compose state (tương thích với WarehouseState) ─────

    const state: WarehouseState = useMemo(() => ({
        ...uiState,
        racks,
        boxes,
        collisionWarnings: [],
    }), [uiState, racks, boxes]);

    // ─── Loading & Error ────────────────────────

    const isLoading = layoutLoading || stockLoading;
    const error = layoutError || stockError;

    return {
        // State tương thích với useWarehouse
        state,
        stats,
        isLoading,
        error,
        warehouseInfo: layout ? { id: layout.id, name: layout.name, description: layout.description } : null,

        // Selection & UI
        selectBox,
        selectRack,
        clearSelection,
        setViewMode,
        setSearchQuery,
        setFilterCategory,
        toggleAxes,
        toggleGrid,
        toggleDragMode,
        createBackground,
        removeBackground,

        // Rack modal
        openRackModal,
        closeRackModal,

        // Visibility
        showOnlyRack,
        showAllRacks,
        setFillRateFilter,
        getVisibleRackIdsByFillRate,

        // Focus
        focusOnBox,
        clearBoxFocus,

        // Computed
        getRackStats,
        getRackPosition,
        getBoxById,

        // Data
        refresh,

        // Shared warehouse (kho chung) rental info
        rowRentalInfo,
        dimmedRackIds,
    };
}
