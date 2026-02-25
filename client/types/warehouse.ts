export interface Position {
  x: number;
  y: number;
  z: number;
}

// Simplified to 3 colors: GREEN (<50%), YELLOW (50-100%), RED (>100%)
export type FillRateStatus = 'low' | 'medium' | 'overfilled';

export const fillRateColors: Record<FillRateStatus, string> = {
  low: '#22c55e',       // Green - còn nhiều chỗ (< 50%)
  medium: '#eab308',    // Yellow - vừa phải (50-100%)
  overfilled: '#ef4444', // Red - quá tải (> 100%)
};

export const fillRateLabels: Record<FillRateStatus, string> = {
  low: 'Còn nhiều chỗ (< 50%)',
  medium: 'Vừa phải (50-100%)',
  overfilled: 'Quá tải (> 100%)',
};

export const getFillRateStatus = (fillRate: number): FillRateStatus => {
  if (fillRate < 0.5) return 'low';
  if (fillRate <= 1) return 'medium';
  return 'overfilled';
};

export interface RackConfig {
  id: string;
  name: string;
  position: Position;
  rows: number;
  columns: number;
  levels: number;
  cellWidth: number;
  cellHeight: number;
  cellDepth: number;
  color: string;
}

export interface BoxItem {
  id: string;
  name: string;
  rackId: string;
  row: number;
  column: number;
  level: number;
  position: Position;
  color: string;
  category: BoxCategory;
  weight?: number;
  quantity?: number;
  selected?: boolean;
  createdAt: Date;
}

export type BoxCategory = 'electronics' | 'food' | 'clothing' | 'fragile' | 'heavy' | 'standard';

export const categoryColors: Record<BoxCategory, string> = {
  electronics: '#3b82f6',
  food: '#22c55e', 
  clothing: '#a855f7',
  fragile: '#ef4444',
  heavy: '#64748b',
  standard: '#f59e0b',
};

export const categoryLabels: Record<BoxCategory, string> = {
  electronics: 'Điện tử',
  food: 'Thực phẩm',
  clothing: 'Quần áo',
  fragile: 'Dễ vỡ',
  heavy: 'Nặng',
  standard: 'Tiêu chuẩn',
};

export interface WarehouseStats {
  totalRacks: number;
  totalBoxes: number;
  totalCapacity: number;
  usedCapacity: number;
  categoryBreakdown: Record<BoxCategory, number>;
}

export interface WarehouseState {
  showBackground: boolean;
  showAxes: boolean;
  showGrid: boolean;
  racks: RackConfig[];
  boxes: BoxItem[];
  selectedBox: string | null;
  selectedRack: string | null;
  viewMode: 'default' | 'category' | 'heatmap';
  searchQuery: string;
  filterCategory: BoxCategory | 'all';
  isDragMode: boolean;
  collisionWarnings: string[];
  rackModalOpen: boolean;
  focusedRackId: string | null;
  focusedBoxId: string | null; // For barcode scanning - animate camera to this box
  visibleRackIds: string[] | null; // null = show all, array = show only these
  fillRateFilter: FillRateStatus | null; // null = show all, otherwise filter by this status
}

export interface RackStats {
  capacity: number;
  boxCount: number;
  fillRate: number;
  status: FillRateStatus;
  categories: Partial<Record<BoxCategory, number>>;
  totalWeight: number;
}

export interface WarehouseAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
  rackId?: string;
  boxId?: string;
}
