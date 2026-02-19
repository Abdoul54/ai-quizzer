// components/cards/quiz-card.tsx
import { Quiz } from "@/types";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Archive, CheckLine, PencilRuler } from "lucide-react";
interface QuizCardProps {
    quiz: Quiz;
    action?: () => void;
}

export const statuses = {
    draft: { label: "Draft", icon: PencilRuler },
    published: { label: "Published", icon: CheckLine },
    archived: { label: "Archived", icon: Archive },
}

export const questionType = {
    multiple_choice: "Multiple Choice",
    true_false: "True/False",
    single_choice: "Single Choice"
}

export const difficultyLevel = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard"
}

const QuizCard = ({ quiz, action }: QuizCardProps) => {

    const clickStyle =
        "cursor-pointer hover:shadow-md transition-shadow ease-in-out";


    return (
        <Card onClick={action} className={action ? clickStyle : ""}>
            <CardHeader className="relative">
                <Badge
                    className="absolute right-8 top-0"
                    variant="secondary"
                >
                    {statuses[quiz?.status as keyof typeof statuses]?.label || quiz?.status}
                </Badge>
                <CardTitle>{quiz?.title}</CardTitle>
                <CardDescription>
                    {quiz?.description}
                </CardDescription>
            </CardHeader>
        </Card>
    );
};

export default QuizCard;