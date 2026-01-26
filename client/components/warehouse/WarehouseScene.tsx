'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Stars } from '@react-three/drei';
import { useState, useCallback } from 'react';
import Rack3D from './Rack3D';
import Box3D from './Box3D';
import RackTooltip from './RackTooltip';
import { RackConfig, BoxItem, BoxCategory, WarehouseStats } from '@/types/warehouse';

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
}

const AxesHelper = () => {
  return (
    <group>
      {/* X axis - Red */}
      <group>
        <mesh position={[10, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
          <meshStandardMaterial color={0xff4444} />
        </mesh>
        <mesh position={[20.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.15, 0.5, 8]} />
          <meshStandardMaterial color={0xff4444} />
        </mesh>
      </group>
      {/* Y axis - Green */}
      <group>
        <mesh position={[0, 7.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 15, 8]} />
          <meshStandardMaterial color={0x44ff44} />
        </mesh>
        <mesh position={[0, 15.5, 0]}>
          <coneGeometry args={[0.15, 0.5, 8]} />
          <meshStandardMaterial color={0x44ff44} />
        </mesh>
      </group>
      {/* Z axis - Blue */}
      <group>
        <mesh position={[0, 0, 10]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
          <meshStandardMaterial color={0x4444ff} />
        </mesh>
        <mesh position={[0, 0, 20.5]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.5, 8]} />
          <meshStandardMaterial color={0x4444ff} />
        </mesh>
      </group>
    </group>
  );
};

const Floor = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
    <planeGeometry args={[200, 200]} />
    <meshStandardMaterial 
      color={0x555555} 
      roughness={0.8}
      metalness={0.2}
    />
  </mesh>
);

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
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        className="bg-gradient-to-b from-slate-800 to-slate-900"
      >
        <PerspectiveCamera makeDefault position={[30, 25, 30]} fov={50} />
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

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[30, 50, 30]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={200}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        <directionalLight position={[-20, 30, -20]} intensity={0.4} />
        <hemisphereLight args={[0x87ceeb, 0x444444, 0.5]} />

        {/* Environment */}
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

        {/* Background floor and grid */}
        {showBackground && (
          <>
            <Floor />
            {showGrid && (
              <Grid
                args={[200, 200]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="#444444"
                sectionSize={5}
                sectionThickness={1.5}
                sectionColor="#666666"
                fadeDistance={150}
                position={[0, 0.01, 0]}
              />
            )}
          </>
        )}

        {/* Axes */}
        {showAxes && <AxesHelper />}

        {/* Racks */}
        {racks.map((rack) => (
          <Rack3D
            key={rack.id}
            config={rack}
            isSelected={rack.id === selectedRack}
            onSelect={onSelectRack}
            onDrag={onUpdateRackPosition}
            isDraggable={isDragMode}
            onHover={handleRackHover}
          />
        ))}

        {/* Boxes */}
        {boxes.map((box) => (
          <Box3D
            key={box.id}
            box={box}
            onSelect={onSelectBox}
            viewMode={viewMode}
            isFiltered={isBoxFiltered(box)}
          />
        ))}
      </Canvas>

      {/* Info overlay */}
      <div className="absolute top-4 right-4 space-y-2">
        <div className="bg-card/90 backdrop-blur border border-border p-4 rounded-lg shadow-lg min-w-52">
          <h3 className="font-semibold text-sm mb-2">Thống kê kho</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Tổng kệ:</span>
              <span className="font-medium text-foreground">{stats.totalRacks}</span>
            </div>
            <div className="flex justify-between">
              <span>Tổng thùng:</span>
              <span className="font-medium text-foreground">{stats.totalBoxes}</span>
            </div>
            <div className="flex justify-between">
              <span>Tỷ lệ lấp đầy:</span>
              <span className="font-medium text-foreground">
                {stats.totalCapacity > 0 ? Math.round((stats.usedCapacity / stats.totalCapacity) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Controls hint */}
        <div className="bg-card/90 backdrop-blur border border-border p-3 rounded-lg shadow-lg text-xs">
          <div className="text-muted-foreground">
            <div>🖱️ Chuột trái: Xoay</div>
            <div>🖱️ Chuột phải: Di chuyển</div>
            <div>🖱️ Cuộn: Zoom</div>
            <div>👆 Click: Chọn</div>
          </div>
        </div>
      </div>

      {/* Rack Tooltip */}
      <RackTooltip rack={hoveredRackData} boxes={boxes} />
    </div>
  );
};

export default WarehouseScene;
