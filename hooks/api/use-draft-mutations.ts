import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { draftKeys } from "./use-quiz";
import { toast } from "sonner";

type QuestionType = "true_false" | "single_choice" | "multiple_choice";

interface NewQuestion {
    questionText: string;
    questionType: QuestionType;
    options: { optionText: string; isCorrect: boolean }[];
}

interface QuestionWithOptions {
    id: string;
    questionText: string;
    questionType: QuestionType;
    options: { id: string; optionText: string; isCorrect: boolean }[];
}

const patchDraft = async (quizId: string, body: object) => {
    const { data } = await api.patch(`/quizzes/${quizId}/draft`, body);
    return data;
};

export const useDraftMutations = (quizId: string) => {
    const queryClient = useQueryClient();

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: draftKeys.latestByQuiz(quizId) });

    const onError = (err: Error) => toast.error(err.message ?? "Something went wrong.");

    const updateQuestion = useMutation({
        mutationFn: (vars: { questionId: string; questionText?: string; questionType?: QuestionType }) =>
            patchDraft(quizId, { operation: "update_question", ...vars }),
        onSuccess: invalidate,
        onError,
    });

    const updateOption = useMutation({
        mutationFn: (vars: { questionId: string; optionId: string; optionText?: string; isCorrect?: boolean }) =>
            patchDraft(quizId, { operation: "update_option", ...vars }),
        onSuccess: invalidate,
        onError,
    });

    const addQuestion = useMutation({
        mutationFn: (question: NewQuestion) =>
            patchDraft(quizId, { operation: "add_question", question }),
        onSuccess: invalidate,
        onError,
    });

    const deleteQuestion = useMutation({
        mutationFn: (questionId: string) =>
            patchDraft(quizId, { operation: "delete_question", questionId }),
        onSuccess: invalidate,
        onError,
    });

    const reorderQuestions = useMutation({
        mutationFn: (questionIds: string[]) =>
            patchDraft(quizId, { operation: "reorder_questions", questionIds }),

        onMutate: async (questionIds) => {
            await queryClient.cancelQueries({
                queryKey: draftKeys.latestByQuiz(quizId),
            });

            const previous = queryClient.getQueryData(
                draftKeys.latestByQuiz(quizId)
            );

            queryClient.setQueryData(
                draftKeys.latestByQuiz(quizId),
                (old: { content: { questions: QuestionWithOptions[] } }) => {
                    if (!old?.content?.questions) return old;

                    const map = new Map(
                        old.content.questions.map((q) => [q.id, q])
                    );

                    return {
                        ...old,
                        content: {
                            ...old.content,
                            questions: questionIds
                                .map(id => map.get(id))
                                .filter(Boolean),
                        },
                    };
                }
            );

            return { previous };
        },

        onError: (err: Error, _vars, ctx) => {
            if (ctx?.previous) {
                queryClient.setQueryData(
                    draftKeys.latestByQuiz(quizId),
                    ctx.previous
                );
            }
            toast.error(err.message ?? "Failed to reorder questions.");
        },
    });

    const replaceOptions = useMutation({
        mutationFn: ({ questionId, options }: { questionId: string; options: { optionText: string; isCorrect: boolean }[] }) =>
            patchDraft(quizId, { operation: "replace_options", questionId, options }),
        onSuccess: invalidate,
        onError,
    });

    const addOption = useMutation({
        mutationFn: ({ questionId, option }: { questionId: string; option: { optionText: string; isCorrect: boolean } }) =>
            patchDraft(quizId, { operation: "add_option", questionId, option }),
        onSuccess: invalidate,
        onError,
    });

    return { updateQuestion, updateOption, addQuestion, deleteQuestion, reorderQuestions, replaceOptions, addOption };
};