import { db } from "@/db";
import { usage } from "@/db/schema";
import { auth } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import { eq, sql, sum } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const log = apiLogger("/api/usage GET", session.user.id);

    try {
        const usageData = await db
            .select({
                date: sql<string>`DATE(${usage.createdAt})`.as("date"),
                totalInputTokens: sum(usage.inputTokens).mapWith(Number),
                totalOutputTokens: sum(usage.outputTokens).mapWith(Number),
            })
            .from(usage)
            .where(eq(usage.userId, session.user.id))
            .groupBy(sql`DATE(${usage.createdAt})`)
            .orderBy(sql`DATE(${usage.createdAt})`);

        log.info(`Fetched usage: ${usageData.length} rows`);

        return NextResponse.json(usageData);
    } catch (error) {
        log.error(`Failed to fetch usage: ${error}`);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
