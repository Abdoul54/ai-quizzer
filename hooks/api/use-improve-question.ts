import { useMutation } from "@tanstack/react-query";

type QuestionType = "true_false" | "single_choice" | "multiple_choice";

interface Question {
    id: string;
    questionText: string;
    questionType: QuestionType;
    options: { id: string; optionText: string; isCorrect: boolean }[];
}

interface FullQuestionResult {
    questionText: string;
    questionType: QuestionType;
    options: { optionText: string; isCorrect: boolean }[];
}

interface NewQuestionResult {
    questionText: string;
    questionType: QuestionType;
    options: { optionText: string; isCorrect: boolean }[];
}

interface DistractorResult {
    optionText: string;
    isCorrect: false;
}

async function enqueueAndAwait<T>(quizId: string, body: object): Promise<T> {
    const res = await fetch(`/api/quizzes/${quizId}/draft/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(await res.text());

    const { jobId } = (await res.json()) as { jobId: string };

    return new Promise<T>((resolve, reject) => {
        const es = new EventSource(`/api/quizzes/${quizId}/draft/improve/${jobId}`);

        es.onmessage = (event) => {
            es.close();
            try {
                const payload = JSON.parse(event.data) as { ok: boolean; data?: T; error?: string };
                if (payload.ok) resolve(payload.data as T);
                else reject(new Error(payload.error ?? "Improvement failed. Please try again."));
            } catch {
                reject(new Error("Unexpected response from server."));
            }
        };

        es.onerror = () => {
            es.close();
            reject(new Error("Lost connection. Please try again."));
        };
    });
}

export const useImproveQuestion = (quizId: string) => {
    const changeType = useMutation({
        mutationFn: ({ question, newType }: { question: Question; newType: QuestionType }) =>
            enqueueAndAwait<FullQuestionResult>(quizId, { scope: "change_type", question, newType }),
    });

    const regenerateQuestion = useMutation({
        mutationFn: (question: Question) =>
            enqueueAndAwait<FullQuestionResult>(quizId, { scope: "regenerate_question", question }),
    });

    const addDistractor = useMutation({
        mutationFn: (question: Question) =>
            enqueueAndAwait<DistractorResult>(quizId, { scope: "add_distractor", question }),
    });

    const addQuestion = useMutation({
        mutationFn: ({ existingQuestions, questionType }: {
            existingQuestions: { questionText: string }[];
            questionType?: QuestionType;
        }) =>
            enqueueAndAwait<NewQuestionResult>(quizId, { scope: "add_question", existingQuestions, questionType }),
    });

    const customInstruction = useMutation({
        mutationFn: ({ question, instruction }: { question: Question; instruction: string }) =>
            enqueueAndAwait<FullQuestionResult>(quizId, { scope: "custom_instruction", question, instruction }),
    });

    return { changeType, regenerateQuestion, addQuestion, addDistractor, customInstruction };
};