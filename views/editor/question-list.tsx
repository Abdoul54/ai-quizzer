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
                    <Skeleton
                        key={i}
                        className="h-9 rounded-md animate-in fade-in-0 slide-in-from-left-2 duration-300"
                        style={{
                            opacity: 0.7 - i * 0.1,
                            animationDelay: `${i * 60}ms`,
                            animationFillMode: "both",
                        }}
                    />
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
                            "transition-all duration-200 ease-in-out select-none border",
                            "animate-in fade-in-0 slide-in-from-left-2",
                            isSelected
                                ? "bg-primary text-primary-foreground border-primary/20 shadow-sm"
                                : "border-transparent hover:bg-muted hover:border-border/50 text-foreground",
                        )}
                        style={{
                            animationDelay: `${index * 35}ms`,
                            animationDuration: "250ms",
                            animationFillMode: "both",
                        }}
                        onClick={() => onSelect(q.id)}
                    >
                        {/* Selected indicator bar */}
                        <span
                            className={cn(
                                "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full bg-primary-foreground/60",
                                "transition-all duration-200 ease-out",
                                isSelected ? "h-4 opacity-100" : "h-0 opacity-0",
                            )}
                        />

                        <ItemContent className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className={cn(
                                        "text-xs font-mono shrink-0 tabular-nums transition-colors duration-150",
                                        isSelected ? "text-primary-foreground/60" : "text-muted-foreground",
                                    )}
                                >
                                    {index + 1}
                                </span>
                                <span className="truncate leading-snug">{q.questionText}</span>
                            </div>
                        </ItemContent>
                    </Item>
                )
            })}

            {/* "Adding" skeleton at the bottom */}
            {isAdding && (
                <div
                    className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
                    style={{ animationFillMode: "both" }}
                >
                    <Item className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border/50 text-muted-foreground text-sm">
                        <Loader2 className="size-3 animate-spin shrink-0" />
                        <span className="truncate text-xs">{t('editor.generating')}</span>
                    </Item>
                </div>
            )}
        </div>
    )
}