'use client';

import { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { RackConfig, getFillRateStatus, fillRateColors } from '@/types/warehouse';
import { Html } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';

interface EnhancedRack3DProps {
  config: RackConfig;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDrag?: (id: string, position: { x: number; y: number; z: number }) => void;
  isDraggable?: boolean;
  onHover?: (id: string | null) => void;
  onDoubleClick?: (id: string) => void;
  fillRate?: number;
  isVisible?: boolean;
  /** When true, rack is rendered at low opacity (belongs to another tenant) */
  isDimmed?: boolean;
}

const EnhancedRack3D = ({ 
  config, 
  isSelected, 
  onSelect, 
  isDraggable = false, 
  onHover, 
  onDoubleClick, 
  fillRate = 0,
  isVisible = true,
  isDimmed = false,
}: EnhancedRack3DProps) => {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  
  const { position, rows, columns, levels, cellWidth, cellHeight, cellDepth } = config;

  const fillStatus = getFillRateStatus(fillRate);
  const statusColor = fillRateColors[fillStatus];

  // Enhanced rack frame with realistic industrial look
  const { frameGeometry, shelfGeometry, postPositions } = useMemo(() => {
    const framePositions: number[] = [];
    const shelfPositions: number[] = [];
    const posts: { x: number; z: number }[] = [];

    const totalWidth = columns * cellWidth;
    const totalHeight = levels * cellHeight;
    const totalDepth = rows * cellDepth;

    const pushSegment = (
      x1: number, y1: number, z1: number,
      x2: number, y2: number, z2: number
    ) => {
      framePositions.push(x1, y1, z1, x2, y2, z2);
    };

    // Vertical posts at corners only (more industrial look)
    const cornerPosts = [
      { x: 0, z: 0 },
      { x: totalWidth, z: 0 },
      { x: 0, z: totalDepth },
      { x: totalWidth, z: totalDepth },
    ];
    
    cornerPosts.forEach(({ x, z }) => {
      pushSegment(x, 0, z, x, totalHeight, z);
      posts.push({ x, z });
    });

    // Horizontal beams - only front and back for each level
    for (let l = 0; l <= levels; l++) {
      const y = l * cellHeight;
      // Front beam
      pushSegment(0, y, 0, totalWidth, y, 0);
      // Back beam
      pushSegment(0, y, totalDepth, totalWidth, y, totalDepth);
    }

    // Cross braces (X pattern on sides for stability)
    // Left side
    for (let l = 0; l < levels; l++) {
      const y = l * cellHeight;
      pushSegment(0, y, 0, 0, y + cellHeight, totalDepth);
      pushSegment(0, y + cellHeight, 0, 0, y, totalDepth);
    }
    // Right side
    for (let l = 0; l < levels; l++) {
      const y = l * cellHeight;
      pushSegment(totalWidth, y, 0, totalWidth, y + cellHeight, totalDepth);
      pushSegment(totalWidth, y + cellHeight, 0, totalWidth, y, totalDepth);
    }

    // Shelf support beams (depth direction)
    for (let l = 1; l <= levels; l++) {
      const y = l * cellHeight;
      for (let c = 0; c <= columns; c++) {
        const x = c * cellWidth;
        shelfPositions.push(x, y, 0, x, y, totalDepth);
      }
    }

    const frameGeo = new THREE.BufferGeometry();
    frameGeo.setAttribute('position', new THREE.Float32BufferAttribute(framePositions, 3));
    frameGeo.computeBoundingSphere();

    const shelfGeo = new THREE.BufferGeometry();
    shelfGeo.setAttribute('position', new THREE.Float32BufferAttribute(shelfPositions, 3));
    shelfGeo.computeBoundingSphere();

    return { frameGeometry: frameGeo, shelfGeometry: shelfGeo, postPositions: posts };
  }, [rows, columns, levels, cellWidth, cellHeight, cellDepth]);

  const frameColor = isSelected
    ? 0x00ff88
    : hovered
      ? 0x44aaff
      : 0x3366aa; // Industrial blue

  // Mouse drag is now disabled - use keyboard arrows instead
  // This prevents conflicts with camera controls

  const handleClick = () => {
    onSelect(config.id);
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onDoubleClick?.(config.id);
  };

  const handlePointerOver = () => {
    setHovered(true);
    onHover?.(config.id);
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHover?.(null);
  };

  if (!isVisible) return null;

  // Dimming constants for shared warehouse (kho chung)
  const dimOpacity = isDimmed ? 0.12 : 1;
  const dimFrameColor = isDimmed ? 0x666688 : frameColor;

  const totalWidth = columns * cellWidth;
  const totalHeight = levels * cellHeight;
  const totalDepth = rows * cellDepth;

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Main frame - thicker lines for industrial look */}
      <lineSegments geometry={frameGeometry}>
        <lineBasicMaterial color={dimFrameColor} linewidth={2} transparent opacity={isDimmed ? 0.2 : 1} />
      </lineSegments>

      {/* Shelf support beams */}
      <lineSegments geometry={shelfGeometry}>
        <lineBasicMaterial color={isDimmed ? 0x555577 : 0x5588bb} linewidth={1} transparent opacity={isDimmed ? 0.15 : 1} />
      </lineSegments>

      {/* Vertical posts as 3D cylinders */}
      {postPositions.map((pos, i) => (
        <mesh key={`post-${i}`} position={[pos.x, totalHeight / 2, pos.z]} castShadow={!isDimmed}>
          <boxGeometry args={[0.08, totalHeight, 0.08]} />
          <meshStandardMaterial 
            color={isDimmed ? 0x555577 : (isSelected ? 0x00ff88 : 0x3366aa)} 
            metalness={0.6} 
            roughness={0.4}
            transparent={isDimmed}
            opacity={dimOpacity}
          />
        </mesh>
      ))}

      {/* Shelf surfaces (subtle) */}
      {Array.from({ length: levels }).map((_, l) => (
        <mesh 
          key={`shelf-${l}`} 
          position={[totalWidth / 2, (l + 1) * cellHeight - 0.02, totalDepth / 2]} 
          receiveShadow={!isDimmed}
        >
          <boxGeometry args={[totalWidth - 0.1, 0.03, totalDepth - 0.1]} />
          <meshStandardMaterial 
            color={isDimmed ? 0x444466 : 0x556677} 
            transparent 
            opacity={isDimmed ? 0.08 : 0.4}
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      ))}

      {/* Base plate */}
      <mesh position={[totalWidth / 2, 0.02, totalDepth / 2]} receiveShadow={!isDimmed}>
        <boxGeometry args={[totalWidth + 0.2, 0.04, totalDepth + 0.2]} />
        <meshStandardMaterial 
          color={isDimmed ? 0x555577 : parseInt(statusColor.replace('#', '0x'))} 
          metalness={0.3} 
          roughness={0.6}
          transparent
          opacity={isDimmed ? 0.1 : 0.8}
        />
      </mesh>

      {/* Fill rate indicator bar on top */}
      {!isDimmed && (
        <mesh position={[totalWidth / 2, totalHeight + 0.15, totalDepth / 2]}>
          <boxGeometry args={[totalWidth, 0.1, 0.3]} />
          <meshStandardMaterial 
            color={parseInt(statusColor.replace('#', '0x'))}
            emissive={parseInt(statusColor.replace('#', '0x'))}
            emissiveIntensity={0.3}
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
      )}

      {/* Selection highlight effect */}
      {isSelected && !isDimmed && (
        <mesh position={[totalWidth / 2, 0.01, totalDepth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[totalWidth + 0.5, totalDepth + 0.5]} />
          <meshBasicMaterial color={0x00ff88} transparent opacity={0.15} />
        </mesh>
      )}

      {/* Dimmed label: "Đã cho thuê" overlay for non-rented racks */}
      {isDimmed && (
        <Html position={[totalWidth / 2, totalHeight / 2, totalDepth / 2]} center>
          <div className="px-2 py-1 rounded text-[10px] font-medium text-slate-400/60 bg-slate-800/30 backdrop-blur-sm border border-slate-600/20 whitespace-nowrap pointer-events-none select-none">
            Khu vực khác
          </div>
        </Html>
      )}

      {/* Rack name label */}
      {(hovered || isSelected) && !isDimmed && (
        <Html position={[totalWidth / 2, totalHeight + 0.8, totalDepth / 2]} center>
          <div className="bg-primary/95 backdrop-blur text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xl whitespace-nowrap border border-primary-foreground/20 animate-in fade-in zoom-in-95 duration-200">
            <span className="mr-2">{config.name}</span>
            <span className="opacity-80">({Math.round(fillRate * 100)}%)</span>
            {isDraggable && isSelected && (
              <span className="ml-2 text-[10px] opacity-70">←↑↓→</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

export default EnhancedRack3D;
