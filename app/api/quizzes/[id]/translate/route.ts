/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { quiz } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { translationQueue } from "@/lib/queue";
import { apiLogger } from "@/lib/logger";
import { languageCodes } from "@/lib/languages";
import { z } from "zod";
import { redis } from "@/lib/redis";

const bodySchema = z.object({
    language: z.enum(languageCodes),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: quizId } = await params;
    const log = apiLogger("/api/quizzes/[id]/translate POST", session.user.id);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { language } = parsed.data;

    const quizRecord = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, quizId), eq(quiz.userId, session.user.id)),
        columns: { id: true, status: true, languages: true, defaultLanguage: true },
    });

    if (!quizRecord) {
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // ── Guards BEFORE any mutation ──────────────────────────────────────────
    if (quizRecord.status !== "published") {
        return NextResponse.json(
            { error: "Quiz must be published before adding languages" },
            { status: 400 }
        );
    }

    if (quizRecord.languages?.includes(language as any)) {
        return NextResponse.json({ error: "Language already exists" }, { status: 409 });
    }
    // ───────────────────────────────────────────────────────────────────────

    // Optimistically add language to the quiz's languages array
    await db
        .update(quiz)
        .set({ languages: [...(quizRecord.languages ?? []), language] as any })
        .where(eq(quiz.id, quizId));

    const job = await translationQueue.add(
        "translate",
        { quizId, language, userId: session.user.id },
        { jobId: `translate:${quizId}:${language}` }
    );

    // Mark language as in-progress in Redis
    await redis.sadd(`quiz:${quizId}:translating`, language);

    log.info({ quizId, language, jobId: job.id }, "Translation job enqueued");

    return NextResponse.json({ jobId: job.id }, { status: 202 });
}