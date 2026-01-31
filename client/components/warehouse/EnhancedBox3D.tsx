'use client';

import { useState, useRef, useMemo, type RefObject } from 'react';
import { BoxItem, categoryColors } from '@/types/warehouse';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface EnhancedBox3DProps {
  box: BoxItem;
  onSelect: (id: string) => void;
  viewMode: 'default' | 'category' | 'heatmap';
  isFiltered: boolean;
}

const SelectedBoxAnimation = ({ meshRef }: { meshRef: RefObject<THREE.Mesh | null> }) => {
  useFrame((state) => {
    if (!meshRef.current) return;
    // Gentle rotation
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
  });
  return null;
};

// Pulsing glow for attention items
const PulseEffect = ({ color }: { color: number }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!ringRef.current) return;
    const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    ringRef.current.scale.set(scale, scale, 1);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.31, 0]}>
      <ringGeometry args={[0.5, 0.7, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
};

const EnhancedBox3D = ({ box, onSelect, viewMode, isFiltered }: EnhancedBox3DProps) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.Mesh>(null);

  // Create cardboard-like texture
  const boxMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base cardboard color
    ctx.fillStyle = '#c4a574';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add cardboard texture noise
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const brightness = Math.random() * 40 - 20;
      ctx.fillStyle = `rgba(${180 + brightness}, ${150 + brightness}, ${100 + brightness}, 0.4)`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 3);
    }
    
    // Add horizontal lines (cardboard corrugation hint)
    ctx.strokeStyle = 'rgba(150, 120, 80, 0.3)';
    ctx.lineWidth = 1;
    for (let y = 0; y < 256; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y + Math.random() * 2);
      ctx.stroke();
    }

    // Add tape on top
    ctx.fillStyle = 'rgba(200, 180, 140, 0.7)';
    ctx.fillRect(100, 0, 56, 30);
    ctx.fillRect(100, 226, 56, 30);
    
    // Add barcode
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 180, 80, 50);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 20; i++) {
      const barWidth = Math.random() > 0.5 ? 2 : 1;
      ctx.fillRect(25 + i * 3.5, 190, barWidth, 30);
    }
    
    // Add label area
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(150, 100, 90, 60);
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(box.name.substring(0, 8), 155, 130);
    ctx.font = '10px Arial';
    ctx.fillText(`QTY: ${box.quantity || '?'}`, 155, 145);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
  }, [box.name, box.quantity]);

  const getColor = () => {
    if (!isFiltered) return 0x333333;
    if (box.selected) return 0xffd700;
    if (hovered) return 0xffcc44;

    switch (viewMode) {
      case 'category':
        return parseInt(categoryColors[box.category].replace('#', '0x'));
      case 'heatmap': {
        const heat = box.level / 5;
        return new THREE.Color().setHSL(0.1 - heat * 0.1, 0.8, 0.5).getHex();
      }
      default:
        return 0xc4a574; // Natural cardboard color
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(box.id);
  };

  const isAttentionNeeded = box.quantity && box.quantity < 5; // Low stock pulse

  return (
    <group position={[box.position.x, box.position.y, box.position.z]}>
      {box.selected && <SelectedBoxAnimation meshRef={meshRef} />}
      
      {/* Main box with cardboard texture */}
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
        castShadow={box.selected || hovered}
        receiveShadow
      >
        <boxGeometry args={[0.8, 0.6, 0.8]} />
        <meshStandardMaterial
          map={viewMode === 'default' ? boxMaterial : undefined}
          color={viewMode !== 'default' ? getColor() : 0xffffff}
          metalness={0.05}
          roughness={0.85}
          opacity={isFiltered ? 1 : 0.3}
          transparent={!isFiltered}
        />
      </mesh>

      {/* Box edges for definition */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.81, 0.61, 0.81)]} />
        <lineBasicMaterial 
          color={hovered ? 0xffaa00 : box.selected ? 0xffd700 : 0x8b6914} 
          transparent 
          opacity={isFiltered ? 0.6 : 0.2} 
        />
      </lineSegments>

      {/* Tape strip on top */}
      <mesh position={[0, 0.305, 0]}>
        <boxGeometry args={[0.82, 0.01, 0.12]} />
        <meshStandardMaterial 
          color={0xd4c4a4} 
          transparent 
          opacity={isFiltered ? 0.9 : 0.3}
          roughness={0.6}
        />
      </mesh>

      {/* Selection glow ring */}
      {box.selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.31, 0]}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          <meshBasicMaterial color={0xffd700} side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Hover outline glow */}
      {hovered && !box.selected && (
        <mesh ref={outlineRef} scale={[1.05, 1.05, 1.05]}>
          <boxGeometry args={[0.8, 0.6, 0.8]} />
          <meshBasicMaterial color={0xffaa00} transparent opacity={0.3} side={THREE.BackSide} />
        </mesh>
      )}

      {/* Pulse effect for low stock items */}
      {isAttentionNeeded && isFiltered && <PulseEffect color={0xff4444} />}

      {/* Tooltip */}
      {hovered && (
        <Html
          position={[0, 0.8, 0]}
          center
          style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
        >
          <div className="bg-card/95 backdrop-blur-sm text-card-foreground px-4 py-3 rounded-xl shadow-2xl border border-border/50 text-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="font-bold text-sm mb-1 text-primary">{box.name}</div>
            <div className="space-y-0.5 text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[box.category] }} />
                Vị trí: Tầng {box.level + 1}, Hàng {box.row + 1}, Cột {box.column + 1}
              </div>
              {box.weight && <div>📦 Khối lượng: <span className="font-medium text-foreground">{box.weight}kg</span></div>}
              {box.quantity && (
                <div className={box.quantity < 5 ? 'text-destructive font-medium' : ''}>
                  📊 Số lượng: <span className="font-medium text-foreground">{box.quantity}</span>
                  {box.quantity < 5 && ' ⚠️'}
                </div>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default EnhancedBox3D;
