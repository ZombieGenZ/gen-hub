'use client';

import { useState, useCallback, useMemo } from 'react';
import { 
  RackConfig, BoxItem, WarehouseState, BoxCategory, 
  categoryColors, WarehouseStats, FillRateStatus, getFillRateStatus
} from '@/types/warehouse';
import { toast } from 'sonner';

const initialState: WarehouseState = {
  showBackground: true,
  showAxes: true,
  showGrid: true,
  racks: [],
  boxes: [],
  selectedBox: null,
  selectedRack: null,
  viewMode: 'default',
  searchQuery: '',
  filterCategory: 'all',
  isDragMode: false,
  collisionWarnings: [],
  rackModalOpen: false,
  focusedRackId: null,
  focusedBoxId: null,
  visibleRackIds: null,
  fillRateFilter: null,
};

const generateId = () => Math.random().toString(36).substring(2, 9);

const rackColors = ['#0066ff', '#0088ff', '#00aaff', '#0044dd', '#0055cc'];

export const useWarehouse = () => {
  const [state, setState] = useState<WarehouseState>(initialState);

  // Calculate statistics
  const stats: WarehouseStats = useMemo(() => {
    const totalCapacity = state.racks.reduce(
      (sum, rack) => sum + rack.rows * rack.columns * rack.levels, 
      0
    );
    
    const categoryBreakdown = state.boxes.reduce((acc, box) => {
      acc[box.category] = (acc[box.category] || 0) + 1;
      return acc;
    }, {} as Record<BoxCategory, number>);
    
    const fillRate = totalCapacity > 0 ? (state.boxes.length / totalCapacity) * 100 : 0;
    
    return {
      totalRacks: state.racks.length,
      totalBoxes: state.boxes.length,
      totalCapacity,
      usedCapacity: state.boxes.length,
      fillRate,
      categoryBreakdown,
    };
  }, [state.racks, state.boxes]);

  const createBackground = useCallback(() => {
    setState(prev => ({ ...prev, showBackground: true }));
    toast.success('Đã tạo nền kho');
  }, []);

  const removeBackground = useCallback(() => {
    setState(prev => ({ ...prev, showBackground: false }));
    toast.success('Đã ẩn nền kho');
  }, []);

  const toggleAxes = useCallback(() => {
    setState(prev => ({ ...prev, showAxes: !prev.showAxes }));
  }, []);

  const toggleGrid = useCallback(() => {
    setState(prev => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const setViewMode = useCallback((mode: 'default' | 'category' | 'heatmap') => {
    setState(prev => ({ ...prev, viewMode: mode }));
    toast.success(`Chế độ xem: ${mode === 'default' ? 'Mặc định' : mode === 'category' ? 'Theo loại' : 'Nhiệt'}`);
  }, []);

  const createRack = useCallback((config: { rows: number; columns: number; levels: number }) => {
    const rackCount = state.racks.length;
    const spacingX = 12; // More space between racks
    const spacingZ = 8;
    const col = rackCount % 6;
    const row = Math.floor(rackCount / 6);
    
    // Industrial pallet rack dimensions
    const newRack: RackConfig = {
      id: `rack-${generateId()}`,
      name: `Kệ ${String.fromCharCode(65 + row)}${col + 1}`,
      position: {
        x: 5 + col * spacingX,
        y: 0,
        z: 5 + row * spacingZ,
      },
      rows: config.rows,
      columns: config.columns,
      levels: config.levels,
      cellWidth: 2.8,   // 2.8m wide per bay
      cellHeight: 1.2,  // 1.2m per level (total ~5m for 4 levels)
      cellDepth: 1.1,   // 1.1m deep (standard pallet depth)
      color: rackColors[rackCount % rackColors.length],
    };
    
    setState(prev => ({ ...prev, racks: [...prev.racks, newRack] }));
    toast.success(`Đã tạo ${newRack.name}`);
  }, [state.racks.length]);

  const removeRack = useCallback(() => {
    if (state.racks.length === 0) return;
    
    const rackToRemove = state.selectedRack || state.racks[state.racks.length - 1].id;
    const rack = state.racks.find(r => r.id === rackToRemove);
    
    setState(prev => ({
      ...prev,
      racks: prev.racks.filter(r => r.id !== rackToRemove),
      boxes: prev.boxes.filter(box => box.rackId !== rackToRemove),
      selectedRack: null,
    }));
    
    toast.success(`Đã xóa ${rack?.name || 'kệ'}`);
  }, [state.racks, state.selectedRack]);

  const addBoxes = useCallback((count: number, category: BoxCategory) => {
    if (state.racks.length === 0) {
      toast.error('Vui lòng tạo kệ trước');
      return;
    }
    
    // If a rack is selected, add only to that rack
    const targetRacks = state.selectedRack 
      ? state.racks.filter(r => r.id === state.selectedRack)
      : state.racks;
    
    if (targetRacks.length === 0) {
      toast.error('Kệ được chọn không tồn tại');
      return;
    }
    
    const newBoxes: BoxItem[] = [];
    
    // Smart placement algorithm: fill from bottom level, front to back, left to right
    for (let i = 0; i < count; i++) {
      // Find rack with available space using smart placement
      let placed = false;
      
      for (const rack of targetRacks) {
        const rackBoxes = [...state.boxes, ...newBoxes].filter(b => b.rackId === rack.id);
        const occupiedSlots = new Set(rackBoxes.map(b => `${b.level}-${b.row}-${b.column}`));
        
        // Fill from bottom level up, then front to back, then left to right
        for (let level = 0; level < rack.levels && !placed; level++) {
          for (let row = 0; row < rack.rows && !placed; row++) {
            for (let col = 0; col < rack.columns && !placed; col++) {
              const slotKey = `${level}-${row}-${col}`;
              if (!occupiedSlots.has(slotKey)) {
                const box: BoxItem = {
                  id: `box-${generateId()}-${i}`,
                  name: `${category.toUpperCase().substring(0, 3)}-${generateId().toUpperCase()}`,
                  rackId: rack.id,
                  row,
                  column: col,
                  level,
                  position: {
                    x: rack.position.x + col * rack.cellWidth + rack.cellWidth / 2,
                    y: rack.position.y + level * rack.cellHeight + rack.cellHeight / 2,
                    z: rack.position.z + row * rack.cellDepth + rack.cellDepth / 2,
                  },
                  color: categoryColors[category],
                  category,
                  weight: Math.floor(Math.random() * 50) + 1,
                  quantity: Math.floor(Math.random() * 100) + 1,
                  createdAt: new Date(),
                };
                newBoxes.push(box);
                placed = true;
              }
            }
          }
        }
        
        if (placed) break;
      }
      
      // If no slot found in any rack, show warning
      if (!placed) {
        toast.warning(`Không đủ chỗ để thêm tất cả ${count} thùng, chỉ thêm được ${newBoxes.length} thùng`);
        break;
      }
    }
    
    if (newBoxes.length > 0) {
      const rackName = state.selectedRack 
        ? targetRacks[0].name 
        : 'kho';
      
      setState(prev => ({ ...prev, boxes: [...prev.boxes, ...newBoxes] }));
      toast.success(`Đã thêm ${newBoxes.length} thùng vào ${rackName}`);
    }
  }, [state.racks, state.selectedRack, state.boxes]);

  const removeAllBoxes = useCallback(() => {
    if (state.selectedRack) {
      const rack = state.racks.find(r => r.id === state.selectedRack);
      setState(prev => ({
        ...prev,
        boxes: prev.boxes.filter(b => b.rackId !== state.selectedRack),
        selectedBox: null,
      }));
      toast.success(`Đã xóa thùng hàng trong ${rack?.name || 'kệ'}`);
    } else {
      setState(prev => ({ ...prev, boxes: [], selectedBox: null }));
      toast.success('Đã xóa tất cả thùng hàng');
    }
  }, [state.selectedRack, state.racks]);

  const removeSelectedBox = useCallback(() => {
    if (!state.selectedBox) {
      toast.error('Chưa chọn thùng hàng');
      return;
    }
    const box = state.boxes.find(b => b.id === state.selectedBox);
    setState(prev => ({
      ...prev,
      boxes: prev.boxes.filter(b => b.id !== state.selectedBox),
      selectedBox: null,
    }));
    toast.success(`Đã xóa ${box?.name || 'thùng hàng'}`);
  }, [state.selectedBox, state.boxes]);

  const moveBoxToRack = useCallback((boxId: string, targetRackId: string) => {
    const targetRack = state.racks.find(r => r.id === targetRackId);
    if (!targetRack) return;
    
    const level = Math.floor(Math.random() * targetRack.levels);
    const row = Math.floor(Math.random() * targetRack.rows);
    const col = Math.floor(Math.random() * targetRack.columns);
    
    setState(prev => ({
      ...prev,
      boxes: prev.boxes.map(box => 
        box.id === boxId 
          ? {
              ...box,
              rackId: targetRackId,
              row,
              column: col,
              level,
              position: {
                x: targetRack.position.x + col * targetRack.cellWidth + targetRack.cellWidth / 2,
                y: targetRack.position.y + level * targetRack.cellHeight + targetRack.cellHeight / 2,
                z: targetRack.position.z + row * targetRack.cellDepth + targetRack.cellDepth / 2,
              },
            }
          : box
      ),
    }));
    toast.success(`Đã di chuyển thùng đến ${targetRack.name}`);
  }, [state.racks]);

  const duplicateBox = useCallback((boxId: string) => {
    const sourceBox = state.boxes.find(b => b.id === boxId);
    if (!sourceBox) return;
    
    const newBox: BoxItem = {
      ...sourceBox,
      id: `box-${generateId()}`,
      name: `${sourceBox.category.toUpperCase()}-${generateId().toUpperCase()}`,
      selected: false,
      createdAt: new Date(),
    };
    
    setState(prev => ({ ...prev, boxes: [...prev.boxes, newBox] }));
    toast.success(`Đã nhân đôi thùng`);
  }, [state.boxes]);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedBox: null,
      selectedRack: null,
      boxes: prev.boxes.map(b => ({ ...b, selected: false })),
    }));
  }, []);

  const loadDemoData = useCallback(() => {
    const demoRacks: RackConfig[] = [];
    const demoBoxes: BoxItem[] = [];
    
    // Industrial pallet rack dimensions (optimized for performance)
    const rackConfig = {
      cellWidth: 2.8,   // 2.8m wide per bay
      cellHeight: 1.2,  // 1.2m per level
      cellDepth: 1.1,   // 1.1m deep
      levels: 4,        // 4 levels high
      rows: 1,          // Single row deep
      columns: 3,       // 3 bays per rack unit
    };
    
    // Optimized layout: 27 racks for better performance
    const sections = [
      { name: 'A', startX: 5, startZ: 5, rackCount: 5, direction: 'horizontal' },
      { name: 'B', startX: 5, startZ: 12, rackCount: 5, direction: 'horizontal' },
      { name: 'C', startX: 5, startZ: 19, rackCount: 5, direction: 'horizontal' },
      { name: 'D', startX: 5, startZ: 26, rackCount: 5, direction: 'horizontal' },
      { name: 'E', startX: 45, startZ: 5, rackCount: 4, direction: 'vertical' },
      { name: 'F', startX: 55, startZ: 5, rackCount: 3, direction: 'vertical' },
    ];
    
    let rackIndex = 0;
    
    sections.forEach((section) => {
      for (let i = 0; i < section.rackCount; i++) {
        const isVertical = section.direction === 'vertical';
        const spacing = isVertical ? 7 : 10;
        
        const rack: RackConfig = {
          id: `rack-${section.name}-${i + 1}`,
          name: `${section.name}${i + 1}`,
          position: {
            x: section.startX + (isVertical ? 0 : i * spacing),
            y: 0,
            z: section.startZ + (isVertical ? i * spacing : 0),
          },
          rows: isVertical ? rackConfig.columns : rackConfig.rows,
          columns: isVertical ? rackConfig.rows : rackConfig.columns,
          levels: rackConfig.levels,
          cellWidth: isVertical ? rackConfig.cellDepth : rackConfig.cellWidth,
          cellHeight: rackConfig.cellHeight,
          cellDepth: isVertical ? rackConfig.cellWidth : rackConfig.cellDepth,
          color: rackColors[rackIndex % rackColors.length],
        };
        demoRacks.push(rack);
        rackIndex++;
      }
    });
    
    // Fill with boxes - limited to 210 boxes for optimal performance
    const categories: BoxCategory[] = ['electronics', 'food', 'clothing', 'fragile', 'heavy', 'standard'];
    const maxTotalBoxes = 210;
    let totalBoxCount = 0;
    
    demoRacks.forEach((rack, rackIdx) => {
      if (totalBoxCount >= maxTotalBoxes) return;
      
      // Vary fill rates for demonstration (reduced to fit 210 total)
      const fillTarget = rackIdx % 3 === 0 ? 0.25 : rackIdx % 3 === 1 ? 0.5 : 0.75;
      const capacity = rack.rows * rack.columns * rack.levels;
      const targetBoxes = Math.min(
        Math.floor(capacity * fillTarget),
        maxTotalBoxes - totalBoxCount
      );
      let boxCount = 0;
      
      for (let level = 0; level < rack.levels && boxCount < targetBoxes; level++) {
        for (let row = 0; row < rack.rows && boxCount < targetBoxes; row++) {
          for (let col = 0; col < rack.columns && boxCount < targetBoxes; col++) {
            if (Math.random() > 0.15) {
              const category = categories[Math.floor(Math.random() * categories.length)];
              demoBoxes.push({
                id: `box-${rack.id}-${level}-${row}-${col}`,
                name: `${category.substring(0, 3).toUpperCase()}-${generateId().toUpperCase()}`,
                rackId: rack.id,
                row,
                column: col,
                level,
                position: {
                  x: rack.position.x + col * rack.cellWidth + rack.cellWidth / 2,
                  y: rack.position.y + level * rack.cellHeight + rack.cellHeight / 2,
                  z: rack.position.z + row * rack.cellDepth + rack.cellDepth / 2,
                },
                color: categoryColors[category],
                category,
                weight: Math.floor(Math.random() * 50) + 5,
                quantity: Math.floor(Math.random() * 100) + 10,
                createdAt: new Date(),
              });
              boxCount++;
              totalBoxCount++;
            }
          }
        }
      }
    });
    
    setState({
      showBackground: true,
      showAxes: true,
      showGrid: true,
      racks: demoRacks,
      boxes: demoBoxes,
      selectedBox: null,
      selectedRack: null,
      viewMode: 'default',
      searchQuery: '',
      filterCategory: 'all',
      isDragMode: false,
      collisionWarnings: [],
      rackModalOpen: false,
      focusedRackId: null,
      focusedBoxId: null,
      visibleRackIds: null,
      fillRateFilter: null,
    });
    
    toast.success(`Đã tải ${demoRacks.length} kệ và ${demoBoxes.length} thùng hàng`);
  }, []);

  const selectBox = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      selectedBox: prev.selectedBox === id ? null : id,
      boxes: prev.boxes.map(box => ({
        ...box,
        selected: box.id === id ? !box.selected : false,
      })),
    }));
  }, []);

  const selectRack = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      selectedRack: prev.selectedRack === id ? null : id,
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setFilterCategory = useCallback((category: BoxCategory | 'all') => {
    setState(prev => ({ ...prev, filterCategory: category }));
  }, []);

  const exportData = useCallback(() => {
    const data = {
      racks: state.racks,
      boxes: state.boxes.map(({ selected, ...rest }) => rest),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-layout-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất dữ liệu');
  }, [state]);

  const importData = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.racks && data.boxes) {
          setState(prev => ({
            ...prev,
            racks: data.racks,
            boxes: data.boxes.map((box: BoxItem) => ({ ...box, selected: false })),
          }));
          toast.success(`Đã nhập ${data.racks.length} kệ và ${data.boxes.length} thùng`);
        } else {
          toast.error('File không hợp lệ');
        }
      } catch {
        toast.error('Không thể đọc file');
      }
    };
    input.click();
  }, []);

  const toggleDragMode = useCallback(() => {
    setState(prev => ({ ...prev, isDragMode: !prev.isDragMode }));
    toast.success(state.isDragMode ? 'Đã tắt chế độ di chuyển kệ' : 'Bật chế độ di chuyển kệ - chọn kệ rồi dùng phím mũi tên ←↑↓→');
  }, [state.isDragMode]);

  // Get rack position for keyboard navigation
  const getRackPosition = useCallback((rackId: string) => {
    const rack = state.racks.find(r => r.id === rackId);
    return rack?.position || null;
  }, [state.racks]);

  const updateRackPosition = useCallback((rackId: string, position: { x: number; y: number; z: number }) => {
    setState(prev => {
      const updatedRacks = prev.racks.map(r => 
        r.id === rackId ? { ...r, position } : r
      );
      
      // Update box positions for boxes in this rack
      const rack = prev.racks.find(r => r.id === rackId);
      if (!rack) return prev;
      
      const updatedBoxes = prev.boxes.map(box => {
        if (box.rackId !== rackId) return box;
        return {
          ...box,
          position: {
            x: position.x + box.column * rack.cellWidth + rack.cellWidth / 2,
            y: position.y + box.level * rack.cellHeight + rack.cellHeight / 2,
            z: position.z + box.row * rack.cellDepth + rack.cellDepth / 2,
          },
        };
      });
      
      // Check for collisions
      const collisions: string[] = [];
      for (let i = 0; i < updatedRacks.length; i++) {
        for (let j = i + 1; j < updatedRacks.length; j++) {
          const r1 = updatedRacks[i];
          const r2 = updatedRacks[j];
          const w1 = r1.columns * r1.cellWidth;
          const d1 = r1.rows * r1.cellDepth;
          const w2 = r2.columns * r2.cellWidth;
          const d2 = r2.rows * r2.cellDepth;
          
          if (
            r1.position.x < r2.position.x + w2 &&
            r1.position.x + w1 > r2.position.x &&
            r1.position.z < r2.position.z + d2 &&
            r1.position.z + d1 > r2.position.z
          ) {
            collisions.push(`${r1.name} và ${r2.name} đang chồng nhau!`);
          }
        }
      }
      
      return { 
        ...prev, 
        racks: updatedRacks, 
        boxes: updatedBoxes,
        collisionWarnings: collisions,
      };
    });
  }, []);

  const rotateRack = useCallback((rackId: string) => {
    setState(prev => ({
      ...prev,
      racks: prev.racks.map(r => {
        if (r.id !== rackId) return r;
        // Swap rows and columns to rotate
        return { ...r, rows: r.columns, columns: r.rows };
      }),
    }));
    toast.success('Đã xoay kệ 90°');
  }, []);

  const cloneRack = useCallback((rackId: string) => {
    const sourceRack = state.racks.find(r => r.id === rackId);
    if (!sourceRack) return;
    
    const newRack: RackConfig = {
      ...sourceRack,
      id: `rack-${generateId()}`,
      name: `${sourceRack.name} (copy)`,
      position: {
        x: sourceRack.position.x + sourceRack.columns * sourceRack.cellWidth + 2,
        y: sourceRack.position.y,
        z: sourceRack.position.z,
      },
    };
    
    setState(prev => ({ ...prev, racks: [...prev.racks, newRack] }));
    toast.success(`Đã nhân đôi ${sourceRack.name}`);
  }, [state.racks]);

  const openRackModal = useCallback((rackId: string) => {
    setState(prev => ({ 
      ...prev, 
      rackModalOpen: true, 
      focusedRackId: rackId,
      selectedRack: rackId,
    }));
  }, []);

  const closeRackModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      rackModalOpen: false, 
      focusedRackId: null,
    }));
  }, []);

  const removeBoxById = useCallback((boxId: string) => {
    const box = state.boxes.find(b => b.id === boxId);
    setState(prev => ({
      ...prev,
      boxes: prev.boxes.filter(b => b.id !== boxId),
      selectedBox: prev.selectedBox === boxId ? null : prev.selectedBox,
    }));
    if (box) {
      toast.success(`Đã xóa ${box.name}`);
    }
  }, [state.boxes]);

  // Get rack stats including fill rate
  const getRackStats = useCallback((rackId: string) => {
    const rack = state.racks.find(r => r.id === rackId);
    if (!rack) return null;
    
    const rackBoxes = state.boxes.filter(b => b.rackId === rackId);
    const capacity = rack.rows * rack.columns * rack.levels;
    const fillRate = capacity > 0 ? rackBoxes.length / capacity : 0;
    
    return { capacity, boxCount: rackBoxes.length, fillRate };
  }, [state.racks, state.boxes]);

  const getRackFillRate = useCallback((rackId: string) => {
    const stats = getRackStats(rackId);
    return stats?.fillRate ?? 0;
  }, [getRackStats]);

  const setVisibleRacks = useCallback((rackIds: string[] | null) => {
    setState(prev => ({ ...prev, visibleRackIds: rackIds }));
    if (rackIds === null) {
      toast.success('Hiển thị tất cả kệ');
    } else if (rackIds.length === 0) {
      toast.info('Đã ẩn tất cả kệ');
    } else {
      toast.success(`Hiển thị ${rackIds.length} kệ`);
    }
  }, []);

  const showOnlyRack = useCallback((rackId: string) => {
    setState(prev => ({ ...prev, visibleRackIds: [rackId] }));
    const rack = state.racks.find(r => r.id === rackId);
    toast.success(`Chỉ hiển thị ${rack?.name || 'kệ đã chọn'}`);
  }, [state.racks]);

  const showAllRacks = useCallback(() => {
    setState(prev => ({ ...prev, visibleRackIds: null }));
    toast.success('Hiển thị tất cả kệ');
  }, []);

  const setFillRateFilter = useCallback((status: FillRateStatus | null) => {
    setState(prev => ({ ...prev, fillRateFilter: status }));
    if (status === null) {
      toast.success('Hiển thị tất cả kệ');
    } else {
      toast.success(`Đang lọc kệ: ${status}`);
    }
  }, []);

  // Get visible rack IDs based on fill rate filter
  const getVisibleRackIdsByFillRate = useCallback(() => {
    if (state.fillRateFilter === null) return null;
    
    return state.racks
      .filter(rack => {
        const rackBoxes = state.boxes.filter(b => b.rackId === rack.id);
        const capacity = rack.rows * rack.columns * rack.levels;
        const fillRate = capacity > 0 ? rackBoxes.length / capacity : 0;
        const status = getFillRateStatus(fillRate);
        return status === state.fillRateFilter;
      })
      .map(r => r.id);
  }, [state.racks, state.boxes, state.fillRateFilter]);

  // Focus on a specific box (for barcode scanning)
  const focusOnBox = useCallback((boxId: string) => {
    const box = state.boxes.find(b => b.id === boxId);
    if (box) {
      setState(prev => ({
        ...prev,
        focusedBoxId: boxId,
        selectedBox: boxId,
        selectedRack: box.rackId,
        boxes: prev.boxes.map(b => ({
          ...b,
          selected: b.id === boxId,
        })),
      }));
      toast.success(`Đang định vị: ${box.name}`);
    }
  }, [state.boxes]);

  // Clear box focus
  const clearBoxFocus = useCallback(() => {
    setState(prev => ({
      ...prev,
      focusedBoxId: null,
    }));
  }, []);

  // Get box by ID
  const getBoxById = useCallback((boxId: string) => {
    return state.boxes.find(b => b.id === boxId) || null;
  }, [state.boxes]);

  return {
    state,
    stats,
    createBackground,
    removeBackground,
    toggleAxes,
    toggleGrid,
    setViewMode,
    createRack,
    removeRack,
    addBoxes,
    removeAllBoxes,
    removeSelectedBox,
    moveBoxToRack,
    duplicateBox,
    clearSelection,
    loadDemoData,
    selectBox,
    selectRack,
    setSearchQuery,
    setFilterCategory,
    exportData,
    importData,
    toggleDragMode,
    updateRackPosition,
    rotateRack,
    cloneRack,
    openRackModal,
    closeRackModal,
    removeBoxById,
    getRackStats,
    getRackFillRate,
    setVisibleRacks,
    showOnlyRack,
    showAllRacks,
    setFillRateFilter,
    getVisibleRackIdsByFillRate,
    getRackPosition,
    focusOnBox,
    clearBoxFocus,
    getBoxById,
  };
};
