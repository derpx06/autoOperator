import { executeComposioTool } from '@repo/ai/connectors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({
    apiKey: z.string().min(1),
    userId: z.string().min(1),
    toolSlug: z.string().min(1),
    connectedAccountId: z.string().optional(),
    arguments: z.record(z.any()).default({}),
});

export async function POST(request: NextRequest) {
    try {
        const body = bodySchema.parse(await request.json());
        const result = await executeComposioTool(body);
        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to execute Composio tool';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
