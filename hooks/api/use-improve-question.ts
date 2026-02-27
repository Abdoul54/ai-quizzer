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

// ─── Return types per scope ───────────────────────────────────────────────────

interface ImprovedQuestionText {
    questionText: string;
}

interface ImprovedOption {
    optionText: string;
    isCorrect: boolean;
}

interface ChangedTypeResult {
    questionText: string;
    questionType: QuestionType;
    options: { optionText: string; isCorrect: boolean }[];
}

interface AddedDistractor {
    optionText: string;
    isCorrect: false;
}

// ─── Core async helper ────────────────────────────────────────────────────────

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
                if (payload.ok) {
                    resolve(payload.data as T);
                } else {
                    reject(new Error(payload.error ?? "Improvement failed. Please try again."));
                }
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useImproveQuestion = (quizId: string) => {
    const improveQuestionText = useMutation({
        mutationFn: (question: Question) =>
            enqueueAndAwait<ImprovedQuestionText>(quizId, { scope: "question_text", question }),
    });

    const improveOption = useMutation({
        mutationFn: ({ questionText, option }: { questionText: string; option: Omit<Option, "id"> }) =>
            enqueueAndAwait<ImprovedOption>(quizId, { scope: "single_option", questionText, option }),
    });

    const changeType = useMutation({
        mutationFn: ({ question, newType }: { question: Question; newType: QuestionType }) =>
            enqueueAndAwait<ChangedTypeResult>(quizId, { scope: "change_type", question, newType }),
    });

    const addDistractor = useMutation({
        mutationFn: (question: Question) =>
            enqueueAndAwait<AddedDistractor>(quizId, { scope: "add_distractor", question }),
    });

    return { improveQuestionText, improveOption, changeType, addDistractor };
};