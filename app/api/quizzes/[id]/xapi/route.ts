import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import {
    statementLaunchedQuiz,
    statementAnsweredQuestion,
    statementCompletedQuiz,
} from "@/lib/xapi/statements";
import { z } from "zod";

const bodySchema = z.discriminatedUnion("event", [
    z.object({
        event: z.literal("launched"),
        quiz: z.object({ id: z.string(), title: z.string() }),
    }),
    z.object({
        event: z.literal("answered"),
        quiz: z.object({ id: z.string(), title: z.string() }),
        question: z.object({ id: z.string(), text: z.string() }),
        response: z.string(),
        correct: z.boolean(),
    }),
    z.object({
        event: z.literal("completed"),
        quiz: z.object({ id: z.string(), title: z.string() }),
        score: z.number(),
        total: z.number(),
        durationSeconds: z.number(),
    }),
]);

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id: quizId } = await params;
    void quizId; // available if you need it for logging

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

    const actor = { name: session.user.name, email: session.user.email };
    const data = parsed.data;

    if (data.event === "launched") {
        await statementLaunchedQuiz(actor, data.quiz);
    } else if (data.event === "answered") {
        await statementAnsweredQuestion(actor, data.quiz, data.question, data.response, data.correct);
    } else if (data.event === "completed") {
        await statementCompletedQuiz(actor, data.quiz, data.score, data.total, data.durationSeconds);
    }

    return Response.json({ ok: true });
}