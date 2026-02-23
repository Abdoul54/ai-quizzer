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
import { Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImproveQuestion } from "@/hooks/api/use-improve-question";

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

    onDelete: (questionId: string) => void;
}

export const EditableQuestion = ({
    quizId,
    question,
    index,
    onUpdateQuestion,
    onUpdateOption,
    onReplaceOptions,
    onDelete,
}: Props) => {
    const [questionText, setQuestionText] = useState(question.questionText);
    const [optionTexts, setOptionTexts] = useState<Record<string, string>>(
        Object.fromEntries(question.options.map(o => [o.id, o.optionText]))
    );

    const { improveQuestionText, improveOption, improveAllOptions, changeType } = useImproveQuestion(quizId);

    const handleQuestionBlur = () => {
        if (questionText !== question.questionText) {
            onUpdateQuestion(question.id, { questionText });
        }
    };

    const handleOptionBlur = (optionId: string) => {
        const current = question.options.find(o => o.id === optionId)?.optionText;
        if (optionTexts[optionId] !== current) {
            onUpdateOption(question.id, optionId, { optionText: optionTexts[optionId] });
        }
    };

    const handleCorrectToggle = (optionId: string, currentValue: boolean) => {
        onUpdateOption(question.id, optionId, { isCorrect: !currentValue });
    };

    const handleTypeChange = async (value: QuestionType) => {
        const result = await changeType.mutateAsync({ question, newType: value });

        setQuestionText(result.questionText);

        // replace ALL options completely
        onUpdateQuestion(question.id, {
            questionType: result.questionType,
            questionText: result.questionText,
        });

        // 🔥 THIS is the key
        onReplaceOptions(question.id, result.options);
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                    Question {index + 1}
                </CardTitle>
                <CardAction className="flex items-center gap-1">
                    <Select
                        value={question.questionType}
                        onValueChange={handleTypeChange}
                        disabled={changeType.isPending}
                    >
                        <SelectTrigger className="text-xs border-0 shadow-none">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="single_choice">Single choice</SelectItem>
                            <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                            <SelectItem value="true_false">True / False</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(question.id)}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
                {/* question text */}
                <div className="flex items-center gap-1 border-b pb-3">
                    <Input
                        value={questionText}
                        onChange={e => setQuestionText(e.target.value)}
                        onBlur={handleQuestionBlur}
                        className="border-0 shadow-none px-0 font-medium text-sm focus-visible:ring-0 bg-transparent"
                        placeholder="Question text..."
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        disabled={improveQuestionText.isPending}
                        onClick={async () => {
                            const result = await improveQuestionText.mutateAsync(question);
                            setQuestionText(result.questionText);
                            onUpdateQuestion(question.id, { questionText: result.questionText });
                        }}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                    </Button>
                </div>

                {/* options */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                            Options
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1 text-muted-foreground hover:text-primary"
                            disabled={improveAllOptions.isPending}
                            onClick={async () => {
                                const result = await improveAllOptions.mutateAsync(question);
                                const newOptionTexts: Record<string, string> = {};
                                question.options.forEach((o, i) => {
                                    newOptionTexts[o.id] = result.options[i]?.optionText ?? o.optionText;
                                });
                                setOptionTexts(newOptionTexts);
                                question.options.forEach((o, i) => {
                                    const newText = result.options[i]?.optionText;
                                    if (newText && newText !== o.optionText) {
                                        onUpdateOption(question.id, o.id, { optionText: newText });
                                    }
                                });
                            }}
                        >
                            <Sparkles className="w-3 h-3" /> Improve all
                        </Button>
                    </div>

                    {question.options.map(option => (
                        <div
                            key={option.id}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                                option.isCorrect
                                    ? "border-green-500/40 bg-green-500/5"
                                    : "border-border bg-transparent"
                            )}
                        >
                            <button
                                onClick={() => handleCorrectToggle(option.id, option.isCorrect)}
                                className={cn(
                                    "w-3.5 h-3.5 rounded-full border-2 transition-colors",
                                    option.isCorrect
                                        ? "bg-green-500 border-green-500"
                                        : "border-muted-foreground hover:border-green-400"
                                )}
                            />
                            <Input
                                value={optionTexts[option.id] ?? option.optionText}
                                onChange={e =>
                                    setOptionTexts(prev => ({ ...prev, [option.id]: e.target.value }))
                                }
                                onBlur={() => handleOptionBlur(option.id)}
                                className="h-7 border-0 shadow-none px-0 text-sm focus-visible:ring-0 bg-transparent"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-primary"
                                disabled={improveOption.isPending}
                                onClick={async () => {
                                    const result = await improveOption.mutateAsync({
                                        questionText: question.questionText,
                                        option: { optionText: option.optionText, isCorrect: option.isCorrect },
                                    });
                                    setOptionTexts(prev => ({ ...prev, [option.id]: result.optionText }));
                                    onUpdateOption(question.id, option.id, { optionText: result.optionText });
                                }}
                            >
                                <Sparkles className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};