import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Loader2 } from "lucide-react"

const LoadingQuizzes = () => (
    <Empty className="h-[calc(100vh-225px)]">
        <EmptyHeader>
            <EmptyMedia variant="icon">
                <Loader2 className="animate-spin" />
            </EmptyMedia>
            <EmptyTitle>Loading quizzes…</EmptyTitle>
        </EmptyHeader>
    </Empty>
)


export default LoadingQuizzes