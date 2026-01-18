"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { usePageLoading } from "@/hooks/usePageLoading";
import { PageLoader } from "@/components/PageLoader";
import { PageTransition } from "@/components/PageTransition";

interface LoadingContextType {
    isLoading: boolean;
    progress: number;
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

export function LoadingProvider({ 
    children, 
    minLoadingTime = 3000, 
    maxLoadingTime = 6000 
}: LoadingProviderProps) {
    const { isLoading, progress, isComplete, skipLoading, shouldSkip } = usePageLoading({
        minLoadingTime,
        maxLoadingTime,
    });
    
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    if (shouldSkip) {
        return <>{children}</>;
    }

    return (
        <LoadingContext.Provider value={{ isLoading, progress, isComplete, skipLoading }}>
            <PageLoader 
                progress={progress} 
                isComplete={isComplete} 
                onSkip={skipLoading}
            />
            <PageTransition isLoading={isLoading} isComplete={isComplete}>
                {children}
            </PageTransition>
        </LoadingContext.Provider>
    );
}
