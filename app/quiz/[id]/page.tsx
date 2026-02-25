/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemHeader } from "@/components/ui/item";
import { useQuizMeta, useTakeQuiz } from "@/hooks/api/use-take-quiz";
import { useXApi } from "@/hooks/api/use-xapi";
import { languages } from "@/lib/languages";
import { useRef, useState } from "react";
import { use } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeResult {
    questionId: string;
    isCorrect: boolean;
    correctOptionIds: string[];
    submittedOptionIds: string[];
}

interface GradingResponse {
    score: number;
    total: number;
    results: GradeResult[];
}

const getLangLabel = (code: string) =>
    languages.find((l) => l.code === code)?.labels?.en ?? code.toUpperCase();

// ─── Component ────────────────────────────────────────────────────────────────

const QuizPage = ({ params }: { params: Promise<{ id: string }> }) => {
    const { id } = use(params);

    // pickerLang: what the user has highlighted in the picker (null = nothing clicked yet)
    // activeLang: the confirmed language after clicking Start — drives the fetch
    // null activeLang = show picker, non-null = quiz in progress
    const [pickerLang, setPickerLang] = useState<string | null>(null);
    const [activeLang, setActiveLang] = useState<string | null>(null);

    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const [current, setCurrent] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [grading, setGrading] = useState<GradingResponse | null>(null);
    const startTime = useRef<number>(0);

    // Fetch 1 — always on, lightweight, just for the picker
    const { data: meta, isLoading: metaLoading, error: metaError } = useQuizMeta(id);

    // Fetch 2 — only fires when activeLang is set (after Start is clicked)
    const { data: quiz, isLoading: quizLoading } = useTakeQuiz(id, activeLang);

    const xapi = useXApi(id, { id, title: meta?.title ?? "" });

    // ─── Loading / Error ──────────────────────────────────────────────────────

    if (metaLoading) return (
        <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
            Loading...
        </div>
    );
    if (metaError || !meta) return (
        <div className="flex items-center justify-center h-screen text-sm text-destructive">
            Failed to load quiz.
        </div>
    );

    // ─── Language picker (activeLang not set yet) ─────────────────────────────

    if (!activeLang) {
        const availableLangs: string[] = meta.availableLanguages ?? [meta.defaultLanguage];
        // Fall back to the quiz default if the user hasn't clicked anything yet
        const highlighted = pickerLang ?? meta.defaultLanguage;

        function handleStart() {
            const lang = pickerLang ?? meta!.defaultLanguage;
            // Single state update — no batching race with a separate "started" flag
            setActiveLang(lang);
            xapi.launched();
            startTime.current = Date.now();
        }

        return (
            <div className="flex flex-col items-center justify-center h-screen gap-8 px-4">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-semibold">{meta.title}</h1>
                    {meta.description && (
                        <p className="text-muted-foreground text-sm max-w-md">{meta.description}</p>
                    )}
                </div>

                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Select your language</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {availableLangs.map((code: string) => (
                            <Item
                                key={code}
                                variant="outline"
                                onClick={() => setPickerLang(code)}
                                data-selected={highlighted === code}
                                className="data-[selected=true]:bg-info/20 data-[selected=true]:text-info data-[selected=true]:border-info cursor-pointer"
                            >
                                <ItemHeader>{getLangLabel(code)}</ItemHeader>
                            </Item>
                        ))}
                    </CardContent>
                </Card>

                <Button onClick={handleStart} className="w-full max-w-sm">
                    Start Quiz
                </Button>
            </div>
        );
    }

    // ─── Loading questions after Start ────────────────────────────────────────

    if (quizLoading || !quiz) return (
        <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
            Loading quiz...
        </div>
    );

    // ─── Quiz state ───────────────────────────────────────────────────────────

    const isRtl = quiz.language === "ar";
    const questions = quiz.questions;
    const q = questions[current];
    const total = questions.length;
    const selected = answers[q.id] ?? [];
    const hasAnswer = selected.length > 0;
    const isLast = current === total - 1;

    function handleSelect(optionId: string) {
        if (submitting || grading) return;
        xapi.selected({ id: q.id, text: q.questionText }, optionId);
        setAnswers((prev) => {
            const currentSel = prev[q.id] ?? [];
            if (q.questionType === "single_choice" || q.questionType === "true_false") {
                return { ...prev, [q.id]: [optionId] };
            }
            const next = currentSel.includes(optionId)
                ? currentSel.filter((o: string) => o !== optionId)
                : [...currentSel, optionId];
            return { ...prev, [q.id]: next };
        });
    }

    async function handleSubmit() {
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/quizzes/${id}/take`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers }),
            });
            if (!res.ok) throw new Error("Failed to submit quiz");
            const data: GradingResponse = await res.json();
            setGrading(data);
            const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
            xapi.completed(data.score, data.total, durationSeconds);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    }

    function handleRetry() {
        setAnswers({});
        setCurrent(0);
        setGrading(null);
        setPickerLang(null);
        setActiveLang(null); // back to picker
        startTime.current = 0;
    }

    // ─── Results ──────────────────────────────────────────────────────────────

    if (grading) {
        const { score, total: totalQ, results } = grading;
        const percentage = Math.round((score / totalQ) * 100);
        const message =
            score === totalQ ? "Perfect score!" :
                score >= totalQ * 0.7 ? "Well done!" :
                    "Keep practicing.";

        return (
            <div className="flex flex-col h-screen" dir={isRtl ? "rtl" : "ltr"}>
                <div className="flex justify-between items-center border-b w-full px-10 py-4">
                    <span className="text-xl font-medium">{quiz.title}</span>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-8">
                    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">Results</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-2 py-6">
                                <span className="text-6xl font-bold">{percentage}%</span>
                                <span className="text-muted-foreground text-sm">
                                    {score} out of {totalQ} correct
                                </span>
                                <span className="text-sm font-medium mt-1">{message}</span>
                            </CardContent>
                        </Card>

                        {questions.map((question: any, i: number) => {
                            const result = results.find((r) => r.questionId === question.id);
                            return (
                                <Card
                                    key={question.id}
                                    className={result?.isCorrect ? "border-success" : "border-destructive"}
                                >
                                    <CardContent className="pt-4">
                                        <p className="font-medium mb-3">{i + 1}. {question.questionText}</p>
                                        <div className="flex flex-col gap-2">
                                            {question.options.map((o: any) => {
                                                const wasSubmitted = result?.submittedOptionIds.includes(o.id);
                                                const isCorrectOption = result?.correctOptionIds.includes(o.id);
                                                const className =
                                                    isCorrectOption
                                                        ? "bg-success/20 text-success border-success"
                                                        : wasSubmitted
                                                            ? "bg-destructive/20 text-destructive border-destructive"
                                                            : "";
                                                return (
                                                    <Item key={o.id} variant="outline" className={className}>
                                                        <ItemHeader>{o.optionText}</ItemHeader>
                                                    </Item>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        <Button onClick={handleRetry} className="w-full">
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Quiz taking ──────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-screen" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex justify-between items-center border-b w-full px-10 py-4">
                <span className="text-xl font-medium">{quiz.title}</span>
                <span className="text-sm text-muted-foreground">{current + 1} / {total}</span>
            </div>

            <div className="flex flex-1 items-center justify-center px-4">
                <Card className="w-full max-w-2xl">
                    <CardContent className="pt-6">
                        <p className="font-semibold text-lg mb-1">{q.questionText}</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            {q.questionType === "true_false" && "True / False"}
                            {q.questionType === "single_choice" && "Select one answer"}
                            {q.questionType === "multiple_choice" && "Select all that apply"}
                        </p>

                        <div className="flex flex-col gap-2">
                            {q.options.map((o: any) => (
                                <Item
                                    key={o.id}
                                    variant="outline"
                                    onClick={() => handleSelect(o.id)}
                                    data-selected={selected.includes(o.id)}
                                    className="data-[selected=true]:bg-info/20 data-[selected=true]:text-info data-[selected=true]:border-info cursor-pointer"
                                >
                                    <ItemHeader>{o.optionText}</ItemHeader>
                                </Item>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-between items-center">
                            <Button
                                variant="outline"
                                onClick={() => setCurrent((c) => c - 1)}
                                disabled={current === 0}
                            >
                                Back
                            </Button>
                            {isLast ? (
                                <Button onClick={handleSubmit} disabled={!hasAnswer || submitting}>
                                    {submitting ? "Submitting..." : "Submit"}
                                </Button>
                            ) : (
                                <Button onClick={() => setCurrent((c) => c + 1)} disabled={!hasAnswer}>
                                    Next
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default QuizPage;