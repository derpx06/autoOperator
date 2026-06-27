import { fetchComposioTools } from '@repo/ai/connectors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({
    apiKey: z.string().min(1),
    appSlug: z.string().min(1),
    connectedAccountId: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = bodySchema.parse(await request.json());
        const tools = await fetchComposioTools(body);
        return NextResponse.json({ tools });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch Composio tools';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
