import { db } from "@/db";
import { quiz } from "@/db/schema";
import { auth } from "@/lib/auth";
import { updateQuizSchema, uuidParamSchema } from "@/lib/validators";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { apiLogger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const log = apiLogger("/api/quizzes/[id] GET", session.user.id);

    const parsedParams = uuidParamSchema.safeParse(await params);
    if (!parsedParams.success) {
        log.warn({ errors: parsedParams.error.flatten() }, "Invalid quiz ID");
        return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    const { id } = parsedParams.data;

    const found = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
        with: {
            questions: { with: { options: true } },
            conversations: { with: { messages: true } },
        },
    });

    if (!found) {
        log.warn({ quizId: id }, "Quiz not found");
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json(found);
}

export async function PATCH(req: NextRequest, { params }: Params) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const log = apiLogger("/api/quizzes/[id] PATCH", session.user.id);

    const parsedParams = uuidParamSchema.safeParse(await params);
    if (!parsedParams.success) {
        log.warn({ errors: parsedParams.error.flatten() }, "Invalid quiz ID");
        return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    const { id } = parsedParams.data;

    const body = await req.json();
    const parsed = updateQuizSchema.safeParse(body);
    if (!parsed.success) {
        log.warn({ quizId: id, errors: parsed.error.flatten() }, "Quiz update validation failed");
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
    });

    if (!existing) {
        log.warn({ quizId: id }, "Quiz not found for update");
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const [updated] = await db
        .update(quiz)
        .set(parsed.data)
        .where(and(eq(quiz.id, id), eq(quiz.userId, session.user.id)))
        .returning();

    log.info({ quizId: id, fields: Object.keys(parsed.data) }, "Quiz updated");

    return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const log = apiLogger("/api/quizzes/[id] DELETE", session.user.id);

    const parsedParams = uuidParamSchema.safeParse(await params);
    if (!parsedParams.success) {
        log.warn({ errors: parsedParams.error.flatten() }, "Invalid quiz ID");
        return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    const { id } = parsedParams.data;

    const existing = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
        columns: { id: true, title: true, status: true },
    });

    if (!existing) {
        log.warn({ quizId: id }, "Quiz not found for deletion");
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    await db.delete(quiz).where(and(eq(quiz.id, id), eq(quiz.userId, session.user.id)));

    log.info({ quizId: id, title: existing.title, status: existing.status }, "Quiz deleted");

    return new NextResponse(null, { status: 204 });
}