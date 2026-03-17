import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { apiLogger } from "@/lib/logger";

const TIMEOUT_MS = 5 * 60 * 1000;

function resultKey(quizId: string, language: string) {
    return `quiz:${quizId}:translate:result:${language}`;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: quizId } = await params;

    // language query param lets us do a targeted fallback read from Redis.
    // Sent by the hook as ?language=fr (etc.)
    const language = req.nextUrl.searchParams.get("language");

    const log = apiLogger("/api/quizzes/[id]/translate/status GET", session.user.id);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let closed = false;
            // eslint-disable-next-line prefer-const
            let timeoutHandle: ReturnType<typeof setTimeout>;

            const send = (data: object) => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch { }
            };

            const close = async (subscriber?: Redis) => {
                if (closed) return;
                closed = true;
                clearTimeout(timeoutHandle);
                if (subscriber) {
                    try {
                        await subscriber.unsubscribe();
                        await subscriber.quit();
                    } catch { }
                }
                try { controller.close(); } catch { }
            };

            const subscriber = new Redis(
                process.env.REDIS_URL ?? "redis://localhost:6379",
                { maxRetriesPerRequest: null, enableReadyCheck: false }
            );

            timeoutHandle = setTimeout(() => {
                log.warn({ quizId }, "Translation SSE timed out");
                send({ success: false, error: "Timed out" });
                close(subscriber);
            }, TIMEOUT_MS);

            subscriber.on("message", async (_channel, message) => {
                send(JSON.parse(message));
                await close(subscriber);
            });

            subscriber.on("error", async (err) => {
                log.error({ quizId, err }, "Translation SSE Redis error");
                await close(subscriber);
            });

            await subscriber.subscribe(`quiz:${quizId}:translate`);

            // ── Race-condition fallback ──────────────────────────────────────
            // The worker may have finished and published BEFORE this EventSource
            // connection was established (POST → worker finishes → EventSource
            // connects). Check the result key the worker stores for exactly this.
            if (language) {
                try {
                    const cached = await subscriber.get(resultKey(quizId, language));
                    if (cached) {
                        log.debug({ quizId, language }, "Translation SSE — hit cached result");
                        send(JSON.parse(cached));
                        await close(subscriber);
                        return;
                    }
                } catch (err) {
                    // Non-fatal: fall through and wait for the pub/sub message
                    log.warn({ quizId, language, err }, "Translation SSE — fallback Redis read failed");
                }
            }
            // ────────────────────────────────────────────────────────────────

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