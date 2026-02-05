'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { useWarehouse } from '@/hooks/useWarehouse';
import { useRackKeyboardNav } from '@/hooks/useRackKeyboardNav';
import { useInventory } from '@/hooks/useInventory';
import { useAIVoiceCommands } from '@/hooks/useAIVoiceCommands';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import { Toaster } from 'sonner';
import RackModal from '@/components/warehouse/RackModal';
import FeatureToolbar from '@/components/warehouse/FeatureToolbar';
import FloatingToolbar from '@/components/warehouse/FloatingToolbar';
import SearchPanel from '@/components/warehouse/SearchPanel';
import AlertsPanel from '@/components/warehouse/AlertsPanel';
import StatsDashboard from '@/components/warehouse/StatsDashboard';
import TransactionPanel from '@/components/warehouse/TransactionPanel';
import AISuggestionPanel from '@/components/warehouse/AISuggestionPanel';
import BarcodeScannerPanel from '@/components/warehouse/BarcodeScannerPanel';
import VoiceCommandIndicator from '@/components/warehouse/VoiceCommandIndicator';
import { RealtimeUsersList } from '@/components/warehouse/RealtimeCursors';
import { BoxCategory } from '@/types/warehouse';
import { SearchResult } from '@/types/inventory';

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

  // Panel visibility states
  const [searchOpen, setSearchOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // Inventory management hook
  const {
    transactions,
    alerts,
    alertsBySeverity,
    highlightedBoxId,
    generateAlerts,
    dismissAlert,
    clearDismissedAlerts,
    searchBoxes,
    highlightBox,
    categoryStats,
    rackUtilization,
    transactionSummary,
  } = useInventory({ boxes: state.boxes, racks: state.racks });

  // Realtime presence hook
  const {
    isConnected: realtimeConnected,
    users: realtimeUsers,
    updateCursor,
  } = useRealtimePresence({
    enabled: realtimeEnabled,
    selectedRackId: state.selectedRack,
  });

  // AI Voice commands hook - với tất cả chức năng
  const {
    isListening: voiceListening,
    isSupported: voiceSupported,
    isProcessing: voiceProcessing,
    transcript: voiceTranscript,
    lastCommand: voiceLastCommand,
    confidence: voiceConfidence,
    toggleListening: toggleVoice,
    availableCommands: voiceCommands,
    executeTextCommand,
  } = useAIVoiceCommands({
    // Search & Navigation
    onSearch: (query) => {
      setSearchOpen(true);
      setSearchQuery(query);
    },
    onHighlightRack: selectRack,
    onClearSelection: clearSelection,
    
    // Rack management
    onCreateRack: createRack,
    onRemoveRack: removeRack,
    onRotateRack: rotateRack,
    onCloneRack: cloneRack,
    onShowOnlyRack: showOnlyRack,
    onShowAllRacks: showAllRacks,
    onOpenRackModal: openRackModal,
    
    // Box management
    onAddBoxes: addBoxes,
    onRemoveAllBoxes: removeAllBoxes,
    onRemoveSelectedBox: removeSelectedBox,
    onDuplicateBox: duplicateBox,
    
    // View controls
    onToggleAxes: toggleAxes,
    onToggleGrid: toggleGrid,
    onSetViewMode: setViewMode,
    onFilterCategory: setFilterCategory,
    
    // Environment
    onCreateBackground: createBackground,
    onRemoveBackground: removeBackground,
    onToggleHumans: () => setShowHumans(prev => !prev),
    onToggleRoof: () => setShowRoof(prev => !prev),
    onTogglePerformanceMode: () => setPerformanceMode(prev => !prev),
    onToggleFPS: () => setShowFPS(prev => !prev),
    
    // Data
    onLoadDemoData: loadDemoData,
    onExportData: exportData,
    onImportData: importData,
    
    // Panels
    onToggleSearch: () => setSearchOpen(prev => !prev),
    onToggleAlerts: () => setAlertsOpen(prev => !prev),
    onToggleStats: () => setStatsOpen(prev => !prev),
    onToggleTransactions: () => setTransactionsOpen(prev => !prev),
    onToggleAI: () => setAiOpen(prev => !prev),
    onToggleBarcode: () => setBarcodeOpen(prev => !prev),
    onToggleRealtime: () => setRealtimeEnabled(prev => !prev),
    
    // Mode toggles
    onToggleDragMode: toggleDragMode,
    
    // Data references
    racks: state.racks,
    boxes: state.boxes,
    selectedRack: state.selectedRack,
    selectedBox: state.selectedBox,
  });

  // Handle search locate
  const handleLocateResult = useCallback((result: SearchResult) => {
    selectRack(result.rackId);
    highlightBox(result.boxId);
    setSearchOpen(false);
  }, [selectRack, highlightBox]);

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
      <div className="flex-1 flex overflow-hidden relative">
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

        {/* Feature Toolbar - Top Left */}
        <FeatureToolbar
          alertCount={alerts.length}
          onToggleSearch={() => setSearchOpen(prev => !prev)}
          onToggleAlerts={() => setAlertsOpen(prev => !prev)}
          onToggleStats={() => setStatsOpen(prev => !prev)}
          onToggleTransactions={() => setTransactionsOpen(prev => !prev)}
          onRefreshAlerts={generateAlerts}
          searchOpen={searchOpen}
          alertsOpen={alertsOpen}
          statsOpen={statsOpen}
          transactionsOpen={transactionsOpen}
        />

        {/* Floating Toolbar - Bottom Right */}
        <FloatingToolbar
          onToggleAI={() => setAiOpen(prev => !prev)}
          onToggleBarcode={() => setBarcodeOpen(prev => !prev)}
          onToggleRealtime={() => setRealtimeEnabled(prev => !prev)}
          onToggleVoice={toggleVoice}
          aiOpen={aiOpen}
          barcodeOpen={barcodeOpen}
          realtimeConnected={realtimeConnected}
          voiceListening={voiceListening}
          realtimeUserCount={realtimeUsers.length}
        />

        {/* Search Panel */}
        <SearchPanel
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSearch={searchBoxes}
          onLocate={handleLocateResult}
          onHighlight={highlightBox}
        />

        {/* Alerts Panel */}
        <AlertsPanel
          isOpen={alertsOpen}
          onClose={() => setAlertsOpen(false)}
          alerts={alerts}
          alertsBySeverity={alertsBySeverity}
          onDismiss={dismissAlert}
          onClearDismissed={clearDismissedAlerts}
          onViewRack={selectRack}
        />

        {/* Stats Dashboard */}
        <StatsDashboard
          isOpen={statsOpen}
          onClose={() => setStatsOpen(false)}
          stats={stats}
          categoryStats={categoryStats}
          rackUtilization={rackUtilization}
          transactionSummary={transactionSummary}
          onViewRack={selectRack}
        />

        {/* Transaction Panel */}
        <TransactionPanel
          isOpen={transactionsOpen}
          onClose={() => setTransactionsOpen(false)}
          transactions={transactions}
        />

        {/* AI Suggestion Panel */}
        <AISuggestionPanel
          isOpen={aiOpen}
          onClose={() => setAiOpen(false)}
          racks={state.racks}
          boxes={state.boxes}
          onHighlightRack={selectRack}
          onSelectRack={(rackId) => {
            selectRack(rackId);
            openRackModal(rackId);
          }}
        />

        {/* Barcode Scanner Panel */}
        <BarcodeScannerPanel
          isOpen={barcodeOpen}
          onClose={() => setBarcodeOpen(false)}
          onSearch={searchBoxes}
          onLocate={handleLocateResult}
        />

        {/* Voice Command Indicator - Enhanced */}
        <VoiceCommandIndicator
          isListening={voiceListening}
          transcript={voiceTranscript}
          isProcessing={voiceProcessing}
          lastCommand={voiceLastCommand}
          confidence={voiceConfidence}
          availableCommands={voiceCommands}
          onExecuteTextCommand={executeTextCommand}
        />

        {/* Realtime Users List */}
        <RealtimeUsersList
          users={realtimeUsers}
          isConnected={realtimeConnected}
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
