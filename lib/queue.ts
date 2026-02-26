import { Queue } from "bullmq";
import { redis } from "@/lib/redis";
import type { CreateQuizInput } from "@/lib/validators";

export interface QuizGenerationJobData {
    quizId: string;
    input: CreateQuizInput;
}

export const quizQueue = new Queue<QuizGenerationJobData>("quiz-generation", {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5_000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});