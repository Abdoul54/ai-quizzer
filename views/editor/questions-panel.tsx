'use client'

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemContent, ItemMedia } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import TooltipWrapper from "@/components/ui/tooltip-wrapper"
import { useDraftMutations } from "@/hooks/api/use-draft-mutations"
import { useImproveQuestion } from "@/hooks/api/use-improve-question"
import { useLatestDraft } from "@/hooks/api/use-quiz"
import { cn } from "@/lib/utils"
import { useUILanguage } from "@/providers/ui-language-provider"
import { QuestionWithOptions } from "@/types"
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Loader2, Plus } from "lucide-react"
import { useState } from "react"

const SortableQuestionRow = ({
    question,
    index,
    isSelected,
    onClick,
}: {
    question: QuestionWithOptions
    index: number
    isSelected: boolean
    onClick: () => void
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: question.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        willChange: "transform",
    }

    return (
        <Item
            ref={setNodeRef}
            style={style}
            role="option"
            aria-selected={isSelected}
            className={cn(
                "group relative flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                "transition-all duration-150 select-none border",
                isSelected
                    ? "bg-primary text-primary-foreground border-primary/20 shadow-sm"
                    : "border-transparent hover:bg-muted hover:border-border/50 text-foreground",
                isDragging && "opacity-0"
            )}
            onClick={onClick}
        >
            {/* Selected indicator */}
            {isSelected && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary-foreground/60" />
            )}

            <ItemMedia
                {...attributes}
                {...listeners}
                className={cn(
                    "flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity",
                    isSelected ? "text-primary-foreground/50" : "text-muted-foreground/40 group-hover:text-muted-foreground",
                    "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="w-3.5 h-3.5" />
            </ItemMedia>

            <ItemContent className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                        "text-xs font-mono shrink-0 tabular-nums",
                        isSelected ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>
                        {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate font-medium text-[13px] leading-snug">
                        {question.questionText}
                    </span>
                </div>
            </ItemContent>
        </Item>
    )
}

const QuestionsPanel = ({
    quizId,
    selectedId,
    onSelect,
}: {
    quizId: string
    selectedId: string | null
    onSelect: (id: string) => void
}) => {
    const { t } = useUILanguage()
    const { data, isLoading } = useLatestDraft(quizId)
    const [activeId, setActiveId] = useState<string | null>(null)

    const { reorderQuestions, addQuestion: persistQuestion } = useDraftMutations(quizId)
    const { addQuestion } = useImproveQuestion(quizId)

    const sensors = useSensors(useSensor(PointerSensor))
    const questions: QuestionWithOptions[] = (data?.content?.questions ?? []) as QuestionWithOptions[]

    const isAdding = addQuestion.isPending || persistQuestion.isPending

    const handleAddQuestion = async () => {
        try {
            const result = await addQuestion.mutateAsync({
                existingQuestions: questions.map((q) => ({ questionText: q.questionText })),
            })
            const added = await persistQuestion.mutateAsync(result)
            if (added?.questions) {
                const last = added.questions[added.questions.length - 1]
                if (last?.id) onSelect(last.id)
            }
        } catch { /* addQuestion.error */ }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIndex = questions.findIndex((q) => q.id === active.id)
        const newIndex = questions.findIndex((q) => q.id === over.id)
        const reordered = arrayMove(questions, oldIndex, newIndex)
        reorderQuestions.mutate(reordered.map((q) => q.id))
    }

    return (
        <Card className="flex-1 col-span-1">
            <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CardTitle>{t("questions.label")}</CardTitle>
                    {!isLoading && questions.length > 0 && (
                        <span className="text-xs text-muted-foreground font-mono tabular-nums bg-muted px-1.5 py-0.5 rounded-md">
                            {questions.length}
                        </span>
                    )}
                </div>
                <CardAction>

                    <TooltipWrapper
                        trigger={<Button
                            size="icon-xs"
                            disabled={isAdding}
                            onClick={handleAddQuestion}
                        >
                            {isAdding
                                ? <Loader2 className="size-3.5 animate-spin" />
                                : <Plus className="size-3.5" />
                            }
                        </Button>}
                        content={t('editor.generate')}
                        side="bottom"
                    />
                </CardAction>
            </CardHeader>
            <CardContent className="h-[calc(100vh-225px)] overflow-y-auto space-y-0.5 px-2 pb-2">
                {isLoading ? (
                    <div className="flex flex-col gap-1.5 pt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-9 rounded-md opacity-60"
                                style={{ opacity: 0.7 - i * 0.1 }}
                            />
                        ))}
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={(event) => setActiveId(String(event.active.id))}
                        onDragEnd={(event) => {
                            setActiveId(null)
                            handleDragEnd(event)
                        }}
                    >
                        <SortableContext
                            items={questions.map((q) => q.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {questions.map((q, index) => (
                                <SortableQuestionRow
                                    key={q.id}
                                    question={q}
                                    index={index}
                                    isSelected={selectedId === q.id}
                                    onClick={() => onSelect(q.id)}
                                />
                            ))}
                        </SortableContext>

                        {isAdding && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-primary/30 bg-primary/5 mt-0.5">
                                <Loader2 className="size-3.5 text-primary/50 animate-spin shrink-0" />
                                <span className="text-xs text-muted-foreground">{t('editor.generating')}</span>
                            </div>
                        )}

                        <DragOverlay>
                            {activeId ? (
                                <Item
                                    variant="outline"
                                    size="sm"
                                    className="shadow-lg border-primary/20 bg-background"
                                >
                                    <ItemContent className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="truncate font-medium text-[13px]">
                                                {questions.find((q) => q.id === activeId)?.questionText}
                                            </span>
                                        </div>
                                    </ItemContent>
                                </Item>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </CardContent>
        </Card>
    )
}

export default QuestionsPanel