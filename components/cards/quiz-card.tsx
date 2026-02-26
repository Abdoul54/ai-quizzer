// components/cards/quiz-card.tsx
import { QuestionType, Quiz } from "@/types";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
    Archive,
    CheckLine,
    PencilRuler,
    Clock,
    Brain,
    Hammer,
    XCircle,
} from "lucide-react";
interface QuizCardProps {
    quiz: Quiz;
    action?: () => void;
}

export const statuses = {
    queued: { label: "Queued", icon: Clock },
    architecting: { label: "Designing", icon: Brain },
    building: { label: "Generating", icon: Hammer },
    draft: { label: "Draft", icon: PencilRuler },
    published: { label: "Published", icon: CheckLine },
    archived: { label: "Archived", icon: Archive },
    failed: { label: "Failed", icon: XCircle },
}

export const questionType = {
    multiple_choice: "Multiple Choice",
    true_false: "True/False",
    single_choice: "Single Choice"
}


export const questionTypes: { value: QuestionType; label: string }[] = [
    {
        value: "multiple_choice",
        label: "Multiple Choice"
    },
    {
        value: "true_false",
        label: "True/False"
    },
    {
        value: "single_choice",
        label: "Single Choice"
    }
]
export const difficultyLevels: { value: string; label: string }[] = [
    {
        value: "easy",
        label: "Easy"
    },
    {
        value: "medium",
        label: "Medium"
    },
    {
        value: "hard",
        label: "Hard"
    }
]

export const difficultyLevel = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard"
}

const ACTIVE_STATUSES = ["queued", "architecting", "building"];

const QuizCard = ({ quiz, action }: QuizCardProps) => {
    const isActive = ACTIVE_STATUSES.includes(quiz?.status);
    const isClickable = (quiz?.status === "draft" || quiz?.status === "published" || quiz?.status === "archived") && !!action;

    return (
        <Card
            onClick={isClickable ? action : undefined}
            className={isActive ? "animated-gradient" : isClickable ? "cursor-pointer hover:shadow-md transition-shadow ease-in-out" : ""}
        >
            <CardHeader className="relative">
                <Badge className="absolute right-8 top-0" variant="secondary">
                    {statuses[quiz?.status as keyof typeof statuses]?.label || quiz?.status}
                </Badge>
                <CardTitle>{quiz?.title}</CardTitle>
                <CardDescription>{quiz?.description}</CardDescription>
            </CardHeader>
        </Card>
    );
};

export default QuizCard;