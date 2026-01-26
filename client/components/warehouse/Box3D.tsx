'use client';

import { useState, useRef, type RefObject } from 'react';
import { BoxItem, categoryColors } from '@/types/warehouse';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface Box3DProps {
  box: BoxItem;
  onSelect: (id: string) => void;
  viewMode: 'default' | 'category' | 'heatmap';
  isFiltered: boolean;
}

const SelectedBoxRotation = ({ meshRef }: { meshRef: RefObject<THREE.Mesh | null> }) => {
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
  });

  return null;
};

const Box3D = ({ box, onSelect, viewMode, isFiltered }: Box3DProps) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  const getColor = () => {
    if (!isFiltered) return 0x333333;
    if (box.selected) return 0xffd700;
    if (hovered) return 0xffaa00;

    switch (viewMode) {
      case 'category':
        return parseInt(categoryColors[box.category].replace('#', '0x'));
      case 'heatmap': {
        // Color based on level - higher = warmer
        const heat = box.level / 5;
        return new THREE.Color().setHSL(0.1 - heat * 0.1, 0.8, 0.5).getHex();
      }
      default:
        return 0xcc7700;
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(box.id);
  };

  const shouldCastShadow = box.selected || hovered;

  return (
    <group position={[box.position.x, box.position.y, box.position.z]}>
      {/* Only animate the selected box (avoid 700+ useFrame callbacks) */}
      {box.selected && <SelectedBoxRotation meshRef={meshRef} />}

      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        castShadow={shouldCastShadow}
        receiveShadow
      >
        <boxGeometry args={[0.8, 0.6, 0.8]} />
        <meshStandardMaterial
          color={getColor()}
          metalness={0.1}
          roughness={0.7}
          opacity={isFiltered ? 1 : 0.3}
          transparent={!isFiltered}
        />
      </mesh>

      {/* Selection ring */}
      {box.selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.31, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color={0xffd700} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Tooltip */}
      {hovered && (
        <Html
          position={[0, 0.8, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="bg-card text-card-foreground px-3 py-2 rounded-lg shadow-lg border border-border text-xs">
            <div className="font-semibold">{box.name}</div>
            <div className="text-muted-foreground">
              Vị trí: Tầng {box.level + 1}, Hàng {box.row + 1}, Cột {box.column + 1}
            </div>
            {box.weight && <div className="text-muted-foreground">Khối lượng: {box.weight}kg</div>}
            {box.quantity && <div className="text-muted-foreground">Số lượng: {box.quantity}</div>}
          </div>
        </Html>
      )}
    </group>
  );
};

export default Box3D;
