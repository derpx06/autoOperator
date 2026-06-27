import { searchWeb } from '@repo/ai/search';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const searchProviderConfigSchema = z.object({
    id: z.string(),
    type: z.enum(['tavily', 'brave', 'exa', 'perplexity', 'serper', 'kagi', 'custom']),
    name: z.string(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    enabled: z.boolean(),
    isDefault: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
}).optional();

const searchRequestSchema = z.object({
    query: z.string(),
    queries: z.array(z.string()).optional(),
    maxResults: z.number().optional(),
    country: z.string().optional(),
    location: z.string().optional(),
    mode: z.enum(['quick', 'pro', 'deep']),
});

const bodySchema = z.object({
    request: searchRequestSchema,
    config: searchProviderConfigSchema,
});

export async function POST(request: NextRequest) {
    try {
        const body = bodySchema.parse(await request.json());
        const results = await searchWeb(body.request, body.config);
        return NextResponse.json({ results });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Search request failed';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
