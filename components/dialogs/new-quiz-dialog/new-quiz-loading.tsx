"use client";

import StepProgress from "@/components/step-progress";
import { Database, Brain, Hammer, LucideIcon } from "lucide-react";
import { useUILanguage } from "@/providers/ui-language-provider";

export const steps: {
    preloadTitle: "step.0.pre" | "step.1.pre" | "step.2.pre";
    loadTitle: "step.0.loading" | "step.1.loading" | "step.2.loading";
    postLoadTitle: "step.0.done" | "step.1.done" | "step.2.done";
    Icon: LucideIcon;
}[] = [
        {
            preloadTitle: "step.0.pre",
            loadTitle: "step.0.loading",
            postLoadTitle: "step.0.done",
            Icon: Database,
        },
        {
            preloadTitle: "step.1.pre",
            loadTitle: "step.1.loading",
            postLoadTitle: "step.1.done",
            Icon: Brain,
        },
        {
            preloadTitle: "step.2.pre",
            loadTitle: "step.2.loading",
            postLoadTitle: "step.2.done",
            Icon: Hammer,
        },
    ];

interface NewQuizLoadingProps {
    currentStep: number;
}

const NewQuizLoading = ({ currentStep }: NewQuizLoadingProps) => {
    const { t } = useUILanguage();

    const activeStep = steps[currentStep];
    const headingKey = activeStep
        ? activeStep.loadTitle
        : steps[steps.length - 1].postLoadTitle;

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-10">
            {/* Heading animates on each step change */}
            <div
                key={headingKey}
                className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 text-center space-y-1"
            >
                <p className="text-base font-semibold text-foreground">
                    {t(headingKey)}
                </p>
                <p className="text-sm text-muted-foreground">
                    {t("newQuiz.loadingHint")}
                </p>
            </div>

            <StepProgress steps={steps} currentStep={currentStep} />
        </div>
    );
};

export default NewQuizLoading;