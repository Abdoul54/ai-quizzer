"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Item, ItemHeader } from "@/components/ui/item";
import { languages } from "@/lib/languages";
import { ArrowRight, Check } from "lucide-react";

const getLangLabel = (code: string) =>
    languages.find((l) => l.code === code)?.labels?.en ?? code.toUpperCase();

interface LangStepProps {
    title: string;
    description?: string;
    availableLangs: string[];
    defaultLang: string;
    pickerLang: string | null;
    onPickLang: (code: string) => void;
    onStart: () => void;
}

export const LangStep = ({
    title,
    description,
    availableLangs,
    defaultLang,
    pickerLang,
    onPickLang,
    onStart,
}: LangStepProps) => {
    const highlighted = pickerLang ?? defaultLang;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-background">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-10">
                <StepDot done />
                <StepLine done />
                <StepDot active />
                <StepLine />
                <StepDot />
            </div>

            {/* Header */}
            <div className="flex flex-col items-center gap-2 text-center mb-8 max-w-md">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>

            {/* Language picker */}
            <Card className="w-full max-w-sm shadow-sm">
                <CardContent className="pt-6 flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Select your language
                    </p>
                    {availableLangs.map((code) => {
                        const isSelected = highlighted === code;
                        return (
                            <Item
                                key={code}
                                variant="outline"
                                onClick={() => onPickLang(code)}
                                data-selected={isSelected}
                                className="cursor-pointer transition-colors data-[selected=true]:bg-info/10 data-[selected=true]:border-info data-[selected=true]:text-info"
                            >
                                <ItemHeader>
                                    <span className="text-sm font-medium">{getLangLabel(code)}</span>
                                    {isSelected && <Check className="size-4 shrink-0" />}
                                </ItemHeader>
                            </Item>
                        );
                    })}
                </CardContent>
            </Card>

            <Button className="mt-6 w-full max-w-sm gap-2" onClick={onStart}>
                Start Quiz
                <ArrowRight className="size-4" />
            </Button>
        </div>
    );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StepDot = ({ active, done }: { active?: boolean; done?: boolean }) => (
    <div
        className={`size-2.5 rounded-full transition-colors ${done ? "bg-primary" : active ? "bg-primary" : "bg-border"
            }`}
    />
);

const StepLine = ({ done }: { done?: boolean }) => (
    <div className={`w-10 h-px transition-colors ${done ? "bg-primary" : "bg-border"}`} />
);