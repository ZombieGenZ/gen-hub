'use client';

import { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { RackConfig, getFillRateStatus, fillRateColors } from '@/types/warehouse';
import { Html } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';

interface Rack3DProps {
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

const Rack3D = ({ 
  config, 
  isSelected, 
  onSelect, 
  onDrag, 
  isDraggable = false, 
  onHover, 
  onDoubleClick, 
  fillRate = 0,
  isVisible = true,
}: Rack3DProps) => {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const { raycaster, gl } = useThree();
  
  const { position, rows, columns, levels, cellWidth, cellHeight, cellDepth } = config;

  // Determine rack color based on fill rate status
  const fillStatus = getFillRateStatus(fillRate);
  const baseColor = fillRateColors[fillStatus];

  const frameColor = isDragging
    ? 0xffaa00
    : isSelected
      ? 0x00ff00
      : hovered
        ? 0x00aaff
        : parseInt(baseColor.replace('#', ''), 16);

  // Render the entire rack frame as a single LineSegments to drastically reduce draw calls
  const frameGeometry = useMemo(() => {
    const positions: number[] = [];

    const totalWidth = columns * cellWidth;
    const totalHeight = levels * cellHeight;
    const totalDepth = rows * cellDepth;

    const pushSegment = (
      x1: number,
      y1: number,
      z1: number,
      x2: number,
      y2: number,
      z2: number
    ) => {
      positions.push(x1, y1, z1, x2, y2, z2);
    };

    // Vertical posts at corners
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= columns; c++) {
        const x = c * cellWidth;
        const z = r * cellDepth;
        pushSegment(x, 0, z, x, totalHeight, z);
      }
    }

    // Horizontal beams - along width for each level
    for (let l = 0; l <= levels; l++) {
      const y = l * cellHeight;
      for (let r = 0; r <= rows; r++) {
        const z = r * cellDepth;
        pushSegment(0, y, z, totalWidth, y, z);
      }
    }

    // Depth beams for each level
    for (let l = 0; l <= levels; l++) {
      const y = l * cellHeight;
      for (let c = 0; c <= columns; c++) {
        const x = c * cellWidth;
        pushSegment(x, y, 0, x, y, totalDepth);
      }
    }

    // Cross braces for stability (diagonal on sides)
    for (let r = 0; r < rows; r++) {
      for (let l = 0; l < levels; l++) {
        const z = r * cellDepth;
        const y = l * cellHeight;
        // Left side diagonal
        pushSegment(0, y, z, 0, y + cellHeight, z + cellDepth);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();

    return geometry;
  }, [rows, columns, levels, cellWidth, cellHeight, cellDepth]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isDraggable || !isSelected) return;
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

    // Create a plane at y=0 for intersection
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

  // Don't render if not visible
  if (!isVisible) return null;

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
      <lineSegments geometry={frameGeometry}>
        <lineBasicMaterial color={frameColor} />
      </lineSegments>

      {/* Rack label */}
      {(hovered || isSelected) && (
        <Html position={[columns * cellWidth / 2, levels * cellHeight + 0.5, rows * cellDepth / 2]} center>
          <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium shadow-lg whitespace-nowrap">
            {config.name} {isDraggable && isSelected && '(Kéo để di chuyển)'}
          </div>
        </Html>
      )}
    </group>
  );
};

export default Rack3D;
