'use client'

import { difficultyLevels, questionTypes, statuses } from "@/components/cards/quiz-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { useAddLanguage } from "@/hooks/api/use-add-language";
import { useQuiz } from "@/hooks/api/use-quiz";
import { useSetBreadcrumbs } from "@/hooks/use-set-breadcrumbs";
import { getLanguageLabel, LanguageCode, languages } from "@/lib/languages";
import { useUILanguage } from "@/providers/ui-language-provider";
import QuizStatements from "@/views/quizzes/quiz-statements";
import {
    BookOpen,
    Gauge,
    Hash,
    Layers,
    MessageSquareQuote,
    Play,
    Settings2,
    Brain,
    Languages,
    Plus
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
            <Avatar className="size-10 bg-info/10 text-info">
                <AvatarFallback className="bg-info/10 text-info"><Icon className="size-5" /></AvatarFallback>
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
    const { t, lang } = useUILanguage()
    const userLang = lang

    const { data: quiz } = useQuiz(String(id))
    const addLanguage = useAddLanguage(String(id));
    const isQuizPublished = quiz?.status === "published"


    useSetBreadcrumbs([
        { label: t('nav.home'), href: "/" },
        { label: t('nav.quizzes'), href: "/quizzes" },
        { label: quiz?.title || String(id) },
    ]);

    const difficulty = difficultyLevels?.find(diff => diff?.value === quiz?.difficulty)?.label as "difficulty.easy" | "difficulty.medium" | "difficulty.hard"
    const quizQuestionTypes = questionTypes?.filter(type =>
        quiz?.questionTypes?.includes(type?.value)
    )

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col gap-2 w-full p-4">
                <div className="flex items-start justify-between">
                    <h1 className="text-1xl font-bold tracking-tight">
                        {quiz?.title}
                    </h1>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={!isQuizPublished} onClick={() => router.push(`/quiz/${id}`)}>
                            <Play className="w-4 h-4 mr-2" />
                            {t('quiz.passQuiz')}
                        </Button>
                        <Button size="sm" onClick={() => router.push(`/quizzes/${id}/editor`)}>
                            <Brain className="w-4 h-4 mr-2" />
                            {t('quiz.edit')}
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
                            {t("quiz.questionCount", { number: quiz?.questionCount })}
                        </Badge>
                    )}

                    {quiz?.difficulty && (
                        <Badge variant="outline" className="rounded bg-warning/10 text-warning border-warning">
                            <Gauge className="w-3 h-3 mr-1" />
                            {t(difficulty)}
                        </Badge>
                    )}
                </div>
            </div>
            {/* Render quiz details here */}
            <div className="grid grid-cols-6 gap-2 p-4">
                <QuizStatements quizId={String(id)} />
                {/* Configuration Sidebar */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle className="flex gap-1 items-center">
                            <Settings2 className="w-4 h-4 inline-block" />
                            {t("quiz.configuration")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {quiz?.status && (
                            <MetaRow
                                icon={statuses[quiz?.status as keyof typeof statuses]?.icon || Settings2}
                                label={t("quiz.status")}
                                value={t(statuses[quiz?.status as keyof typeof statuses]?.label) || quiz?.status}
                            />
                        )}
                        {quiz?.topic && (
                            <MetaRow
                                icon={BookOpen}
                                label={t("quiz.topic")}
                                value={quiz.topic}
                            />
                        )}

                        {quizQuestionTypes && (
                            <MetaRow icon={Layers} label={t('quiz.questionTypes')}>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {quizQuestionTypes.map((type, i) => (
                                        <Badge key={i} variant="outline" className="text-xs rounded bg-info/10 text-info border-info">
                                            {t(type?.label)}
                                        </Badge>
                                    ))}
                                </div>
                            </MetaRow>
                        )}

                        {quiz?.languages && (
                            <MetaRow icon={Languages} label={t('quiz.languages')}>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {quiz.languages.map((language, i) => (
                                        <Badge key={i} variant="outline" className="text-xs rounded bg-info/10 text-info border-info">
                                            {quiz.translatingLanguages?.includes(language) && <Spinner />}
                                            {getLanguageLabel(language as LanguageCode, userLang as LanguageCode)}
                                        </Badge>
                                    ))}
                                    {
                                        isQuizPublished && <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Badge
                                                    variant="outline"
                                                    className="bg-accent/50 border-muted hover:bg-accent hover:border-foreground transition-colors cursor-pointer"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </Badge>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-40" align="start">
                                                <DropdownMenuGroup>
                                                    <DropdownMenuLabel>Languages</DropdownMenuLabel>
                                                    {
                                                        languages?.filter(language => !quiz.languages?.includes(language.code))?.map(language => (
                                                            <DropdownMenuItem
                                                                key={language?.code}
                                                                disabled={quiz?.languages?.includes(language.code) || addLanguage.variables === language.code && addLanguage.isPending}
                                                                onClick={() => addLanguage.mutate(language.code)}
                                                            >
                                                                {addLanguage.isPending && addLanguage.variables === language.code
                                                                    ? <Spinner />
                                                                    : null
                                                                }
                                                                {getLanguageLabel(language?.code, lang)}
                                                            </DropdownMenuItem>
                                                        ))
                                                    }
                                                </DropdownMenuGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    }
                                </div>
                            </MetaRow>
                        )}

                        {quiz?.additionalPrompt && (
                            <MetaRow
                                icon={MessageSquareQuote}
                                label={t("quiz.additionalPrompt")}
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