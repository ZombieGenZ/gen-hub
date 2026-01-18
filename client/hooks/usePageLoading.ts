"use client";

import { useState, useEffect, useCallback } from "react";

interface UsePageLoadingOptions {
    minLoadingTime?: number;
    maxLoadingTime?: number;
    onComplete?: () => void;
}

interface UsePageLoadingReturn {
    isLoading: boolean;
    progress: number;
    isComplete: boolean;
    skipLoading: () => void;
    shouldSkip: boolean;
}

const STORAGE_KEY = "genhub_skip_loading";
const SKIP_EXPIRY_DAYS = 7;
const ENABLE_SKIP_FOR_RETURNING_USERS = false;

export function usePageLoading(options: UsePageLoadingOptions = {}): UsePageLoadingReturn {
    const { 
        minLoadingTime = 3000, 
        maxLoadingTime = 6000,
        onComplete 
    } = options;

    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [shouldSkip, setShouldSkip] = useState(false);
    const [resourcesLoaded, setResourcesLoaded] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined" && ENABLE_SKIP_FOR_RETURNING_USERS) {
            const skipData = localStorage.getItem(STORAGE_KEY);
            if (skipData) {
                try {
                    const { timestamp } = JSON.parse(skipData);
                    const daysSinceLastVisit = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
                    if (daysSinceLastVisit < SKIP_EXPIRY_DAYS) {
                        setShouldSkip(true);
                    }
                } catch {
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (shouldSkip) {
            setProgress(100);
            setIsComplete(true);
            setIsLoading(false);
            return;
        }

        const startTime = Date.now();
        let animationFrame: number;
        let completed = false;

        const preloadResources = async () => {
            try {
                await document.fonts.ready;
                
                const criticalImages = document.querySelectorAll('img[data-priority="true"]');
                await Promise.all(
                    Array.from(criticalImages).map(img => {
                        if ((img as HTMLImageElement).complete) return Promise.resolve();
                        return new Promise(resolve => {
                            img.addEventListener("load", resolve);
                            img.addEventListener("error", resolve);
                        });
                    })
                );
                
                setResourcesLoaded(true);
            } catch {
                setResourcesLoaded(true);
            }
        };

        preloadResources();

        const updateProgress = () => {
            if (completed) return;

            const elapsed = Date.now() - startTime;
            const baseProgress = Math.min((elapsed / minLoadingTime) * 85, 85);
            const resourceBonus = resourcesLoaded ? 15 : 0;
            const newProgress = Math.min(baseProgress + resourceBonus, 100);

            setProgress(Math.round(newProgress));

            if (elapsed >= minLoadingTime && resourcesLoaded) {
                completed = true;
                setProgress(100);
                setTimeout(() => {
                    setIsComplete(true);
                    setTimeout(() => {
                        setIsLoading(false);
                        onComplete?.();
                        localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now() }));
                    }, 800);
                }, 200);
            } else if (elapsed >= maxLoadingTime) {
                completed = true;
                setProgress(100);
                setTimeout(() => {
                    setIsComplete(true);
                    setTimeout(() => {
                        setIsLoading(false);
                        onComplete?.();
                    }, 800);
                }, 200);
            } else {
                animationFrame = requestAnimationFrame(updateProgress);
            }
        };

        animationFrame = requestAnimationFrame(updateProgress);

        return () => {
            completed = true;
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [minLoadingTime, maxLoadingTime, onComplete, resourcesLoaded, shouldSkip]);

    const skipLoading = useCallback(() => {
        setProgress(100);
        setIsComplete(true);
        setTimeout(() => {
            setIsLoading(false);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now() }));
        }, 800);
    }, []);

    return {
        isLoading,
        progress,
        isComplete,
        skipLoading,
        shouldSkip
    };
}
