import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, x-base-url',
};

function parseServerUrl(request: NextRequest): URL | NextResponse {
    const server = request.nextUrl.searchParams.get('server');

    if (!server) {
        return NextResponse.json({ error: 'Missing server parameter' }, { status: 400 });
    }

    try {
        const url = new URL(server);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('Unsupported protocol');
        }
        return url;
    } catch {
        return NextResponse.json({ error: 'Invalid server URL' }, { status: 400 });
    }
}

function rewriteEndpointEvents(
    body: ReadableStream<Uint8Array>,
    request: NextRequest,
    serverUrl: URL
) {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffered = '';
    let isEndpointEvent = false;

    return body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
                buffered += decoder.decode(chunk, { stream: true });
                const lines = buffered.split('\n');
                buffered = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    let outputLine = line;

                    if (trimmedLine === 'event: endpoint') {
                        isEndpointEvent = true;
                    } else if (isEndpointEvent && trimmedLine.startsWith('data:')) {
                        const endpoint = trimmedLine.slice('data:'.length).trim();
                        const upstreamEndpoint = new URL(endpoint, serverUrl).toString();
                        const proxiedEndpoint = new URL(request.nextUrl.pathname, request.url);
                        proxiedEndpoint.searchParams.set('server', upstreamEndpoint);
                        outputLine = `data: ${proxiedEndpoint.toString()}`;
                        isEndpointEvent = false;
                    } else if (trimmedLine === '') {
                        isEndpointEvent = false;
                    }

                    controller.enqueue(encoder.encode(`${outputLine}\n`));
                }
            },
            flush(controller) {
                const remaining = buffered + decoder.decode();
                if (remaining) {
                    controller.enqueue(encoder.encode(remaining));
                }
            },
        })
    );
}

export async function GET(request: NextRequest) {
    const parsed = parseServerUrl(request);
    if (parsed instanceof NextResponse) return parsed;

    try {
        const response = await fetch(parsed, {
            method: 'GET',
            headers: {
                Accept: 'text/event-stream',
            },
        });

        if (!response.ok || !response.body) {
            return NextResponse.json(
                { error: 'Failed to connect to MCP server' },
                { status: response.status || 502 }
            );
        }

        return new NextResponse(rewriteEndpointEvents(response.body, request, parsed), {
            headers: {
                ...CORS_HEADERS,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Error proxying MCP SSE request:', error);
        return NextResponse.json({ error: 'Failed to connect to MCP server' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const parsed = parseServerUrl(request);
    if (parsed instanceof NextResponse) return parsed;

    let jsonRpcRequest: unknown;
    try {
        jsonRpcRequest = await request.json();
    } catch {
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                error: { code: -32700, message: 'Parse error' },
                id: null,
            },
            { status: 400 }
        );
    }

    try {
        const response = await fetch(parsed, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json, text/event-stream',
            },
            body: JSON.stringify(jsonRpcRequest),
        });

        const responseText = await response.text();
        return new NextResponse(responseText, {
            status: response.status,
            headers: {
                ...CORS_HEADERS,
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
            },
        });
    } catch (error) {
        console.error('Error proxying MCP JSON-RPC request:', error);
        return NextResponse.json(
            {
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal error' },
                id: null,
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}
