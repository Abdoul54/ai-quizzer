import { api } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

export const usageKeys = {
    all: ["usage"] as const,
    detail: (id: string) => ["usage", id] as const,
};

export function useUsage() {
    return useQuery({
        queryKey: usageKeys.all,
        queryFn: async () => {
            const { data } = await api.get(`/usage`);
            return data;
        },
    });
}
