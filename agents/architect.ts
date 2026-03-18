import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getDocumentOverview } from '@/lib/tools/get-document-overview';
import { agentLogger } from '@/lib/logger';
import { trackUsage } from '@/lib/lib/track-usage';
import { architectSystemPrompt, buildArchitectPrompt } from '@/agents/prompts/architect';

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

export interface ArchitectOutput {
    architecture: string;
    searchQueries: string[];
}

export const architect = async (input: QuizUserInput): Promise<ArchitectOutput> => {
    const hasDocuments = input.documents.length > 0;
    const questionCount = input.questionCount ?? 10;
    const log = agentLogger('architect', input.quizId);

    log.info({
        documentCount: input.documents.length,
        difficulty: input.difficulty ?? 'medium',
        language: input.language ?? 'auto',
        hasDocuments,
    }, 'Architect started');

    const start = Date.now();

    const result = await generateText({
        model: openai(process.env.ARCHITECT || 'gpt-4o-mini'),
        temperature: 0.3,
        maxOutputTokens: 1024,
        maxRetries: 3,
        timeout: { totalMs: 60000, stepMs: 20000 },
        // With documents:    step 1 = getDocumentOverview, step 2 = write architecture
        // Without documents: step 1 = write architecture
        toolChoice: hasDocuments ? 'required' : 'none',
        tools: hasDocuments ? { getDocumentOverview } : undefined,
        prepareStep: ({ stepNumber }) => {
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
        system: hasDocuments ? architectSystemPrompt.withDocuments : architectSystemPrompt.withoutDocuments,
        prompt: buildArchitectPrompt({
            documentIds: input.documents,
            topic: input.topic,
            questionCount,
            difficulty: input.difficulty ?? 'medium',
            questionTypes: input.questionTypes ?? ['single_choice', 'true_false'],
            language: input.language ?? (hasDocuments ? 'same as the document' : 'English'),
            additionalPrompt: input.additionalPrompt,
        }),
    });

    const toolResults = result.steps.flatMap(s => s.toolResults ?? []);
    const retrievalFailed = toolResults.some(
        r => typeof r.output === 'string' && r.output.startsWith('RETRIEVAL_FAILED')
    );

    log.debug({
        steps: result.steps.length,
        toolCallCount: result.steps.flatMap(s => s.toolCalls ?? []).length,
        retrievalFailed,
        outputTokens: result.usage?.outputTokens,
        inputTokens: result.usage?.inputTokens,
    }, 'Architect LLM call complete');

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

    const searchQueries = extractSearchQueries(architecture, questionCount);

    log.info({
        durationMs: Date.now() - start,
        architectureLength: architecture.length,
        searchQueryCount: searchQueries.length,
    }, 'Architect completed');

    return { architecture, searchQueries };
};

function extractSearchQueries(architecture: string, questionCount: number): string[] {
    const queries: string[] = [];
    const regex = /Search Query:\s*(.+)/gi;
    let match;

    while ((match = regex.exec(architecture)) !== null) {
        const query = match[1].trim();
        if (query) queries.push(query);
    }

    // Fallback: if parsing fails, extract from Topic lines
    if (queries.length === 0) {
        const topicRegex = /Topic(?:\/Intent)?:\s*(.+)/gi;
        while ((match = topicRegex.exec(architecture)) !== null) {
            const topic = match[1].trim();
            if (topic) queries.push(topic);
        }
    }

    // Ensure we have exactly questionCount queries — pad or trim
    if (queries.length < questionCount) {
        const last = queries[queries.length - 1] ?? 'general content';
        while (queries.length < questionCount) queries.push(last);
    }

    return queries.slice(0, questionCount);
}