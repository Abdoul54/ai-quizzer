/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Item, ItemHeader } from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTION_KEYS = ["A", "B", "C", "D", "E"];

interface QuestionStepProps {
    quiz: any;
    current: number;
    answers: Record<string, string[]>;
    submitting: boolean;
    onSelect: (questionId: string, optionId: string, questionType: string) => void;
    onPrev: () => void;
    onNext: () => void;
    onSubmit: () => void;
}

export const QuestionStep = ({
    quiz,
    current,
    answers,
    submitting,
    onSelect,
    onPrev,
    onNext,
    onSubmit,
}: QuestionStepProps) => {
    const isRtl = quiz.language === "ar";
    const questions = quiz.questions;
    const q = questions[current];
    const total = questions.length;
    const selected = answers[q.id] ?? [];
    const hasAnswer = selected.length > 0;
    const isLast = current === total - 1;
    const progress = ((current + 1) / total) * 100;

    // Keyboard shortcut: 1–5 to select options
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (submitting) return;
            const idx = parseInt(e.key) - 1;
            if (idx >= 0 && idx < q.options.length) {
                onSelect(q.id, q.options[idx].id, q.questionType);
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [q, submitting, onSelect]);

    return (
        <div className="flex flex-col h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between border-b px-6 py-3 shrink-0">
                <span className="text-sm font-medium truncate max-w-xs">{quiz.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {current + 1} / {total}
                </span>
            </div>

            {/* ── Progress bar ── */}
            <div className="h-1 bg-border shrink-0">
                <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* ── Content ── */}
            <div className="flex flex-1 items-center justify-center px-4 overflow-y-auto py-8">
                <div className="w-full max-w-2xl flex flex-col gap-6">
                    {/* Question */}
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Question {current + 1}
                        </span>
                        <p className="text-lg font-semibold leading-snug">{q.questionText}</p>
                        <p className="text-xs text-muted-foreground">
                            {q.questionType === "true_false" && "True / False"}
                            {q.questionType === "single_choice" && "Select one answer"}
                            {q.questionType === "multiple_choice" && "Select all that apply"}
                        </p>
                    </div>

                    {/* Options */}
                    <div className="flex flex-col gap-2">
                        {q.options.map((o: any, idx: number) => {
                            const isSelected = selected.includes(o.id);
                            return (
                                <Item
                                    key={o.id}
                                    variant="outline"
                                    onClick={() => !submitting && onSelect(q.id, o.id, q.questionType)}
                                    data-selected={isSelected}
                                    className={cn(
                                        "cursor-pointer transition-colors gap-3",
                                        "data-[selected=true]:bg-info/10 data-[selected=true]:border-info data-[selected=true]:text-info"
                                    )}
                                >
                                    <ItemHeader>
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "size-6 shrink-0 rounded text-xs font-mono transition-colors",
                                                    isSelected
                                                        ? "bg-info border-info text-info-foreground"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                {OPTION_KEYS[idx]}
                                            </Badge>
                                            <span className="text-sm">{o.optionText}</span>
                                        </div>
                                    </ItemHeader>
                                </Item>
                            );
                        })}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center pt-2">
                        <Button
                            variant="outline"
                            onClick={onPrev}
                            disabled={current === 0}
                            className="gap-2"
                        >
                            <ArrowLeft className="size-4" />
                            Back
                        </Button>

                        {isLast ? (
                            <Button
                                onClick={onSubmit}
                                disabled={!hasAnswer || submitting}
                                className="gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        Submit
                                        <Send className="size-4" />
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button onClick={onNext} disabled={!hasAnswer} className="gap-2">
                                Next
                                <ArrowRight className="size-4" />
                            </Button>
                        )}
                    </div>

                    {/* Keyboard hint */}
                    <p className="text-center text-xs text-muted-foreground/60">
                        Press <kbd className="font-mono">1</kbd>–<kbd className="font-mono">{q.options.length}</kbd> to select
                    </p>
                </div>
            </div>
        </div>
    );
};