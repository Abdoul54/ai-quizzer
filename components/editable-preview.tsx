import { useState } from "react";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLatestDraft } from "@/hooks/api/use-quiz";
import { useDraftMutations } from "@/hooks/api/use-draft-mutations";
import { EditableQuestion } from "./editable-question";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Direction } from "@/lib/languages";

interface Question {
    id: string;
    questionText: string;
    questionType: "true_false" | "single_choice" | "multiple_choice";
    options: { id: string; optionText: string; isCorrect: boolean }[];
}

const SortableQuestionRow = ({
    question,
    index,
    isSelected,
    onClick,
}: {
    question: Question;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    ref={setNodeRef}
                    style={style}
                    className={cn(
                        "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors",
                        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground",
                        isDragging && "opacity-50"
                    )}
                    onClick={onClick}
                >
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab text-muted-foreground"
                        onClick={e => e.stopPropagation()}
                    >
                        <GripVertical className="w-3 h-3" />
                    </button>
                    <span className={cn(
                        "font-medium text-xs w-6",
                        isSelected ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                        Q{index + 1}
                    </span>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{question.questionText}</p>
            </TooltipContent>
        </Tooltip>
    );
};

const EditablePreview = ({ id, dir }: { id: string; dir?: Direction }) => {
    const { data, isLoading, error } = useLatestDraft(id);
    const { reorderQuestions, deleteQuestion, updateQuestion, updateOption, replaceOptions, addOption } =
        useDraftMutations(id);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const sensors = useSensors(useSensor(PointerSensor));

    const questions: Question[] = data?.content?.questions || [];
    const selectedQuestion = questions.find(q => q.id === selectedId) ?? questions[0] ?? null;

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = questions.findIndex(q => q.id === active.id);
        const newIndex = questions.findIndex(q => q.id === over.id);
        const reordered = arrayMove(questions, oldIndex, newIndex);
        reorderQuestions.mutate(reordered.map(q => q.id));
    };

    if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
    if (error) return <div className="p-4 text-sm text-destructive">Error: {error.message}</div>;
    if (!questions.length) return <div className="p-4 text-sm text-muted-foreground">No questions yet.</div>;

    return (
        <div className="flex flex-col h-full gap-2 overflow-hidden">
            {/* question tabs */}
            <div className="w-full min-w-0 flex flex-row gap-1 overflow-x-auto pb-1 scrollbar-x">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={questions.map(q => q.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {questions.map((q, index) => (
                            <SortableQuestionRow
                                key={q.id}
                                question={q}
                                index={index}
                                isSelected={(selectedId ?? questions[0]?.id) === q.id}
                                onClick={() => setSelectedId(q.id)}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            {/* editable card */}
            <div className="flex-1 flex overflow-y-auto items-center">
                {selectedQuestion && (
                    <EditableQuestion
                        key={selectedQuestion.id}
                        quizId={id}
                        dir={dir}
                        question={selectedQuestion}
                        index={questions.findIndex(q => q.id === selectedQuestion.id)}
                        onUpdateQuestion={(questionId, fields) =>
                            updateQuestion.mutate({ questionId, ...fields })
                        }
                        onUpdateOption={(questionId, optionId, fields) =>
                            updateOption.mutate({ questionId, optionId, ...fields })
                        }
                        onDelete={(questionId) => {
                            const currentIndex = questions.findIndex(q => q.id === questionId);
                            const next = questions[currentIndex + 1] ?? questions[currentIndex - 1];
                            setSelectedId(next?.id ?? null);
                            deleteQuestion.mutate(questionId);
                        }}
                        onReplaceOptions={(questionId, options) =>
                            replaceOptions.mutate({ questionId, options })
                        }
                        onAddOption={(questionId, option) =>
                            addOption.mutate({ questionId, option })
                        }
                    />
                )}
            </div>
        </div>
    );
};

export default EditablePreview;