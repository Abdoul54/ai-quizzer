'use client'

import { Card, CardContent } from "@/components/ui/card"
import { useDraftMutations } from "@/hooks/api/use-draft-mutations"
import { useImproveQuestion } from "@/hooks/api/use-improve-question"
import { useLatestDraft } from "@/hooks/api/use-quiz"
import { cn } from "@/lib/utils"
import { QuestionWithOptions } from "@/types"
import { useEffect, useState } from "react"
import { QuestionList } from "./question-list"
import { QuestionOrdering } from "./question-ordering"
import { QuestionsHeader } from "./questions-header"

const QuestionsPanel = ({
    quizId,
    selectedId,
    onSelect,
    ordering,
    setOrdering,
}: {
    quizId: string
    selectedId: string | null
    onSelect: (id: string) => void
    ordering: boolean
    setOrdering: (val: boolean) => void
}) => {
    const { data, isLoading } = useLatestDraft(quizId)
    const { addQuestion: persistQuestion, reorderQuestions } = useDraftMutations(quizId)
    const { addQuestion } = useImproveQuestion(quizId)

    const questions: QuestionWithOptions[] = (data?.content?.questions ?? []) as QuestionWithOptions[]
    const isAdding = addQuestion.isPending || persistQuestion.isPending

    const [localOrder, setLocalOrder] = useState<QuestionWithOptions[]>([])
    const [orderingVisible, setOrderingVisible] = useState(false)

    useEffect(() => {
        if (ordering) {
            setLocalOrder(questions)
            // Let the width expansion finish first, then fade the grid in
            const t = setTimeout(() => setOrderingVisible(true), 200)
            return () => clearTimeout(t)
        } else {
            setOrderingVisible(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ordering])

    const handleAddQuestion = async () => {
        try {
            const result = await addQuestion.mutateAsync({
                existingQuestions: questions.map(q => ({ questionText: q.questionText })),
            })
            const added = await persistQuestion.mutateAsync(result)
            if (added?.questions) {
                const last = added.questions[added.questions.length - 1]
                if (last?.id) onSelect(last.id)
            }
        } catch { }
    }

    const handleConfirmOrdering = async () => {
        try {
            await reorderQuestions.mutateAsync(localOrder.map(q => q.id))
            setOrdering(false)
        } catch { }
    }

    return (
        <Card
            className={cn(
                "flex flex-col min-h-0 overflow-hidden",
                "transition-[width] duration-300 ease-in-out",
                ordering ? "w-full" : "w-96 shrink-0",
            )}
        >
            <QuestionsHeader
                count={questions.length}
                isLoading={isLoading}
                isAdding={isAdding}
                ordering={ordering}
                onAdd={handleAddQuestion}
                isSavingOrder={reorderQuestions.isPending}
                onCancelOrdering={() => setOrdering(false)}
                onConfirmOrdering={ordering ? handleConfirmOrdering : () => setOrdering(true)}
            />
            <CardContent className="flex-1 overflow-y-auto px-2 pb-2">
                {ordering ? (
                    <div
                        className={cn(
                            "transition-opacity duration-200",
                            orderingVisible ? "opacity-100" : "opacity-0",
                        )}
                    >
                        <QuestionOrdering questions={localOrder} onReorder={setLocalOrder} />
                    </div>
                ) : (
                    <QuestionList
                        questions={questions}
                        selectedId={selectedId}
                        isLoading={isLoading}
                        isAdding={isAdding}
                        onSelect={onSelect}
                    />
                )}
            </CardContent>
        </Card>
    )
}

export default QuestionsPanel