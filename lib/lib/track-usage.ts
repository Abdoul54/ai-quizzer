import { db } from "@/db";
import { usage } from "@/db/schema";
import logger from "@/lib/logger";

const log = logger.child({ component: "track-usage" });

export type UsageSource =
    | "architect"
    | "builder"
    | "minion_change_type"
    | "minion_regenerate"
    | "minion_add_question"
    | "minion_add_distractor"
    | "minion_custom_instruction";

interface TrackUsageParams {
    userId: string;
    quizId?: string;
    source: UsageSource;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
}

/**
 * Fire-and-forget — never throws, so it can never disrupt the main pipeline.
 */
export async function trackUsage(params: TrackUsageParams): Promise<void> {
    try {
        await db.insert(usage).values({
            userId: params.userId,
            quizId: params.quizId ?? null,
            source: params.source,
            model: params.model,
            inputTokens: params.inputTokens,
            outputTokens: params.outputTokens,
        });
    } catch (err) {
        log.error({ err, ...params }, "Failed to track usage — non-fatal");
    }
}