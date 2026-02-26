import { db } from "@/db";
import { quiz } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Redis from "ioredis";
import type { InferSelectModel } from "drizzle-orm";

type QuizStatus = InferSelectModel<typeof quiz>["status"];

const TERMINAL_STATUSES = new Set<QuizStatus>(["draft", "published", "archived", "failed"]);

const STATUS_TO_STEP: Record<QuizStatus, number> = {
    queued: 0,
    architecting: 1,
    building: 2,
    draft: 3,
    published: 3,
    archived: 3,
    failed: -1,
};

// Max time to hold an SSE connection open.
// Prevents leaked subscriber connections if the client disconnects uncleanly.
const SSE_TIMEOUT_MS = 12 * 60 * 1000; // 12 minutes (job timeout is 10)

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const encoder = new TextEncoder();

    const found = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
        columns: { status: true, errorMessage: true },
    });

    if (!found) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    const stream = new ReadableStream({
        async start(controller) {
            let closed = false;
            // eslint-disable-next-line prefer-const
            let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

            const send = (status: QuizStatus, step: number, errorMessage?: string | null) => {
                if (closed) return;
                controller.enqueue(encoder.encode(`: \n`)); // forces Next.js to flush immediately
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    status,
                    step,
                    errorMessage: errorMessage ?? null,
                })}\n\n`));
            };

            const close = async (subscriber?: Redis) => {
                if (closed) return;
                closed = true;
                clearTimeout(timeoutHandle);
                if (subscriber) {
                    try { await subscriber.unsubscribe(); await subscriber.quit(); } catch { }
                }
                try { controller.close(); } catch { }
            };

            // Fast path — already terminal before stream opens
            if (TERMINAL_STATUSES.has(found.status)) {
                send(found.status, STATUS_TO_STEP[found.status], found.errorMessage);
                await close();
                return;
            }

            const subscriber = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            });

            // Hard timeout — closes subscriber even if the client disconnected
            // uncleanly and the abort signal never fired
            timeoutHandle = setTimeout(() => {
                console.warn(`[status-sse] Timeout reached for quiz ${id}, closing subscriber`);
                close(subscriber);
            }, SSE_TIMEOUT_MS);

            // ── Order matters ────────────────────────────────────────────────
            // 1. Attach handler FIRST — no published message can be dropped
            subscriber.on("message", async (_channel, message) => {
                const data = JSON.parse(message) as {
                    status: QuizStatus;
                    step: number;
                    errorMessage?: string;
                };
                send(data.status, data.step, data.errorMessage);
                if (TERMINAL_STATUSES.has(data.status)) {
                    await close(subscriber);
                }
            });

            subscriber.on("error", async (err) => {
                console.error("[status-sse] Redis subscriber error:", err);
                await close(subscriber);
            });

            // 2. Subscribe
            await subscriber.subscribe(`quiz:${id}:status`);

            // 3. Re-read DB — catches status that changed between initial read and subscribe
            const latest = await db.query.quiz.findFirst({
                where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
                columns: { status: true, errorMessage: true },
            });

            const currentStatus = latest?.status ?? found.status;
            const currentError = latest?.errorMessage ?? found.errorMessage;

            send(currentStatus, STATUS_TO_STEP[currentStatus], currentError);

            if (TERMINAL_STATUSES.has(currentStatus)) {
                await close(subscriber);
                return;
            }

            // Clean up on client disconnect
            req.signal.addEventListener("abort", () => close(subscriber));
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