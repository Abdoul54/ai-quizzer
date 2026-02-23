import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quizKeys } from "./use-quiz";

export const useApproveQuiz = (quizId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/quizzes/${quizId}/approve`, {
                method: "POST",
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: quizKeys.detail(quizId) });
        },
    });
};