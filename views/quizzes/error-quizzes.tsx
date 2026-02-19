import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CircleX } from "lucide-react"

const ErrorQuizzes = ({ error }: { error: string }) => {
    return (
        <Empty className="border border-dashed h-[calc(100vh-225px)]">
            <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-destructive/15 text-destructive">
                    <CircleX />
                </EmptyMedia>
                <EmptyTitle className="text-destructive">Something went wrong</EmptyTitle>
                <EmptyDescription>
                    {error || "We couldn’t load the quizzes. Please try again."}
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    )
}


export default ErrorQuizzes