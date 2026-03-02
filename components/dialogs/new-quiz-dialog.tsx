/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useCreateQuiz } from "@/hooks/api/use-quiz";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { createQuizSchema, type CreateQuizInput } from "@/lib/validators";
import { Slider } from "../ui/slider";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Item, ItemActions, ItemHeader, ItemMedia, ItemTitle } from "../ui/item";

import {
    PlusCircle,
    X,
    FileText,
    FileSpreadsheet,
    File,
    Loader2,
    FilePlusCorner,
    Database,
    Brain,
    Hammer,
    LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import StepProgress from "../step-progress";
import { getLanguageLabel, LanguageCode, languages } from "@/lib/languages";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { difficultyLevels, questionTypes } from "../cards/quiz-card";
import { useUILanguage } from "@/providers/ui-language-provider";

const filesIcons: Record<string, React.ReactElement> = {
    "application/pdf": <FileText className="h-4 w-4" />,
    "text/plain": <FileText className="h-4 w-4" />,
    "application/msword": <FileText className="h-4 w-4" />,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": <FileText className="h-4 w-4" />,
    "application/vnd.ms-excel": <FileSpreadsheet className="h-4 w-4" />,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": <FileSpreadsheet className="h-4 w-4" />,
    "text/csv": <FileSpreadsheet className="h-4 w-4" />,
    "application/vnd.ms-powerpoint": <FileText className="h-4 w-4" />,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": <FileText className="h-4 w-4" />,
    "default": <File className="h-4 w-4" />,
};

const steps: {
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
    ]

const NewQuizDialog = ({ lang }: { lang: LanguageCode }) => {
    const { createQuiz } = useCreateQuiz();
    const { t } = useUILanguage()


    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [documents, setDocuments] = useState<{ id: string; name: string; type: string }[]>([]);
    const [uploading, setUploading] = useState(false);

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

    async function handleUpload(selectedFile: File) {
        setUploading(true);

        const formData = new FormData();
        formData.append("file", selectedFile);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const { id } = await res.json();

        setDocuments((prev) => [...prev, { id, name: selectedFile.name, type: selectedFile.type }]);

        if (fileInputRef.current) fileInputRef.current.value = "";

        setUploading(false);
    }

    const onSubmit = (values: CreateQuizInput) => {
        setSubmitting(true);
        setCurrentStep(0);

        createQuiz(
            {
                ...values,
                documentIds: documents.map((d) => d.id),
            },
            {
                // Never go backwards — handles skipped steps on fast jobs
                onStep: (step) => setCurrentStep((prev) => Math.max(prev, step)),
                onSuccess: (result) => {
                    // Show all steps completed briefly before closing
                    setCurrentStep(steps.length);
                    setTimeout(() => {
                        form.reset();
                        setDocuments([]);
                        setSubmitting(false);
                        setOpen(false);
                        router.push(`/quizzes/${result}/conversation`);
                    }, 800);
                },
                onError: () => {
                    setSubmitting(false);
                },
            }
        );
    };

    useEffect(() => {

        if (lang) {
            form?.setValue("defaultLanguage", lang)
            form?.setValue("languages", [lang])
        }
    }, [lang, form])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <PlusCircle />
                    {t("quizzes.new")}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-4xl">
                {submitting ? (
                    <div className="flex items-center justify-center">
                        <StepProgress steps={steps} currentStep={currentStep} />
                    </div>
                ) : (
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogHeader className="mb-4">
                            <DialogTitle>{t("newQuiz.dialogTitle")}</DialogTitle>
                            {/* <DialogDescription>
                                {t("newQuiz.dialogTitle")}
                                Your quiz will be created as a draft.
                            </DialogDescription> */}
                        </DialogHeader>

                        <FieldGroup className="h-[80vh] overflow-y-auto px-2">
                            <Field {...(form.formState.errors.title && { "data-invalid": true })}>
                                <Label htmlFor="title">{t("newQuiz.quizTitle")}</Label>
                                <Input id="title" {...form.register("title")} autoFocus />
                                {form.formState.errors.title && (
                                    <FieldError>{form.formState.errors.title.message}</FieldError>
                                )}
                            </Field>

                            <Field {...(form.formState.errors.topic && { "data-invalid": true })}>
                                <Label htmlFor="topic">{t("newQuiz.topic")}</Label>
                                <Input id="topic" {...form.register("topic")} />
                                {form.formState.errors.topic && (
                                    <FieldError>{form.formState.errors.topic.message}</FieldError>
                                )}
                            </Field>

                            <Field {...(form.formState.errors.questionCount && { "data-invalid": true })}>
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor="questionCount">{t("newQuiz.questionCount")}</Label>
                                    <span className="text-muted-foreground text-sm">
                                        {t("newQuiz.questionCounting", { number: form.watch("questionCount") || 0 })}
                                    </span>
                                </div>
                                <Slider
                                    min={3}
                                    max={30}
                                    step={1}
                                    value={[Number(form.watch("questionCount")) || 0]}
                                    onValueChange={([val]) => form.setValue("questionCount", val)}
                                />
                                {form.formState.errors.questionCount && (
                                    <FieldError>{form.formState.errors.questionCount.message}</FieldError>
                                )}
                            </Field>

                            <Field {...(form.formState.errors.difficulty && { "data-invalid": true })}>
                                <Label htmlFor="difficulty">{t("newQuiz.difficulty")}</Label>
                                <ToggleGroup
                                    type="single"
                                    size="sm"
                                    variant="outline"
                                    spacing={2}
                                    value={form.watch("difficulty")}
                                    onValueChange={(val) => {
                                        if (val) form.setValue("difficulty", val as CreateQuizInput["difficulty"], { shouldValidate: true });
                                    }}
                                    className="grid grid-cols-1 md:grid-cols-3 gap-2"
                                >
                                    {difficultyLevels?.map((difficulty) => {
                                        const isToggled = form.watch("difficulty")?.includes(difficulty?.value);
                                        const bg = difficulty?.value === "easy" ? "var(--success)" : difficulty?.value === "hard" ? "var(--destructive)" : "var(--warning)";
                                        const text = difficulty?.value === "easy" ? "var(--success-foreground)" : difficulty?.value === "hard" ? "var(--destructive-foreground)" : "var(--warning-foreground)";
                                        return (
                                            <ToggleGroupItem
                                                key={difficulty?.value}
                                                className="col-span-1"
                                                value={difficulty?.value}
                                                style={{
                                                    backgroundColor: isToggled ? bg : undefined,
                                                    color: isToggled ? text : undefined,
                                                    transition: "all 0.2s",
                                                }}
                                            >
                                                {t(difficulty?.label)}
                                            </ToggleGroupItem>
                                        );
                                    })}
                                </ToggleGroup>
                                {form.formState.errors.difficulty && (
                                    <FieldError>{form.formState.errors.difficulty.message}</FieldError>
                                )}
                            </Field>

                            <Field {...(form.formState.errors.questionTypes && { "data-invalid": true })}>
                                <Label htmlFor="questionTypes">{t("newQuiz.questionTypes")}</Label>
                                <ToggleGroup
                                    type="multiple"
                                    size="sm"
                                    variant="outline"
                                    spacing={2}
                                    value={form.watch("questionTypes")}
                                    onValueChange={(val) => {
                                        if (val) form.setValue("questionTypes", val as CreateQuizInput["questionTypes"], { shouldValidate: true });
                                    }}
                                    className="grid grid-cols-1 md:grid-cols-3 gap-2"
                                >
                                    {questionTypes?.map((type) => {
                                        const isToggled = form.watch("questionTypes")?.includes(type?.value);
                                        return (
                                            <ToggleGroupItem
                                                key={type?.value}
                                                className="col-span-1"
                                                value={type?.value}
                                                style={{
                                                    borderColor: isToggled === true ? undefined : "var(--foreground)",
                                                    backgroundColor: isToggled === true ? "var(--info)" : undefined,
                                                    color: isToggled === true ? "var(--info-foreground)" : "var(--foreground)",
                                                    transition: "all 0.2s",
                                                }}
                                            >
                                                {t(type?.label)}
                                            </ToggleGroupItem>
                                        );
                                    })}
                                </ToggleGroup>
                                {form.formState.errors.questionTypes && (
                                    <FieldError>{form.formState.errors.questionTypes.message}</FieldError>
                                )}
                            </Field>

                            <Field {...(form.formState.errors.defaultLanguage && { "data-invalid": true })}>
                                <Label htmlFor="defaultLanguage">{t("newQuiz.defaultLanguage")}</Label>
                                <Select
                                    value={form.watch("defaultLanguage")}
                                    onValueChange={(v) => {
                                        form.setValue("defaultLanguage", v as CreateQuizInput["defaultLanguage"]);
                                        form.setValue("languages", [v] as CreateQuizInput["languages"], { shouldValidate: true });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {languages?.map((l) => (
                                                <SelectItem key={l?.code} value={l?.code}>
                                                    {getLanguageLabel(l?.code, lang)}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.defaultLanguage && (
                                    <FieldError>{form.formState.errors.defaultLanguage.message}</FieldError>
                                )}
                            </Field>

                            <Field {...(form.formState.errors.languages && { "data-invalid": true })}>
                                <Label htmlFor="languages">{t("newQuiz.languages")}</Label>
                                <ToggleGroup
                                    type="multiple"
                                    size="sm"
                                    variant="outline"
                                    spacing={2}
                                    value={form.watch("languages")}
                                    onValueChange={(val) => {
                                        if (val) form.setValue("languages", val as CreateQuizInput["languages"], { shouldValidate: true });
                                    }}
                                    className="grid grid-cols-1 md:grid-cols-4 gap-2"
                                >
                                    {languages?.map((l) => {
                                        const isSelected = (form.watch("languages") ?? []).includes(l?.code as any);
                                        const isDefaultLang = form.watch("defaultLanguage") === l?.code;
                                        const label = getLanguageLabel(l?.code, lang)
                                        return (
                                            <ToggleGroupItem
                                                className="col-span-1"
                                                key={l?.code}
                                                value={l?.code}
                                                disabled={isDefaultLang}
                                                style={{
                                                    borderColor: isDefaultLang || isSelected ? undefined : "var(--foreground)",
                                                    backgroundColor: isDefaultLang || isSelected ? "var(--primary)" : undefined,
                                                    color: isDefaultLang || isSelected ? "var(--primary-foreground)" : "var(--foreground)",
                                                    transition: "all 0.2s",
                                                }}
                                            >
                                                {label}
                                            </ToggleGroupItem>
                                        );
                                    })}
                                </ToggleGroup>
                                {form.formState.errors.languages && (
                                    <FieldError>{form.formState.errors.languages.message}</FieldError>
                                )}
                            </Field>

                            <Field {...(form.formState.errors.additionalPrompt && { "data-invalid": true })}>
                                <Label htmlFor="additionalPrompt">{t("newQuiz.additionalPrompt")}</Label>
                                <Textarea
                                    id="additionalPrompt"
                                    rows={5}
                                    maxLength={1000}
                                    placeholder={t("newQuiz.additionalPromptPlaceholder")}
                                    spellCheck
                                    {...form.register("additionalPrompt")}
                                />
                                {form.formState.errors.additionalPrompt && (
                                    <FieldError>{form.formState.errors.additionalPrompt.message}</FieldError>
                                )}
                            </Field>

                            <Field>
                                <div className="flex justify-between items-center gap-2">
                                    <Label htmlFor="documents">{t("newQuiz.documents")}</Label>
                                    <Button
                                        variant="outline"
                                        type="button"
                                        size="icon-sm"
                                        disabled={uploading}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {uploading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <FilePlusCorner className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="application/pdf"
                                    onChange={(e) => {
                                        const selected = e.target.files?.[0];
                                        if (selected) handleUpload(selected);
                                    }}
                                />

                                {documents.length > 0 && (
                                    <div className="flex flex-col gap-2 mt-2">
                                        {documents.map((doc) => {
                                            const Icon = filesIcons?.[doc?.type || "default"] || filesIcons["default"];
                                            return (
                                                <Item key={doc.id} variant="outline" size="sm">
                                                    <ItemHeader>
                                                        <ItemMedia>{Icon}</ItemMedia>
                                                        <ItemTitle className="font-mono text-xs">{doc.name}</ItemTitle>
                                                        <ItemActions>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                className="text-destructive"
                                                                onClick={() =>
                                                                    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
                                                                }
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </ItemActions>
                                                    </ItemHeader>
                                                </Item>
                                            );
                                        })}
                                    </div>
                                )}
                            </Field>
                        </FieldGroup>

                        <DialogFooter className="mt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    {t("newQuiz.cancel")}
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={submitting}>
                                {t("newQuiz.create")}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default NewQuizDialog;