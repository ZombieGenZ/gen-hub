'use client';

import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import EnhancedRack3D from './EnhancedRack3D';
import EnhancedBox3D from './EnhancedBox3D';
import RackTooltip from './RackTooltip';
import StatsOverlay from './StatsOverlay';
import FillRateLegend from './FillRateLegend';
import HumanFigures from './HumanFigures';
import WarehouseBuilding from './WarehouseBuilding';
import UserAvatar3D from './UserAvatar3D';
import { PerformanceOverlay, FPSTracker } from './PerformanceMonitor';
import { WarehouseFloor, WarehouseLights, WarehouseProps } from './WarehouseEnvironment';
import { RackConfig, BoxItem, BoxCategory, WarehouseStats, FillRateStatus } from '@/types/warehouse';
import { UserPresence } from '@/hooks/useRealtimePresence';

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
  // New props
  showHumans?: boolean;
  showRoof?: boolean;
  performanceMode?: boolean;
  showFPS?: boolean;
  focusedRackId?: string | null;
  focusedBoxId?: string | null;
  onClearBoxFocus?: () => void;
  isModalOpen?: boolean;
  // Realtime multiplayer
  realtimeUsers?: UserPresence[];
  /** Rack IDs that belong to other tenants → render dimmed */
  dimmedRackIds?: string[];
}

const AxesHelper = () => {
  return (
    <group>
      {/* X axis - Red */}
      <group>
        <mesh position={[15, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 30, 8]} />
          <meshStandardMaterial color={0xff4444} emissive={0xff4444} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[30.5, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.15, 0.5, 8]} />
          <meshStandardMaterial color={0xff4444} emissive={0xff4444} emissiveIntensity={0.3} />
        </mesh>
      </group>
      {/* Y axis - Green */}
      <group>
        <mesh position={[0, 10, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
          <meshStandardMaterial color={0x44ff44} emissive={0x44ff44} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 20.5, 0]}>
          <coneGeometry args={[0.15, 0.5, 8]} />
          <meshStandardMaterial color={0x44ff44} emissive={0x44ff44} emissiveIntensity={0.3} />
        </mesh>
      </group>
      {/* Z axis - Blue */}
      <group>
        <mesh position={[0, 0.1, 15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 30, 8]} />
          <meshStandardMaterial color={0x4444ff} emissive={0x4444ff} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 0.1, 30.5]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.5, 8]} />
          <meshStandardMaterial color={0x4444ff} emissive={0x4444ff} emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
};

// Camera controller with WASD movement and focus animation
interface CameraControllerProps {
  focusTarget?: RackConfig | null;
  focusBoxTarget?: BoxItem | null;
  onFocusComplete?: () => void;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

const CameraController = ({ 
  focusTarget, 
  focusBoxTarget,
  onFocusComplete, 
  autoRotate = false, 
  autoRotateSpeed = 0.5 
}: CameraControllerProps) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const animatingRef = useRef(false);
  const previousPositionRef = useRef<THREE.Vector3 | null>(null);
  const previousTargetRef = useRef<THREE.Vector3 | null>(null);
  
  // Handle keyboard input for WASD movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
        keysPressed.current.add(key);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Process WASD movement
  useFrame(() => {
    if (keysPressed.current.size === 0 || animatingRef.current) return;
    
    const moveSpeed = 0.4;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    
    const movement = new THREE.Vector3();
    
    if (keysPressed.current.has('w')) movement.add(forward.clone().multiplyScalar(moveSpeed));
    if (keysPressed.current.has('s')) movement.add(forward.clone().multiplyScalar(-moveSpeed));
    if (keysPressed.current.has('a')) movement.add(right.clone().multiplyScalar(-moveSpeed));
    if (keysPressed.current.has('d')) movement.add(right.clone().multiplyScalar(moveSpeed));
    if (keysPressed.current.has('q')) movement.y -= moveSpeed * 0.5;
    if (keysPressed.current.has('e')) movement.y += moveSpeed * 0.5;
    
    camera.position.add(movement);
    
    // Update OrbitControls target
    if ((gl.domElement as any).__controls) {
      (gl.domElement as any).__controls.target.add(movement);
    }
  });
  
