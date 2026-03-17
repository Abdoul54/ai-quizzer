"use client";

import { SidebarInset } from "@/components/ui/sidebar";
import { useUILanguage } from "@/providers/ui-language-provider";
import React from "react";

/**
 * Wraps SidebarInset and applies the correct `dir` attribute from the active
 * UI language. This is a client component so it can react to session changes
 * without making the parent layout a client component.
 */
export function DirectionAwareSidebarInset({ children }: { children: React.ReactNode }) {
    const { dir } = useUILanguage();
    return <SidebarInset dir={dir}>{children}</SidebarInset>;
}