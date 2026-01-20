"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingPage from "@/components/LoadingPage";

interface LoadingContextType {
    isLoading: boolean;
    isComplete: boolean;
    skipLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoadingContext() {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error("useLoadingContext must be used within LoadingProvider");
    }
    return context;
}

interface LoadingProviderProps {
    children: ReactNode;
    minLoadingTime?: number;
    maxLoadingTime?: number;
}

const STORAGE_KEY = "genhub_skip_loading";
const SKIP_EXPIRY_DAYS = 7;
const ENABLE_SKIP_FOR_RETURNING_USERS = false;

export function LoadingProvider({ 
    children, 
}: LoadingProviderProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isComplete, setIsComplete] = useState(false);
    const [shouldSkip, setShouldSkip] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showContent, setShowContent] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && ENABLE_SKIP_FOR_RETURNING_USERS) {
            const skipData = localStorage.getItem(STORAGE_KEY);
            if (skipData) {
                try {
                    const { timestamp } = JSON.parse(skipData);
                    const daysSinceLastVisit = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
                    if (daysSinceLastVisit < SKIP_EXPIRY_DAYS) {
                        setShouldSkip(true);
                        setIsComplete(true);
                        setIsLoading(false);
                        setShowContent(true);
                    }
                } catch {
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        }
    }, []);

    const handleLoadingComplete = useCallback(() => {
        setIsComplete(true);
        setIsLoading(false);
        // Small delay to ensure smooth transition
        requestAnimationFrame(() => {
            setShowContent(true);
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now() }));
    }, []);

    const skipLoading = useCallback(() => {
        handleLoadingComplete();
    }, [handleLoadingComplete]);

    if (!mounted) {
        return null;
    }

    if (shouldSkip) {
        return <>{children}</>;
    }

    return (
        <LoadingContext.Provider value={{ isLoading, isComplete, skipLoading }}>
            {!isComplete && (
                <LoadingPage onLoadingComplete={handleLoadingComplete} />
            )}
            <div className={`w-full transition-opacity duration-500 ${isComplete ? 'opacity-100' : 'opacity-0'}`}>
                {children}
            </div>
        </LoadingContext.Provider>
    );
}
