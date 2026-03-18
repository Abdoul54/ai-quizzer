'use client'

import { questionTypes } from "@/components/cards/quiz-card"
import { Badge } from "@/components/ui/badge"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { cn, getLabel } from "@/lib/utils"
import { useUILanguage } from "@/providers/ui-language-provider"
import { QuestionWithOptions } from "@/types"

const QuestionPreview = ({
    question,
    index,
}: {
    question: QuestionWithOptions
    index: number
}) => {
    const { t } = useUILanguage()
    const typeLabel = questionTypes.find(qt => qt.value === question.questionType)?.label

    return (
        <div className="flex flex-col gap-4">
            <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                    <DialogTitle className="text-sm font-medium text-muted-foreground">
                        {t('question.number', { number: index + 1 })}
                    </DialogTitle>
                    {typeLabel && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            {t(typeLabel)}
                        </Badge>
                    )}
                </div>
            </DialogHeader>

            <p className="text-sm font-semibold leading-snug">
                {question.questionText}
            </p>

            <div className="flex flex-col gap-1.5">
                {question.options.map((o, idx) => (
                    <Item
                        key={o.id}
                        variant="outline"
                        size="sm"
                        className={cn(
                            "w-full pointer-events-none",
                            o.isCorrect
                                ? "border-success/50 bg-success/5"
                                : "opacity-70"
                        )}
                    >
                        <ItemMedia className="shrink-0">
                            <Badge
                                variant="outline"
                                className={cn(
                                    "size-6 rounded",
                                    o.isCorrect
                                        ? "bg-success border-success text-success-foreground"
                                        : "border-border text-muted-foreground"
                                )}
                            >
                                {getLabel(idx) ?? idx + 1}
                            </Badge>
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle className={cn(
                                "text-sm",
                                o.isCorrect && "text-foreground font-medium"
                            )}>
                                {o.optionText}
                            </ItemTitle>
                        </ItemContent>
                    </Item>
                ))}
            </div>
        </div>
    )
}

export default QuestionPreview