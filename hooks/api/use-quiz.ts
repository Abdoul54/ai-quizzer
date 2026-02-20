import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { QuizWithRelations, Quiz, ConversationWithMessages, DraftWithQuestions } from "@/types";
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

    const createQuiz = async (
        payload: CreateQuizInput,
        callbacks: {
            onStep?: (step: number) => void;
            onSuccess?: (quizId: string) => void;
            onError?: (message: string) => void;
        }
    ) => {
        const response = await fetch("/api/quizzes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok || !response.body) {
            callbacks.onError?.("Failed to start quiz creation");
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let eventType = "";
        let eventData = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);

            for (const line of chunk.split("\n")) {
                if (line.startsWith("event: ")) {
                    eventType = line.slice(7).trim();
                } else if (line.startsWith("data: ")) {
                    eventData = line.slice(6).trim();
                } else if (line === "" && eventType && eventData) {
                    const data = JSON.parse(eventData);

                    if (eventType === "progress") callbacks.onStep?.(data.step);
                    if (eventType === "done") {
                        queryClient.invalidateQueries({ queryKey: quizKeys.all });
                        callbacks.onSuccess?.(data.quizId);
                    }
                    if (eventType === "error") callbacks.onError?.(data.message);

                    eventType = "";
                    eventData = "";
                }
            }
        }
    };

    return { createQuiz };
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

// ─── Conversation Keys ────────────────────────────────────────────────────────

export const conversationKeys = {
    byQuiz: (quizId: string) => ["conversations", "quiz", quizId] as const,
    detail: (id: string) => ["conversations", id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
// types.ts


export function useQuizConversation(quizId: string) {
    return useQuery({
        queryKey: conversationKeys.byQuiz(quizId),
        queryFn: async () => {
            const { data } = await api.get<ConversationWithMessages>(`/quizzes/${quizId}/conversation`);
            return data;
        },
        enabled: !!quizId,
    });
}

// ─── Draft Keys ───────────────────────────────────────────────────────────────

export const draftKeys = {
    latestByQuiz: (quizId: string) => ["drafts", "quiz", quizId, "latest"] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────


export function useLatestDraft(quizId: string) {
    return useQuery({
        queryKey: draftKeys.latestByQuiz(quizId),
        queryFn: async () => {
            const { data } = await api.get<DraftWithQuestions>(`/quizzes/${quizId}/draft`);
            return data;
        },
        enabled: !!quizId,
    });
}