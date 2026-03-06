import { db } from "@/db";
import { usage } from "@/db/schema";
import { auth } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import { eq, sum, sql, and, gte } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function getStartDate(range: string): Date {
    const now = new Date();

    if (range === "1y") {
        return new Date(now.getFullYear(), 0, 1); // Jan 1st this year
    } else if (range === "1m") {
        return new Date(now.getFullYear(), now.getMonth(), 1); // 1st of this month
    } else if (range === "7d") {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        d.setHours(0, 0, 0, 0);
        return d;
    } else if (range === "1d") {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0); // midnight today
        return d;
    }

    return now;
}

export async function GET(request: Request) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const log = apiLogger("/api/usage GET", session.user.id);

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "1m";
    const startDate = getStartDate(range);

    const dateTrunc =
        range === "1d" ? sql<string>`TO_CHAR(DATE_TRUNC('hour', ${usage.createdAt}), 'YYYY-MM-DD"T"HH24')` :
            range === "1y" ? sql<string>`TO_CHAR(DATE_TRUNC('month', ${usage.createdAt}), 'YYYY-MM')` :
                sql<string>`TO_CHAR(DATE_TRUNC('day', ${usage.createdAt}), 'YYYY-MM-DD')`

    try {
        const usageData = await db
            .select({
                date: dateTrunc.as("date"),
                totalInputTokens: sum(usage.inputTokens).mapWith(Number),
                totalOutputTokens: sum(usage.outputTokens).mapWith(Number),
            })
            .from(usage)
            .where(and(
                eq(usage.userId, session.user.id),
                gte(usage.createdAt, startDate)
            ))
            .groupBy(dateTrunc)
            .orderBy(dateTrunc);

        log.info(`Fetched usage: ${usageData.length} rows`);

        return NextResponse.json(usageData);
    } catch (error) {
        log.error(`Failed to fetch usage: ${error}`);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}