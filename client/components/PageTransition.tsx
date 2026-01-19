"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PageTransitionProps {
    children: React.ReactNode;
    isLoading: boolean;
    isComplete: boolean;
}

export function PageTransition({ children, isLoading, isComplete }: PageTransitionProps) {
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
    const [showContent, setShowContent] = React.useState(false);

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        }
    }, []);

    React.useEffect(() => {
        if (isComplete) {
            const timer = setTimeout(() => {
                setShowContent(true);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isComplete]);

    if (!showContent && !isComplete) {
        return null;
    }

    return (
        <AnimatePresence mode="wait">
            {showContent && (
                <motion.div
                    key="main-content"
                    initial={prefersReducedMotion 
                        ? { opacity: 0 }
                        : { scale: 0.92, opacity: 0, y: 30 }
                    }
                    animate={prefersReducedMotion
                        ? { opacity: 1 }
                        : { 
                            scale: 1, 
                            opacity: 1, 
                            y: 0,
                            transition: {
                                duration: 1,
                                ease: [0.22, 1, 0.36, 1],
                            }
                        }
                    }
                    className="w-full"
                    style={{ transformOrigin: "center top" }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
