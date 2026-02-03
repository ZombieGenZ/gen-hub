'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

interface WarehouseBuildingProps {
  visible: boolean;
  roofVisible: boolean;
  wallOpacity?: number;
  roofOpacity?: number;
  showDoors?: boolean;
}

// Complete warehouse building with 4 walls, doors, loading dock, and roof
// Expanded to 80m x 60m warehouse
const WarehouseBuilding = ({ 
  visible, 
  roofVisible, 
  wallOpacity = 0.25,
  roofOpacity = 0.2,
  showDoors = true,
}: WarehouseBuildingProps) => {
  const warehouseWidth = 80;  // 80 meters wide
  const warehouseDepth = 60;  // 60 meters deep
  const warehouseHeight = 18; // 18 meters tall
  const wallThickness = 0.3;  // 30cm thick walls

  // Main entrance door dimensions (forklift/truck access)
  const mainDoorWidth = 5;
  const mainDoorHeight = 5;
  
  // Personnel door dimensions
  const personnelDoorWidth = 1.2;
  const personnelDoorHeight = 2.2;
  
  // Loading dock dimensions
  const dockHeight = 1.2;
  const dockWidth = 12;
  const dockDepth = 3;

  // Wall material with semi-transparency
  const wallMaterial = useMemo(() => (
    <meshStandardMaterial 
      color={0x7a8899}
      metalness={0.5}
      roughness={0.5}
      transparent
      opacity={wallOpacity}
      side={THREE.DoubleSide}
    />
  ), [wallOpacity]);

  // Corrugated metal panel material
  const panelMaterial = useMemo(() => (
    <meshStandardMaterial 
      color={0x6a7888}
      metalness={0.6}
      roughness={0.4}
      transparent
      opacity={wallOpacity + 0.1}
      side={THREE.DoubleSide}
    />
  ), [wallOpacity]);

  // Roof material
  const roofMaterial = useMemo(() => (
    <meshStandardMaterial 
      color={0x4a5666}
      metalness={0.6}
      roughness={0.3}
      transparent
      opacity={roofOpacity}
      side={THREE.DoubleSide}
    />
  ), [roofOpacity]);

  if (!visible) return null;

  const centerX = warehouseWidth / 2;
  const centerZ = warehouseDepth / 2;
  const mainDoorX = centerX; // Center of front wall

  return (
    <group position={[-5, 0, -5]}>
      {/* === WALLS === */}
      
      {/* Back wall (full, no door) - with panel texture simulation */}
      <mesh position={[centerX, warehouseHeight / 2, 0]}>
        <boxGeometry args={[warehouseWidth, warehouseHeight, wallThickness]} />
        {panelMaterial}
      </mesh>

      {/* Left wall (with personnel door) */}
      <group>
        {/* Wall section before door */}
        <mesh position={[0, warehouseHeight / 2, centerZ / 2 - 5]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[centerZ - 10, warehouseHeight, wallThickness]} />
          {panelMaterial}
        </mesh>
        {/* Wall section after door */}
        <mesh position={[0, warehouseHeight / 2, centerZ + 10]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[warehouseDepth - centerZ - 5, warehouseHeight, wallThickness]} />
          {panelMaterial}
        </mesh>
        {/* Section above door */}
        <mesh position={[0, personnelDoorHeight + (warehouseHeight - personnelDoorHeight) / 2, centerZ - 5]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[personnelDoorWidth + 1, warehouseHeight - personnelDoorHeight, wallThickness]} />
          {panelMaterial}
        </mesh>
        
        {/* Personnel door frame */}
        {showDoors && (
          <>
            <mesh position={[-0.2, personnelDoorHeight / 2, centerZ - 5]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[personnelDoorWidth + 0.3, personnelDoorHeight + 0.15, 0.15]} />
              <meshStandardMaterial color={0x334455} metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Steel door */}
            <mesh position={[0.1, personnelDoorHeight / 2, centerZ - 5]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[personnelDoorWidth, personnelDoorHeight, 0.08]} />
              <meshStandardMaterial color={0x3a5a7a} metalness={0.6} roughness={0.4} />
            </mesh>
            {/* Door handle */}
            <mesh position={[0.18, personnelDoorHeight / 2, centerZ - 5 + 0.4]}>
              <boxGeometry args={[0.04, 0.12, 0.04]} />
              <meshStandardMaterial color={0xaabbcc} metalness={0.8} roughness={0.2} />
            </mesh>
          </>
        )}
      </group>

      {/* Right wall (full, no door) */}
      <mesh position={[warehouseWidth, warehouseHeight / 2, centerZ]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[warehouseDepth, warehouseHeight, wallThickness]} />
        {panelMaterial}
      </mesh>

      {/* Front wall (with main entrance) */}
      <group>
        {/* Left section of front wall */}
        <mesh position={[(mainDoorX - mainDoorWidth / 2) / 2, warehouseHeight / 2, warehouseDepth]}>
          <boxGeometry args={[mainDoorX - mainDoorWidth / 2, warehouseHeight, wallThickness]} />
          {panelMaterial}
        </mesh>
        {/* Right section of front wall */}
        <mesh position={[mainDoorX + mainDoorWidth / 2 + (warehouseWidth - mainDoorX - mainDoorWidth / 2) / 2, warehouseHeight / 2, warehouseDepth]}>
          <boxGeometry args={[warehouseWidth - mainDoorX - mainDoorWidth / 2, warehouseHeight, wallThickness]} />
          {panelMaterial}
        </mesh>
        {/* Section above main door */}
        <mesh position={[mainDoorX, mainDoorHeight + (warehouseHeight - mainDoorHeight) / 2, warehouseDepth]}>
          <boxGeometry args={[mainDoorWidth + 1, warehouseHeight - mainDoorHeight, wallThickness]} />
          {panelMaterial}
        </mesh>
        
        {/* Main door frame */}
        {showDoors && (
          <>
            <mesh position={[mainDoorX, mainDoorHeight / 2, warehouseDepth + 0.2]}>
              <boxGeometry args={[mainDoorWidth + 0.4, mainDoorHeight + 0.2, 0.25]} />
              <meshStandardMaterial color={0x2a3a4a} metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Rolling shutter door */}
            <group position={[mainDoorX, mainDoorHeight / 2, warehouseDepth - 0.1]}>
              {Array.from({ length: 12 }).map((_, i) => (
                <mesh key={`shutter-${i}`} position={[0, -mainDoorHeight / 2 + 0.2 + i * 0.4, 0]}>
                  <boxGeometry args={[mainDoorWidth - 0.1, 0.35, 0.08]} />
                  <meshStandardMaterial 
                    color={i % 2 === 0 ? 0x4a5a6a : 0x3a4a5a} 
                    metalness={0.6} 
                    roughness={0.4} 
                  />
                </mesh>
              ))}
            </group>
            
            {/* Warning stripes on floor near entrance */}
            <mesh position={[mainDoorX, 0.02, warehouseDepth + 2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[mainDoorWidth + 2, 4]} />
              <meshBasicMaterial color={0xf5c000} />
            </mesh>
            {/* Black stripes */}
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={`stripe-${i}`} position={[mainDoorX - 3 + i * 1.2, 0.025, warehouseDepth + 2]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
                <planeGeometry args={[0.3, 5]} />
                <meshBasicMaterial color={0x222222} />
              </mesh>
            ))}
          </>
        )}
      </group>

      {/* === LOADING DOCK === */}
      {showDoors && (
        <group position={[mainDoorX, 0, warehouseDepth + dockDepth]}>
          {/* Dock platform */}
          <mesh position={[0, dockHeight / 2, 0]}>
            <boxGeometry args={[dockWidth, dockHeight, dockDepth * 2]} />
            <meshStandardMaterial color={0x555555} roughness={0.8} />
          </mesh>
          {/* Dock edge (yellow safety strip) */}
          <mesh position={[0, dockHeight + 0.02, dockDepth - 0.15]}>
            <boxGeometry args={[dockWidth, 0.05, 0.3]} />
            <meshStandardMaterial color={0xf5c000} emissive={0xf5c000} emissiveIntensity={0.1} />
          </mesh>
          {/* Dock bumpers */}
          {[-dockWidth / 2 + 1, dockWidth / 2 - 1].map((x, i) => (
            <mesh key={`bumper-${i}`} position={[x, dockHeight / 2, dockDepth + 0.15]}>
              <boxGeometry args={[0.4, dockHeight, 0.3]} />
              <meshStandardMaterial color={0x222222} roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {/* === ROOF === */}
      {roofVisible && (
        <group>
          {/* Gabled roof - left slope */}
          <mesh 
            position={[centerX - warehouseWidth / 4, warehouseHeight + 4, centerZ]} 
            rotation={[0, 0, Math.PI * 0.1]}
          >
            <boxGeometry args={[warehouseWidth / 2 + 8, 0.12, warehouseDepth + 8]} />
            {roofMaterial}
          </mesh>
          
          {/* Gabled roof - right slope */}
          <mesh 
            position={[centerX + warehouseWidth / 4, warehouseHeight + 4, centerZ]} 
            rotation={[0, 0, -Math.PI * 0.1]}
          >
            <boxGeometry args={[warehouseWidth / 2 + 8, 0.12, warehouseDepth + 8]} />
            {roofMaterial}
          </mesh>

          {/* Roof ridge beam */}
          <mesh position={[centerX, warehouseHeight + 6.5, centerZ]}>
            <boxGeometry args={[0.4, 0.5, warehouseDepth + 6]} />
            <meshStandardMaterial color={0x3a4a5a} metalness={0.7} roughness={0.3} />
          </mesh>

          {/* Roof trusses */}
          {Array.from({ length: 10 }).map((_, i) => {
            const zPos = 3 + i * (warehouseDepth / 9);
            return (
              <group key={`truss-${i}`} position={[centerX, warehouseHeight, zPos]}>
                {/* Main truss beam */}
                <mesh position={[0, 3, 0]}>
                  <boxGeometry args={[warehouseWidth - 2, 0.25, 0.15]} />
                  <meshStandardMaterial color={0x4a5a6a} metalness={0.6} roughness={0.4} />
                </mesh>
                {/* Vertical supports */}
                {[-warehouseWidth / 3, 0, warehouseWidth / 3].map((xOff, j) => (
                  <mesh key={`support-${j}`} position={[xOff, 1.5, 0]}>
                    <boxGeometry args={[0.12, 3, 0.12]} />
                    <meshStandardMaterial color={0x4a5a6a} metalness={0.6} roughness={0.4} />
                  </mesh>
                ))}
                {/* Diagonal braces */}
                <mesh position={[-warehouseWidth / 6, 4, 0]} rotation={[0, 0, Math.PI * 0.25]}>
                  <boxGeometry args={[0.08, 5, 0.08]} />
                  <meshStandardMaterial color={0x3a4a5a} metalness={0.5} roughness={0.5} />
                </mesh>
                <mesh position={[warehouseWidth / 6, 4, 0]} rotation={[0, 0, -Math.PI * 0.25]}>
                  <boxGeometry args={[0.08, 5, 0.08]} />
                  <meshStandardMaterial color={0x3a4a5a} metalness={0.5} roughness={0.5} />
                </mesh>
              </group>
            );
          })}

          {/* Skylights */}
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh 
              key={`skylight-${i}`} 
              position={[centerX, warehouseHeight + 5.5, 8 + i * 12]} 
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[8, 5]} />
              <meshStandardMaterial 
                color={0xffffff} 
                emissive={0xffffee}
                emissiveIntensity={0.4}
                transparent
                opacity={0.35}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

export default WarehouseBuilding;
