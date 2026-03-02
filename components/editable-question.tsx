import { useState } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Trash2, Sparkles, Plus, Wand2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImproveQuestion } from "@/hooks/api/use-improve-question";
import { GradientIcon } from "./gradient-icon";
import { Direction } from "@/lib/languages";
import { useUILanguage } from "@/providers/ui-language-provider";
import { questionTypes } from "./cards/quiz-card";

type QuestionType = "true_false" | "single_choice" | "multiple_choice";

interface Option {
    id: string;
    optionText: string;
    isCorrect: boolean;
}

interface Question {
    id: string;
    questionText: string;
    questionType: QuestionType;
    options: Option[];
}

interface Props {
    quizId: string;
    dir?: Direction;
    question: Question;
    index: number;

    onUpdateQuestion: (
        questionId: string,
        fields: { questionText?: string; questionType?: QuestionType }
    ) => void;

    onUpdateOption: (
        questionId: string,
        optionId: string,
        fields: { optionText?: string; isCorrect?: boolean }
    ) => void;

    onReplaceOptions: (
        questionId: string,
        newOptions: { optionText: string; isCorrect: boolean }[]
    ) => void;

    onAddOption: (
        questionId: string,
        option: { optionText: string; isCorrect: boolean }
    ) => void;

    onDelete: (questionId: string) => void;
}

