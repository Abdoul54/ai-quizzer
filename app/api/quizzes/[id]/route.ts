import { db } from "@/db";
import { quiz } from "@/db/schema";
import { auth } from "@/lib/auth";
import { updateQuizSchema, uuidParamSchema } from "@/lib/validators";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = uuidParamSchema.safeParse(await params);

    if (!parsedParams.success) {
        return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    const { id } = parsedParams.data;

    const found = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
        with: {
            questions: {
                with: {
                    options: true,
                },
            },
            uploadedDocuments: true,
            conversations: {
                with: {
                    messages: true,
                },
            },
        },
    });

    if (!found) {
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json(found);
}

export async function PATCH(req: NextRequest, { params }: Params) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = uuidParamSchema.safeParse(await params);

    if (!parsedParams.success) {
        return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    const { id } = parsedParams.data;

    const body = await req.json();
    const parsed = updateQuizSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const existing = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
    });

    if (!existing) {
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const [updated] = await db
        .update(quiz)
        .set(parsed.data)
        .where(and(eq(quiz.id, id), eq(quiz.userId, session.user.id)))
        .returning();

    return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = uuidParamSchema.safeParse(await params);

    if (!parsedParams.success) {
        return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    const { id } = parsedParams.data;

    const existing = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
    });

    if (!existing) {
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    await db
        .delete(quiz)
        .where(and(eq(quiz.id, id), eq(quiz.userId, session.user.id)));

    return new NextResponse(null, { status: 204 });
}