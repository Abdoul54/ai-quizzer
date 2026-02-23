import { db } from "@/db";
import { quiz } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const found = await db.query.quiz.findFirst({
        where: eq(quiz.id, id),
        with: {
            questions: {
                with: { options: true },
            },
        },
    });

    if (!found) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (found.status !== "published") return NextResponse.json({ error: "Quiz not available" }, { status: 403 });

    return NextResponse.json(found);
}