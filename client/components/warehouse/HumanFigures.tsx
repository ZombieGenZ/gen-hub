'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface HumanFigureProps {
  position: [number, number, number];
  rotation?: number;
  pose?: 'standing' | 'walking' | 'reaching' | 'clipboard' | 'pointing';
  vestColor?: string;
  skinTone?: string;
}

// Improved low-poly human figure with warehouse worker appearance (~1.7m height)
const HumanFigure = ({ 
  position, 
  rotation = 0, 
  pose = 'standing', 
  vestColor = '#ff6600',
  skinTone = '#e8d4c4'
}: HumanFigureProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const walkPhase = useRef(Math.random() * Math.PI * 2);
  
  // Walking animation with leg movement
  useFrame(() => {
    if (pose === 'walking' && groupRef.current) {
      walkPhase.current += 0.03;
      // Subtle bobbing motion
      groupRef.current.position.y = position[1] + Math.sin(walkPhase.current * 2) * 0.015;
    }
  });

  const getArmPose = () => {
    switch (pose) {
      case 'reaching': return { left: [-1.2, 0, 0.3], right: [-0.5, 0, 0] };
      case 'clipboard': return { left: [-0.3, 0, 0.5], right: [-0.3, 0, 0.5] };
      case 'pointing': return { left: [0, 0, 0], right: [-0.8, 0, 0.8] };
      case 'walking': return { left: [0.2, 0, 0], right: [-0.2, 0, 0] };
      default: return { left: [0, 0, 0], right: [0, 0, 0] };
    }
  };

  const armPose = getArmPose();
  const legSpread = pose === 'walking' ? Math.sin(walkPhase.current) * 0.15 : 0;

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* Head */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial color={skinTone} roughness={0.8} />
      </mesh>
      
      {/* Hair */}
      <mesh position={[0, 1.68, -0.02]} castShadow>
        <sphereGeometry args={[0.1, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color="#2d1f1a" roughness={0.9} />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.48, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.08, 8]} />
        <meshStandardMaterial color={skinTone} roughness={0.8} />
      </mesh>
      
      {/* Safety Vest (main torso) */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <boxGeometry args={[0.36, 0.45, 0.18]} />
        <meshStandardMaterial color={vestColor} roughness={0.6} />
      </mesh>
      
      {/* Reflective stripes on vest */}
      <mesh position={[0, 1.32, 0.095]} castShadow>
        <boxGeometry args={[0.32, 0.06, 0.01]} />
        <meshStandardMaterial color="#cccccc" emissive="#888888" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.15, 0.095]} castShadow>
        <boxGeometry args={[0.32, 0.06, 0.01]} />
        <meshStandardMaterial color="#cccccc" emissive="#888888" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Lower body / pants */}
      <mesh position={[0, 0.88, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 0.16]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
      </mesh>
      
      {/* Left arm */}
      <group position={[-0.22, 1.35, 0]} rotation={armPose.left as [number, number, number]}>
        {/* Upper arm (sleeve) */}
        <mesh position={[0, -0.12, 0]} castShadow>
          <boxGeometry args={[0.09, 0.22, 0.09]} />
          <meshStandardMaterial color={vestColor} roughness={0.6} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.07, 0.2, 0.07]} />
          <meshStandardMaterial color={skinTone} roughness={0.8} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.42, 0]} castShadow>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color={skinTone} roughness={0.8} />
        </mesh>
      </group>
      
      {/* Right arm */}
      <group position={[0.22, 1.35, 0]} rotation={armPose.right as [number, number, number]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <boxGeometry args={[0.09, 0.22, 0.09]} />
          <meshStandardMaterial color={vestColor} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.07, 0.2, 0.07]} />
          <meshStandardMaterial color={skinTone} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.42, 0]} castShadow>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color={skinTone} roughness={0.8} />
        </mesh>
        {/* Clipboard for clipboard pose */}
        {pose === 'clipboard' && (
          <mesh position={[0, -0.35, 0.08]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.15, 0.2, 0.02]} />
            <meshStandardMaterial color="#654321" roughness={0.8} />
          </mesh>
        )}
      </group>
      
      {/* Left leg */}
      <group position={[-0.08, 0.72, legSpread * 0.5]}>
        {/* Thigh */}
        <mesh position={[0, -0.18, 0]} castShadow>
          <boxGeometry args={[0.11, 0.32, 0.11]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
        {/* Shin */}
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[0.1, 0.28, 0.1]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
        {/* Work boot */}
        <mesh position={[0, -0.63, 0.03]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.16]} />
          <meshStandardMaterial color="#2d2d2d" roughness={0.6} />
        </mesh>
      </group>
      
      {/* Right leg */}
      <group position={[0.08, 0.72, -legSpread * 0.5]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <boxGeometry args={[0.11, 0.32, 0.11]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[0.1, 0.28, 0.1]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.63, 0.03]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.16]} />
          <meshStandardMaterial color="#2d2d2d" roughness={0.6} />
        </mesh>
      </group>
      
      {/* Safety helmet */}
      <mesh position={[0, 1.72, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f6e05e" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Helmet brim */}
      <mesh position={[0, 1.68, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.15, 0.02, 12]} />
        <meshStandardMaterial color="#f6e05e" roughness={0.4} />
      </mesh>
    </group>
  );
};

interface HumanFiguresProps {
  visible: boolean;
}

const HumanFigures = ({ visible }: HumanFiguresProps) => {
  // Positioned in warehouse aisles with varied poses and vest colors
  const figures = useMemo(() => [
    // Near entrance area
    { position: [25, 0, 50] as [number, number, number], rotation: Math.PI, pose: 'standing' as const, vestColor: '#ff6600' },
    // In main aisle
    { position: [8, 0, 20] as [number, number, number], rotation: Math.PI * 0.5, pose: 'walking' as const, vestColor: '#ff6600' },
    // Near shelf - reaching
    { position: [15, 0, 8] as [number, number, number], rotation: 0, pose: 'reaching' as const, vestColor: '#00cc44' },
    // Supervisor with clipboard
    { position: [30, 0, 25] as [number, number, number], rotation: Math.PI * 0.3, pose: 'clipboard' as const, vestColor: '#ffffff' },
    // Worker pointing at shelf
    { position: [45, 0, 15] as [number, number, number], rotation: -Math.PI * 0.4, pose: 'pointing' as const, vestColor: '#ff6600' },
    // Worker walking through aisle
    { position: [20, 0, 35] as [number, number, number], rotation: Math.PI * 0.8, pose: 'walking' as const, vestColor: '#ffcc00' },
    // Near loading dock
    { position: [25, 0, 58] as [number, number, number], rotation: -Math.PI * 0.1, pose: 'standing' as const, vestColor: '#ff6600' },
    // At workstation
    { position: [55, 0, 30] as [number, number, number], rotation: Math.PI, pose: 'clipboard' as const, vestColor: '#00cc44' },
  ], []);

  if (!visible) return null;

  return (
    <group>
      {figures.map((fig, i) => (
        <HumanFigure
          key={`human-${i}`}
          position={fig.position}
          rotation={fig.rotation}
          pose={fig.pose}
          vestColor={fig.vestColor}
        />
      ))}
    </group>
  );
};

export default HumanFigures;
