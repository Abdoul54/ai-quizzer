import { api } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

export type UsageRange = "1y" | "1m" | "7d" | "1d";

export type UsageDataPoint = {
    date: string;
    totalInputTokens: number;
    totalOutputTokens: number;
};

export const usageKeys = {
    all: ["usage"] as const,
    byRange: (range: UsageRange) => ["usage", range] as const,
};

export function useUsage(range: UsageRange = "1m") {
    return useQuery({
        queryKey: usageKeys.byRange(range),
        queryFn: async () => {
            const { data } = await api.get<UsageDataPoint[]>(`/usage`, {
                params: { range },
            });
            return data;
        },
    });
}