export const EditableQuestion = ({
    quizId,
    dir,
    question,
    index,
    onUpdateQuestion,
    onUpdateOption,
    onReplaceOptions,
    onAddOption,
    onDelete,
}: Props) => {
    // 🔥 TRACK WHICH QUESTION + OPTION IS IMPROVING
    const [improvingQuestionId, setImprovingQuestionId] = useState<string | null>(null);
    const [improvingOptionId, setImprovingOptionId] = useState<string | null>(null);

    const [questionText, setQuestionText] = useState(question.questionText);
    const [optionTexts, setOptionTexts] = useState<Record<string, string>>(
        Object.fromEntries(question.options.map(o => [o.id, o.optionText]))
    );

    const { t } = useUILanguage()

    const { improveQuestionText, improveOption, changeType, addDistractor } =
        useImproveQuestion(quizId);

    // 🔒 lock only THIS question
    const isLocked = improvingQuestionId === question.id;

    const handleQuestionBlur = () => {
        if (questionText !== question.questionText) {
            onUpdateQuestion(question.id, { questionText });
        }
    };

    const handleOptionBlur = (optionId: string) => {
        const current = question.options.find(o => o.id === optionId)?.optionText;
        if (optionTexts[optionId] !== current) {
            onUpdateOption(question.id, optionId, {
                optionText: optionTexts[optionId],
            });
        }
    };

    const handleCorrectToggle = (optionId: string, currentValue: boolean) => {
        if (isLocked) return;
        onUpdateOption(question.id, optionId, { isCorrect: !currentValue });
    };

    const handleTypeChange = async (value: QuestionType) => {
        try {
            setImprovingQuestionId(question.id);

            const result = await changeType.mutateAsync({
                question,
                newType: value,
            });

            setQuestionText(result.questionText);

            onUpdateQuestion(question.id, {
                questionType: result.questionType,
                questionText: result.questionText,
            });

            onReplaceOptions(question.id, result.options);
        } finally {
            setImprovingQuestionId(null);
        }
    };

    const canAddDistractor =
        question.questionType !== "true_false" && question.options.length < 5;

    return (
        <Card
            className={cn(
                "w-full transition-opacity",
                // isLocked && "opacity-60 pointer-events-none"
            )}
            dir={dir}
        >
            <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                    {t('editableQuestion.title', { number: index + 1 })}
                </CardTitle>

                <CardAction className="flex items-center gap-1">
                    <Select
                        value={question.questionType}
                        onValueChange={handleTypeChange}
                        disabled={isLocked}
                    >
                        <SelectTrigger
                            className={cn(
                                "text-xs border-0 shadow-none",
                                changeType.isPending && "animated-gradient"
                            )}
                        >
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            {questionTypes?.map((type) =>
                                <SelectItem key={type.value} value={type.value}>{t(type?.label)}</SelectItem>
                            )}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={isLocked}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(question.id)}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
                {/* QUESTION TEXT */}
                <div className="flex items-center gap-1 border-b pb-3">
                    <Input
                        value={questionText}
                        onChange={e => setQuestionText(e.target.value)}
                        onBlur={handleQuestionBlur}
                        disabled={isLocked}
                        className={cn(
                            "border-0 shadow-none font-medium text-sm focus-visible:ring-0 bg-transparent",
                            improveQuestionText.isPending && "animated-gradient"
                        )}
                        placeholder="Question text..."
                    />

                    {!improveQuestionText.isPending && (
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLocked}
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={async () => {
                                try {
                                    setImprovingQuestionId(question.id);

                                    const result = await improveQuestionText.mutateAsync(question);

                                    setQuestionText(result.questionText);
                                    onUpdateQuestion(question.id, {
                                        questionText: result.questionText,
                                    });
                                } finally {
                                    setImprovingQuestionId(null);
                                }
                            }}
                        >
                            <GradientIcon icon={Wand2} size={14} />
                        </Button>
                    )}
                </div>

                {/* OPTIONS */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                            {t('editableQuestion.options')}
                        </span>

                        {canAddDistractor && (
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={isLocked}
                                className={cn(
                                    "h-6 text-xs gap-1 text-muted-foreground hover:text-primary",
                                    addDistractor.isPending && "animated-gradient"
                                )}
                                onClick={async () => {
                                    try {
                                        setImprovingQuestionId(question.id);

                                        const result = await addDistractor.mutateAsync(question);

                                        onAddOption(question.id, {
                                            optionText: result.optionText,
                                            isCorrect: false,
                                        });
                                    } finally {
                                        setImprovingQuestionId(null);
                                    }
                                }}
                            >
                                {addDistractor.isPending ? (
                                    t("editableQuestion.addingDistractor")
                                ) : (
                                    <>
                                        <Plus className="w-3 h-3" /> {t("editableQuestion.addDistractor")}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    {question.options.map(option => (
                        <div
                            key={option.id}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                                improvingOptionId === option.id
                                    ? "animated-gradient"
                                    : option.isCorrect
                                        ? "border-green-500/40 bg-green-500/5"
                                        : "border-border bg-transparent"
                            )}
                        >
                            <Button
                                size="icon-xs" variant='outline' disabled={isLocked}
                                onClick={() =>
                                    handleCorrectToggle(option.id, option.isCorrect)
                                }
                                className={cn(
                                    "transition-colors",
                                    option.isCorrect
                                        ? "border-success"
                                        : "border-muted-foreground hover:border-success"
                                )}
                            >
                                <Circle className={cn(
                                    "transition-colors",
                                    option.isCorrect
                                        ? "fill-success stroke-success"
                                        : "border-muted-foreground hover:stroke-success!"
                                )} />
                            </Button>

                            <Input
                                value={optionTexts[option.id] ?? option.optionText}
                                disabled={isLocked}
                                onChange={e =>
                                    setOptionTexts(prev => ({
                                        ...prev,
                                        [option.id]: e.target.value,
                                    }))
                                }
                                onBlur={() => handleOptionBlur(option.id)}
                                className="h-7 border-0 shadow-none px-0 text-sm focus-visible:ring-0 bg-transparent"
                            />

                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={isLocked}
                                className="h-6 w-6 text-muted-foreground hover:text-primary"
                                onClick={async () => {
                                    try {
                                        setImprovingQuestionId(question.id);
                                        setImprovingOptionId(option.id);

                                        const result = await improveOption.mutateAsync({
                                            questionText: question.questionText,
                                            option: {
                                                optionText: option.optionText,
                                                isCorrect: option.isCorrect,
                                            },
                                        });

                                        setOptionTexts(prev => ({
                                            ...prev,
                                            [option.id]: result.optionText,
                                        }));

                                        onUpdateOption(question.id, option.id, {
                                            optionText: result.optionText,
                                        });
                                    } finally {
                                        setImprovingOptionId(null);
                                        setImprovingQuestionId(null);
                                    }
                                }}
                            >
                                <GradientIcon icon={Sparkles} size={14} />
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};