import { useQuery } from "@tanstack/react-query";

export const useTakeQuiz = (quizId: string) => {
    return useQuery({
        queryKey: ["quiz", "take", quizId],
        queryFn: async () => {
            const res = await fetch(`/api/quizzes/${quizId}/take`);
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        enabled: !!quizId,
    });
};