  // Animate to focus target when modal opens
  useEffect(() => {
    if (!focusTarget || animatingRef.current) return;
    
    animatingRef.current = true;
    
    // Store current position to return to later
    previousPositionRef.current = camera.position.clone();
    const controls = (gl.domElement as any).__controls;
    if (controls) {
      previousTargetRef.current = controls.target.clone();
    }
    
    // Calculate rack center and optimal view position
    const rackCenter = new THREE.Vector3(
      focusTarget.position.x + (focusTarget.columns * focusTarget.cellWidth) / 2,
      focusTarget.position.y + (focusTarget.levels * focusTarget.cellHeight) / 2,
      focusTarget.position.z + (focusTarget.rows * focusTarget.cellDepth) / 2
    );
    
    const rackSize = Math.max(
      focusTarget.columns * focusTarget.cellWidth,
      focusTarget.levels * focusTarget.cellHeight,
      focusTarget.rows * focusTarget.cellDepth
    );
    
    const distance = rackSize * 2 + 4;
    const targetPosition = new THREE.Vector3(
      rackCenter.x + distance * 0.6,
      rackCenter.y + distance * 0.4,
      rackCenter.z + distance * 0.6
    );
    
    const startPosition = camera.position.clone();
    const startTarget = controls?.target?.clone() || new THREE.Vector3();
    const startTime = performance.now();
    const duration = 800;
    
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      
      camera.position.lerpVectors(startPosition, targetPosition, eased);
      
      if (controls) {
        controls.target.lerpVectors(startTarget, rackCenter, eased);
        controls.update();
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        animatingRef.current = false;
        onFocusComplete?.();
      }
    };
    
    animate();
  }, [focusTarget, camera, gl.domElement, onFocusComplete]);

  // Animate to focus on a specific box (for barcode scanning)
  useEffect(() => {
    if (!focusBoxTarget || animatingRef.current) return;
    
    animatingRef.current = true;
    
    const controls = (gl.domElement as any).__controls;
    
    // Box position is its center
    const boxCenter = new THREE.Vector3(
      focusBoxTarget.position.x,
      focusBoxTarget.position.y,
      focusBoxTarget.position.z
    );
    
    // Camera position: offset from box, close zoom (2-3 units away)
    const distance = 3;
    const targetPosition = new THREE.Vector3(
      boxCenter.x + distance * 0.8,
      boxCenter.y + distance * 0.6,
      boxCenter.z + distance * 0.8
    );
    
    const startPosition = camera.position.clone();
    const startTarget = controls?.target?.clone() || new THREE.Vector3();
    const startTime = performance.now();
    const duration = 1000; // Slightly longer for smoother feel
    
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      
      camera.position.lerpVectors(startPosition, targetPosition, eased);
      
      if (controls) {
        controls.target.lerpVectors(startTarget, boxCenter, eased);
        controls.update();
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        animatingRef.current = false;
        onFocusComplete?.();
      }
    };
    
    animate();
  }, [focusBoxTarget, camera, gl.domElement, onFocusComplete]);
  
  return null;
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
  showHumans = true,
  showRoof = true,
  performanceMode = false,
  showFPS = false,
  focusedRackId,
  focusedBoxId,
  onClearBoxFocus,
  isModalOpen = false,
  realtimeUsers = [],
  dimmedRackIds = [],
}: WarehouseSceneProps) => {
  const [hoveredRack, setHoveredRack] = useState<string | null>(null);
  const [currentFPS, setCurrentFPS] = useState(60);
  const [autoRotate, setAutoRotate] = useState(false);

  const handleRackHover = useCallback((rackId: string | null) => {
    setHoveredRack(rackId);
  }, []);

  const isBoxFiltered = useCallback((box: BoxItem) => {
    if (filterCategory !== 'all' && box.category !== filterCategory) return false;
    if (searchQuery && !box.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }, [filterCategory, searchQuery]);

  // Build dimmed rack ID set for O(1) lookup
  const dimmedRackIdSet = useMemo(() => new Set(dimmedRackIds), [dimmedRackIds]);

  const hoveredRackData = hoveredRack ? racks.find((r) => r.id === hoveredRack) || null : null;
  
  // Get focused rack for camera animation
  const focusedRack = focusedRackId ? racks.find(r => r.id === focusedRackId) || null : null;

  // Get focused box for camera animation (barcode scanning)
  const focusedBox = focusedBoxId ? boxes.find(b => b.id === focusedBoxId) || null : null;

  // Memoize visible racks and boxes for performance
  const visibleRacks = useMemo(() => {
    return racks.filter(rack => 
      visibleRackIds === null || visibleRackIds === undefined || visibleRackIds.includes(rack.id)
    );
  }, [racks, visibleRackIds]);

  const visibleBoxes = useMemo(() => {
    return boxes.filter(box => {
      const isRackVisible = visibleRackIds === null || visibleRackIds === undefined || visibleRackIds.includes(box.rackId);
      return isRackVisible;
    });
  }, [boxes, visibleRackIds]);

  // Performance mode settings
  const dpr = performanceMode ? [1, 1] as [number, number] : [1, 1.5] as [number, number];
  const shadowMapSize = performanceMode ? 1024 : 2048;

  return (
    <div className="flex-1 relative">
      {/* FPS Counter Overlay */}
      <PerformanceOverlay fps={currentFPS} visible={showFPS} />
      
      {/* Blur overlay when modal is open */}
      <div 
        className={`absolute inset-0 z-10 pointer-events-none transition-all duration-500 ${
          isModalOpen ? 'bg-black/30 backdrop-blur-sm' : 'bg-transparent'
        }`}
        style={{ 
          opacity: isModalOpen ? 1 : 0,
        }}
      />
      
      <Canvas
        shadows={!performanceMode}
        dpr={dpr}
        gl={{ 
          antialias: !performanceMode, 
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
        performance={{ min: 0.5 }}
        onCreated={({ gl }) => {
          // Store controls reference for WASD movement
          (gl.domElement as any).__controls = null;
        }}
      >
        {/* FPS Tracker */}
        {showFPS && <FPSTracker onFPSUpdate={setCurrentFPS} />}
        
        {/* Camera with focus animation */}
        <CameraController 
          focusTarget={isModalOpen ? focusedRack : null}
          focusBoxTarget={focusedBox}
          onFocusComplete={onClearBoxFocus}
          autoRotate={autoRotate}
        />
        
        <PerspectiveCamera makeDefault position={[50, 35, 50]} fov={50} />
        <OrbitControls
          ref={(controls) => {
            // Store reference for WASD movement
            const canvas = document.querySelector('canvas');
            if (canvas && controls) {
              (canvas as any).__controls = controls;
            }
          }}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2 - 0.05}
          panSpeed={1}
          rotateSpeed={0.8}
          zoomSpeed={1.2}
          enableDamping={!performanceMode}
          dampingFactor={0.05}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
        />

        {/* Lighting */}
        <ambientLight intensity={performanceMode ? 0.5 : 0.4} color={0xfff8f0} />
        <directionalLight
          position={[50, 80, 50]}
          intensity={performanceMode ? 0.8 : 1.0}
          castShadow={!performanceMode}
          shadow-mapSize-width={shadowMapSize}
          shadow-mapSize-height={shadowMapSize}
          shadow-camera-far={250}
          shadow-camera-left={-80}
          shadow-camera-right={80}
          shadow-camera-top={80}
          shadow-camera-bottom={-80}
          shadow-bias={-0.0001}
          color={0xfff8e0}
        />
        {!performanceMode && (
          <directionalLight position={[-40, 50, -40]} intensity={0.3} color={0xe8f0ff} />
        )}
        <hemisphereLight args={[0x87ceeb, 0x444444, performanceMode ? 0.3 : 0.4]} />

        {/* Fog for depth */}
        <fog attach="fog" args={[0x1a1f2e, performanceMode ? 100 : 60, performanceMode ? 250 : 180]} />

        {/* Stars */}
        {!performanceMode && (
          <Stars radius={200} depth={60} count={2500} factor={4} saturation={0} fade speed={0.3} />
        )}

        {/* Warehouse Environment */}
        {showBackground && (
          <>
            <WarehouseFloor />
            <WarehouseLights />
            <WarehouseProps />
            <WarehouseBuilding 
              visible={true} 
              roofVisible={showRoof}
              wallOpacity={0.2}
              roofOpacity={0.15}
              showDoors={true}
            />
          </>
        )}

        {/* Human Figures for Scale */}
        <HumanFigures visible={showHumans && showBackground} />

        {/* Realtime User Avatars */}
        {realtimeUsers.map((user) => (
          <UserAvatar3D key={user.id} user={user} showLabel={true} />
        ))}

        {/* Axes Helper */}
        {showAxes && <AxesHelper />}

        {/* Racks */}
        {visibleRacks.map((rack) => {
          const fillRate = getRackFillRate?.(rack.id) ?? 0;
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
              isVisible={true}
              isDimmed={dimmedRackIdSet.has(rack.id)}
            />
          );
        })}

        {/* Boxes */}
        {visibleBoxes.map((box) => (
          <EnhancedBox3D
            key={box.id}
            box={box}
            onSelect={onSelectBox}
            viewMode={viewMode}
            isFiltered={isBoxFiltered(box)}
            isFocused={box.id === focusedBoxId}
            isDimmed={dimmedRackIdSet.has(box.rackId)}
          />
        ))}
      </Canvas>

      {/* UI Overlays - hide when modal is open */}
      <div className={`absolute top-4 right-4 space-y-3 transition-opacity duration-300 ${isModalOpen ? 'opacity-30' : 'opacity-100'}`}>
        <StatsOverlay stats={stats} />
        <FillRateLegend 
          onFilterByStatus={onSetFillRateFilter}
          activeFilter={fillRateFilter}
        />
      </div>

      {/* Rack Tooltip */}
      {!isModalOpen && <RackTooltip rack={hoveredRackData} boxes={boxes} />}
    </div>
  );
};

export default WarehouseScene;
