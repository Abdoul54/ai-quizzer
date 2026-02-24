import { useMutation } from "@tanstack/react-query";

type QuestionType = "true_false" | "single_choice" | "multiple_choice";

interface Option {
    id: string;
    optionText: string;
    isCorrect: boolean;
}

interface Question {
    id: string;
    questionText: string;
    questionType: QuestionType;
    options: Option[];
}

const postImprove = async (quizId: string, body: object) => {
    const res = await fetch(`/api/quizzes/${quizId}/draft/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const useImproveQuestion = (quizId: string) => {
    const improveQuestionText = useMutation({
        mutationFn: (question: Question) =>
            postImprove(quizId, { scope: "question_text", question }),
    });

    const improveOption = useMutation({
        mutationFn: ({ questionText, option }: { questionText: string; option: Omit<Option, "id"> }) =>
            postImprove(quizId, { scope: "single_option", questionText, option }),
    });

    const changeType = useMutation({
        mutationFn: ({ question, newType }: { question: Question; newType: QuestionType }) =>
            postImprove(quizId, { scope: "change_type", question, newType }),
    });

    const addDistractor = useMutation({
        mutationFn: (question: Question) =>
            postImprove(quizId, { scope: "add_distractor", question }),
    });

    return { improveQuestionText, improveOption, changeType, addDistractor };
};