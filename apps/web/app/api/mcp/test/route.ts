import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { NextRequest, NextResponse } from 'next/server';

const serverSchema = (value: any) => {
    if (!value || typeof value !== 'object') throw new Error('Missing server config');
    if (!value.url || typeof value.url !== 'string') throw new Error('Server URL is required');
    if (value.transport !== 'sse' && value.transport !== 'streamable-http') {
        throw new Error('Transport must be sse or streamable-http');
    }
    return {
        id: String(value.id || value.name || 'mcp-server'),
        name: String(value.name || value.id || 'mcp-server'),
        title: String(value.title || value.name || 'MCP Server'),
        url: value.url,
        transport: value.transport as 'sse' | 'streamable-http',
        headers: typeof value.headers === 'object' && value.headers ? value.headers : {},
    };
};

export async function POST(request: NextRequest) {
    let server;
    try {
        const body = await request.json();
        server = serverSchema(body.server || body);
    } catch (error: any) {
        return NextResponse.json({ ok: false, tools: [], error: error.message }, { status: 400 });
    }

    const client = new Client(
        { name: server.name, version: '0.1.0' },
        { capabilities: { sampling: {} } }
    );

    try {
        const headers = server.headers || {};
        const transport =
            server.transport === 'streamable-http'
                ? new StreamableHTTPClientTransport(new URL(server.url), {
                      requestInit: { headers },
                  })
                : new SSEClientTransport(
                      new URL(
                          `/api/mcp/proxy?server=${encodeURIComponent(server.url)}`,
                          request.url
                      ),
                      {
                          requestInit: {
                              headers: {
                                  ...headers,
                                  'x-base-url': server.url,
                              },
                          },
                      }
                  );

        await client.connect(transport);

        const tools = [];
        let cursor: string | undefined;
        do {
            const response = await client.listTools({ cursor });
            tools.push(
                ...(response.tools || []).map(tool => ({
                    name: tool.name,
                    description: tool.description || '',
                }))
            );
            cursor = response.nextCursor;
        } while (cursor);

        return NextResponse.json({ ok: true, tools });
    } catch (error: any) {
        console.error('MCP test failed:', error);
        return NextResponse.json({
            ok: false,
            tools: [],
            error: error?.message || 'Failed to connect to MCP server',
        });
    } finally {
        await client.close().catch(() => undefined);
    }
}
