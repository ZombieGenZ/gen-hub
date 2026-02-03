'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

interface CameraControllerProps {
  viewMode: 'free' | 'topdown' | 'firstperson';
  autoRotate: boolean;
  autoRotateSpeed: number;
  focusTarget?: { x: number; y: number; z: number; width: number; height: number; depth: number } | null;
  onFocusComplete?: () => void;
  performanceMode?: boolean;
}

const CameraController = ({
  viewMode,
  autoRotate,
  autoRotateSpeed,
  focusTarget,
  onFocusComplete,
  performanceMode = false,
}: CameraControllerProps) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const animatingRef = useRef(false);
  const keysPressed = useRef<Set<string>>(new Set());
  const moveSpeed = 0.5;
  
  // Handle WASD movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        keysPressed.current.add(e.key.toLowerCase());
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Process movement in animation frame
  useFrame(() => {
    if (keysPressed.current.size === 0 || !controlsRef.current) return;
    
    const controls = controlsRef.current;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    
    const movement = new THREE.Vector3();
    
    if (keysPressed.current.has('w')) movement.add(forward.clone().multiplyScalar(moveSpeed));
    if (keysPressed.current.has('s')) movement.add(forward.clone().multiplyScalar(-moveSpeed));
    if (keysPressed.current.has('a')) movement.add(right.clone().multiplyScalar(-moveSpeed));
    if (keysPressed.current.has('d')) movement.add(right.clone().multiplyScalar(moveSpeed));
    
    camera.position.add(movement);
    controls.target.add(movement);
    controls.update();
  });
  
  // Animate to focus target
  useEffect(() => {
    if (!focusTarget || !controlsRef.current || animatingRef.current) return;
    
    animatingRef.current = true;
    
    const targetCenter = new THREE.Vector3(
      focusTarget.x + focusTarget.width / 2,
      focusTarget.y + focusTarget.height / 2,
      focusTarget.z + focusTarget.depth / 2
    );
    
    const distance = Math.max(focusTarget.width, focusTarget.height, focusTarget.depth) * 2 + 5;
    const targetPosition = new THREE.Vector3(
      targetCenter.x + distance * 0.7,
      targetCenter.y + distance * 0.4,
      targetCenter.z + distance * 0.7
    );
    
    const startPosition = camera.position.clone();
    const startTarget = controlsRef.current.target.clone();
    const startTime = performance.now();
    const duration = 800;
    
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      
      camera.position.lerpVectors(startPosition, targetPosition, eased);
      controlsRef.current!.target.lerpVectors(startTarget, targetCenter, eased);
      controlsRef.current!.update();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        animatingRef.current = false;
        onFocusComplete?.();
      }
    };
    
    animate();
  }, [focusTarget, camera, onFocusComplete]);
  
  // Handle view mode changes
  useEffect(() => {
    if (!controlsRef.current) return;
    
    const controls = controlsRef.current;
    
    switch (viewMode) {
      case 'topdown':
        camera.position.set(20, 50, 20);
        controls.target.set(20, 0, 15);
        controls.maxPolarAngle = 0;
        controls.minPolarAngle = 0;
        break;
      case 'firstperson':
        camera.position.set(5, 1.7, 5);
        controls.target.set(15, 1.7, 15);
        controls.maxPolarAngle = Math.PI * 0.6;
        controls.minPolarAngle = Math.PI * 0.3;
        break;
      case 'free':
      default:
        controls.maxPolarAngle = Math.PI / 2 - 0.05;
        controls.minPolarAngle = 0;
        break;
    }
    
    controls.update();
  }, [viewMode, camera]);
  
  return null;
};

export default CameraController;
