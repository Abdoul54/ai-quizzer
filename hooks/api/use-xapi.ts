import { useMutation } from "@tanstack/react-query";

type XApiEvent =
    | { event: "launched"; quiz: { id: string; title: string } }
    | { event: "selected"; quiz: { id: string; title: string }; question: { id: string; text: string }; response: string }
    | { event: "answered"; quiz: { id: string; title: string }; question: { id: string; text: string }; response: string; correct: boolean }
    | { event: "completed"; quiz: { id: string; title: string }; score: number; total: number; durationSeconds: number };

const sendXApiEvent = async (quizId: string, body: XApiEvent) => {
    const res = await fetch(`/api/quizzes/${quizId}/xapi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to send xAPI event");
};

export const useXApi = (quizId: string, quiz: { id: string; title: string }) => {
    const { mutate } = useMutation({
        mutationFn: (body: XApiEvent) => sendXApiEvent(quizId, body),
        onError: console.error,
    });

    const launched = () => mutate({ event: "launched", quiz });

    const selected = (question: { id: string; text: string }, response: string) =>
        mutate({ event: "selected", quiz, question, response });

    const answered = (question: { id: string; text: string }, response: string, correct: boolean) =>
        mutate({ event: "answered", quiz, question, response, correct });

    const completed = (score: number, total: number, durationSeconds: number) =>
        mutate({ event: "completed", quiz, score, total, durationSeconds });

    return { launched, selected, answered, completed };
};