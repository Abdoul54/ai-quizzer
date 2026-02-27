'use client'

import NewQuizDialog from "@/components/dialogs/new-quiz-dialog"
import { useQuizzes } from "@/hooks/api/use-quiz"
import { useSetBreadcrumbs } from "@/hooks/use-set-breadcrumbs"
import ErrorQuizzes from "@/views/quizzes/error-quizzes"
import ListQuizzes from "@/views/quizzes/list-quizzes"
import LoadingQuizzes from "@/views/quizzes/loading-quizzes"
import NoQuizzes from "@/views/quizzes/no-quizzes"

const Page = () => {
    useSetBreadcrumbs([
        { label: "Home", href: "/" },
        { label: "Quizzes" },
    ]);

    const { data, isLoading, error } = useQuizzes()

    const renderData = () => {
        if (isLoading)
            return <LoadingQuizzes />
        if (error)
            return <ErrorQuizzes error={error?.message} />
        if (!data?.length || data?.length <= 0)
            return <NoQuizzes />
        return <ListQuizzes quizzes={data} />
    }

    return (
        <div className="flex flex-col justify-center h-full">
            <div className="h-full w-full px-4">
                <div className="flex  justify-between w-full">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">
                        Quizzes
                    </h1>
                    <NewQuizDialog />
                </div>
                {renderData()}
            </div>
        </div>
    )
}

export default Page
