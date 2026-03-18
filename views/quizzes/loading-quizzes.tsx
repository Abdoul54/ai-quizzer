import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useUILanguage } from "@/providers/ui-language-provider"
import { Loader2 } from "lucide-react"

const LoadingQuizzes = () => {
    const { t } = useUILanguage()

    return (
        <Empty className="h-[calc(100vh-225px)]">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Loader2 className="animate-spin" />
                </EmptyMedia>
                <EmptyTitle>{t("quizzes.loading")}</EmptyTitle>
            </EmptyHeader>
        </Empty>
    )
}


export default LoadingQuizzes