'use client'

import { difficultyLevels, questionType, statuses } from "@/components/cards/quiz-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { useQuiz } from "@/hooks/api/use-quiz";
import { useSetBreadcrumbs } from "@/hooks/use-set-breadcrumbs";
import { useSession } from "@/lib/auth-client";
import { getLanguageLabel, LanguageCode, languages } from "@/lib/languages";
import {
    BookOpen,
    Gauge,
    Hash,
    Layers,
    MessageSquareQuote,
    Play,
    Settings2,
    SquareStack,
    Brain
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

const MetaRow = ({
    icon: Icon,
    label,
    value,
    children
}: {
    icon: React.ElementType
    label: string
    value?: string | number
    children?: React.ReactNode
}) => (
    <Item variant="default" className="p-2">
        {Icon && <ItemMedia>
            <Avatar className="size-10 rounded bg-info/10 text-info">
                <AvatarFallback className="rounded bg-info/10 text-info"><Icon className="size-5" /></AvatarFallback>
            </Avatar>
        </ItemMedia>}
        <ItemContent>
            <ItemTitle className="font-bold">{label}</ItemTitle>
            {value && <ItemDescription className="line-clamp-none">{value}</ItemDescription>}
            {children}
        </ItemContent>
    </Item>
);

const Page = () => {

    const { id } = useParams()
    const router = useRouter()
    const { data } = useSession()
    const userLang = data?.user?.language || 'en'

    const { data: quiz } = useQuiz(String(id))

    useSetBreadcrumbs([
        { label: "Home", href: "/" },
        { label: "Quizzes", href: "/quizzes" },
        { label: quiz?.title || String(id) },
    ]);

    const difficulty = difficultyLevels?.find(diff => diff?.value === quiz?.difficulty)?.label


    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col gap-2 w-full p-4">
                <div className="flex items-start justify-between">
                    <h1 className="text-1xl font-bold tracking-tight">
                        {quiz?.title}
                    </h1>
                    <div className="flex gap-2">

                        <Button variant="outline" size="sm" onClick={() => router.push(`/quiz/${id}`)}>
                            <Play className="w-4 h-4 mr-2" />
                            Pass the quiz
                        </Button>
                        <Button size="sm" onClick={() => router.push(`/quizzes/${id}/conversation`)}>
                            <Brain className="w-4 h-4 mr-2" />
                            Edit Questions
                        </Button>
                    </div>
                </div>
                {quiz?.description && (
                    <p className="mt-2 text-muted-foreground ">
                        {quiz.description}
                    </p>
                )}
                <div className="flex flex-wrap gap-3">
                    {quiz?.questionCount && (
                        <Badge variant="outline" className="rounded bg-background">
                            <Hash className="w-3 h-3 mr-1" />
                            {quiz.questionCount} Questions
                        </Badge>
                    )}

                    {quiz?.difficulty && (
                        <Badge variant="outline" className="rounded bg-warning/10 text-warning border-warning">
                            <Gauge className="w-3 h-3 mr-1" />
                            {difficulty}
                        </Badge>
                    )}
                    {/* {data?.language && (
                        <Badge variant="outline" className="rounded bg-info/10 text-info border-info">
                            <Globe className="w-3 h-3 mr-1" />
                            {languages.find(l => l.code === data.language)?.labels.en}
                        </Badge>
                    )} */}
                </div>
            </div>
            {/* Render quiz details here */}
            <div className="grid grid-cols-6 gap-2 p-4">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>
                            <SquareStack className="w-4 h-4 mr-2 inline-block" />
                            Versions
                        </CardTitle>
                    </CardHeader>
                </Card>
                {/* Configuration Sidebar */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>
                            <Settings2 className="w-4 h-4 mr-2 inline-block" />
                            Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {quiz?.status && (
                            <MetaRow
                                icon={statuses[quiz?.status as keyof typeof statuses]?.icon || Settings2}
                                label="Status"
                                value={statuses[quiz?.status as keyof typeof statuses]?.label || quiz?.status}
                            />
                        )}
                        {quiz?.topic && (
                            <MetaRow
                                icon={BookOpen}
                                label="Topic"
                                value={quiz.topic}
                            />
                        )}

                        {quiz?.questionTypes && (
                            <MetaRow icon={Layers} label="Question Types">
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {quiz.questionTypes.map((type: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-xs rounded bg-info/10 text-info border-info">
                                            {questionType[type as keyof typeof questionType] || type}
                                        </Badge>
                                    ))}
                                </div>
                            </MetaRow>
                        )}

                        {quiz?.languages && (
                            <MetaRow icon={Layers} label="Question Types">
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {quiz.languages.map((lang: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-xs rounded bg-info/10 text-info border-info">
                                            {getLanguageLabel(lang as LanguageCode, userLang as LanguageCode)}
                                        </Badge>
                                    ))}
                                </div>
                            </MetaRow>
                        )}

                        {quiz?.additionalPrompt && (
                            <MetaRow
                                icon={MessageSquareQuote}
                                label="Additional Prompt"
                                value={quiz.additionalPrompt}
                            />
                        )}

                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default Page