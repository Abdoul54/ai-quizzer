"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useCreateQuiz } from "@/hooks/api/use-quiz";
import { createQuizSchema, type CreateQuizInput } from "@/lib/validators";
import { LanguageCode } from "@/lib/languages";
import { useUILanguage } from "@/providers/ui-language-provider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import NewQuizForm from "./new-quiz-form";
import NewQuizLoading, { steps } from "./new-quiz-loading";
import NewQuizDone from "./new-quiz-done";

type Phase = "form" | "loading" | "done";

const NewQuizDialog = ({ lang }: { lang: LanguageCode }) => {
    const { createQuiz } = useCreateQuiz();
    const { t } = useUILanguage();
    const { push } = useRouter();

    const [open, setOpen] = useState(false);
    const [phase, setPhase] = useState<Phase>("form");
    const [currentStep, setCurrentStep] = useState(0);
    const [quizId, setQuizId] = useState<string | null>(null);
    const [documents, setDocuments] = useState<{ id: string; name: string; type: string }[]>([]);

    const form = useForm<CreateQuizInput>({
        resolver: zodResolver(createQuizSchema),
        defaultValues: {
            title: "",
            topic: "",
            questionCount: 10,
            difficulty: "medium",
            questionTypes: [],
            defaultLanguage: lang,
            languages: [lang],
            additionalPrompt: "",
        },
    });

    useEffect(() => {
        if (lang) {
            form.setValue("defaultLanguage", lang);
            form.setValue("languages", [lang]);
        }
    }, [lang, form]);

    const handleOpenChange = (next: boolean) => {
        if (next) {
            setPhase("form");
            setCurrentStep(0);
            setQuizId(null);
            setDocuments([]);
            form.reset({
                title: "",
                topic: "",
                questionCount: 10,
                difficulty: "medium",
                questionTypes: [],
                defaultLanguage: lang,
                languages: [lang],
                additionalPrompt: "",
            });
        }
        setOpen(next);
    };

    const onSubmit = (values: CreateQuizInput) => {
        setPhase("loading");
        setCurrentStep(0);

        createQuiz(
            { ...values, documentIds: documents.map((d) => d.id) },
            {
                onStep: (step) => setCurrentStep((prev) => Math.max(prev, step)),
                onSuccess: (result) => {
                    setCurrentStep(steps.length);
                    setQuizId(result);
                    setTimeout(() => setPhase("done"), 600);
                },
                onError: (message) => {
                    toast.error(message);
                    setPhase("form");
                },
            }
        );
    };

    const goToQuiz = () => {
        if (!quizId) {
            toast.error(t("newQuiz.errorNoQuizId"));
            return;
        }
        push(`/quizzes/${quizId}`);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <PlusCircle />
                    {t("quizzes.new")}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-4xl">
                <div
                    key={phase}
                    className="animate-in fade-in-0 duration-200"
                >
                    {phase === "loading" && <NewQuizLoading currentStep={currentStep} />}
                    {phase === "done" && <NewQuizDone goToQuiz={goToQuiz} />}
                    {phase === "form" && (
                        <NewQuizForm
                            form={form}
                            lang={lang}
                            submitting={false}
                            documents={documents}
                            onDocumentsChange={setDocuments}
                            onSubmit={onSubmit}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default NewQuizDialog;