"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
    isOpen: boolean;
    toggle: () => void;
    close: () => void;
    open: () => void;
    isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpenState] = useState(true); 
    const [isMobile, setIsMobile] = useState(false);

    const updateOpenState = (newState: boolean) => {
        setIsOpenState(newState);
        localStorage.setItem("sidebar:state", String(newState));
    };

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024; 
            setIsMobile(mobile);

            if (mobile) {
                setIsOpenState(false);
            } else {
                const stored = localStorage.getItem("sidebar:state");
                setIsOpenState(stored === "true");
            }
        };

        handleResize();

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const toggle = () => {
        setIsOpenState((prev) => {
            const next = !prev;
            localStorage.setItem("sidebar:state", String(next));
            return next;
        });
    };

    const close = () => updateOpenState(false);
    const open = () => updateOpenState(true);

    return (
        <SidebarContext.Provider value={{ isOpen, toggle, close, open, isMobile }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}
