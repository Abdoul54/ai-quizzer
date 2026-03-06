import { generateText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createSearchDocsTool } from '@/lib/tools/search-docs';
import { getDocumentOverview } from '@/lib/tools/get-document-overview';
import { agentLogger } from '@/lib/logger';
import { trackUsage } from '@/lib/lib/track-usage';

interface QuizUserInput {
    documents: string[];
    userId: string;
    topic?: string;
    questionCount?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    questionTypes?: ('true_false' | 'single_choice' | 'multiple_choice')[];
    language?: string;
    additionalPrompt?: string;
    quizId?: string;
}

export const architect = async (input: QuizUserInput): Promise<string> => {
    const hasDocuments = input.documents.length > 0;
    const log = agentLogger('architect', input.quizId);

    log.info({
        documentCount: input.documents.length,
        questionCount: input.questionCount ?? 10,
        difficulty: input.difficulty ?? 'medium',
        language: input.language ?? 'auto',
        hasDocuments,
    }, 'Architect started');

    const start = Date.now();

    const result = await generateText({
        model: openai(process.env.ARCHITECT || 'gpt-4o-mini'),
        // Step budget for gpt-4o-mini:
        // With documents:    step 1 = getDocumentOverview, step 2 = write architecture (step 3 = buffer)
        // Without documents: step 1 = write architecture
        stopWhen: stepCountIs(3),
        toolChoice: hasDocuments ? 'auto' : 'none',
        tools: hasDocuments ? { getDocumentOverview, searchDocs: createSearchDocsTool(input.documents) } : undefined,
        prepareStep: ({ stepNumber }) => {
            // After the overview call, force text output — no more tool calls
            if (stepNumber >= 1) {
                return { toolChoice: 'none' };
            }
        },
        onFinish: async ({ usage }) => {
            await trackUsage({
                userId: input.userId,
                quizId: input.quizId,
                source: "architect",
                model: process.env.ARCHITECT || "gpt-4o-mini",
                inputTokens: usage?.inputTokens,
                outputTokens: usage?.outputTokens,
            });
        },
        system: hasDocuments
            ? `You are an expert instructional designer and quiz architect.
You have access to one tool: getDocumentOverview, which fetches the first chunks of documents.

WORKFLOW (strict):
1. Call getDocumentOverview ONCE with all documentIds and chunksPerDocument: 5.
2. Write the architecture immediately based ONLY on what was returned. Do NOT call any more tools.

STRICT RULES:
- Only respond with "RETRIEVAL_FAILED: Could not retrieve document content." if getDocumentOverview returns empty or an error.
- Do NOT generate architecture from general knowledge under any circumstances.
- Do NOT assume document content. Only use what the tool returns.

OUTPUT FORMAT — keep it short and actionable:
- Keep the architecture concise — 400 words maximum. The Builder reads this as its full context, so shorter is better.
- Do NOT pre-write question text or dictate specific answer values.
  Bad:  "Question 1: Which company has the highest rating? Answer: BioCore (4.8)"
  Good: "Topic: Identify the top-rated company from the dataset"
- For each topic, specify: the concept to test, the suggested question type, and brief distractor guidance.

QUESTION TYPE ASSIGNMENT:
- Use multiple_choice ONLY when the topic has multiple correct answers that are structurally guaranteed in the data.
- Use true_false for binary facts that are unambiguously verifiable.
- When in doubt, use single_choice — it is always safer.
- If the requested type distribution cannot be satisfied by the content, adjust and note why.

The architecture must include:
- A brief summary of key concepts found in the documents (2–3 sentences)
- Exact quiz parameters (question count, types, difficulty, language)
- One entry per question: topic/intent, question type with justification, distractor hint
- Any critical instructions the builder must follow`
            : `You are an expert instructional designer and quiz architect.
No documents have been provided. Generate the architecture based solely on the quiz preferences.

OUTPUT FORMAT — keep it short and actionable:
- Keep the architecture concise — 400 words maximum.
- Do NOT pre-write question text or answers.
- For each topic: concept to test, suggested question type, brief distractor guidance.

The architecture must include:
- Summary of key concepts and themes relevant to the topic
- Exact quiz parameters (question count, types, difficulty, language)
- Topics and subtopics to cover with suggested question distribution
- Common misconceptions or tricky areas worth testing
- Clear instructions the quiz builder must follow`,
        prompt: hasDocuments
            ? `Generate a quiz architecture for the following document IDs: ${input.documents.join(', ')}

Quiz preferences:
- Topic focus: ${input.topic ?? 'derive from the document'}
- Number of questions: ${input.questionCount ?? 10}
- Difficulty: ${input.difficulty ?? 'medium'}
- Question types: ${input.questionTypes?.join(', ') ?? 'single_choice, true_false'}
- Language: ${input.language ?? 'same as the document'}
- Additional instructions: ${input.additionalPrompt ?? 'none'}

Start by calling getDocumentOverview with:
- documentIds: [${input.documents.map(id => `"${id}"`).join(', ')}]
- chunksPerDocument: 5`
            : `Generate a quiz architecture based on these preferences:
- Topic focus: ${input.topic ?? 'general knowledge'}
- Number of questions: ${input.questionCount ?? 10}
- Difficulty: ${input.difficulty ?? 'medium'}
- Question types: ${input.questionTypes?.join(', ') ?? 'single_choice, true_false'}
- Language: ${input.language ?? 'English'}
- Additional instructions: ${input.additionalPrompt ?? 'none'}`,
    });

    const toolCalls = result.steps.flatMap(s => s.toolCalls ?? []);
    const toolResults = result.steps.flatMap(s => s.toolResults ?? []);
    const retrievalFailed = toolResults.some(
        r => typeof r.output === 'string' && r.output.startsWith('RETRIEVAL_FAILED')
    );

    log.debug({
        steps: result.steps.length,
        toolCallCount: toolCalls.length,
        toolsUsed: [...new Set(toolCalls.map(t => t.toolName))],
        retrievalFailed,
        outputTokens: result.usage?.outputTokens,
        inputTokens: result.usage?.inputTokens,
    }, 'Architect LLM call complete');

    if (retrievalFailed) {
        log.warn({ toolResults: toolResults.map(r => r.output) }, 'One or more retrieval calls failed');
    }

    const architecture =
        result.text ||
        result.steps.findLast((s) => s.text.length > 0)?.text ||
        '';

    if (!architecture) {
        log.error('Architect produced no output');
        throw new Error('Architect failed to generate architecture.');
    }

    if (hasDocuments && architecture.startsWith('RETRIEVAL_FAILED')) {
        log.error({ architecture }, 'Architect returned RETRIEVAL_FAILED');
        throw new Error('Architect failed to retrieve document content. Ensure documents are uploaded and embeddings are generated.');
    }

    log.info({ durationMs: Date.now() - start, architectureLength: architecture.length }, 'Architect completed');

    return architecture;
};