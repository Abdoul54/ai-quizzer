'use client'

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
    console.log(data);

    return (
        <div className="flex flex-col h-full">
        </div>
    )
}

export default Page