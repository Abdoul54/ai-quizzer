import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useUILanguage } from "@/providers/ui-language-provider"
import { Brain } from "lucide-react"

const NoQuizzes = () => {
    const { t } = useUILanguage()

    return (
        <Empty className="border border-dashed h-sidebar">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Brain />
                </EmptyMedia>
                <EmptyTitle>{t('quizzes.empty')}</EmptyTitle>
                <EmptyDescription>
                    {t('quizzes.emptyHint')}
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    )
}


export default NoQuizzes