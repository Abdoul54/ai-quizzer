/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuizMeta, useTakeQuiz } from "@/hooks/api/use-take-quiz";
import { useXApi } from "@/hooks/api/use-xapi";
import { useRef, useState } from "react";
import { use } from "react";
import { toast } from "sonner";

import { InfoStep } from "@/components/quiz/steps/info-step";
import { LangStep } from "@/components/quiz/steps/lang-step";
import { QuestionStep } from "@/components/quiz/steps/question-step";
import { ResultsStep } from "@/components/quiz/steps/results-step";
import { GradingResponse, UserInfo } from "@/types";



// ─── Page ─────────────────────────────────────────────────────────────────────

const QuizPage = ({ params }: { params: Promise<{ id: string }> }) => {
    const { id } = use(params);

    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [pickerLang, setPickerLang] = useState<string | null>(null);
    const [activeLang, setActiveLang] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const [current, setCurrent] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [grading, setGrading] = useState<GradingResponse | null>(null);
    const startTime = useRef<number>(0);

    const { data: meta, isLoading: metaLoading, error: metaError } = useQuizMeta(id);
    const { data: quiz, isLoading: quizLoading } = useTakeQuiz(id, activeLang);
    const xapi = useXApi(id, { id, title: meta?.title ?? "" }, userInfo ?? undefined);

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

    // ─── Step: User info ──────────────────────────────────────────────────────

    if (!userInfo) {
        return (
            <InfoStep
                title={meta.title}
                description={meta.description}
                onContinue={(info) => setUserInfo(info)}
            />
        );
    }

    // ─── Step: Language picker ────────────────────────────────────────────────

    if (!activeLang) {
        const availableLangs: string[] = meta.availableLanguages ?? [meta.defaultLanguage];
        return (
            <LangStep
                title={meta.title}
                description={meta.description}
                availableLangs={availableLangs}
                defaultLang={meta.defaultLanguage}
                pickerLang={pickerLang}
                onPickLang={setPickerLang}
                onStart={() => {
                    const lang = pickerLang ?? meta.defaultLanguage;
                    setActiveLang(lang);
                    xapi.launched();
                    startTime.current = Date.now();
                }}
            />
        );
    }

    // ─── Loading questions ────────────────────────────────────────────────────

    if (quizLoading || !quiz) return (
        <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
            Loading quiz...
        </div>
    );

    // ─── Step: Results ────────────────────────────────────────────────────────

    if (grading) {
        return (
            <ResultsStep
                quiz={quiz}
                grading={grading}
                onRetry={() => {
                    setAnswers({});
                    setCurrent(0);
                    setGrading(null);
                    setPickerLang(null);
                    setActiveLang(null);
                    setUserInfo(null);
                    startTime.current = 0;
                }}
            />
        );
    }

    // ─── Step: Quiz taking ────────────────────────────────────────────────────

    async function handleSubmit() {
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/quizzes/${id}/take`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers }),
            });
            if (!res.ok) throw new Error("Failed to submit quiz. Please try again.");
            const data: GradingResponse = await res.json();
            setGrading(data);
            const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
            xapi.completed(data.score, data.total, durationSeconds);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to submit quiz. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <QuestionStep
            quiz={quiz}
            current={current}
            answers={answers}
            submitting={submitting}
            onSelect={(questionId, optionId, questionType) => {
                xapi.selected({ id: questionId, text: quiz.questions[current].questionText }, optionId);
                setAnswers((prev) => {
                    const currentSel = prev[questionId] ?? [];
                    if (questionType === "single_choice" || questionType === "true_false") {
                        return { ...prev, [questionId]: [optionId] };
                    }
                    const next = currentSel.includes(optionId)
                        ? currentSel.filter((o: string) => o !== optionId)
                        : [...currentSel, optionId];
                    return { ...prev, [questionId]: next };
                });
            }}
            onPrev={() => setCurrent((c) => c - 1)}
            onNext={() => setCurrent((c) => c + 1)}
            onSubmit={handleSubmit}
        />
    );
};

export default QuizPage;