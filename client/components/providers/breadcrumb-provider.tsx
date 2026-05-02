"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface BreadcrumbContextType {
    label: string | null;
    setLabel: (label: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
    label: null,
    setLabel: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
    const [label, setLabel] = useState<string | null>(null);

    return (
        <BreadcrumbContext.Provider value={{ label, setLabel }}>
            {children}
        </BreadcrumbContext.Provider>
    );
}

export function useBreadcrumb() {
    return useContext(BreadcrumbContext);
}

/**
 * Dùng trong page để set tên hiển thị trên breadcrumb.
 * Tự động clear khi component unmount.
 *
 * @example
 * useBreadcrumbLabel(warehouse?.name)
 */
export function useBreadcrumbLabel(label: string | null | undefined) {
    const { setLabel } = useBreadcrumb();

    useEffect(() => {
        if (label) setLabel(label);
        return () => setLabel(null);
    }, [label, setLabel]);
}
