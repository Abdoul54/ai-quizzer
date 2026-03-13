'use client'

import { Button } from "@/components/ui/button"
import { CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import TooltipWrapper from "@/components/ui/tooltip-wrapper"
import { useUILanguage } from "@/providers/ui-language-provider"
import { Check, ListOrdered, Loader2, Plus, X } from "lucide-react"

type Props = {
    count: number
    isLoading: boolean
    isAdding: boolean
    ordering: boolean
    isSavingOrder: boolean
    onAdd: () => void
    onCancelOrdering: () => void
    onConfirmOrdering: () => void
}

export const QuestionsHeader = ({ count, isLoading, isAdding, ordering, onAdd, onCancelOrdering, isSavingOrder, onConfirmOrdering }: Props) => {
    const { t } = useUILanguage()

    return (
        <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <CardTitle>{t("questions.label")}</CardTitle>
                {!isLoading && count > 0 && (
                    <span className="text-xs text-muted-foreground font-mono tabular-nums bg-muted px-1.5 py-0.5 rounded-md">
                        {count}
                    </span>
                )}
            </div>
            {ordering ? (
                <CardAction className="flex gap-1">
                    <TooltipWrapper
                        trigger={<Button
                            size="icon-xs"
                            disabled={isSavingOrder}
                            onClick={onConfirmOrdering}
                            className="reverse-rounded-diagonal"
                        >
                            {isSavingOrder ? <Spinner className="size-3.5" /> : <Check className="size-3.5" />}
                        </Button>}
                        content={t('editor.save')}
                        side="bottom"
                    />
                    <TooltipWrapper
                        trigger={<Button size="icon-xs" variant="outline" onClick={onCancelOrdering} disabled={isSavingOrder}><X className="size-3.5" /></Button>}
                        content={t('editor.cancel')}
                        side="bottom"
                    />
                </CardAction>
            ) : (
                <CardAction className="flex gap-1">
                    <TooltipWrapper
                        trigger={
                            <Button size="icon-xs" disabled={isAdding} onClick={onAdd} className="reverse-rounded-diagonal">
                                {isAdding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                            </Button>
                        }
                        content={t('editor.generate')}
                        side="bottom"
                    />
                    <TooltipWrapper
                        trigger={<Button size="icon-xs" onClick={onConfirmOrdering}><ListOrdered className="size-3.5" /></Button>}
                        content={t('editor.order')}
                        side="bottom"
                    />
                </CardAction>
            )}
        </CardHeader>
    )
}