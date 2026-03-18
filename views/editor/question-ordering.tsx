'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { QuestionWithOptions } from "@/types"
import {
    DndContext, DragEndEvent, KeyboardSensor,
    PointerSensor, closestCenter, useSensor, useSensors
} from "@dnd-kit/core"
import {
    SortableContext, arrayMove, rectSortingStrategy,
    sortableKeyboardCoordinates, useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Eye, GripVertical } from "lucide-react"
import QuestionPreview from "./question-preview"
import { useState } from "react"

// -- Sortable Card --

const SortableCard = ({ question, index }: { question: QuestionWithOptions; index: number }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id })
    const [previewOpen, setPreviewOpen] = useState(false)

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(
                "flex flex-col gap-1.5 p-3 rounded-diagonal border bg-card",
                "transition-shadow duration-150 select-none",
                isDragging
                    ? "shadow-lg opacity-50 border-primary/40 z-10"
                    : "border-border hover:border-primary/40 hover:shadow-sm"
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <Badge className="text-[10px] font-mono font-semibold tabular-nums px-1.5 py-0.5">
                    {String(index + 1).padStart(2, "0")}
                </Badge>
                <div className="flex gap-1">
                    <>
                        <Button
                            size="icon-xs"
                            variant="outline"
                            className="reverse-rounded-diagonal"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => setPreviewOpen(true)}
                        >
                            <Eye className="size-3.5" />
                        </Button>

                        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                            <DialogContent className="max-w-md">
                                <QuestionPreview question={question} index={index} />
                            </DialogContent>
                        </Dialog>
                    </>

                    <Button
                        {...attributes}
                        {...listeners}
                        size="icon-xs"
                        variant="outline"
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:border-primary hover:text-primary transition-colors"
                    >
                        <GripVertical className="size-3.5" />
                    </Button>
                </div>
            </div>
            <p className="font-medium text-[13px] leading-snug line-clamp-2 text-foreground">
                {question.questionText}
            </p>
        </div>
    )
}

// -- Ordering Grid --

type Props = {
    questions: QuestionWithOptions[]
    onReorder: (questions: QuestionWithOptions[]) => void
}

export const QuestionOrdering = ({ questions, onReorder }: Props) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return
        const from = questions.findIndex(q => q.id === active.id)
        const to = questions.findIndex(q => q.id === over.id)
        onReorder(arrayMove(questions, from, to))
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map(q => q.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 gap-2 p-1">
                    {questions.map((q, index) => (
                        <SortableCard key={q.id} question={q} index={index} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    )
}