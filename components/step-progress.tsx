/* eslint-disable @typescript-eslint/no-explicit-any */
import { Check, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUILanguage } from "@/providers/ui-language-provider";

export default function StepProgress({
    steps,
    currentStep = 0,
}: {
    steps: {
        preloadTitle: "step.0.pre" | "step.1.pre" | "step.2.pre";
        loadTitle: "step.0.loading" | "step.1.loading" | "step.2.loading";
        postLoadTitle: "step.0.done" | "step.1.done" | "step.2.done";
        Icon: LucideIcon;
    }[];
    currentStep?: number;
}) {
    const { t } = useUILanguage();

    const stepsWithSeparators = steps.reduce((acc, step, idx) => {
        acc.push(step);
        if (idx < steps.length - 1) {
            acc.push({ isSeparator: true, afterStepIndex: idx } as any);
        }
        return acc;
    }, [] as (typeof steps[0] | { isSeparator: true; afterStepIndex: number })[]);

    return (
        <div className="w-full max-w-full px-4 py-6">
            <div className="grid grid-cols-5 items-center gap-2">
                {stepsWithSeparators.map((step, idx) => {
                    if ("isSeparator" in step) {
                        // Separator is filled once the step before it is completed
                        const filled = (step as any).afterStepIndex < currentStep;
                        return (
                            <div key={idx} className="col-span-1 flex items-center">
                                <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-border">
                                    <div
                                        className={cn(
                                            "absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500 ease-in-out",
                                            filled ? "w-full" : "w-0"
                                        )}
                                    />
                                </div>
                            </div>
                        );
                    }

                    const stepIndex = Math.floor(idx / 2);
                    const isCompleted = stepIndex < currentStep;
                    const isActive = stepIndex === currentStep;

                    const label = isCompleted
                        ? step.postLoadTitle
                        : isActive
                            ? step.loadTitle
                            : step.preloadTitle;

                    return (
                        <div key={idx} className="col-span-1">
                            <div className="flex flex-col items-center gap-2">
                                {/* Icon circle */}
                                <div
                                    className={cn(
                                        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                                        isCompleted &&
                                        "border-primary bg-primary text-primary-foreground",
                                        isActive &&
                                        "border-primary bg-background text-primary ring-4 ring-primary/15",
                                        !isCompleted &&
                                        !isActive &&
                                        "border-border bg-background text-muted-foreground"
                                    )}
                                >
                                    {isActive && (
                                        <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
                                    )}
                                    {isCompleted ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <step.Icon className="h-4 w-4" />
                                    )}
                                </div>

                                {/* Label */}
                                <span
                                    className={cn(
                                        "text-center text-xs font-medium leading-tight transition-colors duration-300",
                                        isActive && "text-foreground",
                                        isCompleted && "text-muted-foreground",
                                        !isActive && !isCompleted && "text-muted-foreground/50"
                                    )}
                                >
                                    {t(label)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}