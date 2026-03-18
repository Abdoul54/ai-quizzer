import { db } from "@/db";
import { quiz } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createQuizSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { quizQueue } from "@/lib/queue";
import { apiLogger } from "@/lib/logger";
import { quizCreateRateLimit } from "@/lib/rate-limit";

export async function GET() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const log = apiLogger("/api/quizzes GET", session.user.id);

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

    log.debug({ count: quizzes.length }, "Quizzes fetched");

    return NextResponse.json(quizzes);
}

export async function POST(req: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const log = apiLogger("/api/quizzes POST", session.user.id);

    // ── Rate limit ────────────────────────────────────────────────────────────
    const limited = await quizCreateRateLimit(session.user.id);
    if (limited) {
        log.warn("Quiz creation rate limit exceeded");
        return limited;
    }

    const body = await req.json();
    const parsed = createQuizSchema.safeParse(body);

    if (!parsed.success) {
        log.warn({ errors: parsed.error.flatten() }, "Quiz creation validation failed");
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { documentIds, questionCount, difficulty, questionTypes, defaultLanguage } = parsed.data;

    log.info({
        documentCount: documentIds?.length ?? 0,
        questionCount: questionCount ?? 10,
        difficulty: difficulty ?? "medium",
        questionTypes: questionTypes ?? ["true_false", "single_choice"],
        language: defaultLanguage,
    }, "Quiz creation requested");

    // Insert quiz shell with "queued" status
    const [created] = await db
        .insert(quiz)
        .values({
            userId: session.user.id,
            ...parsed.data,
            questionCount: questionCount ?? 10,
            difficulty: difficulty ?? "medium",
            questionTypes: questionTypes ?? ["true_false", "single_choice"],
            status: "queued",
        })
        .returning();

    // Enqueue — idempotent: same quiz can't be queued twice
    await quizQueue.add(
        "generate",
        { quizId: created.id, input: parsed.data },
        { jobId: created.id }
    );

    log.info({ quizId: created.id }, "Quiz queued for generation");

    return NextResponse.json({ quizId: created.id }, { status: 202 });
}