'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { useState, useCallback } from 'react';
import EnhancedRack3D from './EnhancedRack3D';
import EnhancedBox3D from './EnhancedBox3D';
import RackTooltip from './RackTooltip';
import StatsOverlay from './StatsOverlay';
import ControlsHint from './ControlsHint';
import FillRateLegend from './FillRateLegend';
import { WarehouseStructure, WarehouseFloor, WarehouseLights, WarehouseProps } from './WarehouseEnvironment';
import { RackConfig, BoxItem, BoxCategory, WarehouseStats, FillRateStatus } from '@/types/warehouse';

interface WarehouseSceneProps {
  showBackground: boolean;
  showAxes: boolean;
  showGrid: boolean;
  racks: RackConfig[];
  boxes: BoxItem[];
  selectedRack: string | null;
  onSelectBox: (id: string) => void;
  onSelectRack: (id: string) => void;
  onUpdateRackPosition: (id: string, position: { x: number; y: number; z: number }) => void;
  viewMode: 'default' | 'category' | 'heatmap';
  searchQuery: string;
  filterCategory: BoxCategory | 'all';
  stats: WarehouseStats;
  isDragMode: boolean;
  onDoubleClickRack?: (id: string) => void;
  getRackFillRate?: (rackId: string) => number;
  visibleRackIds?: string[] | null;
  fillRateFilter?: FillRateStatus | null;
  onSetFillRateFilter?: (status: FillRateStatus | null) => void;
}

const AxesHelper = () => {
  return (
    <group>
      {/* X axis - Red */}
      <group>
        <mesh position={[10, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
          <meshStandardMaterial color={0xff4444} emissive={0xff4444} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[20.5, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.15, 0.5, 8]} />
          <meshStandardMaterial color={0xff4444} emissive={0xff4444} emissiveIntensity={0.3} />
        </mesh>
      </group>
      {/* Y axis - Green */}
      <group>
        <mesh position={[0, 7.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 15, 8]} />
          <meshStandardMaterial color={0x44ff44} emissive={0x44ff44} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 15.5, 0]}>
          <coneGeometry args={[0.15, 0.5, 8]} />
          <meshStandardMaterial color={0x44ff44} emissive={0x44ff44} emissiveIntensity={0.3} />
        </mesh>
      </group>
      {/* Z axis - Blue */}
      <group>
        <mesh position={[0, 0.1, 10]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
          <meshStandardMaterial color={0x4444ff} emissive={0x4444ff} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 0.1, 20.5]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.5, 8]} />
          <meshStandardMaterial color={0x4444ff} emissive={0x4444ff} emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
};

const WarehouseScene = ({ 
  showBackground, 
  showAxes,
  showGrid,
  racks, 
  boxes, 
  selectedRack,
  onSelectBox, 
  onSelectRack,
  onUpdateRackPosition,
  viewMode,
  searchQuery,
  filterCategory,
  stats,
  isDragMode,
  onDoubleClickRack,
  getRackFillRate,
  visibleRackIds,
  fillRateFilter,
  onSetFillRateFilter,
}: WarehouseSceneProps) => {
  const [hoveredRack, setHoveredRack] = useState<string | null>(null);

  const handleRackHover = useCallback((rackId: string | null) => {
    setHoveredRack(rackId);
  }, []);

  const isBoxFiltered = (box: BoxItem) => {
    if (filterCategory !== 'all' && box.category !== filterCategory) return false;
    if (searchQuery && !box.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  };

  const hoveredRackData = hoveredRack ? racks.find((r) => r.id === hoveredRack) || null : null;

  return (
    <div className="flex-1 relative">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
      >
        <PerspectiveCamera makeDefault position={[35, 30, 35]} fov={50} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={150}
          maxPolarAngle={Math.PI / 2 - 0.05}
          panSpeed={1}
          rotateSpeed={0.8}
          zoomSpeed={1.2}
        />

        {/* Enhanced Lighting System */}
        <ambientLight intensity={0.35} color={0xfff8f0} />
        <directionalLight
          position={[40, 60, 40]}
          intensity={1.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={200}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
          shadow-bias={-0.0001}
          color={0xfff8e0}
        />
        <directionalLight position={[-30, 40, -30]} intensity={0.3} color={0xe8f0ff} />
        <hemisphereLight args={[0x87ceeb, 0x444444, 0.4]} />

        {/* Fog for depth */}
        <fog attach="fog" args={[0x1a1f2e, 50, 150]} />

        {/* Environment - Stars in background */}
        <Stars radius={150} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />

        {/* Warehouse Environment */}
        {showBackground && (
          <>
            <WarehouseFloor />
            <WarehouseStructure />
            <WarehouseLights />
            <WarehouseProps />
          </>
        )}

        {/* Axes Helper */}
        {showAxes && <AxesHelper />}

        {/* Enhanced Racks */}
        {racks.map((rack) => {
          const fillRate = getRackFillRate?.(rack.id) ?? 0;
          const isVisible = visibleRackIds === null || visibleRackIds === undefined || visibleRackIds.includes(rack.id);
          return (
            <EnhancedRack3D
              key={rack.id}
              config={rack}
              isSelected={rack.id === selectedRack}
              onSelect={onSelectRack}
              onDrag={onUpdateRackPosition}
              isDraggable={isDragMode}
              onHover={handleRackHover}
              onDoubleClick={onDoubleClickRack}
              fillRate={fillRate}
              isVisible={isVisible}
            />
          );
        })}

        {/* Enhanced Boxes */}
        {boxes.map((box) => {
          const isRackVisible = visibleRackIds === null || visibleRackIds === undefined || visibleRackIds.includes(box.rackId);
          if (!isRackVisible) return null;
          
          return (
            <EnhancedBox3D
              key={box.id}
              box={box}
              onSelect={onSelectBox}
              viewMode={viewMode}
              isFiltered={isBoxFiltered(box)}
            />
          );
        })}
      </Canvas>

      {/* UI Overlays */}
      <div className="absolute top-4 right-4 space-y-3">
        <StatsOverlay stats={stats} />
        <FillRateLegend 
          onFilterByStatus={onSetFillRateFilter}
          activeFilter={fillRateFilter}
        />
        <ControlsHint />
      </div>

      {/* Rack Tooltip */}
      <RackTooltip rack={hoveredRackData} boxes={boxes} />
    </div>
  );
};

export default WarehouseScene;
