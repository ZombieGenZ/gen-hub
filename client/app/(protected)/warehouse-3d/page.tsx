'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { useWarehouse } from '@/hooks/useWarehouse';
import { useRackKeyboardNav } from '@/hooks/useRackKeyboardNav';
import { Toaster } from 'sonner';
import RackModal from '@/components/warehouse/RackModal';
import TopNavbar from '@/components/warehouse/TopNavbar';
import { BoxCategory } from '@/types/warehouse';

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
    openRackModal,
    closeRackModal,
    removeBoxById,
    getRackStats,
    showOnlyRack,
    showAllRacks,
    setFillRateFilter,
    getVisibleRackIdsByFillRate,
    getRackPosition,
  } = useWarehouse();

  // New feature states
  const [showHumans, setShowHumans] = useState(true);
  const [showRoof, setShowRoof] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [showFPS, setShowFPS] = useState(false);

  // Keyboard navigation for rack movement
  useRackKeyboardNav({
    selectedRackId: state.selectedRack,
    isDragMode: state.isDragMode,
    onUpdatePosition: updateRackPosition,
    getRackPosition,
  });

  const focusedRack = state.focusedRackId 
    ? state.racks.find(r => r.id === state.focusedRackId) || null 
    : null;

  const getRackFillRate = useCallback((rackId: string) => {
    const stats = getRackStats(rackId);
    return stats?.fillRate ?? 0;
  }, [getRackStats]);

  const handleAddBoxFromModal = useCallback((count: number, category: BoxCategory) => {
    if (state.focusedRackId) {
      selectRack(state.focusedRackId);
      setTimeout(() => addBoxes(count, category), 0);
    }
  }, [state.focusedRackId, selectRack, addBoxes]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Toaster position="top-right" richColors />
      <TopNavbar />
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
          onShowOnlyRack={showOnlyRack}
          onShowAllRacks={showAllRacks}
          // New feature toggles
          onToggleHumans={() => setShowHumans(prev => !prev)}
          onToggleRoof={() => setShowRoof(prev => !prev)}
          onTogglePerformanceMode={() => setPerformanceMode(prev => !prev)}
          onToggleFPS={() => setShowFPS(prev => !prev)}
          showHumans={showHumans}
          showRoof={showRoof}
          performanceMode={performanceMode}
          showFPS={showFPS}
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
          isFilteringRacks={state.visibleRackIds !== null}
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
          onDoubleClickRack={openRackModal}
          getRackFillRate={getRackFillRate}
          visibleRackIds={state.visibleRackIds ?? getVisibleRackIdsByFillRate()}
          fillRateFilter={state.fillRateFilter}
          onSetFillRateFilter={setFillRateFilter}
          // New features
          showHumans={showHumans}
          showRoof={showRoof}
          performanceMode={performanceMode}
          showFPS={showFPS}
          // Modal integration
          focusedRackId={state.focusedRackId}
          isModalOpen={state.rackModalOpen}
        />
      </div>

      {/* Rack Management Modal */}
      <RackModal
        open={state.rackModalOpen}
        onClose={closeRackModal}
        rack={focusedRack}
        boxes={state.boxes}
        onAddBox={handleAddBoxFromModal}
        onRemoveBox={removeBoxById}
        onRemoveAllBoxes={removeAllBoxes}
        onDuplicateBox={duplicateBox}
        onRotateRack={rotateRack}
        onCloneRack={cloneRack}
        onDeleteRack={removeRack}
      />
    </div>
  );
}
