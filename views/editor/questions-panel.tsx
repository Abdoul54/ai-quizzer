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

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (ordering) setLocalOrder(questions)
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
        <Card className={cn("flex-1", ordering ? "col-span-5" : "col-span-1")}>
            <QuestionsHeader
                count={questions.length}
                isLoading={isLoading}
                isAdding={isAdding}
                ordering={ordering}
                onAdd={handleAddQuestion}
                isSavingOrder={reorderQuestions.isPending}   // <-- add this
                onCancelOrdering={() => setOrdering(false)}
                onConfirmOrdering={ordering ? handleConfirmOrdering : () => setOrdering(true)}
            />
            <CardContent className="h-[calc(100vh-225px)] overflow-y-auto px-2 pb-2">
                {ordering ? (
                    <QuestionOrdering questions={localOrder} onReorder={setLocalOrder} />
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