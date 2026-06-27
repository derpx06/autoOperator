import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { jsonSchema, tool, ToolSet } from 'ai';

export type MCPTransportType = 'sse' | 'streamable-http';

export type MCPServerConfig = {
        id: string;
        name: string;
        title: string;
        url: string;
        transport: MCPTransportType;
        enabled: boolean;
        source: 'manual' | 'registry';
        headers?: Record<string, string>;
        variables?: Record<string, string>;
        registryName?: string;
        registryVersion?: string;
        description?: string;
        toolCount?: number;
        lastTestedAt?: number;
};

export type MCPServersConfig = {
        proxyEndpoint: string,
        mcpServers: Record<string, string> | MCPServerConfig[]
};

const normalizeMcpServers = (mcpServers: MCPServersConfig['mcpServers']): MCPServerConfig[] => {
        if (Array.isArray(mcpServers)) {
                return mcpServers.filter(server => server.enabled !== false && !!server.url);
        }

        return Object.entries(mcpServers)
                .filter(([, url]) => !!url)
                .map(([name, url]) => ({
                        id: name,
                        name,
                        title: name,
                        url,
                        transport: 'sse' as const,
                        enabled: true,
                        source: 'manual' as const,
                }));
};

async function getMcpClients(config: MCPServersConfig): Promise<Client[]> {
        const clients: Client[] = [];
        
        // Ping proxy endpoint to ensure it's ready
        try {
                await fetch(config.proxyEndpoint, { method: 'HEAD' });
                console.log(`Successfully pinged proxy endpoint: ${config.proxyEndpoint}`);
        } catch (error) {
                console.warn(`Failed to ping proxy endpoint: ${config.proxyEndpoint}`, error);
        }

        for (const server of normalizeMcpServers(config.mcpServers)) {
                const baseUrl = server.url;
                const proxyEndpoint = config.proxyEndpoint;

                console.log(`Creating MCP client for ${server.name} with URL: ${baseUrl}`);
                
                // The SSE transport will append /sse to baseUrl if needed
                const client = new Client(
                        {
                                name: server.name,
                                version: '0.1.0',
                                baseUrl: baseUrl,
                                proxyUrl: proxyEndpoint,
                        } as any,
                        
                        {
                                capabilities: {
                                        sampling: {},
                                },
                        },
                );


                try {
                        console.log(`Connecting to ${baseUrl}`);
                        const headers = server.headers || {};
                        const transport = server.transport === 'streamable-http'
                                ? new StreamableHTTPClientTransport(new URL(baseUrl), {
                                        requestInit: { headers },
                                })
                                : new SSEClientTransport(new URL(`${proxyEndpoint}?server=${encodeURIComponent(baseUrl)}`), {
                                        requestInit: {
                                                headers: {
                                                        ...headers,
                                                        'x-base-url': baseUrl,
                                                },
                                        },
                                });
                        await client.connect(transport);
                        console.log(`Successfully connected to ${baseUrl}`);
                        clients.push(client);
                } catch (error) {
                        console.error(`Failed to connect to ${baseUrl}:`, error);
                }
        }
        return clients;
}

export async function buildAllTools(config: MCPServersConfig): Promise<{ allTools: ToolSet, toolServerMap: Map<string, Client>, onClose: () => void } | undefined> {
        try {
                const mcpClients = await getMcpClients(config);
                console.log("mcpClients", mcpClients);
                let allTools: ToolSet = {};
                const toolServerMap = new Map();

        await Promise.all(mcpClients.map(async (mcpClient) => {
                let allMcpTools = [];
                let nextCursor: string | undefined = undefined;

                do {
                    const toolList = await mcpClient.listTools({
                        cursor: nextCursor
                    });

                    nextCursor = toolList.nextCursor;
                    console.log(mcpClient, "toolList", toolList);
                    
                    const mcpTools = toolList.tools.map((tool) => {
                        toolServerMap.set(tool.name, mcpClient);
                        return {
                            name: tool.name,
                            description: tool.description,
                            input_schema: tool.inputSchema,
                        };
                    });
                    
                    allMcpTools.push(...mcpTools);
                } while (nextCursor);

                const aiSdkTools = allMcpTools.map((t) => {
                    console.log(t.input_schema);
                    return {
                        name: t.name,
                        tool: tool({
                            parameters: jsonSchema(t.input_schema as any) as any,
                            description: t.description,
                            execute: async (args) => {
                                const result = await mcpClient.callTool({
                                    name: t.name,
                                    arguments: args,
                                });
                                return result;
                            }
                        })
                    };
                });

                allTools = aiSdkTools?.reduce((acc, tool) => {
                    acc[tool.name] = tool.tool;
                    return acc;
                }, allTools);
        }));

        return { allTools, toolServerMap, onClose: () => {
                mcpClients.forEach((client) => {
                        client.close();
                });
        } };

        } catch (error) {
                console.error('Error building tools:', error);
                throw error;    
        }

}
