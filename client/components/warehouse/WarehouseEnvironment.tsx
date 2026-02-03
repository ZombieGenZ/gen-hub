'use client';

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

// Note: WarehouseStructure moved to WarehouseBuilding.tsx for complete building with 4 walls

// Warehouse floor with markings - expanded for 80m x 60m warehouse
export const WarehouseFloor = () => {
  const floorSize = 250;
  
  // Create floor texture procedurally
  const floorMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Base concrete/epoxy color
    ctx.fillStyle = '#6a7580';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add noise/texture for concrete effect
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const brightness = Math.random() * 25 - 12;
      ctx.fillStyle = `rgba(${110 + brightness}, ${120 + brightness}, ${130 + brightness}, 0.25)`;
      ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(25, 25);
    
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.75,
      metalness: 0.1,
    });
  }, []);

  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, -0.01, 25]} receiveShadow material={floorMaterial}>
        <planeGeometry args={[floorSize, floorSize]} />
      </mesh>

      {/* Floor markings - walking paths */}
      <FloorMarkings />

      {/* Epoxy reflective overlay in main work areas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[35, 0.01, 25]} receiveShadow>
        <planeGeometry args={[70, 55]} />
        <meshStandardMaterial 
          color={0x7a8a98}
          roughness={0.25}
          metalness={0.15}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
};

// Floor markings component - expanded for larger warehouse
const FloorMarkings = () => {
  const markings = useMemo(() => {
    const lines: React.JSX.Element[] = [];
    
    // Main aisle lines (yellow) - horizontal through warehouse
    for (let i = 0; i < 8; i++) {
      lines.push(
        <mesh 
          key={`h-aisle-${i}`} 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[35, 0.02, 5 + i * 7]}
        >
          <planeGeometry args={[65, 0.12]} />
          <meshBasicMaterial color={0xf0c000} />
        </mesh>
      );
    }
    
    // Vertical aisle lines
    for (let i = 0; i < 7; i++) {
      lines.push(
        <mesh 
          key={`v-aisle-${i}`} 
          rotation={[-Math.PI / 2, 0, Math.PI / 2]} 
          position={[5 + i * 10, 0.02, 28]}
        >
          <planeGeometry args={[0.12, 50]} />
          <meshBasicMaterial color={0xf0c000} />
        </mesh>
      );
    }

    // Loading zone markings near entrance
    for (let i = 0; i < 12; i++) {
      lines.push(
        <mesh 
          key={`loading-${i}`} 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[35 - 6 + i * 1, 0.02, 58]}
        >
          <planeGeometry args={[0.5, 3]} />
          <meshBasicMaterial color={i % 2 === 0 ? 0xf0c000 : 0x222222} />
        </mesh>
      );
    }

    // Pedestrian crossing near personnel door
    for (let i = 0; i < 10; i++) {
      lines.push(
        <mesh 
          key={`zebra-${i}`} 
          rotation={[-Math.PI / 2, 0, Math.PI / 2]} 
          position={[-3, 0.02, 20 + i * 1.2]}
        >
          <planeGeometry args={[0.7, 2.5]} />
          <meshBasicMaterial color={0xffffff} />
        </mesh>
      );
    }

    // Section labels on floor
    const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
    sections.forEach((_, i) => {
      lines.push(
        <mesh 
          key={`section-marker-${i}`} 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[2, 0.025, 5 + i * 7]}
        >
          <circleGeometry args={[0.8, 16]} />
          <meshBasicMaterial color={0x3366aa} />
        </mesh>
      );
    });
    
    return lines;
  }, []);

  return <group>{markings}</group>;
};

// LED lights on ceiling - expanded grid for larger warehouse
export const WarehouseLights = () => {
  const lightRef = useRef<THREE.Group>(null);
  
  const lights = useMemo(() => {
    const fixtures: React.JSX.Element[] = [];
    
    // LED strip lights - expanded grid
    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 7; z++) {
        const posX = x * 10 - 2;
        const posZ = z * 8 + 2;
        
        fixtures.push(
          <group key={`light-${x}-${z}`} position={[posX, 16, posZ]}>
            {/* Light fixture body */}
            <mesh castShadow>
              <boxGeometry args={[3.5, 0.12, 0.35]} />
              <meshStandardMaterial color={0xcccccc} metalness={0.7} roughness={0.3} />
            </mesh>
            {/* LED panel (emissive) */}
            <mesh position={[0, -0.08, 0]}>
              <boxGeometry args={[3.3, 0.04, 0.3]} />
              <meshStandardMaterial 
                color={0xffffee}
                emissive={0xffffee}
                emissiveIntensity={0.6}
              />
            </mesh>
            {/* Point light for actual illumination - reduced for performance */}
            {(x + z) % 2 === 0 && (
              <pointLight
                intensity={0.6}
                distance={20}
                decay={2}
                color={0xfff8e8}
                castShadow={false}
              />
            )}
          </group>
        );
      }
    }
    
    return fixtures;
  }, []);

  return <group ref={lightRef}>{lights}</group>;
};

// Safety equipment and warehouse props - positioned for larger warehouse
export const WarehouseProps = () => {
  return (
    <group>
      {/* Fire extinguishers along walls */}
      {[5, 20, 35, 50].map((z, i) => (
        <group key={`extinguisher-${i}`} position={[-4, 1.2, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.5, 16]} />
            <meshStandardMaterial color={0xcc2222} metalness={0.3} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
            <meshStandardMaterial color={0x222222} metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Safety signs */}
      {[10, 30, 50].map((z, i) => (
        <mesh key={`sign-${i}`} position={[-4.5, 3, z]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.7, 0.7, 0.04]} />
          <meshStandardMaterial color={i === 1 ? 0x00aa44 : 0xcc4400} />
        </mesh>
      ))}

      {/* Pallet stacks in staging area */}
      {[0, 5, 10].map((offset, j) => (
        <group key={`pallet-stack-${j}`}>
          {[0, 0.15, 0.3].map((y, i) => (
            <mesh key={`pallet-${j}-${i}`} position={[68, y, 10 + offset]} castShadow>
              <boxGeometry args={[1.2, 0.12, 1]} />
              <meshStandardMaterial color={0x8b6914} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Trash bins */}
      {[15, 45].map((z, i) => (
        <mesh key={`bin-${i}`} position={[72, 0.5, z]} castShadow>
          <cylinderGeometry args={[0.35, 0.3, 1, 16]} />
          <meshStandardMaterial color={i === 0 ? 0x446688 : 0x888844} metalness={0.4} roughness={0.6} />
        </mesh>
      ))}

      {/* Forklift parking area markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[68, 0.015, 45]}>
        <planeGeometry args={[5, 8]} />
        <meshBasicMaterial color={0x335588} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[68, 0.02, 45]}>
        <ringGeometry args={[1.5, 1.8, 16]} />
        <meshBasicMaterial color={0xffffff} />
      </mesh>
    </group>
  );
};
