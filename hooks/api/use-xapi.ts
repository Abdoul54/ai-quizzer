const sendXApiEvent = async (quizId: string, body: object) => {
    await fetch(`/api/quizzes/${quizId}/xapi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
};

export const useXApi = (quizId: string, quiz: { id: string; title: string }) => {
    const launched = () =>
        sendXApiEvent(quizId, { event: "launched", quiz }).catch(console.error);

    const answered = (question: { id: string; text: string }, response: string, correct: boolean) =>
        sendXApiEvent(quizId, { event: "answered", quiz, question, response, correct }).catch(console.error);

    const completed = (score: number, total: number, durationSeconds: number) =>
        sendXApiEvent(quizId, { event: "completed", quiz, score, total, durationSeconds }).catch(console.error);

    return { launched, answered, completed };
};