'use client'

import Chat from "@/components/chat"
import { Card, CardContent } from "@/components/ui/card"
import { useQuizConversation } from "@/hooks/api/use-quiz"
import { useSetBreadcrumbs } from "@/hooks/use-set-breadcrumbs"
import { useParams } from "next/navigation"


const Page = () => {
    const { id } = useParams()

    const { data } = useQuizConversation(String(id))

    useSetBreadcrumbs([
        { label: "Home", href: "/" },
        { label: "Quizzes", href: "/quizzes" },
        { label: data?.quiz?.title || String(id), href: `/quizzes/${id}` },
        { label: "Conversation" }
    ]);

    return (
        <div className="flex flex-col h-full gap-2">
            <div className="p-4 bg-gray-100" >
                {data?.quiz?.title}
            </div>
            <div className="flex-1 flex gap-2">
                <Card className="flex-1">
                    <CardContent className="h-full">
                        <Chat />
                    </CardContent>
                </Card>
                <Card className="flex-1 bg-yellow-500">
                </Card>
            </div>
        </div>
    )
}

export default Page