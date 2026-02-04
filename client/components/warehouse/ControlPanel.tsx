'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Layers, Trash2, Box, Download, Plus, Grid3X3, 
  Eye, EyeOff, Search, Palette, Upload, Axis3D,
  LayoutGrid, Thermometer, Package, Boxes, Copy,
  Move, X, Target, ArrowRight, GripVertical, RotateCw,
  AlertTriangle, User, Home, Gauge, Activity
} from 'lucide-react';
import { BoxCategory, categoryLabels, categoryColors, WarehouseStats, RackConfig, BoxItem } from '@/types/warehouse';

interface ControlPanelProps {
  onCreateBackground: () => void;
  onRemoveBackground: () => void;
  onCreateRack: (config: { rows: number; columns: number; levels: number }) => void;
  onRemoveRack: () => void;
  onAddBoxes: (count: number, category: BoxCategory) => void;
  onRemoveAllBoxes: () => void;
  onRemoveSelectedBox: () => void;
  onMoveBoxToRack: (boxId: string, rackId: string) => void;
  onDuplicateBox: (boxId: string) => void;
  onClearSelection: () => void;
  onLoadDemoData: () => void;
  onExportData: () => void;
  onImportData: () => void;
  onToggleAxes: () => void;
  onToggleGrid: () => void;
  onSetViewMode: (mode: 'default' | 'category' | 'heatmap') => void;
  onSearch: (query: string) => void;
  onFilterCategory: (category: BoxCategory | 'all') => void;
  onToggleDragMode: () => void;
  onRotateRack: (rackId: string) => void;
  onCloneRack: (rackId: string) => void;
  onShowOnlyRack: (rackId: string) => void;
  onShowAllRacks: () => void;
  // New feature toggles
  onToggleHumans?: () => void;
  onToggleRoof?: () => void;
  onTogglePerformanceMode?: () => void;
  onToggleFPS?: () => void;
  showHumans?: boolean;
  showRoof?: boolean;
  performanceMode?: boolean;
  showFPS?: boolean;
  hasBackground: boolean;
  hasRacks: boolean;
  showAxes: boolean;
  showGrid: boolean;
  viewMode: 'default' | 'category' | 'heatmap';
  stats: WarehouseStats;
  searchQuery: string;
  filterCategory: BoxCategory | 'all';
  selectedRack: string | null;
  selectedBox: string | null;
  racks: RackConfig[];
  boxes: BoxItem[];
  isDragMode: boolean;
  collisionWarnings: string[];
  isFilteringRacks: boolean;
}

