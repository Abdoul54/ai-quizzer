import { useMemo } from "react";

export function useOS() {
    return useMemo(() => {
        if (typeof window === "undefined") return "unknown";

        const platform = navigator.platform.toLowerCase();

        if (platform.includes("mac")) return "macos";
        if (platform.includes("win")) return "windows";

        return "other";
    }, []);
}