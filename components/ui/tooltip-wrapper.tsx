import { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

const TooltipWrapper = ({
    trigger,
    content,
    side,
    props
}: {
    trigger: ReactNode
    content: ReactNode
    side?: "left" | "top" | "bottom" | "right"
    props?: {
        content?: { className?: string }
        trigger?: { className?: string }
    }
}) => {
    return (
        <Tooltip>
            <TooltipTrigger className={props?.trigger?.className} asChild>
                {trigger}
            </TooltipTrigger>

            <TooltipContent
                side={side}
                className={props?.content?.className}
            >
                {content}
            </TooltipContent>
        </Tooltip>
    )
}

export default TooltipWrapper