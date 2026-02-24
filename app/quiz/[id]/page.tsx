/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemHeader } from "@/components/ui/item";
import { useTakeQuiz } from "@/hooks/api/use-take-quiz";
import { useXApi } from "@/hooks/api/use-xapi";
import { useEffect, useRef, useState } from "react";
import { use } from "react";

const QuizPage = ({ params }: { params: Promise<{ id: string }> }) => {
    const { id } = use(params);
    const { data: quiz, isLoading, error } = useTakeQuiz(id);
    const startTime = useRef<number>(0);

    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string[]>>({});
    const [submitted, setSubmitted] = useState(false);

    const xapi = useXApi(id, { id, title: quiz?.title ?? "" });

    // launched
    useEffect(() => {
        if (quiz) {
            xapi.launched();
            startTime.current = Date.now();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quiz?.id]);

    if (isLoading) return <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">Loading quiz...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-sm text-destructive">Failed to load quiz.</div>;
    if (!quiz) return null;

    const questions = quiz.questions;
    const q = questions[current];
    const total = questions.length;
    const selected = answers[current] ?? [];
    const hasAnswer = selected.length > 0;
    const isLast = current === total - 1;

    function handleSelect(optionText: string) {
        if (submitted) return;
        const correct = q.options.find((o: any) => o.optionText === optionText)?.isCorrect ?? false;

        // answered statement — fire and forget
        xapi.selected(
            { id: q.id, text: q.questionText },
            optionText,
        );

        setAnswers((prev) => {
            const current_sel = prev[current] ?? [];
            if (q.questionType === "single_choice" || q.questionType === "true_false") {
                return { ...prev, [current]: [optionText] };
            }
            const next = current_sel.includes(optionText)
                ? current_sel.filter((o: string) => o !== optionText)
                : [...current_sel, optionText];
            return { ...prev, [current]: next };
        });
    }


    function calcScore() {
        return questions.reduce((acc: number, q: any, i: number) => {
            const sel = answers[i] ?? [];
            const correct = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.optionText);
            const isCorrect = correct.length === sel.length && correct.every((c: string) => sel.includes(c));
            return acc + (isCorrect ? 1 : 0);
        }, 0);
    }

    if (submitted) {
        const score = calcScore();
        const percentage = Math.round((score / total) * 100);
        const message = score === total ? "Perfect score!" : score >= total * 0.7 ? "Well done!" : "Keep practicing.";

        return (
            <div className="flex flex-col items-center h-screen">
                <div className="flex justify-between items-center border w-full px-10 py-4">
                    <span className="text-xl text-foreground">{quiz.title}</span>
                </div>

                <div className="flex w-full h-full items-center justify-center px-4">
                    <Card className="w-full max-w-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl">Results</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-6">
                            <div className="flex flex-col items-center gap-2 py-6">
                                <span className="text-6xl font-bold">{percentage}%</span>
                                <span className="text-muted-foreground text-sm">{score} out of {total} correct</span>
                                <span className="text-sm font-medium mt-1">{message}</span>
                            </div>

                            <Button
                                onClick={() => { setAnswers({}); setCurrent(0); setSubmitted(false); }}
                            >
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center h-screen">
            <div className="flex justify-between items-center border w-full px-10 py-4">
                <span className="text-xl text-foreground">{quiz.title}</span>
                <span className="text-lg font-semibold text-foreground">
                    {current + 1} / {total}
                </span>
            </div>
            <div className="flex w-full h-full items-center justify-center">
                <Card className="w-full max-w-6xl">
                    <CardHeader>
                        <CardTitle className="mb-1">{q.questionText}</CardTitle>
                        <CardDescription>
                            {q.questionType === "true_false" && "True / False"}
                            {q.questionType === "single_choice" && "Single choice"}
                            {q.questionType === "multiple_choice" && "Multiple choice"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {q.options.map((o: any) => {
                            const isSelected = selected.includes(o.optionText);
                            return (
                                <Item
                                    key={o.optionText}
                                    variant="outline"
                                    onClick={() => handleSelect(o.optionText)}
                                    data-selected={isSelected}
                                    className="data-[selected=true]:bg-primary/20 data-[selected=true]:text-primary data-[selected=true]:border-primary cursor-pointer"
                                >
                                    <ItemHeader>{o.optionText}</ItemHeader>
                                </Item>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-between items-center border w-full px-10 py-4">
                <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Previous</Button>
                {isLast ? (
                    <Button disabled={!hasAnswer}
                        onClick={() => {
                            const score = calcScore();
                            const duration = Math.round((Date.now() - startTime.current) / 1000);
                            xapi.completed(score, total, duration);
                            setSubmitted(true);
                        }}
                    >
                        Submit
                    </Button>
                ) : (
                    <Button disabled={!hasAnswer} onClick={() => setCurrent((c) => c + 1)}>
                        Next
                    </Button>
                )}
            </div>
        </div>
    );
};

export default QuizPage;