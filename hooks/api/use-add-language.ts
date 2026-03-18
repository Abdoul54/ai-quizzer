import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quizKeys } from "./use-quiz";
import { toast } from "sonner";

export const useAddLanguage = (quizId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (language: string) => {
            const res = await fetch(`/api/quizzes/${quizId}/translate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language }),
            });
            if (!res.ok) throw new Error((await res.json()).error ?? "Failed to start translation.");

            // Pass language so the SSE route can do a fallback read from Redis
            // if the worker finishes before this EventSource connection is established.
            const statusUrl = `/api/quizzes/${quizId}/translate/status?language=${encodeURIComponent(language)}`;

            await new Promise<void>((resolve, reject) => {
                const es = new EventSource(statusUrl);

                es.onmessage = (event) => {
                    const data = JSON.parse(event.data) as {
                        success: boolean;
                        language?: string;
                        error?: string;
                    };
                    es.close();
                    if (data.success) resolve();
                    else reject(new Error(data.error ?? "Translation failed."));
                };

                es.onerror = () => {
                    es.close();
                    reject(new Error("Lost connection. Please try again."));
                };
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: quizKeys.detail(quizId) });
            queryClient.invalidateQueries({ queryKey: quizKeys.all });
            toast.success("Language added successfully.");
        },
        onError: (err: Error) => toast.error(err.message),
    });
};