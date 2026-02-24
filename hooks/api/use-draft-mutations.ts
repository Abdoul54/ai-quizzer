import { useMutation, useQueryClient } from "@tanstack/react-query";
import { draftKeys } from "./use-quiz";

type QuestionType = "true_false" | "single_choice" | "multiple_choice";

interface Option {
    id: string;
    optionText: string;
    isCorrect: boolean;
}

interface NewQuestion {
    questionText: string;
    questionType: QuestionType;
    options: Omit<Option, "id">[];
}

const patchDraft = async (quizId: string, body: object) => {
    const res = await fetch(`/api/quizzes/${quizId}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const useDraftMutations = (quizId: string) => {
    const queryClient = useQueryClient();

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: draftKeys.latestByQuiz(quizId) });

    const updateQuestion = useMutation({
        mutationFn: (vars: { questionId: string; questionText?: string; questionType?: QuestionType }) =>
            patchDraft(quizId, { operation: "update_question", ...vars }),
        onSuccess: invalidate,
    });

    const updateOption = useMutation({
        mutationFn: (vars: { questionId: string; optionId: string; optionText?: string; isCorrect?: boolean }) =>
            patchDraft(quizId, { operation: "update_option", ...vars }),
        onSuccess: invalidate,
    });

    const addQuestion = useMutation({
        mutationFn: (question: NewQuestion) =>
            patchDraft(quizId, { operation: "add_question", question }),
        onSuccess: invalidate,
    });

    const deleteQuestion = useMutation({
        mutationFn: (questionId: string) =>
            patchDraft(quizId, { operation: "delete_question", questionId }),
        onSuccess: invalidate,
    });

    const reorderQuestions = useMutation({
        mutationFn: (questionIds: string[]) =>
            patchDraft(quizId, { operation: "reorder_questions", questionIds }),
        onSuccess: invalidate,
    });

    const replaceOptions = useMutation({
        mutationFn: ({ questionId, options }: { questionId: string; options: { optionText: string; isCorrect: boolean }[] }) =>
            patchDraft(quizId, { operation: "replace_options", questionId, options }),
        onSuccess: invalidate,
    });

    const addOption = useMutation({
        mutationFn: ({ questionId, option }: { questionId: string; option: { optionText: string; isCorrect: boolean } }) =>
            patchDraft(quizId, { operation: "add_option", questionId, option }),
        onSuccess: invalidate,
    });

    return { updateQuestion, updateOption, addQuestion, deleteQuestion, reorderQuestions, replaceOptions, addOption };
};