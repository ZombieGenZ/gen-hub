"use client";

import React, { ReactNode } from "react";
import { motion, type Variant } from "framer-motion";

export type RevealAnimation =
    | "fade-up"
    | "fade-down"
    | "fade-left"
    | "fade-right"
    | "zoom-in"
    | "zoom-out"
    | "flip-up"
    | "flip-down"
    | "slide-up"
    | "slide-down"
    | "slide-left"
    | "slide-right"
    | "rotate-in"
    | "bounce-in";

interface ScrollRevealProps {
    children: ReactNode;
    animation?: RevealAnimation;
    delay?: number;
    duration?: number;
    threshold?: number;
    once?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const hiddenVariants: Record<RevealAnimation, Variant> = {
    "fade-up": { opacity: 0, y: 40 },
    "fade-down": { opacity: 0, y: -40 },
    "fade-left": { opacity: 0, x: 40 },
    "fade-right": { opacity: 0, x: -40 },
    "zoom-in": { opacity: 0, scale: 0.9 },
    "zoom-out": { opacity: 0, scale: 1.1 },
    "flip-up": { opacity: 0, rotateX: 45 },
    "flip-down": { opacity: 0, rotateX: -45 },
    "slide-up": { opacity: 0, y: 60 },
    "slide-down": { opacity: 0, y: -60 },
    "slide-left": { opacity: 0, x: 60 },
    "slide-right": { opacity: 0, x: -60 },
    "rotate-in": { opacity: 0, rotate: -8, scale: 0.95 },
    "bounce-in": { opacity: 0, scale: 0.6, y: 30 },
};

const visibleVariants: Record<RevealAnimation, Variant> = {
    "fade-up": { opacity: 1, y: 0 },
    "fade-down": { opacity: 1, y: 0 },
    "fade-left": { opacity: 1, x: 0 },
    "fade-right": { opacity: 1, x: 0 },
    "zoom-in": { opacity: 1, scale: 1 },
    "zoom-out": { opacity: 1, scale: 1 },
    "flip-up": { opacity: 1, rotateX: 0 },
    "flip-down": { opacity: 1, rotateX: 0 },
    "slide-up": { opacity: 1, y: 0 },
    "slide-down": { opacity: 1, y: 0 },
    "slide-left": { opacity: 1, x: 0 },
    "slide-right": { opacity: 1, x: 0 },
    "rotate-in": { opacity: 1, rotate: 0, scale: 1 },
    "bounce-in": { opacity: 1, scale: 1, y: 0 },
};

export function ScrollReveal({
    children,
    animation = "fade-up",
    delay = 0,
    duration = 600,
    threshold = 0.15,
    once = true,
    className = "",
    style = {},
}: ScrollRevealProps) {
    const durationInSeconds = duration / 1000;
    const delayInSeconds = delay / 1000;

    return (
        <motion.div
            className={className}
            style={{ willChange: "opacity, transform", ...style }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once, amount: threshold }}
            variants={{
                hidden: hiddenVariants[animation],
                visible: {
                    ...visibleVariants[animation],
                    transition: {
                        duration: durationInSeconds,
                        delay: delayInSeconds,
                        ease: [0.25, 0.1, 0.25, 1],
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

// Wrapper for staggered children animations
interface ScrollRevealGroupProps {
    children: ReactNode[];
    animation?: RevealAnimation;
    staggerDelay?: number;
    duration?: number;
    threshold?: number;
    once?: boolean;
    className?: string;
    childClassName?: string;
}

export function ScrollRevealGroup({
    children,
    animation = "fade-up",
    staggerDelay = 100,
    duration = 600,
    threshold = 0.1,
    once = true,
    className = "",
    childClassName = "",
}: ScrollRevealGroupProps) {
    return (
        <div className={className}>
            {React.Children.map(children, (child, index) => (
                <ScrollReveal
                    animation={animation}
                    delay={index * staggerDelay}
                    duration={duration}
                    threshold={threshold}
                    once={once}
                    className={childClassName}
                >
                    {child}
                </ScrollReveal>
            ))}
        </div>
    );
}

// Hook for custom scroll reveal logic - using Framer Motion's useInView
export { useInView as useScrollInView } from "framer-motion";
