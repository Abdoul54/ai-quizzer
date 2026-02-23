'use client'

import Chat from "@/components/chat"
import EditablePreview from "@/components/editable-preview"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useApproveQuiz } from "@/hooks/api/use-approve-quiz"
import { useQuizConversation } from "@/hooks/api/use-quiz"
import { useSetBreadcrumbs } from "@/hooks/use-set-breadcrumbs"
import { CheckCheck } from "lucide-react"
import { useParams } from "next/navigation"


const Page = () => {
    const { id } = useParams()

    const { data } = useQuizConversation(String(id))
    const approveQuiz = useApproveQuiz(String(id));


    useSetBreadcrumbs([
        { label: "Home", href: "/" },
        { label: "Quizzes", href: "/quizzes" },
        { label: data?.quiz?.title || String(id), href: `/quizzes/${id}` },
        { label: "Conversation" }
    ]);

    console.log(data?.quiz);

    return (
        <div className="flex flex-col h-full gap-2">
            <div className="flex  justify-between items-center" >
                <div className="text-xl line-clamp-1 font-semibold">
                    {data?.quiz?.title}
                </div>
                <Button
                    onClick={() => approveQuiz.mutate()}
                    disabled={approveQuiz.isPending}
                    className="gap-2"
                >
                    <CheckCheck className="w-4 h-4" />
                    {approveQuiz.isPending ? "Approving..." : "Approve quiz"}
                </Button>
            </div>
            <div className="flex-1 flex gap-2">
                <Card className="flex-1">
                    <CardContent className="h-full">
                        <Chat quizId={String(id)} />
                    </CardContent>
                </Card>
                <Card className="flex-1 bg-transparent p-2">
                    <EditablePreview id={String(id)} />
                </Card>
            </div>
        </div>
    )
}

export default Page