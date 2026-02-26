import Redis from "ioredis";

// BullMQ requires maxRetriesPerRequest: null
const createRedisConnection = () =>
    new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: false,
    });

// Reuse across hot-reloads in dev
declare global {
    // eslint-disable-next-line no-var
    var __redis: Redis | undefined;
}

export const redis =
    globalThis.__redis ?? (globalThis.__redis = createRedisConnection());

if (process.env.NODE_ENV !== "production") {
    globalThis.__redis = redis;
}