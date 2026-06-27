import { createTask } from '@repo/orchestrator';
import { buildAllTools } from '../../tools/mcp';
import { buildComposioTools } from '../../connectors';
import { getModelFromChatMode } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { ChunkBuffer, generateText, getHumanizedDate, handleError } from '../utils';
import { buildMemoryPromptSection } from '../../memory';

const MAX_ALLOWED_CUSTOM_INSTRUCTIONS_LENGTH = 6000;

export const completionTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'completion',
    execute: async ({ events, context, signal, redirectTo }) => {
        if (!context) {
            throw new Error('Context is required but was not provided');
        }

        const customInstructions = context?.get('customInstructions');
        const mode = context.get('mode');
        const webSearch = context.get('webSearch') || false;
        const mcpConfig = context.get('mcpConfig') || {};
        const composioConfig = context.get('composioConfig');
        const memories = context.get('memories') || [];

        let messages =
            context
                .get('messages')
                ?.filter(
                    message =>
                        (message.role === 'user' || message.role === 'assistant') &&
                        !!message.content
                ) || [];

        if (
            customInstructions &&
            customInstructions?.length < MAX_ALLOWED_CUSTOM_INSTRUCTIONS_LENGTH
        ) {
            messages = [
                {
                    role: 'system',
                    content: `Today is ${getHumanizedDate()}. and current location is ${context.get('gl')?.city}, ${context.get('gl')?.country}. \n\n ${customInstructions}`,
                },
                ...messages,
            ];
        }

        if (webSearch) {
            redirectTo('quickSearch');
            return;
        }

        const model = getModelFromChatMode(mode);

        let prompt = `You are a helpful assistant that can answer questions and help with tasks.
        Today is ${getHumanizedDate()}.
        ${buildMemoryPromptSection(memories)}
        `;

        // Resolve MCP tools if any servers are configured
        let mcpTools: Record<string, any> | undefined;
        let mcpCleanup: (() => void) | undefined;
        const appUrl = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_URL)
            || (typeof self !== 'undefined' && (self as any).NEXT_PUBLIC_APP_URL)
            || '';
        const hasMcpServers = Array.isArray(mcpConfig)
            ? mcpConfig.some(server => server.enabled !== false && !!server.url)
            : Object.keys(mcpConfig).length > 0;

        if (hasMcpServers) {
            try {
                const mcpResult = await buildAllTools({
                    proxyEndpoint: `${appUrl}/api/mcp/proxy`,
                    mcpServers: mcpConfig,
                });
                if (mcpResult) {
                    mcpTools = mcpResult.allTools;
                    mcpCleanup = mcpResult.onClose;
                }
            } catch (e) {
                console.warn('[MCP] Failed to build tools, proceeding without MCP:', e);
            }
        }

        const composioTools = buildComposioTools(composioConfig);
        const allTools = {
            ...(mcpTools || {}),
            ...(composioTools || {}),
        };
        const hasTools = Object.keys(allTools).length > 0;

        const reasoningBuffer = new ChunkBuffer({
            threshold: 200,
            breakOn: ['\n\n'],
            onFlush: (_chunk: string, fullText: string) => {
                events?.update('steps', prev => ({
                    ...prev,
                    0: {
                        ...prev?.[0],
                        id: 0,
                        status: 'COMPLETED',
                        steps: {
                            ...prev?.[0]?.steps,
                            reasoning: {
                                data: fullText,
                                status: 'COMPLETED',
                            },
                        },
                    },
                }));
            },
        });

        const chunkBuffer = new ChunkBuffer({
            threshold: 200,
            breakOn: ['\n'],
            onFlush: (text: string) => {
                events?.update('answer', current => ({
                    ...current,
                    text,
                    status: 'PENDING' as const,
                }));
            },
        });

        let response = '';
        try {
            response = await generateText({
                model,
                messages,
                prompt,
                signal,
                tools: hasTools ? allTools : undefined,
                toolChoice: hasTools ? 'auto' : 'none',
                maxSteps: hasTools ? 5 : 2,
                onToolCall: toolCall => {
                    events?.update('toolCalls', prev => [...(prev || []), toolCall]);
                },
                onToolResult: toolResult => {
                    events?.update('toolResults', prev => [...(prev || []), toolResult]);
                },
                onReasoning: (chunk, fullText) => {
                    reasoningBuffer.add(chunk);
                },
                onChunk: (chunk, fullText) => {
                    chunkBuffer.add(chunk);
                },
            });
        } finally {
            mcpCleanup?.();
        }

        reasoningBuffer.end();
        chunkBuffer.end();

        events?.update('answer', prev => ({
            ...prev,
            text: '',
            fullText: response,
            status: 'COMPLETED',
        }));

        context.update('answer', _ => response);

        events?.update('status', prev => 'COMPLETED');

        const onFinish = context.get('onFinish');
        if (onFinish) {
            onFinish({
                answer: response,
                threadId: context.get('threadId'),
                threadItemId: context.get('threadItemId'),
            });
        }
        return;
    },
    onError: handleError,
    route: ({ context }) => {
        if (context?.get('showSuggestions') && context.get('answer')) {
            return 'suggestions';
        }
        return 'end';
    },
});
