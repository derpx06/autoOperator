import { createComposioConnectLink } from '@repo/ai/connectors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({
    apiKey: z.string().min(1),
    userId: z.string().min(1),
    authConfigId: z.string().min(1),
    callbackUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = bodySchema.parse(await request.json());
        const data = await createComposioConnectLink(body);
        return NextResponse.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create Composio connect link';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
