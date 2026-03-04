'use client'

import { useQuiz, useLatestDraft } from "@/hooks/api/use-quiz"
import { useSetBreadcrumbs } from "@/hooks/use-set-breadcrumbs"
import { getDirection, LanguageCode } from "@/lib/languages"
import { useUILanguage } from "@/providers/ui-language-provider"
import { QuestionWithOptions } from "@/types"
import QuestionPanel from "@/views/editor/question-panel"
import QuestionsPanel from "@/views/editor/questions-panel"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"

const Page = () => {
    const { id } = useParams()
    const quizId = String(id)


    const { t } = useUILanguage()
    const { data: quiz } = useQuiz(quizId)
    const { data: draft } = useLatestDraft(quizId)

    useSetBreadcrumbs([
        { label: t('nav.home'), href: "/" },
        { label: t('nav.quizzes'), href: "/quizzes" },
        { label: quiz?.title || String(id), href: `/quizzes/${id}` },
        { label: t('nav.editor') },
    ]);

    const [selectedId, setSelectedId] = useState<string | null>(null)

    const questions = useMemo<QuestionWithOptions[]>(
        () => (draft?.content?.questions ?? []) as QuestionWithOptions[],
        [draft]
    )

    // Derived from live draft — always fresh after any mutation
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
            </div>
            <div className="grid grid-cols-5 flex-1 gap-2">
                <QuestionsPanel
                    quizId={quizId}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                />
                <QuestionPanel
                    quizId={quizId}
                    question={currentQuestion}
                    dir={getDirection(quiz?.defaultLanguage as LanguageCode)}
                />
            </div>
        </div>
    )
}

export default Page