"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  PanInfo,
} from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
  onDismiss: (id: string) => void;
  index?: number;
  total?: number;
}

// Animated Icons Components (restored from original toast implementation)
const SuccessIcon = () => (
  <svg className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
      d="M20 6L9 17l-5-5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ErrorIcon = () => (
  <svg className="h-6 w-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
      d="M18 6L6 18M6 6l12 12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WarningIcon = () => (
  <svg className="h-6 w-6 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <motion.circle
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
      cx="12" cy="12" r="10"
      strokeLinecap="round"
    />
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.4 }}
      d="M12 16v-4m0-4h.01"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const toastIcons = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

const toastGradients = {
  success: "from-green-500/20 via-emerald-500/20 to-green-500/20 border-green-500/30",
  error: "from-red-500/20 via-rose-500/20 to-red-500/20 border-red-500/30",
  warning: "from-yellow-500/20 via-amber-500/20 to-yellow-500/20 border-yellow-500/30",
  info: "from-blue-500/20 via-cyan-500/20 to-blue-500/20 border-blue-500/30",
};

const progressBarColors = {
  success: "bg-green-500",
  error: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-blue-500",
};

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration = 5000,
  action,
  onDismiss,
  index = 0,
  total = 1,
}) => {
  const Icon = toastIcons[type];
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  // eslint-disable-next-line react-hooks/purity
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(duration);

  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), { stiffness: 300, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), { stiffness: 300, damping: 20 });

  // Progress Timer
  useEffect(() => {
    let animationFrame: number;

    const updateProgress = () => {
      if (isPaused) {
        startTimeRef.current = Date.now();
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.max(0, 100 - (elapsed / remainingTimeRef.current) * 100);

      setProgress(newProgress);

      if (newProgress > 0) {
        animationFrame = requestAnimationFrame(updateProgress);
      } else {
        onDismiss(id);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(animationFrame);
  }, [isPaused, duration, id, onDismiss]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsPaused(false);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onDismiss(id);
    }
  };

  // Stacking Logic
  const isFront = index === total - 1;
  const scale = 1 - (total - 1 - index) * 0.05;
  const yOffset = (total - 1 - index) * -15;
  const opacity = 1 - (total - 1 - index) * 0.2;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9, rotateX: 20 }}
      animate={{
        opacity: opacity,
        y: isFront ? 0 : yOffset,
        scale: scale,
        rotateX: 0,
        zIndex: index
      }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{ rotateX: isFront ? rotateX : 0, rotateY: isFront ? rotateY : 0, perspective: 1000 }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border bg-white/80 p-4 shadow-2xl backdrop-blur-xl dark:bg-slate-900/80",
        toastGradients[type],
        !isFront && "pointer-events-none"
      )}
    >
      {/* Holographic Gradient Border Effect */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Type Icon */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70">
        <Icon />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-900 dark:text-white capitalize">{type}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{message}</p>
      </div>

      {/* Action Button */}
      {action && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
            onDismiss(id);
          }}
          className="shrink-0 rounded-lg bg-white/30 px-2.5 py-1 text-xs font-semibold text-slate-800 transition-colors hover:bg-white/50 dark:bg-slate-700/50 dark:text-white dark:hover:bg-slate-600/50"
        >
          {action.label}
        </button>
      )}

      {/* Close Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
        className="btn-raw-icon group relative shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label="Dong thong bao"
        title="Dong thong bao"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Linear timeout progress */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-slate-200/70 dark:bg-slate-700/70">
        <div
          className={cn("h-full transition-all duration-100 ease-linear", progressBarColors[type])}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Confetti / Flash Effects (Conditional) */}
      {type === 'success' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 -z-20 bg-green-500/20 blur-2xl"
        />
      )}
      {type === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 0.3, repeat: 2 }}
          className="absolute inset-0 -z-20 bg-red-500/20"
        />
      )}
    </motion.div>
  );
};

