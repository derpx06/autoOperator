import { ChatMode } from '@repo/shared/config';
import { z } from 'zod';

const mcpServerConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    url: z.string(),
    transport: z.enum(['sse', 'streamable-http']),
    enabled: z.boolean(),
    source: z.enum(['manual', 'registry']),
    headers: z.record(z.string(), z.string()).optional(),
    variables: z.record(z.string(), z.string()).optional(),
    registryName: z.string().optional(),
    registryVersion: z.string().optional(),
    description: z.string().optional(),
    toolCount: z.number().optional(),
    lastTestedAt: z.number().optional(),
});

const memoryContextItemSchema = z.object({
    id: z.string(),
    type: z.enum(['style', 'preference', 'fact', 'instruction']),
    content: z.string(),
    tags: z.array(z.string()),
    keywords: z.array(z.string()),
    confidence: z.number(),
});

export const completionRequestSchema = z.object({
    threadId: z.string(),
    threadItemId: z.string(),
    parentThreadItemId: z.string(),
    prompt: z.string(),
    messages: z.any(),
    mode: z.nativeEnum(ChatMode).optional(),
    maxIterations: z.number().optional(),
    mcpConfig: z.union([z.record(z.string(), z.string()), z.array(mcpServerConfigSchema)]).optional(),
    memories: z.array(memoryContextItemSchema).optional(),
    webSearch: z.boolean().optional(),
    showSuggestions: z.boolean().optional(),
    customInstructions: z.string().optional(),
    selectedProviderId: z.string().optional(),
    selectedModelId: z.string().optional(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
});

export type CompletionRequestType = z.infer<typeof completionRequestSchema>;

export type AgentEventResponse = {
    threadId: string;
    threadItemId: string;
    parentThreadItemId: string;
};

export type StreamController = ReadableStreamDefaultController<Uint8Array>;

export const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'X-Accel-Buffering': 'no',
} as const;
