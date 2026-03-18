'use client'

import { Button } from "@/components/ui/button"
import { useApproveQuiz } from "@/hooks/api/use-approve-quiz"
import { useQuiz, useLatestDraft } from "@/hooks/api/use-quiz"
import { useSetBreadcrumbs } from "@/hooks/use-set-breadcrumbs"
import { getDirection, LanguageCode } from "@/lib/languages"
import { useUILanguage } from "@/providers/ui-language-provider"
import { QuestionWithOptions } from "@/types"
import QuestionPanel from "@/views/editor/question-panel"
import QuestionsPanel from "@/views/editor/questions-panel"
import { CheckCheck } from "lucide-react"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"

const Page = () => {
    const { id } = useParams()
    const quizId = String(id)

    const { t } = useUILanguage()
    const { data: quiz } = useQuiz(quizId)
    const { data: draft } = useLatestDraft(quizId)
    const approveQuiz = useApproveQuiz(quizId)

    useSetBreadcrumbs([
        { label: t('nav.home'), href: "/" },
        { label: t('nav.quizzes'), href: "/quizzes" },
        { label: quiz?.title || String(id), href: `/quizzes/${id}` },
        { label: t('nav.editor') },
    ])

    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [ordering, setOrdering] = useState<boolean>(false)

    const questions = useMemo<QuestionWithOptions[]>(
        () => (draft?.content?.questions ?? []) as QuestionWithOptions[],
        [draft]
    )

    const currentQuestion = useMemo(() => {
        if (!selectedId) return undefined
        const index = questions.findIndex((q) => q.id === selectedId)
        if (index === -1) return undefined
        return { ...questions[index], index }
    }, [selectedId, questions])

    return (
        <div className="flex flex-col h-full gap-2">
            <div className="flex justify-between items-center">
                <div className="text-xl line-clamp-1 font-semibold">
                    {quiz?.title}
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => approveQuiz.mutate()}
                        disabled={approveQuiz.isPending}
                        className="gap-2"
                    >
                        <CheckCheck className="w-4 h-4" />
                        {approveQuiz.isPending ? t('quiz.approving') : t('quiz.approve')}
                    </Button>
                </div>
            </div>

            {/* Flex container instead of grid — width transitions work here */}
            <div className="flex flex-1 gap-2 min-h-0">
                <QuestionsPanel
                    quizId={quizId}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    ordering={ordering}
                    setOrdering={setOrdering}
                />
                <QuestionPanel
                    quizId={quizId}
                    question={currentQuestion}
                    ordering={ordering}
                    dir={getDirection(quiz?.defaultLanguage as LanguageCode)}
                />
            </div>
        </div>
    )
}

export default Page