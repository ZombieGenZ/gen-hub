'use client';

import dynamic from 'next/dynamic';
import { useWarehouse } from '@/hooks/useWarehouse';
import { Toaster } from 'sonner';

// Dynamic import for 3D components to avoid SSR issues
const WarehouseScene = dynamic(() => import('@/components/warehouse/WarehouseScene'), { 
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-900">
      <div className="text-white text-lg">Đang tải 3D Scene...</div>
    </div>
  )
});

const ControlPanel = dynamic(() => import('@/components/warehouse/ControlPanel'), { 
  ssr: false,
  loading: () => (
    <div className="w-72 bg-card border-r border-border animate-pulse" />
  )
});

export default function Warehouse3DPage() {
  const {
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
  } = useWarehouse();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Toaster position="top-right" richColors />
      <div className="flex-1 flex overflow-hidden">
        <ControlPanel
          onCreateBackground={createBackground}
          onRemoveBackground={removeBackground}
          onCreateRack={createRack}
          onRemoveRack={removeRack}
          onAddBoxes={addBoxes}
          onRemoveAllBoxes={removeAllBoxes}
          onRemoveSelectedBox={removeSelectedBox}
          onMoveBoxToRack={moveBoxToRack}
          onDuplicateBox={duplicateBox}
          onClearSelection={clearSelection}
          onLoadDemoData={loadDemoData}
          onExportData={exportData}
          onImportData={importData}
          onToggleAxes={toggleAxes}
          onToggleGrid={toggleGrid}
          onSetViewMode={setViewMode}
          onSearch={setSearchQuery}
          onFilterCategory={setFilterCategory}
          onToggleDragMode={toggleDragMode}
          onRotateRack={rotateRack}
          onCloneRack={cloneRack}
          hasBackground={state.showBackground}
          hasRacks={state.racks.length > 0}
          showAxes={state.showAxes}
          showGrid={state.showGrid}
          viewMode={state.viewMode}
          stats={stats}
          searchQuery={state.searchQuery}
          filterCategory={state.filterCategory}
          selectedRack={state.selectedRack}
          selectedBox={state.selectedBox}
          racks={state.racks}
          boxes={state.boxes}
          isDragMode={state.isDragMode}
          collisionWarnings={state.collisionWarnings}
        />
        <WarehouseScene
          showBackground={state.showBackground}
          showAxes={state.showAxes}
          showGrid={state.showGrid}
          racks={state.racks}
          boxes={state.boxes}
          selectedRack={state.selectedRack}
          onSelectBox={selectBox}
          onSelectRack={selectRack}
          onUpdateRackPosition={updateRackPosition}
          viewMode={state.viewMode}
          searchQuery={state.searchQuery}
          filterCategory={state.filterCategory}
          stats={stats}
          isDragMode={state.isDragMode}
        />
      </div>
    </div>
  );
}
