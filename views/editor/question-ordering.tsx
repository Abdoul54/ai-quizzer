'use client'

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
import { GripVertical } from "lucide-react"

// -- Sortable Card --

const SortableCard = ({ question, index }: { question: QuestionWithOptions; index: number }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id })

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(
                "flex flex-col gap-1.5 p-3 rounded-lg border bg-card",
                "transition-shadow duration-150 select-none",
                isDragging
                    ? "shadow-lg opacity-50 border-primary/40 z-10"
                    : "border-border hover:border-primary/40 hover:shadow-sm"
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Q{String(index + 1).padStart(2, "0")}
                </span>
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                    <GripVertical className="size-3.5" />
                </button>
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