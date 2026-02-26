import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { QuizWithRelations, Quiz, ConversationWithMessages, DraftWithQuestions } from "@/types";
import type { CreateQuizInput, UpdateQuizInput } from "@/lib/validators";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const quizKeys = {
    all: ["quizzes"] as const,
    detail: (id: string) => ["quizzes", id] as const,
};

export const conversationKeys = {
    byQuiz: (quizId: string) => ["conversations", "quiz", quizId] as const,
    detail: (id: string) => ["conversations", id] as const,
};

export const draftKeys = {
    latestByQuiz: (quizId: string) => ["drafts", "quiz", quizId, "latest"] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type QuizStatus =
    | "queued"
    | "architecting"
    | "building"
    | "draft"
    | "published"
    | "archived"
    | "failed";

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useQuizzes() {
    return useQuery({
        queryKey: quizKeys.all,
        queryFn: async () => {
            const { data } = await api.get<QuizWithRelations[]>("/quizzes");
            return data;
        },
        // No refetchInterval — SSE updates the cache directly during generation
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
        // POST returns { quizId } immediately — job is queued in BullMQ
        let quizId: string;
        try {
            const { data } = await api.post<{ quizId: string }>("/quizzes", payload);
            quizId = data.quizId;
        } catch {
            callbacks.onError?.("Failed to start quiz creation");
            return;
        }

        // One fetch to pull the new quiz into the list cache (status: "queued")
        // It will appear in the list immediately before generation completes
        queryClient.invalidateQueries({ queryKey: quizKeys.all });

        // Step 0 — saved, job queued
        callbacks.onStep?.(0);

        // Update just this quiz's status in the existing cache — no network request
        const updateStatus = (status: QuizStatus) => {
            queryClient.setQueryData(
                quizKeys.all,
                (old: QuizWithRelations[] | undefined) => {
                    if (!old) return old;
                    return old.map((q) => q.id === quizId ? { ...q, status } : q);
                }
            );
        };

        // Open SSE — worker publishes to Redis, server pushes here instantly
        const es = new EventSource(`/api/quizzes/${quizId}/status`);
        let completed = false;

        es.onmessage = (event) => {
            const { status, step, errorMessage } = JSON.parse(event.data) as {
                status: QuizStatus;
                step: number;
                errorMessage: string | null;
            };

            // Never go backwards — handles skipped steps on fast jobs
            if (step >= 0) callbacks.onStep?.(step);

            // Update the badge in the list instantly — zero network calls
            updateStatus(status);

            if (status === "draft" || status === "published") {
                completed = true;
                es.close();
                // One final fetch to hydrate the full quiz data (questions, options, etc.)
                queryClient.invalidateQueries({ queryKey: quizKeys.all });
                callbacks.onSuccess?.(quizId);
                return;
            }

            if (status === "failed") {
                completed = true;
                es.close();
                callbacks.onError?.(errorMessage ?? "Quiz generation failed. Please try again.");
            }
        };

        es.onerror = () => {
            es.close();
            // Guard against onerror firing after clean server-side close on success
            if (!completed) {
                callbacks.onError?.("Lost connection to server. Please refresh and try again.");
            }
        };
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