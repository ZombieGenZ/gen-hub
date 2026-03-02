// Inventory transaction types for In/Out management
export type TransactionType = 'in' | 'out';

export interface InventoryTransaction {
  id: string;
  type: TransactionType;
  boxId: string;
  boxName: string;
  rackId: string;
  rackName: string;
  category: string;
  quantity: number;
  weight?: number;
  timestamp: Date;
  note?: string;
  operator?: string;
}

export interface InventoryHistory {
  transactions: InventoryTransaction[];
  totalIn: number;
  totalOut: number;
}

// Alert types
export type AlertSeverity = 'info' | 'warning' | 'danger';
export type AlertCategory = 'overfilled' | 'weight' | 'expiry' | 'low_stock' | 'empty';

export interface WarehouseAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  rackId?: string;
  rackName?: string;
  boxId?: string;
  boxName?: string;
  timestamp: Date;
  dismissed: boolean;
  actionLabel?: string;
  actionCallback?: () => void;
}

// Statistics types
export interface DailyStats {
  date: string;
  totalBoxes: number;
  totalIn: number;
  totalOut: number;
  fillRate: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RackUtilization {
  rackId: string;
  rackName: string;
  capacity: number;
  used: number;
  fillRate: number;
  status: 'low' | 'medium' | 'overfilled';
}

// Search result with position for 3D highlighting
export interface SearchResult {
  boxId: string;
  boxName: string;
  rackId: string;
  rackName: string;
  category: string;
  position: { x: number; y: number; z: number };
  level: number;
  row: number;
  column: number;
  weight?: number;
  quantity?: number;
}

// Barcode scan result with inventory information
export interface BarcodeScanResult {
  // Basic info
  barcode: string;
  productName: string;
  category: string;
  
  // Inventory statistics
  totalBoxes: number;           // Tổng số thùng
  totalQuantity: number;        // Tổng số lượng trong kho
  totalWeight: number;          // Tổng trọng lượng
  
  // Location breakdown
  locations: BarcodeScanLocation[];
  
  // Status
  stockStatus: 'out_of_stock' | 'low_stock' | 'in_stock' | 'overstocked';
  lastUpdated: Date;
}

export interface BarcodeScanLocation {
  rackId: string;
  rackName: string;
  boxCount: number;
  quantity: number;
  weight: number;
  fillRate: number;
  boxes: SearchResult[];
}

// Stock status thresholds
export const STOCK_THRESHOLDS = {
  outOfStock: 0,
  lowStock: 5,
  overstock: 50,
};
