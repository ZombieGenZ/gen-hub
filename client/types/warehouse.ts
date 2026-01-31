export interface Position {
  x: number;
  y: number;
  z: number;
}

export type FillRateStatus = 'empty' | 'low' | 'medium' | 'high' | 'full' | 'overfilled';

export const fillRateColors: Record<FillRateStatus, string> = {
  empty: '#64748b',     // Slate gray - trống
  low: '#22c55e',       // Green - còn nhiều chỗ
  medium: '#eab308',    // Yellow - vừa phải
  high: '#f97316',      // Orange - gần đầy
  full: '#ef4444',      // Red - đầy
  overfilled: '#dc2626', // Dark red - quá tải
};

export const fillRateLabels: Record<FillRateStatus, string> = {
  empty: 'Trống',
  low: 'Còn nhiều chỗ (< 30%)',
  medium: 'Vừa phải (30-60%)',
  high: 'Gần đầy (60-90%)',
  full: 'Đầy (90-100%)',
  overfilled: 'Quá tải (> 100%)',
};

export const getFillRateStatus = (fillRate: number): FillRateStatus => {
  if (fillRate <= 0) return 'empty';
  if (fillRate < 0.3) return 'low';
  if (fillRate < 0.6) return 'medium';
  if (fillRate < 0.9) return 'high';
  if (fillRate <= 1) return 'full';
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
