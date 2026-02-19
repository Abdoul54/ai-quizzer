// app/api/quizzes/[id]/conversation/route.ts
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: quizId } = await params;

    const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.quizId, quizId),
        with: {
            quiz: {
                columns: { title: true },
            },
            messages: {
                orderBy: (msg, { asc }) => [asc(msg.createdAt)],
            },
        },
    });
    if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
}