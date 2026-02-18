import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { QuizWithRelations, Quiz } from "@/types";
import type { CreateQuizInput, UpdateQuizInput } from "@/lib/validators";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const quizKeys = {
    all: ["quizzes"] as const,
    detail: (id: string) => ["quizzes", id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useQuizzes() {
    return useQuery({
        queryKey: quizKeys.all,
        queryFn: async () => {
            const { data } = await api.get<QuizWithRelations[]>("/quizzes");
            return data;
        },
    });
}

export function useQuiz(id: string) {
    return useQuery({
        queryKey: quizKeys.detail(id),
        queryFn: async () => {
            const { data } = await api.get<QuizWithRelations>(`/quizzes/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

export function useCreateQuiz() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateQuizInput) => {
            const { data } = await api.post<Quiz>("/quizzes", payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: quizKeys.all });
        },
    });
}

export function useUpdateQuiz(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: UpdateQuizInput) => {
            const { data } = await api.patch<Quiz>(`/quizzes/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: quizKeys.all });
            queryClient.invalidateQueries({ queryKey: quizKeys.detail(id) });
        },
    });
}

export function useDeleteQuiz() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/quizzes/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: quizKeys.all });
            queryClient.removeQueries({ queryKey: quizKeys.detail(id) });
        },
    });
}