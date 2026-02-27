import { generateText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { searchDocs } from '@/lib/tools/search-docs';
import { getDocumentOverview } from '@/lib/tools/get-document-overview';
import { agentLogger } from '@/lib/logger';

interface QuizUserInput {
    documents: string[];
    topic?: string;
    questionCount?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    questionTypes?: ('true_false' | 'single_choice' | 'multiple_choice')[];
    language?: string;
    additionalPrompt?: string;
    quizId?: string; // optional — passed through from worker for log correlation
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
        stopWhen: stepCountIs(8),
        toolChoice: hasDocuments ? 'auto' : 'none',
        tools: hasDocuments ? { getDocumentOverview, searchDocs } : undefined,
        system: hasDocuments
            ? `You are an expert instructional designer and quiz architect.
You have access to two tools:
- getDocumentOverview: fetches the first chunks of documents to understand their structure
- searchDocs: semantically searches for specific concepts or topics

WORKFLOW (follow this order strictly):
1. Call getDocumentOverview FIRST with all documentIds and chunksPerDocument: 15.
2. If the overview already contains enough content to build the architecture, skip searchDocs and write directly.
3. Only call searchDocs if the overview is insufficient and you need deeper content on specific topics.
4. Write the architecture based EXCLUSIVELY on what you retrieved.

STRICT RULES:
- Only respond with "RETRIEVAL_FAILED: Could not retrieve document content." if getDocumentOverview returns empty or an error.
- searchDocs returning empty results is acceptable if the overview already has sufficient content.
- Do NOT generate architecture from general knowledge under any circumstances.
- Do NOT assume document content. Only use what the tools return.

The architecture must include:
- Summary of key concepts and themes found in the documents
- Exact quiz parameters (question count, types, difficulty, language)
- Topics and subtopics to cover with suggested question distribution
- Common misconceptions or tricky areas worth testing
- Clear instructions the quiz builder must follow`
            : `You are an expert instructional designer and quiz architect.
No documents have been provided. Generate the architecture based solely on the quiz preferences.

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
- chunksPerDocument: 15`
            : `Generate a quiz architecture based on these preferences:
- Topic focus: ${input.topic ?? 'general knowledge'}
- Number of questions: ${input.questionCount ?? 10}
- Difficulty: ${input.difficulty ?? 'medium'}
- Question types: ${input.questionTypes?.join(', ') ?? 'single_choice, true_false'}
- Language: ${input.language ?? 'English'}
- Additional instructions: ${input.additionalPrompt ?? 'none'}`,
    });

    // Log tool usage summary
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