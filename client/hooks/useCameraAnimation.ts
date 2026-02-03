'use client';

import { useRef, useCallback } from 'react';
import * as THREE from 'three';

interface CameraAnimationState {
  isAnimating: boolean;
  previousPosition: THREE.Vector3 | null;
  previousTarget: THREE.Vector3 | null;
}

export const useCameraAnimation = () => {
  const stateRef = useRef<CameraAnimationState>({
    isAnimating: false,
    previousPosition: null,
    previousTarget: null,
  });
  
  const animateCamera = useCallback((
    camera: THREE.PerspectiveCamera,
    controls: any,
    targetPosition: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    duration: number = 800,
    onComplete?: () => void
  ) => {
    if (stateRef.current.isAnimating) return;
    
    stateRef.current.isAnimating = true;
    stateRef.current.previousPosition = camera.position.clone();
    stateRef.current.previousTarget = controls?.target?.clone() || new THREE.Vector3();
    
    const startPosition = camera.position.clone();
    const startTarget = controls?.target?.clone() || new THREE.Vector3();
    const startTime = performance.now();
    
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      
      camera.position.lerpVectors(startPosition, targetPosition, eased);
      
      if (controls?.target) {
        controls.target.lerpVectors(startTarget, targetLookAt, eased);
        controls.update();
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        stateRef.current.isAnimating = false;
        onComplete?.();
      }
    };
    
    animate();
  }, []);
  
  const animateCameraBack = useCallback((
    camera: THREE.PerspectiveCamera,
    controls: any,
    duration: number = 800,
    onComplete?: () => void
  ) => {
    if (!stateRef.current.previousPosition || !stateRef.current.previousTarget) {
      onComplete?.();
      return;
    }
    
    animateCamera(
      camera, 
      controls, 
      stateRef.current.previousPosition, 
      stateRef.current.previousTarget, 
      duration,
      () => {
        stateRef.current.previousPosition = null;
        stateRef.current.previousTarget = null;
        onComplete?.();
      }
    );
  }, [animateCamera]);
  
  const calculateOptimalViewPosition = useCallback((
    rackPosition: { x: number; y: number; z: number },
    rackWidth: number,
    rackHeight: number,
    rackDepth: number
  ): { position: THREE.Vector3; lookAt: THREE.Vector3 } => {
    const rackCenter = new THREE.Vector3(
      rackPosition.x + rackWidth / 2,
      rackPosition.y + rackHeight / 2,
      rackPosition.z + rackDepth / 2
    );
    
    // Position camera at 30-45 degree angle, 5-8m away from rack
    const distance = Math.max(rackWidth, rackHeight, rackDepth) * 2 + 5;
    const angle = Math.PI / 6; // 30 degrees
    
    const cameraPosition = new THREE.Vector3(
      rackCenter.x + distance * Math.cos(angle),
      rackCenter.y + distance * 0.5,
      rackCenter.z + distance * Math.sin(angle)
    );
    
    return { position: cameraPosition, lookAt: rackCenter };
  }, []);
  
  return {
    animateCamera,
    animateCameraBack,
    calculateOptimalViewPosition,
    isAnimating: () => stateRef.current.isAnimating,
  };
};
