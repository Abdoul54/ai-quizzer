"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type BreadcrumbItem = {
    label: string;
    href?: string;
};

type BreadcrumbContextType = {
    items: BreadcrumbItem[];
    setBreadcrumbs: (items: BreadcrumbItem[]) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextType | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<BreadcrumbItem[]>([]);

    const setBreadcrumbs = useCallback((items: BreadcrumbItem[]) => {
        setItems(items);
    }, []);

    return (
        <BreadcrumbContext.Provider value={{ items, setBreadcrumbs }}>
            {children}
        </BreadcrumbContext.Provider>
    );
}

export function useBreadcrumbs() {
    const ctx = useContext(BreadcrumbContext);
    if (!ctx) throw new Error("useBreadcrumbs must be used within BreadcrumbProvider");
    return ctx;
}