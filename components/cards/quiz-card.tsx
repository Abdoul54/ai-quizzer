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
    LucideIcon,
} from "lucide-react";
import { useUILanguage } from "@/providers/ui-language-provider";
import { cn } from "@/lib/utils";
interface QuizCardProps {
    quiz: Quiz;
    action?: () => void;
}

type statusTranslation = "status.queued" | "status.architecting" | "status.building" | "status.draft" | "status.published" | "status.archived" | "status.failed"

export const statuses: Record<
    string,
    { label: statusTranslation; icon: LucideIcon }
> = {
    queued: { label: "status.queued", icon: Clock },
    architecting: { label: "status.architecting", icon: Brain },
    building: { label: "status.building", icon: Hammer },
    draft: { label: "status.draft", icon: PencilRuler },
    published: { label: "status.published", icon: CheckLine },
    archived: { label: "status.archived", icon: Archive },
    failed: { label: "status.failed", icon: XCircle },
};

export const questionType = {
    multiple_choice: "Multiple Choice",
    true_false: "True/False",
    single_choice: "Single Choice"
}


export const questionTypes: {
    value: QuestionType; label: "questionType.multiple_choice" | "questionType.true_false" | "questionType.single_choice"
}[] = [
        {
            value: "multiple_choice",
            label: "questionType.multiple_choice"
        },
        {
            value: "true_false",
            label: "questionType.true_false"
        },
        {
            value: "single_choice",
            label: "questionType.single_choice"
        }
    ]

export const difficultyLevels: { value: string; label: "difficulty.easy" | "difficulty.medium" | "difficulty.hard" }[] = [
    {
        value: "easy",
        label: "difficulty.easy"
    },
    {
        value: "medium",
        label: "difficulty.medium"
    },
    {
        value: "hard",
        label: "difficulty.hard"
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
    const { t, isRTL } = useUILanguage()

    return (
        <Card
            onClick={isClickable ? action : undefined}
            className={isActive ? "animated-gradient" : isClickable ? "cursor-pointer hover:shadow-md transition-shadow ease-in-out" : ""}
        >
            <CardHeader className="relative">
                <Badge className={cn("absolute top-0", isRTL ? 'left-8' : 'right-8')} variant="secondary">
                    {t(statuses[quiz?.status]?.label)}
                </Badge>
                <CardTitle>{quiz?.title}</CardTitle>
                <CardDescription>{quiz?.description}</CardDescription>
            </CardHeader>
        </Card>
    );
};

export default QuizCard;