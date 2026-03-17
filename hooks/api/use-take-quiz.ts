import { useQuery } from "@tanstack/react-query";

// Fetched immediately on page load — no questions, just metadata for the picker.
export const useQuizMeta = (quizId: string) => {
    return useQuery({
        queryKey: ["quiz", "meta", quizId],
        queryFn: async () => {
            const res = await fetch(`/api/quizzes/${quizId}/take`);
            if (!res.ok) throw new Error(await res.text());
            return res.json() as Promise<{
                id: string;
                title: string;
                description?: string;
                defaultLanguage: string;
                availableLanguages: string[];
            }>;
        },
        enabled: !!quizId,
    });
};

// Only fires when activeLang is a non-empty string (i.e. after Start is clicked).
export const useTakeQuiz = (quizId: string, activeLang: string | null) => {
    return useQuery({
        queryKey: ["quiz", "take", quizId, activeLang],
        queryFn: async () => {
            const res = await fetch(`/api/quizzes/${quizId}/take?lang=${activeLang}`);
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        enabled: !!quizId && !!activeLang,
    });
};