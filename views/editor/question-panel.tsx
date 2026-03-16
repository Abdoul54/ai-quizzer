'use client'

import { questionTypes } from "@/components/cards/quiz-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import TooltipWrapper from "@/components/ui/tooltip-wrapper"
import { useDraftMutations } from "@/hooks/api/use-draft-mutations"
import { useImproveQuestion } from "@/hooks/api/use-improve-question"
import { Direction } from "@/lib/languages"
import { cn, getLabel } from "@/lib/utils"
import { useUILanguage } from "@/providers/ui-language-provider"
import { QuestionType, QuestionWithOptions } from "@/types"
import {
    Check,
    CheckCircle2,
    FileQuestion,
    Loader2,
    PenSquare,
    PlusCircle,
    RotateCcw,
    Sparkles,
    X,
} from "lucide-react"
import { useState } from "react"
import { useOS } from "@/hooks/use-os"

type EditingState =
    | { type: "question" }
    | { type: "option"; id: string }
    | null


const QuestionPanel = ({
    quizId,
    question,
    ordering,
    dir,
}: {
    quizId: string
    question?: QuestionWithOptions & { index: number }
    ordering?: boolean
    dir?: Direction
}) => {
    const { t } = useUILanguage()
    const os = useOS();

    const isMac = os === 'macos'

    const [editing, setEditing] = useState<EditingState>(null)
    const [editValue, setEditValue] = useState("")
    const [instruction, setInstruction] = useState("")
    const [popoverOpen, setPopoverOpen] = useState(false)

    const { updateQuestion, updateOption, addOption, replaceOptions } = useDraftMutations(quizId)
    const { changeType, regenerateQuestion, addDistractor, customInstruction } = useImproveQuestion(quizId)

    const isMutating =
        updateQuestion.isPending ||
        updateOption.isPending ||
        addOption.isPending ||
        replaceOptions.isPending ||
        changeType.isPending ||
        regenerateQuestion.isPending ||
        addDistractor.isPending ||
        customInstruction.isPending

    // ── Type change ──────────────────────────────────────────────────────────

    const handleTypeChange = async (newType: QuestionType) => {
        if (!question || newType === question.questionType) return
        try {
            const result = await changeType.mutateAsync({ question, newType })
            await updateQuestion.mutateAsync({
                questionId: question.id,
                questionText: result.questionText,
                questionType: result.questionType,
            })
            await replaceOptions.mutateAsync({ questionId: question.id, options: result.options })
        } catch { /* changeType.error */ }
    }

    // ── Regenerate ───────────────────────────────────────────────────────────

    const handleRegenerateQuestion = async () => {
        if (!question) return
        try {
            const result = await regenerateQuestion.mutateAsync(question)
            await updateQuestion.mutateAsync({
                questionId: question.id,
                questionText: result.questionText,
                questionType: result.questionType,
            })
            await replaceOptions.mutateAsync({ questionId: question.id, options: result.options })
        } catch { /* regenerateQuestion.error */ }
    }

    // ── Add distractor ───────────────────────────────────────────────────────

    const handleAddDistractor = async () => {
        if (!question || question.questionType === "true_false") return
        try {
            const result = await addDistractor.mutateAsync(question)
            await addOption.mutateAsync({
                questionId: question.id,
                option: { optionText: result.optionText, isCorrect: false },
            })
        } catch { /* addDistractor.error */ }
    }

    // ── Custom instruction ───────────────────────────────────────────────────

    const handleChangeWithAI = async () => {
        if (!question || !instruction.trim()) return
        try {
            const result = await customInstruction.mutateAsync({ question, instruction: instruction.trim() })
            await updateQuestion.mutateAsync({
                questionId: question.id,
                questionText: result.questionText,
                questionType: result.questionType,
            })
            await replaceOptions.mutateAsync({ questionId: question.id, options: result.options })
            setInstruction("")
            setPopoverOpen(false)
        } catch { /* customInstruction.error */ }
    }

    // ── Manual editing ───────────────────────────────────────────────────────

    const handleStartEditQuestion = () => {
        if (!question) return
        setEditing({ type: "question" })
        setEditValue(question.questionText)
    }

    const handleStartEditOption = (id: string, currentText: string) => {
        setEditing({ type: "option", id })
        setEditValue(currentText)
    }

    const handleSaveEdit = async () => {
        if (!editing || !question) return
        if (editing.type === "question") {
            await updateQuestion.mutateAsync({ questionId: question.id, questionText: editValue })
        } else {
            await updateOption.mutateAsync({ questionId: question.id, optionId: editing.id, optionText: editValue })
        }
        setEditing(null)
        setEditValue("")
    }

    const handleCancelEdit = () => {
        setEditing(null)
        setEditValue("")
    }

    // ── Toggle correct ───────────────────────────────────────────────────────

    const handleToggleCorrect = async (optionId: string, isCorrect: boolean) => {
        if (!question) return

        // For single_choice and true_false: marking one correct must unmark all others
        if ((question.questionType === "single_choice" || question.questionType === "true_false") && !isCorrect) {
            await replaceOptions.mutateAsync({
                questionId: question.id,
                options: question.options.map((o) => ({
                    optionText: o.optionText,
                    isCorrect: o.id === optionId,
                })),
            })
            return
        }

        await updateOption.mutateAsync({ questionId: question.id, optionId, isCorrect: !isCorrect })
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    const isEditingQuestion = editing?.type === "question"
    const isEditingOption = (id: string) => editing?.type === "option" && editing.id === id
    const canAddOption = question?.questionType !== "true_false"

    return (
        <Card className={cn(
            "flex flex-col min-h-0 overflow-hidden",
            "transition-[width,opacity] duration-300 ease-in-out",
            ordering ? "w-0 opacity-0 pointer-events-none" : "flex-1 opacity-100",
        )}>
            {/* Header */}
            <CardHeader className="shrink-0 border-b">
                {question ? (
                    <>
                        <CardTitle className="text-md font-medium text-muted-foreground">
                            {t('question.number', { number: question.index + 1 })}
                        </CardTitle>
                        <CardAction className="flex justify-center items-center gap-1.5">
                            <Select
                                value={question.questionType}
                                onValueChange={(v) => handleTypeChange(v as QuestionType)}
                                disabled={isMutating}
                            >
                                <SelectTrigger size="sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {questionTypes?.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {t(type?.label)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Divider */}
                            <div className="w-px h-4 bg-border mx-0.5" />
                            <TooltipWrapper
                                trigger={
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        disabled={isMutating}
                                        onClick={handleRegenerateQuestion}
                                    >
                                        {regenerateQuestion.isPending
                                            ? <Loader2 className="size-3.5 animate-spin" />
                                            : <RotateCcw className="size-3.5" />
                                        }
                                    </Button>
                                }
                                content={t("editor.regenerate")}
                                side="bottom"
                            />

                            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                            <Button size="icon-sm" disabled={isMutating}>
                                                {customInstruction.isPending
                                                    ? <Loader2 className="size-3.5 animate-spin" />
                                                    : <Sparkles className="size-3.5" />
                                                }
                                            </Button>
                                        </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">{t('editor.changeWithAI')}</TooltipContent>
                                </Tooltip>
                                <PopoverContent className="w-72" side="bottom" align="end">
                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <p className="text-sm font-medium">{t('editor.popoverTitle')}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{t('editor.popoverDescription')}</p>
                                        </div>
                                        <Textarea
                                            autoFocus
                                            value={instruction}
                                            onChange={(e) => setInstruction(e.target.value)}
                                            placeholder={t('editor.popoverPlaceholder')}
                                            className="text-sm resize-none"
                                            rows={3}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && (isMac ? e.metaKey : e.ctrlKey)) {
                                                    e.preventDefault()
                                                    handleChangeWithAI()
                                                }
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handleChangeWithAI}
                                            disabled={!instruction.trim() || customInstruction.isPending}
                                            className="gap-1.5 self-end"
                                        >
                                            {customInstruction.isPending
                                                ? <Loader2 className="size-3.5 animate-spin" />
                                                : <Sparkles className="size-3.5" />
                                            }
                                            {t('editor.changeWithAI')}
                                            <Kbd>{isMac ? t("editor.popoverSubmitKeyMac") : t("editor.popoverSubmitKeyWindows")}</Kbd>
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </CardAction>
                    </>
                ) : (
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t('question.label')}
                    </CardTitle>
                )}
            </CardHeader>

            <CardContent
                className="flex-1 overflow-y-auto px-4 py-4"
                dir={dir}
            >
                {/* ── No question selected ── */}
                {!question ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground animate-in fade-in-0 zoom-in-95 duration-300">
                        <div className="p-3 rounded-full bg-muted">
                            <FileQuestion className="size-6 opacity-40" />
                        </div>
                        <p className="text-sm">{t('editor.noQuestionSelectedDescription')}</p>
                    </div>
                ) : (
                    /*
                     * Key on question.id — React will unmount/remount this node
                     * whenever the selected question changes, triggering the entrance animation.
                     */
                    <div
                        key={question.id}
                        className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-3 duration-250 ease-out"
                        style={{ animationFillMode: "both" }}
                    >
                        {/* ── Question text ── */}
                        {isEditingQuestion ? (
                            <div className="flex flex-col gap-2 animate-in fade-in-0 slide-in-from-top-1 duration-150">
                                <Textarea
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") handleCancelEdit()
                                        if (e.key === "Enter" && (isMac ? e.metaKey : e.ctrlKey)) {
                                            e.preventDefault()
                                            handleSaveEdit()
                                        }
                                    }}
                                    disabled={updateQuestion.isPending}
                                    className="text-base font-semibold resize-none leading-snug"
                                    rows={3}
                                />
                                <div className="flex gap-1.5 self-end">
                                    <TooltipWrapper
                                        trigger={
                                            <Button
                                                size="icon-sm"
                                                onClick={handleSaveEdit}
                                                disabled={updateQuestion.isPending}
                                            >
                                                {updateQuestion.isPending
                                                    ? <Loader2 className="size-3 animate-spin" />
                                                    : <Check className="size-3" />
                                                }
                                            </Button>
                                        }
                                        content={t('editor.save')}
                                    />
                                    <TooltipWrapper
                                        trigger={
                                            <Button size="icon-sm" variant="outline" onClick={handleCancelEdit} title="Cancel">
                                                <X className="size-3" />
                                            </Button>
                                        }
                                        content={t('editor.cancel')}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div
                                className="group/question flex items-start gap-2 cursor-text rounded-lg -mx-2 px-2 py-1.5 hover:bg-muted/50 transition-colors duration-150"
                                onDoubleClick={handleStartEditQuestion}
                                title={t('editor.questionDoubleClick')}
                            >
                                <p className="flex-1 text-base font-semibold leading-snug">
                                    {question.questionText}
                                </p>
                                <TooltipWrapper
                                    trigger={
                                        <Button
                                            size="icon-sm"
                                            variant="ghost"
                                            className="shrink-0 opacity-0 group-hover/question:opacity-100 transition-opacity duration-150 mt-0.5"
                                            tabIndex={-1}
                                        >
                                            <PenSquare className="size-3.5" />
                                        </Button>
                                    }
                                    content={t('editor.questionEdit')}
                                />
                            </div>
                        )}

                        {/* ── Options ── */}
                        <div className="flex flex-col gap-2">
                            {question.options?.map((o, idx) => (
                                <Item
                                    key={o?.id}
                                    variant="outline"
                                    className={cn(
                                        "w-full transition-all duration-200 ease-in-out group/option",
                                        "animate-in fade-in-0 slide-in-from-bottom-2",
                                        o?.isCorrect
                                            ? "border-success/50 bg-success/5"
                                            : "hover:border-border",
                                    )}
                                    size="sm"
                                    style={{
                                        animationDelay: `${idx * 50}ms`,
                                        animationFillMode: "both",
                                        animationDuration: "200ms",
                                    }}
                                >
                                    {/* Option label */}
                                    <ItemMedia className="shrink-0">
                                        <Badge variant="outline" className={cn(
                                            "size-6 rounded transition-colors duration-150",
                                            o?.isCorrect
                                                ? "bg-success border-success text-success-foreground"
                                                : "border-border text-muted-foreground"
                                        )}>
                                            {getLabel(idx) ?? idx + 1}
                                        </Badge>
                                    </ItemMedia>

                                    <ItemContent className="flex-1 min-w-0">
                                        {isEditingOption(o?.id) ? (
                                            <Input
                                                autoFocus
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleSaveEdit()
                                                    if (e.key === "Escape") handleCancelEdit()
                                                }}
                                                disabled={updateOption.isPending}
                                                className="h-7 text-sm animate-in fade-in-0 duration-150"
                                            />
                                        ) : (
                                            <ItemTitle className={cn(
                                                "text-sm",
                                                o?.isCorrect && "text-foreground font-medium"
                                            )}>
                                                {o?.optionText}
                                            </ItemTitle>
                                        )}
                                    </ItemContent>

                                    <ItemActions className="shrink-0 gap-1">
                                        {isEditingOption(o?.id) ? (
                                            <>
                                                <TooltipWrapper
                                                    trigger={
                                                        <Button
                                                            size="icon-xs"
                                                            onClick={handleSaveEdit}
                                                            disabled={updateOption.isPending}
                                                        >
                                                            {updateOption.isPending
                                                                ? <Loader2 className="size-3 animate-spin" />
                                                                : <Check className="size-3" />
                                                            }
                                                        </Button>
                                                    }
                                                    content={t('editor.save')}
                                                />
                                                <TooltipWrapper
                                                    trigger={
                                                        <Button size="icon-xs" variant="outline" onClick={handleCancelEdit}>
                                                            <X className="size-3" />
                                                        </Button>
                                                    }
                                                    content={t('editor.cancel')}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <TooltipWrapper
                                                    trigger={
                                                        <Button
                                                            size="icon-xs"
                                                            variant="ghost"
                                                            className="opacity-0 group-hover/option:opacity-100 transition-opacity duration-150"
                                                            onClick={() => handleStartEditOption(o?.id, o?.optionText)}
                                                            disabled={isMutating}
                                                            tabIndex={-1}
                                                        >
                                                            <PenSquare className="size-3" />
                                                        </Button>
                                                    }
                                                    content={t('editor.optionEdit')}
                                                />
                                                <TooltipWrapper
                                                    trigger={
                                                        <Button
                                                            size="icon-xs"
                                                            variant={o?.isCorrect ? "default" : "outline"}
                                                            className={cn(
                                                                "transition-all duration-150",
                                                                o?.isCorrect
                                                                    ? "bg-success border-success hover:bg-success/80 text-success-foreground"
                                                                    : "opacity-0 group-hover/option:opacity-100",
                                                            )}
                                                            onClick={() => handleToggleCorrect(o?.id, o?.isCorrect)}
                                                            disabled={isMutating}
                                                        >
                                                            <CheckCircle2 className="size-3" />
                                                        </Button>
                                                    }
                                                    content={o?.isCorrect ? t("editor.optionMarkAsIncorrect") : t("editor.optionMarkAsCorrect")}
                                                />
                                            </>
                                        )}
                                    </ItemActions>
                                </Item>
                            ))}

                            {/* ── Add distractor skeleton while pending ── */}
                            {addDistractor.isPending && (
                                <Item
                                    variant="outline"
                                    className="w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-200 opacity-60"
                                    size="sm"
                                    style={{ animationFillMode: "both" }}
                                >
                                    <ItemMedia className="shrink-0">
                                        <div className="size-6 rounded border border-border/50 bg-muted animate-pulse" />
                                    </ItemMedia>
                                    <ItemContent className="flex-1 min-w-0">
                                        <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
                                    </ItemContent>
                                </Item>
                            )}
                        </div>

                        {/* ── Add option / add distractor ── */}
                        {canAddOption && (
                            <div
                                className="animate-in fade-in-0 duration-300"
                                style={{ animationDelay: `${(question.options?.length ?? 0) * 50 + 50}ms`, animationFillMode: "both" }}
                            >
                                <TooltipWrapper
                                    trigger={
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-150"
                                            onClick={handleAddDistractor}
                                            disabled={isMutating}
                                        >
                                            {addDistractor.isPending
                                                ? <Loader2 className="size-3.5 animate-spin" />
                                                : <PlusCircle className="size-3.5" />
                                            }
                                            {addDistractor.isPending
                                                ? t('editableQuestion.addingDistractor')
                                                : t('editableQuestion.addDistractor')
                                            }
                                        </Button>
                                    }
                                    content={t('editableQuestion.addDistractor')}
                                    side="bottom"
                                />
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default QuestionPanel