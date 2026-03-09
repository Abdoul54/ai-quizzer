"use client"

import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card"
import { Item, ItemContent, ItemTitle, ItemDescription, ItemMedia } from "@/components/ui/item"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useUILanguage } from "@/providers/ui-language-provider"
import { useQuizStatements } from "@/hooks/api/use-xapi"
import { Timer, RotateCw, ScrollText, Scroll } from "lucide-react"
import { Agent, Statement } from "@xapi/xapi"
import { cn, getInitials, parseDuration } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

const PASSED_VERB = "http://adlnet.gov/expapi/verbs/passed"
const FAILED_VERB = "http://adlnet.gov/expapi/verbs/failed"



const QuizStatements = ({ quizId }: { quizId: string }) => {
    const { t } = useUILanguage()
    const { data: statements, isLoading, refetch, isRefetching } = useQuizStatements(quizId)

    // Only show completed attempts (passed or failed)
    const completions = statements?.filter((s: Statement) =>
        s.verb.id === PASSED_VERB || s.verb.id === FAILED_VERB
    ) ?? []

    return (
        <Card className="col-span-4 min-h-full h-full">
            <CardHeader>
                <CardTitle className="flex gap-1.5 items-center">
                    <ScrollText className="w-4 h-4" />
                    {t("quiz.statements")}
                </CardTitle>
                <CardAction className="flex items-center gap-2">
                    {!isLoading && (
                        <Badge variant="outline" className="reverse-rounded-diagonal border-info text-info bg-info/20">
                            {completions.length}
                        </Badge>
                    )}
                    <Button size="icon-xs" onClick={() => refetch()} className="transition" >
                        {isRefetching ? <Spinner /> : <RotateCw />}
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col gap-2 pt-0 max-h-[calc(100vh-325px)] h-full overflow-y-auto">
                {isLoading && (
                    <div className="flex flex-col gap-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-14 rounded-md bg-muted/50 animate-pulse" />
                        ))}
                    </div>
                )}

                {!isLoading && completions.length === 0 && (
                    <Empty className="border border-dashed h-sidebar">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Scroll />
                            </EmptyMedia>
                            <EmptyTitle>No attempts yet</EmptyTitle>
                            <EmptyDescription>
                                Share the quiz so they can take it
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}

                {completions.map((s: Statement, i: number) => {
                    const passed = s.verb.id === PASSED_VERB
                    const actor = s.actor as Agent;
                    const name = actor.name ?? "Unknown"
                    const email = actor.mbox?.replace("mailto:", "") ?? "";
                    const score = s.result?.score?.raw
                    const total = s.result?.score?.max
                    const duration = parseDuration(s.result?.duration)
                    const verb = s?.verb?.display?.["en-US"]?.replace(/^./, c => c.toUpperCase());
                    const date = s.timestamp
                        ? new Date(s.timestamp).toLocaleDateString(undefined, { dateStyle: "medium" })
                        : "—"

                    return (
                        <Item key={i} variant="outline" size="sm">
                            <ItemMedia>
                                <Avatar className="size-8 rounded">
                                    <AvatarFallback className={cn("rounded text-xs font-bold", passed ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
                                        {getInitials(name)}
                                    </AvatarFallback>
                                </Avatar>
                            </ItemMedia>
                            <ItemContent className="flex flex-row justify-between">
                                <div className="flex flex-col justify-center items-start ">
                                    <ItemTitle>{name}</ItemTitle>
                                    <ItemDescription>{email}</ItemDescription>
                                </div>
                                <div className="flex flex-row justify-end items-center gap-2">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Timer className="size-3" />
                                        {duration}
                                    </span>
                                    {score !== undefined && total !== undefined && (
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {score}/{total}
                                        </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">{date}</span>
                                    <Badge variant='outline' className={cn(passed ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
                                        {verb}
                                    </Badge>
                                </div>
                            </ItemContent>
                        </Item>
                    )
                })}
            </CardContent>
        </Card>
    )
}

export default QuizStatements