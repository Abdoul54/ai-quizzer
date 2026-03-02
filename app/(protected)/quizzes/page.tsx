'use client'

import NewQuizDialog from "@/components/dialogs/new-quiz-dialog"
import { useQuizzes } from "@/hooks/api/use-quiz"
import { useSetBreadcrumbs } from "@/hooks/use-set-breadcrumbs"
import { useSession } from "@/lib/auth-client"
import { LanguageCode } from "@/lib/languages"
import { useUILanguage } from "@/providers/ui-language-provider"
import ErrorQuizzes from "@/views/quizzes/error-quizzes"
import ListQuizzes from "@/views/quizzes/list-quizzes"
import LoadingQuizzes from "@/views/quizzes/loading-quizzes"
import NoQuizzes from "@/views/quizzes/no-quizzes"

const Page = () => {

    const { data, isLoading, error } = useQuizzes()
    const { data: session } = useSession()
    const { t } = useUILanguage()
    const language = session?.user?.language as LanguageCode

    useSetBreadcrumbs([
        { label: t('nav.home'), href: "/" },
        { label: t('nav.quizzes') },
    ]);

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
                        {t('quizzes.title')}
                    </h1>
                    <NewQuizDialog lang={language} />
                </div>
                {renderData()}
            </div>
        </div>
    )
}

export default Page
