"use client";

import React, { useEffect, useRef, useState, ReactNode } from "react";

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

const getAnimationStyles = (animation: RevealAnimation, isVisible: boolean) => {
    const baseTransition = {
        opacity: isVisible ? 1 : 0,
    };

    const animations: Record<RevealAnimation, React.CSSProperties> = {
        "fade-up": {
            ...baseTransition,
            transform: isVisible ? "translateY(0)" : "translateY(60px)",
        },
        "fade-down": {
            ...baseTransition,
            transform: isVisible ? "translateY(0)" : "translateY(-60px)",
        },
        "fade-left": {
            ...baseTransition,
            transform: isVisible ? "translateX(0)" : "translateX(60px)",
        },
        "fade-right": {
            ...baseTransition,
            transform: isVisible ? "translateX(0)" : "translateX(-60px)",
        },
        "zoom-in": {
            ...baseTransition,
            transform: isVisible ? "scale(1)" : "scale(0.8)",
        },
        "zoom-out": {
            ...baseTransition,
            transform: isVisible ? "scale(1)" : "scale(1.2)",
        },
        "flip-up": {
            ...baseTransition,
            transform: isVisible ? "rotateX(0deg)" : "rotateX(90deg)",
        },
        "flip-down": {
            ...baseTransition,
            transform: isVisible ? "rotateX(0deg)" : "rotateX(-90deg)",
        },
        "slide-up": {
            ...baseTransition,
            transform: isVisible ? "translateY(0)" : "translateY(100px)",
        },
        "slide-down": {
            ...baseTransition,
            transform: isVisible ? "translateY(0)" : "translateY(-100px)",
        },
        "slide-left": {
            ...baseTransition,
            transform: isVisible ? "translateX(0)" : "translateX(100px)",
        },
        "slide-right": {
            ...baseTransition,
            transform: isVisible ? "translateX(0)" : "translateX(-100px)",
        },
        "rotate-in": {
            ...baseTransition,
            transform: isVisible ? "rotate(0deg) scale(1)" : "rotate(-10deg) scale(0.9)",
        },
        "bounce-in": {
            ...baseTransition,
            transform: isVisible ? "scale(1) translateY(0)" : "scale(0.5) translateY(40px)",
        },
    };

    return animations[animation];
};

export function ScrollReveal({
    children,
    animation = "fade-up",
    delay = 0,
    duration = 600,
    threshold = 0.1,
    once = true,
    className = "",
    style = {},
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) {
                        observer.unobserve(element);
                    }
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            {
                threshold,
                rootMargin: "0px 0px -50px 0px",
            }
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [threshold, once]);

    const animationStyles = getAnimationStyles(animation, isVisible);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                ...animationStyles,
                transition: `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
                willChange: "opacity, transform",
                ...style,
            }}
        >
            {children}
        </div>
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

// Hook for custom scroll reveal logic
export function useScrollReveal(threshold = 0.1, once = true) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) {
                        observer.unobserve(element);
                    }
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            {
                threshold,
                rootMargin: "0px 0px -50px 0px",
            }
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [threshold, once]);

    return { ref, isVisible };
}
