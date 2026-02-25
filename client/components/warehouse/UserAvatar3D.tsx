'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { UserPresence } from '@/hooks/useRealtimePresence';

interface UserAvatar3DProps {
  user: UserPresence;
  showLabel?: boolean;
}

// Action icons as textures (using emoji for simplicity)
const ACTION_ICONS: Record<UserPresence['currentAction'] & string, string> = {
  viewing: '👁️',
  editing: '✏️',
  moving: '📦',
  scanning: '📱',
};

export const UserAvatar3D = ({ user, showLabel = true }: UserAvatar3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);

  // Parse user color to THREE color
  const userColor = useMemo(() => new THREE.Color(user.color), [user.color]);
  const darkerColor = useMemo(() => {
    const c = new THREE.Color(user.color);
    c.multiplyScalar(0.7);
    return c;
  }, [user.color]);

  // Subtle floating animation
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle bob animation
      groupRef.current.position.y = user.position.y + Math.sin(state.clock.elapsedTime * 2 + user.id.charCodeAt(0)) * 0.05;
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={[user.position.x, user.position.y, user.position.z]}
      rotation={[0, (user.rotation * Math.PI) / 180, 0]}
    >
      {/* Body - Capsule shape */}
      <mesh ref={bodyRef} position={[0, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.4, 8, 16]} />
        <meshStandardMaterial 
          color={userColor} 
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial 
          color={userColor}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.06, 1.18, 0.14]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.06, 1.18, 0.14]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Pupils */}
      <mesh position={[-0.06, 1.18, 0.16]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#1a2e25" />
      </mesh>
      <mesh position={[0.06, 1.18, 0.16]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#1a2e25" />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.25, 0.7, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <capsuleGeometry args={[0.06, 0.3, 4, 8]} />
        <meshStandardMaterial color={darkerColor} />
      </mesh>
      <mesh position={[0.25, 0.7, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
        <capsuleGeometry args={[0.06, 0.3, 4, 8]} />
        <meshStandardMaterial color={darkerColor} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.08, 0.15, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.25, 4, 8]} />
        <meshStandardMaterial color={darkerColor} />
      </mesh>
      <mesh position={[0.08, 0.15, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.25, 4, 8]} />
        <meshStandardMaterial color={darkerColor} />
      </mesh>

      {/* Ground shadow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 16]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.2} 
        />
      </mesh>

      {/* Name label with action indicator */}
      {showLabel && (
        <Billboard position={[0, 1.6, 0]} follow={true}>
          {/* Background plate */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.2, 0.35]} />
            <meshBasicMaterial 
              color={userColor} 
              transparent 
              opacity={0.9}
            />
          </mesh>
          
          {/* User name */}
          <Text
            position={[0, 0.02, 0]}
            fontSize={0.12}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-medium.woff"
            outlineWidth={0.005}
            outlineColor="#000000"
          >
            {user.currentAction ? `${ACTION_ICONS[user.currentAction]} ` : ''}{user.name}
          </Text>
        </Billboard>
      )}

      {/* Selection indicator - ring when user has selected something */}
      {(user.selectedRackId || user.selectedBoxId) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.4, 32]} />
          <meshBasicMaterial 
            color={userColor} 
            transparent 
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Pulse effect when active */}
      <PulseEffect color={user.color} active={user.currentAction === 'scanning' || user.currentAction === 'editing'} />
    </group>
  );
};

// Pulse effect component
const PulseEffect = ({ color, active }: { color: string; active: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && active) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      meshRef.current.scale.set(scale, 1, scale);
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 - Math.sin(state.clock.elapsedTime * 3) * 0.15;
    }
  });

  if (!active) return null;

  return (
    <mesh ref={meshRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.5, 32]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={0.3}
      />
    </mesh>
  );
};

export default UserAvatar3D;
