"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";

export default function Loading() {
    const [progress, setProgress] = useState(0);
    const [waveOffset, setWaveOffset] = useState(0);

    // Simulate loading progress
    useEffect(() => {
        const duration = 3000;
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

    // Wave animation
    useEffect(() => {
        const waveTimer = setInterval(() => {
            setWaveOffset((prev) => (prev + 1) % 360);
        }, 30);
        return () => clearInterval(waveTimer);
    }, []);

    const brandName = "GenHub";

    // Generate wave path for clip-path
    const waveClipPath = useMemo(() => {
        const baseWaveHeight = 6;
        const waveAmplitude = progress > 90 ? baseWaveHeight * ((100 - progress) / 10) : baseWaveHeight;
        const buffer = waveAmplitude + 2;
        const fillHeight = Math.max(0, 100 - progress - buffer);
        
        const points: string[] = [];
        
        for (let x = 0; x <= 100; x += 2) {
            const y = fillHeight + buffer + Math.sin((x + waveOffset) * (Math.PI / 18)) * waveAmplitude;
            points.push(`${x}% ${Math.max(0, y)}%`);
        }
        
        return `polygon(${points.join(", ")}, 100% 100%, 0% 100%)`;
    }, [progress, waveOffset]);

    return (
        <div className="fixed inset-0 z-9998 flex flex-col items-center justify-center bg-loader-bg overflow-hidden">
            {/* Main content wrapper */}
            <div className="relative flex flex-col items-center">
                {/* Text container with layered effect */}
                <div className="relative">
                    {/* Background text - Gray (unfilled) */}
                    <h1
                        className="text-4xl sm:text-5xl md:text-[6rem] lg:text-[8rem] font-black tracking-tighter select-none"
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
                        className="absolute inset-0 text-4xl sm:text-5xl md:text-[6rem] lg:text-[8rem] font-black tracking-tighter select-none"
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

                {/* Loading text */}
                <motion.div
                    className="flex items-center gap-3 self-end mt-2 md:mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
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
                transition={{ delay: 0.5, duration: 0.3 }}
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
        </div>
    );
}
