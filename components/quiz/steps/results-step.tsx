/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemHeader } from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { GradingResponse } from "@/types";
import { RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import CircularProgress from "@/components/ui/circular-progress";

const OPTION_KEYS = ["A", "B", "C", "D", "E"];

interface ResultsStepProps {
    quiz: any;
    grading: GradingResponse;
    onRetry: () => void;
}

export const ResultsStep = ({ quiz, grading, onRetry }: ResultsStepProps) => {
    const isRtl = quiz.language === "ar";
    const { score, total, results } = grading;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= 70;

    const message =
        score === total ? "Perfect score! 🎉" :
            passed ? "Well done!" :
                "Keep practicing.";

    return (
        <div className="flex flex-col h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
            {/* Top bar */}
            <div className="flex items-center justify-between border-b px-6 py-3 shrink-0">
                <span className="text-sm font-medium">{quiz.title}</span>
                <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
                    <RotateCcw className="size-3.5" />
                    Try Again
                </Button>
            </div>

            <div className="flex items-center flex-1 overflow-y-auto px-4 py-8">
                <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
                    {/* Score card */}
                    <Card className={cn("border-2", passed ? "border-success/40" : "border-destructive/40")}>
                        <CardContent className="flex flex-col items-center gap-3 py-8">
                            <CircularProgress
                                value={percentage}
                                size={112}
                                strokeWidth={10}
                                showLabel
                                renderLabel={(v) => `${v}%`}
                                progressClassName={passed ? "stroke-success" : "stroke-destructive"}
                                labelClassName={cn("text-xl font-bold", passed ? "text-success" : "text-destructive")}
                            />

                            <p className="text-sm font-medium">{message}</p>
                            <p className="text-sm text-muted-foreground">
                                {score} out of {total} correct
                            </p>
                        </CardContent>
                    </Card>

                    {/* Per-question review */}
                    {/* <div className="flex flex-col gap-3">
                        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Review
                        </h2>
                        {quiz.questions.map((question: any, i: number) => {
                            const result = results.find((r) => r.questionId === question.id);
                            const isCorrect = result?.isCorrect;

                            return (
                                <Card
                                    key={question.id}
                                    className={cn(
                                        "border",
                                        isCorrect ? "border-success/40" : "border-destructive/40"
                                    )}
                                >
                                    <CardHeader className="pb-2 pt-4 px-4">
                                        <CardTitle className="text-sm font-medium flex items-start gap-2">
                                            {isCorrect
                                                ? <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                                                : <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                                            }
                                            <span>{i + 1}. {question.questionText}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-4 px-4 flex flex-col gap-1.5">
                                        {question.options.map((o: any, idx: number) => {
                                            const wasSubmitted = result?.submittedOptionIds.includes(o.id);
                                            const isCorrectOption = result?.correctOptionIds.includes(o.id);

                                            return (
                                                <Item
                                                    key={o.id}
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "gap-3 transition-none",
                                                        isCorrectOption
                                                            ? "bg-success/10 border-success/50 text-success"
                                                            : wasSubmitted
                                                                ? "bg-destructive/10 border-destructive/50 text-destructive"
                                                                : "opacity-50"
                                                    )}
                                                >
                                                    <ItemHeader>
                                                        <div className="flex items-center gap-2.5">
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "size-5 shrink-0 rounded text-xs font-mono",
                                                                    isCorrectOption
                                                                        ? "bg-success border-success text-success-foreground"
                                                                        : wasSubmitted
                                                                            ? "bg-destructive border-destructive text-destructive-foreground"
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
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div> */}

                    <Button onClick={onRetry} variant="outline" className="w-full gap-2">
                        <RotateCcw className="size-4" />
                        Try Again
                    </Button>
                </div>
            </div>
        </div>
    );
};