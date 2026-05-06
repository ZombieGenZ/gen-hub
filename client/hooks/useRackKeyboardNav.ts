'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';
interface UseRackKeyboardNavProps {
  selectedRackId: string | null;
  isDragMode: boolean;
  onUpdatePosition: (rackId: string, position: { x: number; y: number; z: number }) => void;
  getRackPosition: (rackId: string) => { x: number; y: number; z: number } | null;
}

/**
 * Hook to handle keyboard-based rack movement
 * Uses Arrow keys + Shift for faster movement
 */
export const useRackKeyboardNav = ({
  selectedRackId,
  isDragMode,
  onUpdatePosition,
  getRackPosition,
}: UseRackKeyboardNavProps) => {
  const { showToast } = useToast();
  const lastMoveTime = useRef(0);
  const moveThrottle = 50; // ms between moves

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle when drag mode is on and a rack is selected
    if (!isDragMode || !selectedRackId) return;
    
    // Only handle arrow keys
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    
    // Don't interfere with input fields
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    e.preventDefault();
    
    // Throttle movements
    const now = performance.now();
    if (now - lastMoveTime.current < moveThrottle) return;
    lastMoveTime.current = now;
    
    const currentPos = getRackPosition(selectedRackId);
    if (!currentPos) return;
    
    // Move step: 0.5m normal, 2m with Shift
    const step = e.shiftKey ? 2 : 0.5;
    
    let newX = currentPos.x;
    let newZ = currentPos.z;
    
    switch (e.key) {
      case 'ArrowUp':
        newZ -= step;
        break;
      case 'ArrowDown':
        newZ += step;
        break;
      case 'ArrowLeft':
        newX -= step;
        break;
      case 'ArrowRight':
        newX += step;
        break;
    }
    
    // Clamp to reasonable bounds (0 to 100m)
    newX = Math.max(0, Math.min(100, newX));
    newZ = Math.max(0, Math.min(100, newZ));
    
    onUpdatePosition(selectedRackId, {
      x: Math.round(newX * 2) / 2, // Snap to 0.5m grid
      y: currentPos.y,
      z: Math.round(newZ * 2) / 2,
    });
  }, [isDragMode, selectedRackId, onUpdatePosition, getRackPosition]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Show instruction toast when drag mode is enabled
  useEffect(() => {
    if (isDragMode && selectedRackId) {
      showToast('Dùng phím mũi tên ←↑↓→ để di chuyển kệ (Shift: nhanh hơn)', "info");
    }
  }, [isDragMode, selectedRackId]);
};

export default useRackKeyboardNav;
