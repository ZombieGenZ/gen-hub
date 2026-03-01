'use client';

import { useState, useCallback, useMemo } from 'react';
import { 
  InventoryTransaction, 
  WarehouseAlert, 
  AlertSeverity,
  AlertCategory,
  DailyStats,
  CategoryStats,
  RackUtilization,
  SearchResult,
  BarcodeScanResult,
  BarcodeScanLocation,
  STOCK_THRESHOLDS
} from '@/types/inventory';
import { BoxItem, RackConfig, BoxCategory, categoryLabels, categoryColors, getFillRateStatus } from '@/types/warehouse';

const generateId = () => Math.random().toString(36).substring(2, 9);

interface UseInventoryProps {
  boxes: BoxItem[];
  racks: RackConfig[];
}

export const useInventory = ({ boxes, racks }: UseInventoryProps) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [alerts, setAlerts] = useState<WarehouseAlert[]>([]);
  const [highlightedBoxId, setHighlightedBoxId] = useState<string | null>(null);

  // Add transaction
  const addTransaction = useCallback((
    type: 'in' | 'out',
    box: BoxItem,
    rack: RackConfig,
    quantity: number = 1,
    note?: string
  ) => {
    const transaction: InventoryTransaction = {
      id: `trans-${generateId()}`,
      type,
      boxId: box.id,
      boxName: box.name,
      rackId: rack.id,
      rackName: rack.name,
      category: box.category,
      quantity,
      weight: box.weight,
      timestamp: new Date(),
      note,
      operator: 'Admin',
    };
    
    setTransactions(prev => [transaction, ...prev]);
  }, []);

  // Generate alerts based on current state
  const generateAlerts = useCallback(() => {
    const newAlerts: WarehouseAlert[] = [];
    
    racks.forEach(rack => {
      const rackBoxes = boxes.filter(b => b.rackId === rack.id);
      const capacity = rack.rows * rack.columns * rack.levels;
      const fillRate = capacity > 0 ? rackBoxes.length / capacity : 0;
      const totalWeight = rackBoxes.reduce((sum, b) => sum + (b.weight || 0), 0);
      const maxWeight = capacity * 50; // 50kg per slot max
      
      // Overfilled alert
      if (fillRate > 1) {
        newAlerts.push({
          id: `alert-overfill-${rack.id}`,
          severity: 'danger',
          category: 'overfilled',
          title: 'Kệ quá tải!',
          message: `${rack.name} đã vượt ${Math.round((fillRate - 1) * 100)}% sức chứa`,
          rackId: rack.id,
          rackName: rack.name,
          timestamp: new Date(),
          dismissed: false,
          actionLabel: 'Xem kệ',
        });
      } else if (fillRate > 0.9) {
        newAlerts.push({
          id: `alert-almostfull-${rack.id}`,
          severity: 'warning',
          category: 'overfilled',
          title: 'Kệ sắp đầy',
          message: `${rack.name} đã sử dụng ${Math.round(fillRate * 100)}% sức chứa`,
          rackId: rack.id,
          rackName: rack.name,
          timestamp: new Date(),
          dismissed: false,
        });
      }
      
      // Weight alert
      if (totalWeight > maxWeight * 0.8) {
        newAlerts.push({
          id: `alert-weight-${rack.id}`,
          severity: totalWeight > maxWeight ? 'danger' : 'warning',
          category: 'weight',
          title: totalWeight > maxWeight ? 'Vượt trọng lượng!' : 'Trọng lượng cao',
          message: `${rack.name}: ${totalWeight}kg / ${maxWeight}kg tối đa`,
          rackId: rack.id,
          rackName: rack.name,
          timestamp: new Date(),
          dismissed: false,
        });
      }
      
      // Empty rack info
      if (rackBoxes.length === 0 && capacity > 0) {
        newAlerts.push({
          id: `alert-empty-${rack.id}`,
          severity: 'info',
          category: 'empty',
          title: 'Kệ trống',
          message: `${rack.name} chưa có hàng, sức chứa ${capacity} thùng`,
          rackId: rack.id,
          rackName: rack.name,
          timestamp: new Date(),
          dismissed: false,
        });
      }
    });
    
    // Check for low stock categories
    const categoryCount: Record<string, number> = {};
    boxes.forEach(box => {
      categoryCount[box.category] = (categoryCount[box.category] || 0) + 1;
    });
    
    Object.entries(categoryCount).forEach(([category, count]) => {
      if (count < 5) {
        newAlerts.push({
          id: `alert-lowstock-${category}`,
          severity: 'warning',
          category: 'low_stock',
          title: 'Tồn kho thấp',
          message: `${categoryLabels[category as BoxCategory]}: chỉ còn ${count} thùng`,
          timestamp: new Date(),
          dismissed: false,
        });
      }
    });
    
    setAlerts(newAlerts);
    return newAlerts;
  }, [boxes, racks]);

  // Dismiss alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, dismissed: true } : a
    ));
  }, []);

  // Clear all dismissed alerts
  const clearDismissedAlerts = useCallback(() => {
    setAlerts(prev => prev.filter(a => !a.dismissed));
  }, []);

  // Search boxes
  const searchBoxes = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return boxes
      .filter(box => 
        box.name.toLowerCase().includes(lowerQuery) ||
        box.category.toLowerCase().includes(lowerQuery)
      )
      .map(box => {
        const rack = racks.find(r => r.id === box.rackId);
        return {
          boxId: box.id,
          boxName: box.name,
          rackId: box.rackId,
          rackName: rack?.name || 'Unknown',
          category: box.category,
          position: box.position,
          level: box.level,
          row: box.row,
          column: box.column,
          weight: box.weight,
          quantity: box.quantity,
        };
      })
      .slice(0, 20); // Limit results
  }, [boxes, racks]);

  // Scan barcode to check remaining inventory - Quét barcode kiểm tra tồn kho
  const scanBarcode = useCallback((barcode: string): BarcodeScanResult | null => {
    if (!barcode.trim()) return null;
    
    const lowerBarcode = barcode.toLowerCase().trim();
    
    // Find all boxes matching the barcode/product code
    const matchingBoxes = boxes.filter(box => {
      // Match by box name, category, or partial match
      const boxName = box.name.toLowerCase();
      const boxCategory = box.category.toLowerCase();
      
      return boxName.includes(lowerBarcode) || 
             boxCategory.includes(lowerBarcode) ||
             box.id.toLowerCase().includes(lowerBarcode);
    });
    
    if (matchingBoxes.length === 0) return null;
    
    // Group boxes by rack
    const rackGroups = new Map<string, BoxItem[]>();
    matchingBoxes.forEach(box => {
      const existing = rackGroups.get(box.rackId) || [];
      existing.push(box);
      rackGroups.set(box.rackId, existing);
    });
    
    // Build location breakdown
    const locations: BarcodeScanLocation[] = [];
    rackGroups.forEach((rackBoxes, rackId) => {
      const rack = racks.find(r => r.id === rackId);
      if (!rack) return;
      
      const capacity = rack.rows * rack.columns * rack.levels;
      const totalRackBoxes = boxes.filter(b => b.rackId === rackId).length;
      
      const locationQuantity = rackBoxes.reduce((sum, b) => sum + (b.quantity || 1), 0);
      const locationWeight = rackBoxes.reduce((sum, b) => sum + (b.weight || 0), 0);
      
      locations.push({
        rackId,
        rackName: rack.name,
        boxCount: rackBoxes.length,
        quantity: locationQuantity,
        weight: locationWeight,
        fillRate: capacity > 0 ? totalRackBoxes / capacity : 0,
        boxes: rackBoxes.map(box => ({
          boxId: box.id,
          boxName: box.name,
          rackId: box.rackId,
          rackName: rack.name,
          category: box.category,
          position: box.position,
          level: box.level,
          row: box.row,
          column: box.column,
          weight: box.weight,
          quantity: box.quantity,
        })),
      });
    });
    
    // Sort locations by box count descending
    locations.sort((a, b) => b.boxCount - a.boxCount);
    
    // Calculate totals
    const totalBoxes = matchingBoxes.length;
    const totalQuantity = matchingBoxes.reduce((sum, b) => sum + (b.quantity || 1), 0);
    const totalWeight = matchingBoxes.reduce((sum, b) => sum + (b.weight || 0), 0);
    
    // Determine stock status
    let stockStatus: BarcodeScanResult['stockStatus'];
    if (totalBoxes === STOCK_THRESHOLDS.outOfStock) {
      stockStatus = 'out_of_stock';
    } else if (totalBoxes <= STOCK_THRESHOLDS.lowStock) {
      stockStatus = 'low_stock';
    } else if (totalBoxes > STOCK_THRESHOLDS.overstock) {
      stockStatus = 'overstocked';
    } else {
      stockStatus = 'in_stock';
    }
    
    // Get product name and category from first match
    const primaryBox = matchingBoxes[0];
    
    return {
      barcode,
      productName: primaryBox.name,
      category: categoryLabels[primaryBox.category as BoxCategory] || primaryBox.category,
      totalBoxes,
      totalQuantity,
      totalWeight,
      locations,
      stockStatus,
      lastUpdated: new Date(),
    };
  }, [boxes, racks]);

  // Highlight a box and focus camera
  const highlightBox = useCallback((boxId: string | null) => {
    setHighlightedBoxId(boxId);
  }, []);

  // Get statistics
  const categoryStats = useMemo((): CategoryStats[] => {
    const total = boxes.length;
    if (total === 0) return [];
    
    const counts: Record<string, number> = {};
    boxes.forEach(box => {
      counts[box.category] = (counts[box.category] || 0) + 1;
    });
    
    return Object.entries(counts).map(([category, count]) => ({
      category: categoryLabels[category as BoxCategory] || category,
      count,
      percentage: Math.round((count / total) * 100),
      color: categoryColors[category as BoxCategory] || '#888888',
    }));
  }, [boxes]);

  const rackUtilization = useMemo((): RackUtilization[] => {
    return racks.map(rack => {
      const rackBoxes = boxes.filter(b => b.rackId === rack.id);
      const capacity = rack.rows * rack.columns * rack.levels;
      const fillRate = capacity > 0 ? rackBoxes.length / capacity : 0;
      
      return {
        rackId: rack.id,
        rackName: rack.name,
        capacity,
        used: rackBoxes.length,
        fillRate,
        status: getFillRateStatus(fillRate),
      };
    });
  }, [boxes, racks]);

  const transactionSummary = useMemo(() => {
    const today = new Date().toDateString();
    const todayTransactions = transactions.filter(
      t => new Date(t.timestamp).toDateString() === today
    );
    
    const totalIn = todayTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.quantity, 0);
    const totalOut = todayTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.quantity, 0);
    
    return {
      todayIn: totalIn,
      todayOut: totalOut,
      totalTransactions: transactions.length,
    };
  }, [transactions]);

  // Active (non-dismissed) alerts
  const activeAlerts = useMemo(() => 
    alerts.filter(a => !a.dismissed),
  [alerts]);

  // Get alerts by severity
  const alertsBySeverity = useMemo(() => ({
    danger: activeAlerts.filter(a => a.severity === 'danger'),
    warning: activeAlerts.filter(a => a.severity === 'warning'),
    info: activeAlerts.filter(a => a.severity === 'info'),
  }), [activeAlerts]);

  return {
    // State
    transactions,
    alerts: activeAlerts,
    alertsBySeverity,
    highlightedBoxId,
    
    // Actions
    addTransaction,
    generateAlerts,
    dismissAlert,
    clearDismissedAlerts,
    searchBoxes,
    scanBarcode,
    highlightBox,
    
    // Statistics
    categoryStats,
    rackUtilization,
    transactionSummary,
  };
};
