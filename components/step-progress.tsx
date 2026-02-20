/* eslint-disable @typescript-eslint/no-explicit-any */
import { Check, LucideIcon } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { cn } from "@/lib/utils";

export default function StepProgress({ steps, currentStep = 2 }: {
    steps: {
        preloadTitle?: string;
        loadTitle?: string;
        postLoadTitle?: string;
        Icon: LucideIcon
    }[];
    currentStep?: number;
}) {
    const stepsWithSeparators = steps.reduce((acc, step, idx) => {
        acc.push(step);
        if (idx < steps.length - 1) {
            acc.push({ isSeparator: true } as any);
        }
        return acc;
    }, [] as (typeof steps[0] | { isSeparator: true })[]);

    return (
        <Card className="w-full max-w-full border-none shadow-none">
            <CardContent>
                <div className={cn("grid grid-cols-5 items-center gap-4")}>
                    {stepsWithSeparators.map((step, idx) => {
                        const stepIndex = Math.floor(idx / 2); // actual step index (separators are at odd positions)

                        if ('isSeparator' in step) {
                            return (
                                <div key={idx} className="col-span-1 flex items-center">
                                    <div
                                        className={cn(
                                            "h-0.5 w-full rounded-full transition-all duration-300",
                                            stepIndex < currentStep * 2 - 1 ? "bg-primary" : "bg-border"
                                        )}
                                    />
                                </div>
                            );
                        }

                        const isCompleted = stepIndex < currentStep;
                        const isActive = stepIndex === currentStep;

                        const label = isCompleted
                            ? step.postLoadTitle
                            : isActive
                                ? step.loadTitle
                                : step.preloadTitle;

                        return (
                            <div key={idx} className="col-span-1">
                                <div className="flex flex-col items-center gap-1.5">
                                    <div
                                        className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-200 shrink-0",
                                            isCompleted && "bg-primary border-primary text-primary-foreground",
                                            isActive && "border-primary text-primary bg-background ring-4 ring-primary/10 animate-pulse",
                                            !isCompleted && !isActive && "border-border text-muted-foreground bg-background"
                                        )}
                                    >
                                        {isCompleted ? <Check className="w-4 h-4" /> : <step.Icon className="w-4 h-4" />}
                                    </div>
                                    <span
                                        className={cn(
                                            "text-xs font-medium whitespace-nowrap transition-colors",
                                            isActive && "text-foreground",
                                            isCompleted && "text-muted-foreground",
                                            !isActive && !isCompleted && "text-muted-foreground/60"
                                        )}
                                    >
                                        {label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}