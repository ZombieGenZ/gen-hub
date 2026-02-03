'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

interface PerformanceMonitorProps {
  visible: boolean;
}

// Performance monitor component - renders outside Canvas
export const PerformanceOverlay = ({ fps, visible }: { fps: number; visible: boolean }) => {
  if (!visible) return null;
  
  const fpsColor = fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400';
  
  return (
    <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">FPS:</span>
        <span className={`font-bold ${fpsColor}`}>{fps}</span>
      </div>
    </div>
  );
};

// FPS counter hook - must be used inside Canvas
export const useFPSCounter = () => {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const [fps, setFps] = useState(60);
  
  useFrame(() => {
    frameCount.current++;
    const currentTime = performance.now();
    
    if (currentTime - lastTime.current >= 1000) {
      setFps(Math.round(frameCount.current * 1000 / (currentTime - lastTime.current)));
      frameCount.current = 0;
      lastTime.current = currentTime;
    }
  });
  
  return fps;
};

// Internal component to track FPS inside Canvas
export const FPSTracker = ({ onFPSUpdate }: { onFPSUpdate: (fps: number) => void }) => {
  const fps = useFPSCounter();
  
  useEffect(() => {
    onFPSUpdate(fps);
  }, [fps, onFPSUpdate]);
  
  return null;
};

export default PerformanceOverlay;
