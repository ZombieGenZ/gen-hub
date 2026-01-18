"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface RouteTransitionProps {
    children: React.ReactNode;
}

export function RouteTransition({ children }: RouteTransitionProps) {
    const pathname = usePathname();
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        }
    }, []);

    const variants = {
        initial: prefersReducedMotion 
            ? { opacity: 0 }
            : { 
                scale: 0.95, 
                opacity: 0,
            },
        animate: prefersReducedMotion
            ? { opacity: 1 }
            : {
                scale: 1,
                opacity: 1,
                transition: {
                    duration: 0.5,
                    ease: [0.4, 0, 0.2, 1],
                }
            },
        exit: prefersReducedMotion
            ? { opacity: 0 }
            : {
                scale: 1.05,
                opacity: 0,
                transition: {
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }
            }
    };

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={pathname}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
                style={{ transformOrigin: "center center" }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
