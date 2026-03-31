'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWarehouse3D } from '@/hooks/useWarehouse3D';
import { useInventory } from '@/hooks/useInventory';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import { Toaster } from 'sonner';
import RackModal from '@/components/warehouse/RackModal';
import FeatureToolbar from '@/components/warehouse/FeatureToolbar';
import SearchPanel from '@/components/warehouse/SearchPanel';
import AlertsPanel from '@/components/warehouse/AlertsPanel';
import StatsDashboard from '@/components/warehouse/StatsDashboard';
import TransactionPanel from '@/components/warehouse/TransactionPanel';
import AISuggestionPanel from '@/components/warehouse/AISuggestionPanel';
import BarcodeScannerPanel from '@/components/warehouse/BarcodeScannerPanel';
import VoiceCommandIndicator from '@/components/warehouse/VoiceCommandIndicator';
import ControlPanel from '@/components/warehouse/ControlPanel';
import { WarehouseManagementSheet } from '@/components/warehouse/WarehouseManagementSheet';
import OnlineUsersList from '@/components/warehouse/OnlineUsersList';
import { RealtimeUsersList } from '@/components/warehouse/RealtimeCursors';
import { useAIVoiceCommands } from '@/hooks/useAIVoiceCommands';
import { toast } from 'sonner';
import { BoxCategory } from '@/types/warehouse';
import { SearchResult } from '@/types/inventory';

// Dynamic import for 3D components to avoid SSR issues
const WarehouseScene = dynamic(() => import('@/components/warehouse/WarehouseScene'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-900">
      <div className="text-white text-lg">Đang tải 3D Scene...</div>
    </div>
  ),
});

/**
 * Trang 3D Warehouse kết nối API thật.
 * Route: /warehouse-3d/[warehouseId]
 *
 * Dùng useWarehouse3D hook thay vì useWarehouse (local-only).
 * - Dữ liệu ô/kệ/hàng lấy từ DB qua React Query
 * - WebSocket tự refresh khi có nhập/xuất
 * - Scoped theo warehouse_id từ URL params
 */
