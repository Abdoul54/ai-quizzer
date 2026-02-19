import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Brain } from "lucide-react"

const NoQuizzes = () => (
    <Empty className="border border-dashed h-sidebar">
        <EmptyHeader>
            <EmptyMedia variant="icon">
                <Brain />
            </EmptyMedia>
            <EmptyTitle>No quizzes found</EmptyTitle>
            <EmptyDescription>
                There are no quizzes here yet. Create your first one and get started.
            </EmptyDescription>
        </EmptyHeader>
    </Empty>
)


export default NoQuizzes