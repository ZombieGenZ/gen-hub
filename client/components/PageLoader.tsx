"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PageLoaderProps {
    progress: number;
    isComplete: boolean;
    onSkip?: () => void;
    showSkipAfter?: number;
}

const LOADING_TIPS = [
    "Hệ thống kho bãi thông minh giúp tiết kiệm đến 30% chi phí logistics",
    "GenHub quản lý hơn 500,000m² diện tích kho trên toàn quốc",
    "Fulfillment tự động giúp xử lý đơn hàng nhanh hơn 5 lần",
    "Hơn 1,000 doanh nghiệp đã tin tưởng sử dụng GenHub",
    "Kho mát GenHub đạt chuẩn GDP cho ngành dược phẩm",
];

export function PageLoader({ progress, isComplete, onSkip, showSkipAfter = 3000 }: PageLoaderProps) {
    const [showSkip, setShowSkip] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const currentTip = useMemo(() => {
        return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
            setIsMobile(window.innerWidth < 768);

            const handleResize = () => setIsMobile(window.innerWidth < 768);
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setShowSkip(true), showSkipAfter);
        return () => clearTimeout(timer);
    }, [showSkipAfter]);

    useEffect(() => {
        const text = "Đang tải...";
        let index = 0;
        const interval = setInterval(() => {
            setLoadingText(text.slice(0, index + 1));
            index = (index + 1) % (text.length + 1);
            if (index === 0) index = 0;
        }, 150);
        return () => clearInterval(interval);
    }, []);

    const containerVariants = {
        initial: { scale: 1, opacity: 1 },
        exit: prefersReducedMotion
            ? { opacity: 0 }
            : {
                scale: 1.2,
                opacity: 0,
                transition: {
                    duration: 0.8,
                    ease: [0.4, 0, 0.2, 1] as const
                }
            }
    };

    const logoVariants = {
        initial: { scale: 0.8, opacity: 0 },
        animate: prefersReducedMotion
            ? { scale: 1, opacity: 1 }
            : {
                scale: 1,
                opacity: 1,
                transition: {
                    duration: 0.6,
                    ease: [0.4, 0, 0.2, 1] as const
                }
            }
    };

    const pulseVariants = {
        animate: prefersReducedMotion
            ? {}
            : {
                scale: [1, 1.05, 1],
                transition: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut" as const
                }
            }
    };

    return (
        <AnimatePresence mode="wait">
            {!isComplete && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
                    variants={containerVariants}
                    initial="initial"
                    exit="exit"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Đang tải trang"
                >
                    {!isMobile && (
                        <>
                            <video
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                                poster="/assets/5791000_Coll_wavebreak_Warehouse_4096x2160.mov"
                                onError={(e) => {
                                    (e.target as HTMLVideoElement).style.display = "none";
                                }}
                            >
                                <source src="/assets/loading-video.webm" type="video/webm" />
                                <source src="/assets/loading-video.mp4" type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-primary/30" />
                        </>
                    )}

                    {isMobile && (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary/40">
                            <div className="absolute inset-0 overflow-hidden">
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute w-2 h-2 bg-primary/20 rounded-full"
                                        style={{
                                            left: `${Math.random() * 100}%`,
                                            top: `${Math.random() * 100}%`,
                                        }}
                                        animate={prefersReducedMotion ? {} : {
                                            y: [0, -30, 0],
                                            opacity: [0.2, 0.8, 0.2],
                                        }}
                                        transition={{
                                            duration: 3 + Math.random() * 2,
                                            repeat: Infinity,
                                            delay: Math.random() * 2,
                                        }}
                                    />
                                ))}
                            </div>

                            <svg className="absolute inset-0 w-full h-full opacity-10">
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
                                </pattern>
                                <rect width="100%" height="100%" fill="url(#grid)" />
                            </svg>
                        </div>
                    )}

                    <div className="relative z-10 flex flex-col items-center px-6 max-w-md w-full">
                        <motion.div
                            variants={logoVariants}
                            initial="initial"
                            animate="animate"
                            className="mb-8"
                        >
                            <motion.div
                                variants={pulseVariants}
                                animate="animate"
                                className="relative"
                            >
                                <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
                                    <img
                                        src="/assets/Genhubv2.svg"
                                        alt="GenHub Logo"
                                        className="w-16 h-16 md:w-24 md:h-24 object-contain"
                                        data-priority="true"
                                    />
                                </div>

                                {!prefersReducedMotion && (
                                    <motion.div
                                        className="absolute -inset-2 rounded-3xl border-2 border-primary/50"
                                        animate={{
                                            scale: [1, 1.1, 1],
                                            opacity: [0.5, 0, 0.5],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    />
                                )}
                            </motion.div>
                        </motion.div>

                        <motion.h1
                            className="text-2xl md:text-3xl font-bold text-white mb-2 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                        >
                            GenHub
                        </motion.h1>

                        <motion.p
                            className="text-sm md:text-base text-white/70 mb-8 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                        >
                            Giải pháp kho bãi thông minh
                        </motion.p>

                        <motion.div
                            className="w-full max-w-xs mb-4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                        >
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                                <motion.div
                                    className="h-full bg-primary rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                />
                            </div>

                            <div className="flex justify-between items-center mt-3">
                                <span className="text-white/80 text-sm font-medium min-w-[80px]">
                                    {loadingText}
                                    <motion.span
                                        animate={{ opacity: [1, 0] }}
                                        transition={{ duration: 0.5, repeat: Infinity }}
                                    >
                                        |
                                    </motion.span>
                                </span>
                                <span className="text-white font-bold text-lg">
                                    {progress}%
                                </span>
                            </div>
                        </motion.div>

                        <motion.div
                            className="mt-6 px-4 py-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 max-w-xs"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                        >
                            <p className="text-white/60 text-xs text-center leading-relaxed">
                                💡 {currentTip}
                            </p>
                        </motion.div>

                        <AnimatePresence>
                            {showSkip && onSkip && (
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    onClick={onSkip}
                                    className="mt-6 px-4 py-2 text-white/50 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent rounded-lg"
                                    aria-label="Bỏ qua loading"
                                >
                                    Nhấn để bỏ qua →
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    {!prefersReducedMotion && !isMobile && (
                        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none">
                            <motion.div
                                className="absolute bottom-0 left-1/4 w-px h-full bg-gradient-to-t from-primary/50 to-transparent"
                                animate={{ scaleY: [0, 1, 0] }}
                                transition={{ duration: 3, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div
                                className="absolute bottom-0 left-1/2 w-px h-full bg-gradient-to-t from-primary/30 to-transparent"
                                animate={{ scaleY: [0, 1, 0] }}
                                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                            />
                            <motion.div
                                className="absolute bottom-0 left-3/4 w-px h-full bg-gradient-to-t from-primary/50 to-transparent"
                                animate={{ scaleY: [0, 1, 0] }}
                                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                            />
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