export default function Warehouse3DLivePage() {
  const params = useParams();
  const warehouseId = params.warehouseId as string;

  const {
    state,
    stats,
    isLoading,
    error,
    warehouseInfo,
    selectBox,
    selectRack,
    clearSelection,
    setViewMode,
    setSearchQuery,
    setFilterCategory,
    toggleAxes,
    toggleGrid,
    toggleDragMode,
    createBackground,
    removeBackground,
    openRackModal,
    closeRackModal,
    showOnlyRack,
    showAllRacks,
    setFillRateFilter,
    getVisibleRackIdsByFillRate,
    focusOnBox,
    clearBoxFocus,
    getRackStats,
    getRackPosition,
    refresh,
  } = useWarehouse3D({ warehouseId });

  // Display feature states
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
  const [controlPanelOpen, setControlPanelOpen] = useState(true);
  const [inboundOpen, setInboundOpen] = useState(false);
  const [outboundOpen, setOutboundOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ─── AI Voice Commands ──────────────────────────
  const {
    isListening,
    transcript,
    isProcessing: voiceProcessing,
    lastCommand,
    confidence,
    toggleListening,
    executeTextCommand,
    availableCommands,
  } = useAIVoiceCommands({
    onSearch: setSearchQuery,
    onHighlightRack: selectRack,
    onClearSelection: clearSelection,
    onToggleAxes: toggleAxes,
    onToggleGrid: toggleGrid,
    onSetViewMode: setViewMode,
    onFilterCategory: setFilterCategory,
    onCreateBackground: createBackground,
    onRemoveBackground: removeBackground,
    onToggleHumans: () => setShowHumans(prev => !prev),
    onToggleRoof: () => setShowRoof(prev => !prev),
    onTogglePerformanceMode: () => setPerformanceMode(prev => !prev),
    onToggleFPS: () => setShowFPS(prev => !prev),
    onToggleSearch: () => setSearchOpen(prev => !prev),
    onToggleAlerts: () => setAlertsOpen(prev => !prev),
    onToggleStats: () => setStatsOpen(prev => !prev),
    onToggleTransactions: () => setTransactionsOpen(prev => !prev),
    onToggleAI: () => setAiOpen(prev => !prev),
    onToggleBarcode: () => setBarcodeOpen(prev => !prev),
    onToggleRealtime: () => setRealtimeEnabled(prev => !prev),
    onOpenRackModal: openRackModal,
    onShowOnlyRack: showOnlyRack,
    onShowAllRacks: showAllRacks,
    racks: state.racks,
    boxes: state.boxes,
    selectedRack: state.selectedRack,
    selectedBox: state.selectedBox,
  });

  // Handle Ctrl+M for voice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening]);

  // Inventory management hook (operates on the transformed boxes/racks)
  const {
    transactions,
    alerts,
    alertsBySeverity,
    highlightedBoxId,
    generateAlerts,
    dismissAlert,
    clearDismissedAlerts,
    searchBoxes,
    scanBarcode,
    highlightBox,
    categoryStats,
    rackUtilization,
    transactionSummary,
  } = useInventory({ boxes: state.boxes, racks: state.racks, warehouseId });

  // Realtime presence
  const {
    isConnected: realtimeConnected,
    users: realtimeUsers,
    onlineCount: realtimeOnlineCount,
    currentUserId: realtimeCurrentUserId,
    updatePosition: realtimeUpdatePosition,
    updateSelection: realtimeUpdateSelection,
    updateAction: realtimeUpdateAction,
  } = useRealtimePresence({
    enabled: realtimeEnabled,
    selectedRackId: state.selectedRack,
    selectedBoxId: state.selectedBox,
    warehouseId,
  });

  // Handle search/barcode locate
  const handleLocateResult = useCallback((result: SearchResult) => {
    focusOnBox(result.boxId);
    setBarcodeOpen(false);
    setSearchOpen(false);
  }, [focusOnBox]);

  const focusedRack = state.focusedRackId
    ? state.racks.find(r => r.id === state.focusedRackId) || null
    : null;

  const getRackFillRate = useCallback((rackId: string) => {
    const s = getRackStats(rackId);
    return s?.fillRate ?? 0;
  }, [getRackStats]);

  // ─── Loading state ─────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">Đang tải dữ liệu kho...</p>
          <p className="text-slate-400 text-sm mt-1">Kho: {warehouseId}</p>
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-5xl mb-4">⚠</div>
          <h2 className="text-white text-xl font-semibold mb-2">Không thể tải kho</h2>
          <p className="text-slate-400 text-sm mb-4">
            {error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn'}
          </p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Toaster position="top-right" richColors />

      {/* Warehouse name header */}
      {warehouseInfo && (
        <div className="px-4 py-2 bg-card border-b border-border flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setControlPanelOpen(!controlPanelOpen)}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Toggle Sidebar"
            >
              <span className="text-xl">☰</span>
            </button>
            <h1 className="text-lg font-semibold">{warehouseInfo.name}</h1>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Live
            </span>
          </div>
          <button
            onClick={refresh}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ↻ Làm mới
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Control Panel */}
        {controlPanelOpen && (
          <ControlPanel
            onCreateBackground={createBackground}
            onRemoveBackground={removeBackground}
            onCreateRack={() => toast.info('Chế độ xem trực tiếp không hỗ trợ chỉnh sửa layout')}
            onRemoveRack={() => toast.info('Chế độ xem trực tiếp không hỗ trợ chỉnh sửa layout')}
            onAddBoxes={() => toast.info('Vui lòng sử dụng tính năng Nhập kho để thêm hàng')}
            onRemoveAllBoxes={() => toast.info('Chế độ xem trực tiếp không hỗ trợ xóa hàng')}
            onRemoveSelectedBox={() => toast.info('Chế độ xem trực tiếp không hỗ trợ xóa hàng')}
            onMoveBoxToRack={() => toast.info('Chế độ xem trực tiếp không hỗ trợ di chuyển')}
            onDuplicateBox={() => {}}
            onClearSelection={clearSelection}
            onLoadDemoData={() => toast.info('Đang ở chế độ dữ liệu thực từ kho')}
            onExportData={() => {}}
            onImportData={() => {}}
            onToggleAxes={toggleAxes}
            onToggleGrid={toggleGrid}
            onSetViewMode={setViewMode}
            onSearch={setSearchQuery}
            onFilterCategory={setFilterCategory}
            onToggleDragMode={toggleDragMode}
            onRotateRack={() => {}}
            onCloneRack={() => {}}
            onShowOnlyRack={showOnlyRack}
            onShowAllRacks={showAllRacks}
            onToggleHumans={() => setShowHumans(!showHumans)}
            onToggleRoof={() => setShowRoof(!showRoof)}
            onTogglePerformanceMode={() => setPerformanceMode(!performanceMode)}
            onToggleFPS={() => setShowFPS(!showFPS)}
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
            isFilteringRacks={!!state.visibleRackIds}
            onOpenInbound={() => setInboundOpen(true)}
            onOpenOutbound={() => setOutboundOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        )}

        <WarehouseScene
          showBackground={state.showBackground}
          showAxes={state.showAxes}
          showGrid={state.showGrid}
          racks={state.racks}
          boxes={state.boxes}
          selectedRack={state.selectedRack}
          onSelectBox={selectBox}
          onSelectRack={selectRack}
          onUpdateRackPosition={() => {}} // Read-only in live mode
          viewMode={state.viewMode}
          searchQuery={state.searchQuery}
          filterCategory={state.filterCategory}
          stats={stats}
          isDragMode={false} // Read-only in live mode
          onDoubleClickRack={openRackModal}
          getRackFillRate={getRackFillRate}
          visibleRackIds={state.visibleRackIds ?? getVisibleRackIdsByFillRate()}
          fillRateFilter={state.fillRateFilter}
          onSetFillRateFilter={setFillRateFilter}
          showHumans={showHumans}
          showRoof={showRoof}
          performanceMode={performanceMode}
          showFPS={showFPS}
          focusedRackId={state.focusedRackId}
          isModalOpen={state.rackModalOpen}
          focusedBoxId={state.focusedBoxId}
          onClearBoxFocus={clearBoxFocus}
          realtimeUsers={realtimeUsers}
        />

        {/* Online Users List */}
        {realtimeEnabled && (
          <OnlineUsersList
            users={realtimeUsers}
            currentUserId={realtimeCurrentUserId}
            isConnected={realtimeConnected}
            onlineCount={realtimeOnlineCount}
          />
        )}

        {/* Feature Toolbar */}
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


        {/* Panels */}
        <SearchPanel
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSearch={searchBoxes}
          onLocate={handleLocateResult}
          onHighlight={highlightBox}
        />

        <AlertsPanel
          isOpen={alertsOpen}
          onClose={() => setAlertsOpen(false)}
          alerts={alerts}
          alertsBySeverity={alertsBySeverity}
          onDismiss={dismissAlert}
          onClearDismissed={clearDismissedAlerts}
          onViewRack={selectRack}
        />

        <StatsDashboard
          isOpen={statsOpen}
          onClose={() => setStatsOpen(false)}
          stats={stats}
          categoryStats={categoryStats}
          rackUtilization={rackUtilization}
          transactionSummary={transactionSummary}
          onViewRack={selectRack}
        />

        <TransactionPanel
          isOpen={transactionsOpen}
          onClose={() => setTransactionsOpen(false)}
          transactions={transactions}
        />

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

        <BarcodeScannerPanel
          isOpen={barcodeOpen}
          onClose={() => setBarcodeOpen(false)}
          onSearch={searchBoxes}
          onScanBarcode={scanBarcode}
          onLocate={handleLocateResult}
        />

        <RealtimeUsersList
          users={realtimeUsers}
          isConnected={realtimeConnected}
        />

        {/* AI Voice Command Overlay */}
        <VoiceCommandIndicator
          isListening={isListening}
          transcript={transcript}
          isProcessing={voiceProcessing}
          lastCommand={lastCommand}
          confidence={confidence}
          availableCommands={availableCommands as any}
          onExecuteTextCommand={executeTextCommand}
        />

        {/* Management Sheets */}
        <WarehouseManagementSheet
          type="inbound"
          open={inboundOpen}
          onOpenChange={setInboundOpen}
        />
        <WarehouseManagementSheet
          type="outbound"
          open={outboundOpen}
          onOpenChange={setOutboundOpen}
        />
        <WarehouseManagementSheet
          type="history"
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          warehouseId={warehouseId}
        />
      </div>

      {/* Rack Info Modal (read-only) */}
      <RackModal
        open={state.rackModalOpen}
        onClose={closeRackModal}
        rack={focusedRack}
        boxes={state.boxes}
        onAddBox={() => {}} // Read-only
        onRemoveBox={() => {}} // Read-only
        onRemoveAllBoxes={() => {}} // Read-only
        onDuplicateBox={() => {}} // Read-only
        onRotateRack={() => {}} // Read-only
        onCloneRack={() => {}} // Read-only
        onDeleteRack={() => {}} // Read-only
      />
    </div>
  );
}
