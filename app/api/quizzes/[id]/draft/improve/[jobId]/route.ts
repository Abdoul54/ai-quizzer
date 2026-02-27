import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { minionResultChannel } from "@/workers/minion.worker";
import { apiLogger } from "@/lib/logger";

const TIMEOUT_MS = 70_000;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; jobId: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: quizId, jobId } = await params;
    const log = apiLogger("/api/quizzes/[id]/draft/improve/[jobId] GET", session.user.id);

    const channel = minionResultChannel(jobId);
    const resultKey = `improvement:${jobId}:result`;

    // ── Fast path: result already in Redis ────────────────────────────────────
    const cached = await redis.get(resultKey);
    if (cached) {
        log.debug({ quizId, jobId }, "Improvement result served from cache (fast path)");
        return new Response(`data: ${cached}\n\n`, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    }

    // ── Slow path: subscribe and wait ─────────────────────────────────────────
    log.debug({ quizId, jobId }, "Improvement result not cached — subscribing (slow path)");

    const stream = new ReadableStream({
        async start(controller) {
            const sub = redis.duplicate();
            let settled = false;
            // eslint-disable-next-line prefer-const
            let timeoutHandle: ReturnType<typeof setTimeout>;

            const send = (message: string) => {
                const payload = `data: ${message}\n\n`;
                try { controller.enqueue(new TextEncoder().encode(payload)); } catch { /* ignore */ }
            };

            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutHandle);
                sub.disconnect();
                try { controller.close(); } catch { /* ignore */ }
            };

            timeoutHandle = setTimeout(() => {
                log.warn({ quizId, jobId, timeoutMs: TIMEOUT_MS }, "Improvement SSE timed out");
                send(JSON.stringify({ ok: false, error: "Request timed out. Please try again." }));
                finish();
            }, TIMEOUT_MS);

            sub.on("message", (ch, message) => {
                if (ch !== channel) return;
                log.debug({ quizId, jobId }, "Improvement result received via pub/sub");
                send(message);
                finish();
            });

            await sub.subscribe(channel);

            // Second cached check — covers the gap between the first check and subscribe
            const rechecked = await redis.get(resultKey);
            if (rechecked) {
                log.debug({ quizId, jobId }, "Improvement result found on recheck after subscribe");
                send(rechecked);
                finish();
                return;
            }

            req.signal.addEventListener("abort", () => {
                log.debug({ quizId, jobId }, "Improvement SSE client disconnected");
                finish();
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}