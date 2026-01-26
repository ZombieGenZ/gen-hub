export interface Position {
  x: number;
  y: number;
  z: number;
}

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
}

export interface WarehouseAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
  rackId?: string;
  boxId?: string;
}