const ControlPanel = ({
  onCreateBackground,
  onRemoveBackground,
  onCreateRack,
  onRemoveRack,
  onAddBoxes,
  onRemoveAllBoxes,
  onRemoveSelectedBox,
  onMoveBoxToRack,
  onDuplicateBox,
  onClearSelection,
  onLoadDemoData,
  onExportData,
  onImportData,
  onToggleAxes,
  onToggleGrid,
  onSetViewMode,
  onSearch,
  onFilterCategory,
  onToggleDragMode,
  onRotateRack,
  onCloneRack,
  onShowOnlyRack,
  onShowAllRacks,
  onToggleHumans,
  onToggleRoof,
  onTogglePerformanceMode,
  onToggleFPS,
  showHumans = true,
  showRoof = true,
  performanceMode = false,
  showFPS = false,
  hasBackground,
  hasRacks,
  showAxes,
  showGrid,
  viewMode,
  stats,
  searchQuery,
  filterCategory,
  selectedRack,
  selectedBox,
  racks,
  boxes,
  isDragMode,
  collisionWarnings,
  isFilteringRacks,
}: ControlPanelProps) => {
  const [rackRows, setRackRows] = React.useState(2);
  const [rackColumns, setRackColumns] = React.useState(3);
  const [rackLevels, setRackLevels] = React.useState(4);
  const [boxCount, setBoxCount] = React.useState(10);
  const [boxCategory, setBoxCategory] = React.useState<BoxCategory>('standard');
  const [moveTargetRack, setMoveTargetRack] = React.useState<string>('');

  const selectedRackInfo = selectedRack ? racks.find(r => r.id === selectedRack) : null;
  const selectedBoxInfo = selectedBox ? boxes.find(b => b.id === selectedBox) : null;

  return (
    <div className="w-72 bg-card border-r border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Warehouse 3D
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Collision Warnings */}
        {collisionWarnings.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <div className="flex items-center gap-1 text-destructive text-xs font-semibold mb-1">
              <AlertTriangle className="w-3 h-3" />
              Cảnh báo va chạm
            </div>
            {collisionWarnings.map((warning, i) => (
              <p key={i} className="text-xs text-destructive/80">{warning}</p>
            ))}
          </div>
        )}

        {/* Show All Racks Button - visible when filtering */}
        {isFilteringRacks && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={onShowAllRacks}
          >
            <Eye className="w-3 h-3 mr-1" />
            Hiển thị tất cả kệ
          </Button>
        )}

        {/* Rack Move Mode Toggle */}
        <Button
          variant={isDragMode ? "default" : "outline"}
          size="sm"
          className="w-full text-xs"
          onClick={onToggleDragMode}
        >
          <GripVertical className="w-3 h-3 mr-1" />
          {isDragMode ? 'Tắt di chuyển kệ' : 'Bật di chuyển kệ (←↑↓→)'}
        </Button>

        {/* Selection Info */}
        {(selectedRack || selectedBox) && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-primary flex items-center gap-1">
                <Target className="w-3 h-3" />
                Đang chọn
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onClearSelection}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            {selectedRackInfo && (
              <div className="text-sm space-y-2">
                <Badge variant="secondary" className="mb-1">
                  <Grid3X3 className="w-3 h-3 mr-1" />
                  {selectedRackInfo.name}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {selectedRackInfo.rows}x{selectedRackInfo.columns}x{selectedRackInfo.levels} = 
                  {selectedRackInfo.rows * selectedRackInfo.columns * selectedRackInfo.levels} ô
                </p>
                <p className="text-xs text-primary">
                  ✓ Thêm hàng sẽ vào kệ này
                </p>
                
                {/* Rack Actions */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => onRotateRack(selectedRack!)}
                  >
                    <RotateCw className="w-3 h-3 mr-1" />
                    Xoay
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => onCloneRack(selectedRack!)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Nhân đôi
                  </Button>
                </div>
                
                {/* Filter/Isolate Rack */}
                <div className="flex gap-1">
                  <Button
                    variant={isFilteringRacks ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => onShowOnlyRack(selectedRack!)}
                  >
                    <Target className="w-3 h-3 mr-1" />
                    Chỉ hiện kệ này
                  </Button>
                </div>
              </div>
            )}
            
            {selectedBoxInfo && (
              <div className="text-sm space-y-2">
                <Badge 
                  variant="secondary" 
                  style={{ backgroundColor: selectedBoxInfo.color + '30', color: selectedBoxInfo.color }}
                >
                  <Box className="w-3 h-3 mr-1" />
                  {selectedBoxInfo.name}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {categoryLabels[selectedBoxInfo.category]} • {selectedBoxInfo.weight}kg • SL: {selectedBoxInfo.quantity}
                </p>
                
                {/* Box Actions */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => onDuplicateBox(selectedBox!)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Nhân đôi
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={onRemoveSelectedBox}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Xóa
                  </Button>
                </div>
                
                {/* Move Box to Rack */}
                {racks.length > 1 && (
                  <div className="flex gap-1">
                    <Select value={moveTargetRack} onValueChange={setMoveTargetRack}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue placeholder="Chọn kệ..." />
                      </SelectTrigger>
                      <SelectContent>
                        {racks.filter(r => r.id !== selectedBoxInfo.rackId).map(rack => (
                          <SelectItem key={rack.id} value={rack.id}>
                            {rack.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!moveTargetRack}
                      onClick={() => {
                        onMoveBoxToRack(selectedBox!, moveTargetRack);
                        setMoveTargetRack('');
                      }}
                    >
                      <Move className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Thống kê</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Kệ:</span>
              <Badge variant="secondary" className="ml-1">{stats.totalRacks}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Thùng:</span>
              <Badge variant="secondary" className="ml-1">{stats.totalBoxes}</Badge>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Sức chứa:</span>
              <span className="ml-1 font-medium">
                {stats.usedCapacity}/{stats.totalCapacity} 
                ({stats.totalCapacity > 0 ? Math.round(stats.usedCapacity / stats.totalCapacity * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm thùng hàng..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={filterCategory} onValueChange={(v) => onFilterCategory(v as BoxCategory | 'all')}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Lọc theo loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: categoryColors[key as BoxCategory] }}
                    />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* View Controls */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Hiển thị</h3>
          <div className="flex gap-2">
            <Button
              variant={showAxes ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs"
              onClick={onToggleAxes}
            >
              <Axis3D className="w-3 h-3 mr-1" />
              Trục
            </Button>
            <Button
              variant={showGrid ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs"
              onClick={onToggleGrid}
            >
              <LayoutGrid className="w-3 h-3 mr-1" />
              Lưới
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'default' ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-2"
              onClick={() => onSetViewMode('default')}
              title="Chế độ mặc định"
            >
              <Eye className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'category' ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-2"
              onClick={() => onSetViewMode('category')}
              title="Màu theo loại hàng"
            >
              <Palette className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'heatmap' ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-2"
              onClick={() => onSetViewMode('heatmap')}
              title="Bản đồ nhiệt (theo tầng)"
            >
              <Thermometer className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Performance & Features */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            Hiệu suất & Tính năng
          </h3>
          
          {/* Performance Mode Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5">
              <Activity className="w-3 h-3" />
              Chế độ hiệu suất
            </Label>
            <Switch 
              checked={performanceMode}
              onCheckedChange={onTogglePerformanceMode}
            />
          </div>
          
          {/* FPS Counter Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Hiển thị FPS</Label>
            <Switch 
              checked={showFPS}
              onCheckedChange={onToggleFPS}
            />
          </div>
          
          {/* Human Figures Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5">
              <User className="w-3 h-3" />
              Người tham chiếu
            </Label>
            <Switch 
              checked={showHumans}
              onCheckedChange={onToggleHumans}
            />
          </div>
          
          {/* Roof Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5">
              <Home className="w-3 h-3" />
              Hiển thị mái
            </Label>
            <Switch 
              checked={showRoof}
              onCheckedChange={onToggleRoof}
            />
          </div>
        </div>

        <Separator />
        
        {/* Background Controls */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Nền kho</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={onCreateBackground}
            >
              <Layers className="w-3 h-3 mr-1" />
              Tạo
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={onRemoveBackground}
              disabled={!hasBackground}
            >
              <EyeOff className="w-3 h-3 mr-1" />
              Ẩn
            </Button>
          </div>
        </div>

        <Separator />
        
        {/* Rack Controls */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Kệ hàng</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <Label>Số hàng: {rackRows}</Label>
            </div>
            <Slider
              value={[rackRows]}
              onValueChange={([v]) => setRackRows(v)}
              min={1}
              max={5}
              step={1}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <Label>Số cột: {rackColumns}</Label>
            </div>
            <Slider
              value={[rackColumns]}
              onValueChange={([v]) => setRackColumns(v)}
              min={1}
              max={8}
              step={1}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <Label>Số tầng: {rackLevels}</Label>
            </div>
            <Slider
              value={[rackLevels]}
              onValueChange={([v]) => setRackLevels(v)}
              min={1}
              max={8}
              step={1}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onCreateRack({ rows: rackRows, columns: rackColumns, levels: rackLevels })}
            >
              <Grid3X3 className="w-3 h-3 mr-1" />
              Thêm kệ
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={onRemoveRack}
              disabled={!hasRacks}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Xóa
            </Button>
          </div>
        </div>

        <Separator />
        
        {/* Box Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Thùng hàng</h3>
            {selectedRackInfo && (
              <Badge variant="outline" className="text-xs">
                <ArrowRight className="w-3 h-3 mr-1" />
                {selectedRackInfo.name}
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <Label>Số lượng: {boxCount}</Label>
            </div>
            <Slider
              value={[boxCount]}
              onValueChange={([v]) => setBoxCount(v)}
              min={1}
              max={100}
              step={1}
            />
          </div>
          
          <Select value={boxCategory} onValueChange={(v) => setBoxCategory(v as BoxCategory)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: categoryColors[key as BoxCategory] }}
                    />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onAddBoxes(boxCount, boxCategory)}
              disabled={!hasRacks}
            >
              <Plus className="w-3 h-3 mr-1" />
              Thêm
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={onRemoveAllBoxes}
              title={selectedRack ? `Xóa thùng trong ${selectedRackInfo?.name}` : 'Xóa tất cả'}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {selectedRack ? 'Xóa kệ' : 'Xóa hết'}
            </Button>
          </div>
        </div>

        <Separator />
        
        {/* Data Controls */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Dữ liệu</h3>
          <Button
            variant="default"
            size="sm"
            className="w-full text-xs"
            onClick={onLoadDemoData}
          >
            <Boxes className="w-3 h-3 mr-1" />
            Tải demo
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={onExportData}
            >
              <Download className="w-3 h-3 mr-1" />
              Xuất
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={onImportData}
            >
              <Upload className="w-3 h-3 mr-1" />
              Nhập
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
