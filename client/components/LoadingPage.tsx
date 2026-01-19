"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface LoadingPageProps {
  onLoadingComplete: () => void;
}

const LoadingPage = ({ onLoadingComplete }: LoadingPageProps) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isFullyComplete, setIsFullyComplete] = useState(false);
  const [waveOffset, setWaveOffset] = useState(0);

  // Simulate loading progress
  useEffect(() => {
    const duration = 3500;
    const interval = 50;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step + Math.random() * 0.8;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  // When progress reaches 100, wait a bit then start exit animation
  useEffect(() => {
    if (progress >= 100 && !isExiting) {
      const timer = setTimeout(() => {
        setIsExiting(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [progress, isExiting]);

  // Wave animation - stop when exiting
  useEffect(() => {
    if (isExiting) return;
    
    const waveTimer = setInterval(() => {
      setWaveOffset((prev) => (prev + 1) % 360);
    }, 30);
    return () => clearInterval(waveTimer);
  }, [isExiting]);

  // Handle exit animation complete
  const handleExitComplete = useCallback(() => {
    setIsFullyComplete(true);
    onLoadingComplete();
  }, [onLoadingComplete]);

  const brandName = "GenHub";

  // Generate wave path for clip-path - ensure full fill at 100%
  const waveClipPath = useMemo(() => {
    // At 100%, show full text
    if (progress >= 100) {
      return "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
    }
    
    // Reduce wave amplitude as progress increases
    const baseWaveHeight = 6;
    const waveAmplitude = progress > 90 ? baseWaveHeight * ((100 - progress) / 10) : baseWaveHeight;
    
    // Calculate fill height (from bottom to top, so we invert)
    const fillHeight = Math.max(0, 100 - progress);
    
    const points: string[] = [];
    
    // Create wave points along the top edge
    for (let x = 0; x <= 100; x += 2) {
      const y = fillHeight + Math.sin((x + waveOffset) * (Math.PI / 18)) * waveAmplitude;
      points.push(`${x}% ${Math.max(0, y)}%`);
    }
    
    // Complete the polygon (bottom corners)
    return `polygon(${points.join(", ")}, 100% 100%, 0% 100%)`;
  }, [progress, waveOffset]);

  const overlayVariants: Variants = {
    initial: { scaleY: 1 },
    exit: {
      scaleY: 0,
      transition: {
        duration: 0.8,
        ease: [0.76, 0, 0.24, 1] as const,
      },
    },
  };

  // Don't render anything once fully complete
  if (isFullyComplete) {
    return null;
  }

  return (
    <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
      {!isExiting ? (
        <motion.div
          key="loader"
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-loader-bg overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          {/* Main content wrapper */}
          <div className="relative flex flex-col items-center">
            {/* Text container with layered effect */}
            <div className="relative">
              {/* Background text - Gray (unfilled) */}
              <h1
                className="text-6xl sm:text-7xl md:text-[8rem] lg:text-[10rem] xl:text-[12rem] font-black tracking-tighter select-none"
                style={{
                  fontStyle: "italic",
                  color: "var(--loader-text-unfilled)",
                  WebkitTextStroke: "0",
                }}
              >
                {brandName}
              </h1>

              {/* Foreground text - White (filled based on progress) */}
              <h1
                className="absolute inset-0 text-6xl sm:text-7xl md:text-[8rem] lg:text-[10rem] xl:text-[12rem] font-black tracking-tighter select-none"
                style={{
                  fontStyle: "italic",
                  color: "var(--loader)",
                  clipPath: waveClipPath,
                  WebkitClipPath: waveClipPath,
                  transition: "clip-path 0.1s ease-out",
                }}
              >
                {brandName}
              </h1>
            </div>

            {/* Loading text - positioned below the brand name on the right */}
            <motion.div
              className="flex items-center gap-3 self-end mt-2 md:mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-sm md:text-base text-loader-muted tracking-wide">
                loading...
              </span>
              <span className="text-sm md:text-base text-loader tabular-nums font-medium">
                {Math.floor(progress)} %
              </span>
            </motion.div>
          </div>

          {/* Dot indicator at bottom center */}
          <motion.div
            className="absolute bottom-16 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-loader"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="overlay-exit"
          className="fixed inset-0 z-9999 bg-loader-bg origin-bottom"
          variants={overlayVariants}
          initial="initial"
          animate="exit"
        />
      )}
    </AnimatePresence>
  );
};

export default LoadingPage;
