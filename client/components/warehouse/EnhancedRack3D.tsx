'use client';

import { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { RackConfig, getFillRateStatus, fillRateColors } from '@/types/warehouse';
import { Html } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';

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
}

const EnhancedRack3D = ({ 
  config, 
  isSelected, 
  onSelect, 
  onDrag, 
  isDraggable = false, 
  onHover, 
  onDoubleClick, 
  fillRate = 0,
  isVisible = true,
}: EnhancedRack3DProps) => {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const { raycaster, gl } = useThree();
  
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

  const frameColor = isDragging
    ? 0xffaa00
    : isSelected
      ? 0x00ff88
      : hovered
        ? 0x44aaff
        : 0x3366aa; // Industrial blue

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isDraggable || !isSelected) return;
    if (!e.nativeEvent.ctrlKey && !e.nativeEvent.metaKey) return;
    e.stopPropagation();
    setIsDragging(true);
    gl.domElement.style.cursor = 'grabbing';
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    gl.domElement.style.cursor = 'auto';

    if (groupRef.current && onDrag) {
      const pos = groupRef.current.position;
      onDrag(config.id, {
        x: Math.round(pos.x * 2) / 2,
        y: 0,
        z: Math.round(pos.z * 2) / 2,
      });
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !groupRef.current) return;
    e.stopPropagation();

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      groupRef.current.position.x = intersection.x - (columns * cellWidth) / 2;
      groupRef.current.position.z = intersection.z - (rows * cellDepth) / 2;
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (isDragging) return;
    e.stopPropagation();
    onSelect(config.id);
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onDoubleClick?.(config.id);
  };

  if (!isVisible) return null;

  const totalWidth = columns * cellWidth;
  const totalHeight = levels * cellHeight;
  const totalDepth = rows * cellDepth;

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover?.(config.id);
        if (isDraggable && isSelected) {
          gl.domElement.style.cursor = 'grab';
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover?.(null);
        if (!isDragging) {
          gl.domElement.style.cursor = 'auto';
        }
      }}
    >
      {/* Main frame - thicker lines for industrial look */}
      <lineSegments geometry={frameGeometry}>
        <lineBasicMaterial color={frameColor} linewidth={2} />
      </lineSegments>

      {/* Shelf support beams */}
      <lineSegments geometry={shelfGeometry}>
        <lineBasicMaterial color={0x5588bb} linewidth={1} />
      </lineSegments>

      {/* Vertical posts as 3D cylinders */}
      {postPositions.map((pos, i) => (
        <mesh key={`post-${i}`} position={[pos.x, totalHeight / 2, pos.z]} castShadow>
          <boxGeometry args={[0.08, totalHeight, 0.08]} />
          <meshStandardMaterial 
            color={isSelected ? 0x00ff88 : 0x3366aa} 
            metalness={0.6} 
            roughness={0.4} 
          />
        </mesh>
      ))}

      {/* Shelf surfaces (subtle) */}
      {Array.from({ length: levels }).map((_, l) => (
        <mesh 
          key={`shelf-${l}`} 
          position={[totalWidth / 2, (l + 1) * cellHeight - 0.02, totalDepth / 2]} 
          receiveShadow
        >
          <boxGeometry args={[totalWidth - 0.1, 0.03, totalDepth - 0.1]} />
          <meshStandardMaterial 
            color={0x556677} 
            transparent 
            opacity={0.4}
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      ))}

      {/* Base plate */}
      <mesh position={[totalWidth / 2, 0.02, totalDepth / 2]} receiveShadow>
        <boxGeometry args={[totalWidth + 0.2, 0.04, totalDepth + 0.2]} />
        <meshStandardMaterial 
          color={parseInt(statusColor.replace('#', '0x'))} 
          metalness={0.3} 
          roughness={0.6}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Fill rate indicator bar on top */}
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

      {/* Selection highlight effect */}
      {isSelected && (
        <mesh position={[totalWidth / 2, 0.01, totalDepth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[totalWidth + 0.5, totalDepth + 0.5]} />
          <meshBasicMaterial color={0x00ff88} transparent opacity={0.15} />
        </mesh>
      )}

      {/* Rack name label */}
      {(hovered || isSelected) && (
        <Html position={[totalWidth / 2, totalHeight + 0.8, totalDepth / 2]} center>
          <div className="bg-primary/95 backdrop-blur text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xl whitespace-nowrap border border-primary-foreground/20 animate-in fade-in zoom-in-95 duration-200">
            <span className="mr-2">{config.name}</span>
            <span className="opacity-80">({Math.round(fillRate * 100)}%)</span>
            {isDraggable && isSelected && (
              <span className="ml-2 text-[10px] opacity-70">Ctrl+Drag</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

export default EnhancedRack3D;
