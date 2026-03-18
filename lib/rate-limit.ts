import { redis } from "./redis";
import { NextResponse } from "next/server";

interface RateLimitOptions {
    /** Max requests allowed in the window */
    max: number;
    /** Window size in seconds */
    windowSecs: number;
}

/**
 * Fixed-window rate limiter backed by Redis.
 * Returns a 429 NextResponse when the limit is exceeded, or null when allowed.
 *
 * Usage:
 *   const limited = await rateLimit(`upload:${userId}`, { max: 20, windowSecs: 3600 });
 *   if (limited) return limited;
 */
export async function rateLimit(
    key: string,
    { max, windowSecs }: RateLimitOptions
): Promise<NextResponse | null> {
    const redisKey = `rl:${key}`;

    try {
        const count = await redis.incr(redisKey);
        // Set expiry only on the first request in the window
        if (count === 1) await redis.expire(redisKey, windowSecs);

        if (count > max) {
            const ttl = await redis.ttl(redisKey);
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(ttl > 0 ? ttl : windowSecs),
                        "X-RateLimit-Limit": String(max),
                        "X-RateLimit-Remaining": "0",
                    },
                }
            );
        }

        return null; // allowed
    } catch {
        // If Redis is unavailable, fail open (don't block the request)
        return null;
    }
}

// ─── Pre-configured limiters ──────────────────────────────────────────────────

/** 20 uploads per user per hour */
export const uploadRateLimit = (userId: string) =>
    rateLimit(`upload:${userId}`, { max: 20, windowSecs: 3600 });

/** 10 quiz generations per user per hour */
export const quizCreateRateLimit = (userId: string) =>
    rateLimit(`quiz_create:${userId}`, { max: 10, windowSecs: 3600 });

/** 20 translation jobs per user per hour */
export const translateRateLimit = (userId: string) =>
    rateLimit(`translate:${userId}`, { max: 20, windowSecs: 3600 });