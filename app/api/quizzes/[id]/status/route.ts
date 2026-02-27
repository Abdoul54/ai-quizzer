import { db } from "@/db";
import { quiz } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Redis from "ioredis";
import type { InferSelectModel } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";

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

const SSE_TIMEOUT_MS = 12 * 60 * 1000; // 12 minutes

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const log = apiLogger("/api/quizzes/[id]/status GET", session.user.id);
    const encoder = new TextEncoder();

    const found = await db.query.quiz.findFirst({
        where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
        columns: { status: true, errorMessage: true },
    });

    if (!found) {
        log.warn({ quizId: id }, "Status SSE — quiz not found");
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Fast path — already terminal
    if (TERMINAL_STATUSES.has(found.status)) {
        log.debug({ quizId: id, status: found.status }, "Status SSE — already terminal, returning immediately");
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(`: \n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    status: found.status,
                    step: STATUS_TO_STEP[found.status],
                    errorMessage: found.errorMessage ?? null,
                })}\n\n`));
                controller.close();
            },
        });
        return new Response(stream, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
        });
    }

    log.debug({ quizId: id, currentStatus: found.status }, "Status SSE — subscribing for updates");

    const stream = new ReadableStream({
        async start(controller) {
            let closed = false;
            // eslint-disable-next-line prefer-const
            let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

            const send = (status: QuizStatus, step: number, errorMessage?: string | null) => {
                if (closed) return;
                controller.enqueue(encoder.encode(`: \n`));
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

            const subscriber = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            });

            timeoutHandle = setTimeout(() => {
                log.warn({ quizId: id, timeoutMs: SSE_TIMEOUT_MS }, "Status SSE timed out — closing subscriber");
                close(subscriber);
            }, SSE_TIMEOUT_MS);

            subscriber.on("message", async (_channel, message) => {
                const data = JSON.parse(message) as {
                    status: QuizStatus;
                    step: number;
                    errorMessage?: string;
                };
                log.debug({ quizId: id, status: data.status, step: data.step }, "Status SSE — received update");
                send(data.status, data.step, data.errorMessage);
                if (TERMINAL_STATUSES.has(data.status)) {
                    log.info({ quizId: id, status: data.status }, "Status SSE — terminal status reached, closing");
                    await close(subscriber);
                }
            });

            subscriber.on("error", async (err) => {
                log.error({ quizId: id, err }, "Status SSE — Redis subscriber error");
                await close(subscriber);
            });

            await subscriber.subscribe(`quiz:${id}:status`);

            // Re-read DB — catches status that changed between initial read and subscribe
            const latest = await db.query.quiz.findFirst({
                where: and(eq(quiz.id, id), eq(quiz.userId, session.user.id)),
                columns: { status: true, errorMessage: true },
            });

            const currentStatus = latest?.status ?? found.status;
            const currentError = latest?.errorMessage ?? found.errorMessage;

            send(currentStatus, STATUS_TO_STEP[currentStatus], currentError);

            if (TERMINAL_STATUSES.has(currentStatus)) {
                log.debug({ quizId: id, status: currentStatus }, "Status SSE — already terminal on recheck, closing");
                await close(subscriber);
                return;
            }

            req.signal.addEventListener("abort", () => {
                log.debug({ quizId: id }, "Status SSE — client disconnected");
                close(subscriber);
            });
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