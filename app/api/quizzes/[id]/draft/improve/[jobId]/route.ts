import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { minionResultChannel } from "@/workers/minion.worker";

const TIMEOUT_MS = 70_000;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; jobId: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId } = await params;
    const channel = minionResultChannel(jobId);
    const resultKey = `improvement:${jobId}:result`;

    // ── Fast path: result already in Redis (worker finished before SSE opened) ──
    const cached = await redis.get(resultKey);
    if (cached) {
        return new Response(`data: ${cached}\n\n`, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    }

    // ── Slow path: subscribe and wait for the worker to publish ──────────────
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
                send(JSON.stringify({ ok: false, error: "Request timed out. Please try again." }));
                finish();
            }, TIMEOUT_MS);

            sub.on("message", (ch, message) => {
                if (ch !== channel) return;
                send(message);
                finish();
            });

            await sub.subscribe(channel);

            // Second cached check — covers the gap between the first check and subscribe
            const rechecked = await redis.get(resultKey);
            if (rechecked) {
                send(rechecked);
                finish();
                return;
            }

            req.signal.addEventListener("abort", finish);
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