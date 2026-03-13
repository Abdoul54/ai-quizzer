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
        <Card className={cn("flex-1", ordering ? "hidden" : "col-span-4 flex flex-col")}>
            {/* Header */}
            <CardHeader className="shrink-0 border-b">
                {question ? (
                    <>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
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
                                                    : <Sparkles className="size-3.5" />}
                                            </Button>
                                        </PopoverTrigger>
                                    </TooltipTrigger>

                                    <TooltipContent side="bottom">
                                        {t("editor.changeWithAI")}
                                    </TooltipContent>
                                </Tooltip>
                                <PopoverContent className="w-80" align="end">
                                    <div className="grid gap-3">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium">{t("editor.popoverTitle")}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {t("editor.popoverDescription")}
                                            </p>
                                        </div>
                                        <Textarea
                                            placeholder={t("editor.popoverPlaceholder")}
                                            value={instruction}
                                            onChange={(e) => setInstruction(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleChangeWithAI()
                                            }}
                                            rows={3}
                                            className="resize-none text-sm"
                                        />
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground"><Kbd>{isMac ? t("editor.popoverSubmitKeyMac") : t("editor.popoverSubmitKeyWindows")}</Kbd> to submit</p>
                                            <Button
                                                size="sm"
                                                onClick={handleChangeWithAI}
                                                disabled={!instruction.trim() || customInstruction.isPending}
                                            >
                                                {customInstruction.isPending ? (
                                                    <><Loader2 className="size-3.5 animate-spin mr-1.5" />{t("editor.popoverSubmitting")}</>
                                                ) : t("editor.popoverSubmit")}
                                            </Button>
                                        </div>
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

            {/* Content */}
            <CardContent className="flex-1 overflow-y-auto p-5" dir={dir}>
                {!question ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground select-none">
                        <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
                            <FileQuestion className="size-6 opacity-40" />
                        </div>
                        <p className="text-sm text-center leading-relaxed">
                            {t("editor.noQuestionSelectedDescription")}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {/* Question text */}
                        {isEditingQuestion ? (
                            <div className="flex items-start gap-2">
                                <Input
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveEdit()
                                        if (e.key === "Escape") handleCancelEdit()
                                    }}
                                    className="flex-1 text-base font-semibold"
                                    disabled={updateQuestion.isPending}
                                />

                                <TooltipWrapper
                                    trigger={
                                        <Button size="icon-sm" variant="outline" onClick={handleSaveEdit} disabled={updateQuestion.isPending} title="Save">
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
                        ) : (
                            <div
                                className="group/question flex items-start gap-2 cursor-text rounded-lg -mx-2 px-2 py-1.5 hover:bg-muted/50 transition-colors"
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
                                            className="shrink-0 opacity-0 group-hover/question:opacity-100 transition-opacity mt-0.5"
                                            tabIndex={-1}
                                        >
                                            <PenSquare className="size-3.5" />
                                        </Button>
                                    }
                                    content={t('editor.questionEdit')}
                                />
                            </div>
                        )}

                        {/* Options */}
                        <div className="flex flex-col gap-2">
                            {question.options?.map((o, idx) => (
                                <Item
                                    key={o?.id}
                                    variant="outline"
                                    className={cn(
                                        "w-full transition-all duration-150 group/option",
                                        o?.isCorrect
                                            ? "border-success/50 bg-success/5"
                                            : "hover:border-border"
                                    )}
                                    size="sm"
                                >
                                    {/* Option label */}
                                    <ItemMedia className="shrink-0">
                                        <Badge variant="outline" className={cn(
                                            "size-6 rounded transition",
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
                                                className="h-7 text-sm"
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
                                                        <Button size="icon-sm" variant="outline" onClick={handleSaveEdit} disabled={updateOption.isPending}>
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
                                                        <Button size="icon-sm" variant="outline" onClick={handleCancelEdit}>
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
                                                            size="icon-sm"
                                                            variant={o?.isCorrect ? "default" : "outline"}
                                                            className={cn(
                                                                "transition-all",
                                                                o?.isCorrect
                                                                    ? "bg-success hover:bg-success/90 border-success"
                                                                    : "opacity-0 group-hover/option:opacity-100"
                                                            )}
                                                            disabled={isMutating}
                                                            onClick={() => handleToggleCorrect(o.id, o.isCorrect)}
                                                        >
                                                            <CheckCircle2 className={cn(
                                                                "size-3.5",
                                                                o?.isCorrect ? "stroke-white" : "stroke-success"
                                                            )} />
                                                        </Button>
                                                    }
                                                    content={o?.isCorrect ? t("editor.optionMarkAsIncorrect") : t("editor.optionMarkAsCorrect")}
                                                />
                                                <TooltipWrapper
                                                    trigger={<Button
                                                        size="icon-sm"
                                                        variant="outline"
                                                        className="opacity-0 group-hover/option:opacity-100 transition-opacity"
                                                        onClick={() => handleStartEditOption(o?.id, o?.optionText)}
                                                        disabled={isMutating}
                                                    >
                                                        <PenSquare className="size-3.5" />
                                                    </Button>}
                                                    content={t('editor.optionEdit')}
                                                />
                                            </>
                                        )}
                                    </ItemActions>
                                </Item>
                            ))}

                            {canAddOption && (
                                <button
                                    onClick={handleAddDistractor}
                                    disabled={isMutating}
                                    className={cn(
                                        "flex items-center justify-center gap-2 w-full py-2 rounded-md border border-dashed",
                                        "text-sm text-muted-foreground transition-all duration-150",
                                        isMutating
                                            ? "opacity-50 cursor-not-allowed border-border"
                                            : "hover:border-primary/40 hover:text-foreground hover:bg-muted/30 cursor-pointer border-border"
                                    )}
                                    dir="ltr"
                                >
                                    {addDistractor.isPending
                                        ? <Loader2 className="size-3.5 animate-spin" />
                                        : <PlusCircle className="size-3.5" />
                                    }
                                    <span>{addDistractor.isPending ? t('editor.distractorAdding') : t('editor.distractorAdd')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default QuestionPanel