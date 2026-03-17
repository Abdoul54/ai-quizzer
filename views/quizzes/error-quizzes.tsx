import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useUILanguage } from "@/providers/ui-language-provider"
import { CircleX } from "lucide-react"

const ErrorQuizzes = ({ error }: { error: string }) => {
    const { t } = useUILanguage()

    return (
        <Empty className="border border-dashed h-[calc(100vh-225px)]">
            <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-destructive/15 text-destructive">
                    <CircleX />
                </EmptyMedia>
                <EmptyTitle className="text-destructive">{t("quizzes.error")}</EmptyTitle>
                <EmptyDescription>
                    {error || t("quizzes.errorHint")}
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    )
}


export default ErrorQuizzes