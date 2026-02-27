"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { createT, getDirection, type TranslationKey } from "@/lib/i18n";
import type { LanguageCode } from "@/lib/languages";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UILanguageContextValue {
    lang: LanguageCode;
    dir: "ltr" | "rtl";
    t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const UILanguageContext = createContext<UILanguageContextValue>({
    lang: "en",
    dir: "ltr",
    t: (key) => key,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface UILanguageProviderProps {
    children: React.ReactNode;
    /** Initial language determined server-side — avoids flash on first render */
    initialLang?: LanguageCode;
}

export function UILanguageProvider({ children, initialLang = "en" }: UILanguageProviderProps) {
    const { data: session } = useSession();
    const lang: LanguageCode = ((session?.user as { language?: string })?.language as LanguageCode) ?? initialLang;
    const dir = getDirection(lang) ?? "ltr";

    // Keep <html> attributes in sync on the client side
    useEffect(() => {
        const html = document.documentElement;
        html.setAttribute("lang", lang);
        html.setAttribute("dir", dir);
    }, [lang, dir]);

    const value = useMemo<UILanguageContextValue>(() => ({
        lang,
        dir,
        t: createT(lang),
    }), [lang, dir]);

    return (
        <UILanguageContext.Provider value={value}>
            {children}
        </UILanguageContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUILanguage() {
    return useContext(UILanguageContext);
}