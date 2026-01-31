'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';

// Warehouse walls and ceiling structure
export const WarehouseStructure = () => {
  const warehouseWidth = 80;
  const warehouseDepth = 60;
  const warehouseHeight = 20;

  return (
    <group>
      {/* Back wall */}
      <mesh position={[warehouseWidth / 2 - 10, warehouseHeight / 2, -5]} receiveShadow>
        <boxGeometry args={[warehouseWidth + 20, warehouseHeight, 0.3]} />
        <meshStandardMaterial 
          color={0x8899aa}
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {/* Left wall */}
      <mesh position={[-15, warehouseHeight / 2, warehouseDepth / 2 - 5]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[warehouseDepth + 10, warehouseHeight, 0.3]} />
        <meshStandardMaterial 
          color={0x8899aa}
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {/* Steel beams on ceiling */}
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={`beam-${i}`}>
          {/* Main horizontal beam */}
          <mesh position={[warehouseWidth / 2 - 10, warehouseHeight - 1, i * 8 - 5]} castShadow>
            <boxGeometry args={[warehouseWidth + 20, 0.4, 0.3]} />
            <meshStandardMaterial color={0x445566} metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Cross beam */}
          <mesh position={[warehouseWidth / 2 - 10, warehouseHeight - 1.5, i * 8 - 5]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[0.2, 0.3, warehouseWidth + 20]} />
            <meshStandardMaterial color={0x334455} metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Vertical support columns */}
      {[0, 20, 40, 60].map((x) => (
        [0, 20, 40].map((z) => (
          <mesh key={`column-${x}-${z}`} position={[x - 10, warehouseHeight / 2, z - 5]} castShadow>
            <boxGeometry args={[0.4, warehouseHeight, 0.4]} />
            <meshStandardMaterial color={0x556677} metalness={0.5} roughness={0.5} />
          </mesh>
        ))
      )).flat()}
    </group>
  );
};

// Warehouse floor with markings
export const WarehouseFloor = () => {
  const floorSize = 200;
  
  // Create floor texture procedurally
  const floorMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Base concrete color
    ctx.fillStyle = '#7a8590';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add noise/texture
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const brightness = Math.random() * 30 - 15;
      ctx.fillStyle = `rgba(${128 + brightness}, ${140 + brightness}, ${150 + brightness}, 0.3)`;
      ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1,
    });
  }, []);

  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow material={floorMaterial}>
        <planeGeometry args={[floorSize, floorSize]} />
      </mesh>

      {/* Floor markings - walking paths */}
      <FloorMarkings />

      {/* Epoxy reflective overlay in work areas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, 0.01, 15]} receiveShadow>
        <planeGeometry args={[50, 40]} />
        <meshStandardMaterial 
          color={0x8a9aa8}
          roughness={0.3}
          metalness={0.2}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
};

// Floor markings component
const FloorMarkings = () => {
  const markings = useMemo(() => {
    const lines: JSX.Element[] = [];
    
    // Yellow safety lines along aisles
    for (let i = 0; i < 6; i++) {
      // Horizontal lines
      lines.push(
        <mesh 
          key={`h-line-${i}`} 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[-10 + i * 10, 0.02, 20]}
        >
          <planeGeometry args={[0.15, 50]} />
          <meshBasicMaterial color={0xf0c000} />
        </mesh>
      );
    }
    
    // Vertical lines
    for (let i = 0; i < 5; i++) {
      lines.push(
        <mesh 
          key={`v-line-${i}`} 
          rotation={[-Math.PI / 2, 0, Math.PI / 2]} 
          position={[20, 0.02, -5 + i * 10]}
        >
          <planeGeometry args={[0.15, 60]} />
          <meshBasicMaterial color={0xf0c000} />
        </mesh>
      );
    }

    // Zebra crossing at entry
    for (let i = 0; i < 8; i++) {
      lines.push(
        <mesh 
          key={`zebra-${i}`} 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[-12, 0.02, -3 + i * 1.5]}
        >
          <planeGeometry args={[3, 0.8]} />
          <meshBasicMaterial color={0xffffff} />
        </mesh>
      );
    }
    
    return lines;
  }, []);

  return <group>{markings}</group>;
};

// LED lights on ceiling
export const WarehouseLights = () => {
  const lightRef = useRef<THREE.Group>(null);
  
  const lights = useMemo(() => {
    const fixtures: JSX.Element[] = [];
    
    // LED strip lights
    for (let x = 0; x < 5; x++) {
      for (let z = 0; z < 4; z++) {
        const posX = x * 12 - 5;
        const posZ = z * 10;
        
        fixtures.push(
          <group key={`light-${x}-${z}`} position={[posX, 18, posZ]}>
            {/* Light fixture body */}
            <mesh castShadow>
              <boxGeometry args={[4, 0.15, 0.4]} />
              <meshStandardMaterial color={0xcccccc} metalness={0.8} roughness={0.2} />
            </mesh>
            {/* LED panel (emissive) */}
            <mesh position={[0, -0.1, 0]}>
              <boxGeometry args={[3.8, 0.05, 0.35]} />
              <meshStandardMaterial 
                color={0xffffee}
                emissive={0xffffee}
                emissiveIntensity={0.8}
              />
            </mesh>
            {/* Point light for actual illumination */}
            <pointLight
              intensity={0.8}
              distance={25}
              decay={2}
              color={0xfff8e8}
              castShadow={false}
            />
          </group>
        );
      }
    }
    
    return fixtures;
  }, []);

  return <group ref={lightRef}>{lights}</group>;
};

// Safety equipment and warehouse props
export const WarehouseProps = () => {
  return (
    <group>
      {/* Fire extinguisher on wall */}
      <group position={[-14, 1.2, 5]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.5, 16]} />
          <meshStandardMaterial color={0xcc2222} metalness={0.3} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
          <meshStandardMaterial color={0x222222} metalness={0.5} roughness={0.5} />
        </mesh>
      </group>

      {/* Safety sign */}
      <mesh position={[-14.5, 3, 15]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.05]} />
        <meshStandardMaterial color={0x00aa44} />
      </mesh>

      {/* Pallet stack in corner */}
      {[0, 0.15, 0.3].map((y, i) => (
        <mesh key={`pallet-${i}`} position={[55, y, -3]} castShadow>
          <boxGeometry args={[1.2, 0.12, 1]} />
          <meshStandardMaterial color={0x8b6914} roughness={0.9} />
        </mesh>
      ))}

      {/* Trash bin */}
      <mesh position={[58, 0.5, 5]} castShadow>
        <cylinderGeometry args={[0.35, 0.3, 1, 16]} />
        <meshStandardMaterial color={0x445566} metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
};
