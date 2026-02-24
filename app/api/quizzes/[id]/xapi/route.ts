// /api/quizzes/[id]/xapi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    statementLaunchedQuiz,
    statementAnsweredQuestion,
    statementCompletedQuiz,
    statementSelectedOption,
} from "@/lib/xapi/statements";

// You need the actor — get it from the session
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const schema = z.discriminatedUnion("event", [
    z.object({
        event: z.literal("launched"),
        quiz: z.object({ id: z.string(), title: z.string() }),
    }),
    z.object({
        event: z.literal("selected"),
        quiz: z.object({ id: z.string(), title: z.string() }),
        question: z.object({ id: z.string(), text: z.string() }),
        response: z.string(),
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

    const actor = { name: session.user.name!, email: session.user.email! };

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    switch (data.event) {
        case "launched":
            await statementLaunchedQuiz(actor, data.quiz);
            break;
        case "selected":
            await statementSelectedOption(actor, data.quiz, data.question, data.response);
            break;
        case "answered":
            await statementAnsweredQuestion(actor, data.quiz, data.question, data.response, data.correct);
            break;
        case "completed":
            await statementCompletedQuiz(actor, data.quiz, data.score, data.total, data.durationSeconds);
            break;
    }

    return NextResponse.json({ ok: true });
}