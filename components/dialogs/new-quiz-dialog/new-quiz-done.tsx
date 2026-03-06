"use client";

import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { useUILanguage } from "@/providers/ui-language-provider";

const NewQuizDone = ({ goToQuiz }: { goToQuiz: () => void }) => {
    const { t } = useUILanguage();

    return (
        <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
            {/* Animated checkmark */}
            <div className="animate-in zoom-in-50 fade-in-0 duration-500 rounded-full bg-success/10 p-5">
                <CheckCircle className="h-12 w-12 text-success" />
            </div>

            {/* Text fades in slightly after the icon */}
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-150 space-y-1.5 fill-mode-both">
                <p className="text-lg font-semibold">{t("newQuiz.doneTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("newQuiz.doneDescription")}</p>
            </div>

            {/* Actions */}
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-300 fill-mode-both flex items-center gap-2">
                <Button type="button" onClick={goToQuiz}>
                    {t("newQuiz.goToQuiz")}
                </Button>
                <DialogClose asChild>
                    <Button variant="outline">{t("newQuiz.close")}</Button>
                </DialogClose>
            </div>
        </div>
    );
};

export default NewQuizDone;