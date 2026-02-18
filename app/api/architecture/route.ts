import { architect } from "@/agents/architect";

export async function POST(req: Request) {
    const { documents, topic, questionCount, difficulty, questionTypes, additionalPrompt } = await req.json();

    const architecture = await architect({
        documents,
        topic,
        questionCount: questionCount ?? 10,
        difficulty: difficulty ?? "medium",
        questionTypes: questionTypes ?? ["true_false", "single_choice", "multiple_choice"],
        additionalPrompt,
    });

    return Response.json({ architecture });
}