import { db } from "@/db";
import { conversations, quiz } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createQuizSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { architect } from "@/agents/architect";
import { builder } from "@/agents/builder";

export async function GET() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizzes = await db.query.quiz.findMany({
        where: eq(quiz.userId, session.user.id),
        orderBy: (quiz, { desc }) => [desc(quiz.createdAt)],
        with: {
            questions: {
                with: {
                    options: true,
                },
            },
        },
    });

    return NextResponse.json(quizzes);
}

export async function POST(req: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createQuizSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, data: object) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            try {
                // Step 0 — Save quiz shell to DB
                send("progress", { step: 0 });
                const [created] = await db.insert(quiz)
                    .values({ userId: session.user.id, ...parsed.data })
                    .returning();

                await db.insert(conversations).values({ quizId: created.id });

                // Step 1 — Architect agent
                send("progress", { step: 1 });
                const architecture = await architect({
                    documents: parsed.data.documentIds ?? [],
                    topic: parsed.data.topic,
                    questionCount: parsed.data.questionCount,
                    difficulty: parsed.data.difficulty,
                    questionTypes: parsed.data.questionTypes,
                    language: parsed.data.language,
                    additionalPrompt: parsed.data.additionalPrompt,
                });
                await db.update(quiz).set({ architecture }).where(eq(quiz.id, created.id));

                console.log(architecture);

                // Step 2 — Builder agent
                send("progress", { step: 2 });
                await builder({ quizId: created.id, architecture });

                send("done", { quizId: created.id });
            } catch (err) {
                send("error", { message: err instanceof Error ? err.message : "Something went wrong" });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
