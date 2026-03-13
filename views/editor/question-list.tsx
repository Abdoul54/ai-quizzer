'use client'

import { Item, ItemContent } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useUILanguage } from "@/providers/ui-language-provider"
import { cn } from "@/lib/utils"
import { QuestionWithOptions } from "@/types"
import { Loader2 } from "lucide-react"

type Props = {
    questions: QuestionWithOptions[]
    selectedId: string | null
    isLoading: boolean
    isAdding: boolean
    onSelect: (id: string) => void
}

export const QuestionList = ({ questions, selectedId, isLoading, isAdding, onSelect }: Props) => {
    const { t } = useUILanguage()

    if (isLoading) {
        return (
            <div className="flex flex-col gap-1.5 pt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 rounded-md" style={{ opacity: 0.7 - i * 0.1 }} />
                ))}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-0.5">
            {questions.map((q, index) => {
                const isSelected = selectedId === q.id
                return (
                    <Item
                        key={q.id}
                        role="option"
                        aria-selected={isSelected}
                        className={cn(
                            "group relative flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                            "transition-all duration-150 select-none border",
                            isSelected
                                ? "bg-primary text-primary-foreground border-primary/20 shadow-sm"
                                : "border-transparent hover:bg-muted hover:border-border/50 text-foreground",
                        )}
                        onClick={() => onSelect(q.id)}
                    >
                        {isSelected && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary-foreground/60" />
                        )}
                        <ItemContent className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={cn(
                                    "text-xs font-mono shrink-0 tabular-nums",
                                    isSelected ? "text-primary-foreground/60" : "text-muted-foreground"
                                )}>
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <span className="truncate font-medium text-[13px] leading-snug">{q.questionText}</span>
                            </div>
                        </ItemContent>
                    </Item>
                )
            })}
            {isAdding && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-primary/30 bg-primary/5 mt-0.5">
                    <Loader2 className="size-3.5 text-primary/50 animate-spin shrink-0" />
                    <span className="text-xs text-muted-foreground">{t('editor.generating')}</span>
                </div>
            )}
        </div>
    )
}