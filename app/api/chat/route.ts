import { db } from "@/db";
import { quiz } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { editor } from "@/agents/editor";

export async function POST(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, quizId } = await req.json();

    // Fetch the quiz to get its scoped documentIds
    const found = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, quizId), eq(quiz.userId, session.user.id)),
        columns: { documentIds: true },
    });

    if (!found) {
        return Response.json({ error: "Quiz not found" }, { status: 404 });
    }

    const result = await editor({ quizId, messages })

    return result.toUIMessageStreamResponse();
}
