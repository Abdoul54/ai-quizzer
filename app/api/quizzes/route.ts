import { db } from "@/db";
import { conversations, quiz } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createQuizSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { quizQueue } from "@/lib/queue";

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
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createQuizSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Insert quiz shell with "queued" status
    const [created] = await db
        .insert(quiz)
        .values({
            userId: session.user.id,
            ...parsed.data,
            status: "queued",
        })
        .returning();

    await db.insert(conversations).values({ quizId: created.id });

    // Enqueue — job survives tab closes, server restarts, network drops
    await quizQueue.add(
        "generate",
        { quizId: created.id, input: parsed.data },
        { jobId: created.id } // idempotent: same quiz can't be queued twice
    );

    return NextResponse.json({ quizId: created.id }, { status: 202 });
}