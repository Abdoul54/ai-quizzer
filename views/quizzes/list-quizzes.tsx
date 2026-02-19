import QuizCard from "@/components/cards/quiz-card"
import { Quiz } from "@/types"
import { useRouter } from "next/navigation"

const ListQuizzes = ({ quizzes }: { quizzes: Quiz[] }) => {
    const router = useRouter()

    return (
        <div className="grid grid-cols-2 gap-4">
            {quizzes?.map((quiz: Quiz) => (
                <QuizCard key={quiz?.id} quiz={quiz} action={() => router.push(`/quizzes/${quiz?.id}`)} />
            ))}
        </div>
    )
}


export default ListQuizzes