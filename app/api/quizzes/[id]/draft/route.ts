import { db } from "@/db";
import { draft, quiz } from "@/db/schema";
import { auth } from "@/lib/auth";
import { uuidParamSchema } from "@/lib/validators";
import { and, desc, eq } from "drizzle-orm";
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

    // Verify the quiz belongs to the current user
    const quizExists = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
        columns: { id: true },
    });

    if (!quizExists) {
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Fetch the latest draft
    const latestDraft = await db.query.draft.findFirst({
        where: eq(draft.quizId, id),
        orderBy: [desc(draft.createdAt)],
    });

    if (!latestDraft) {
        return NextResponse.json({ error: "No draft found" }, { status: 404 });
    }

    return NextResponse.json(latestDraft);
}