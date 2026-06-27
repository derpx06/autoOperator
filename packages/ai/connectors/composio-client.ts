import { jsonSchema, tool, ToolSet } from 'ai';
import { ComposioConnectorConfig, ComposioTool, ComposioToolConfig } from './types';

const COMPOSIO_BASE_URL = 'https://backend.composio.dev/api/v3.1';

const composioFetch = async (path: string, apiKey: string, init: RequestInit = {}) => {
    const response = await fetch(`${COMPOSIO_BASE_URL}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            ...(init.headers || {}),
        },
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Composio API responded with ${response.status}${body ? `: ${body.slice(0, 220)}` : ''}`);
    }
    return response.json();
};

export const createComposioConnectLink = async ({
    apiKey,
    userId,
    authConfigId,
    callbackUrl,
}: {
    apiKey: string;
    userId: string;
    authConfigId: string;
    callbackUrl?: string;
}) => {
    return composioFetch('/connected_accounts/link', apiKey, {
        method: 'POST',
        body: JSON.stringify({
            auth_config_id: authConfigId,
            user_id: userId,
            callback_url: callbackUrl,
        }),
    });
};

export const fetchComposioTools = async ({
    apiKey,
    appSlug,
    connectedAccountId,
}: {
    apiKey: string;
    appSlug: string;
    connectedAccountId?: string;
}): Promise<ComposioTool[]> => {
    const url = new URL(`${COMPOSIO_BASE_URL}/tools`);
    url.searchParams.set('toolkit_slug', appSlug);
    url.searchParams.set('limit', '100');
    const response = await fetch(url.toString(), {
        headers: {
            'x-api-key': apiKey,
        },
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Composio API responded with ${response.status}${body ? `: ${body.slice(0, 220)}` : ''}`);
    }
    const data = await response.json();
    const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.tools)
            ? data.tools
            : Array.isArray(data)
                ? data
                : [];

    return items.map((item: any) => ({
        slug: item.slug || item.name || item.tool_slug,
        name: item.name || item.slug || item.tool_slug,
        description: item.description || '',
        toolkit: item.toolkit?.slug || item.toolkit_slug || appSlug,
        appSlug,
        inputSchema: item.input_parameters || item.inputSchema || item.schema || {
            type: 'object',
            properties: {},
        },
        connectedAccountId,
        enabled: true,
    })).filter((item: ComposioTool) => Boolean(item.slug));
};

export const executeComposioTool = async ({
    apiKey,
    userId,
    toolSlug,
    arguments: args,
    connectedAccountId,
}: {
    apiKey: string;
    userId: string;
    toolSlug: string;
    arguments: Record<string, any>;
    connectedAccountId?: string;
}) => {
    return composioFetch(`/tools/execute/${encodeURIComponent(toolSlug)}`, apiKey, {
        method: 'POST',
        body: JSON.stringify({
            user_id: userId,
            connected_account_id: connectedAccountId,
            arguments: args,
        }),
    });
};

const getBrowserProxyUrl = () => {
    const globalSelf = typeof self !== 'undefined' ? self as any : undefined;
    const isBrowserWindow = typeof window !== 'undefined';
    const isWorker = !isBrowserWindow && Boolean(globalSelf?.location);
    if (!isBrowserWindow && !isWorker) return undefined;
    const origin = globalSelf?.NEXT_PUBLIC_APP_URL || globalSelf?.location?.origin;
    if (!origin || origin === 'null') return undefined;
    return `${origin}/api/connectors/composio/execute`;
};

export const buildComposioTools = (config?: ComposioToolConfig): ToolSet | undefined => {
    if (!config?.enabled || !config.apiKey || !config.tools.length) return undefined;

    return config.tools.reduce<ToolSet>((acc, composioTool) => {
        const toolName = `composio_${composioTool.slug}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        acc[toolName] = tool({
            description: composioTool.description || `Run the ${composioTool.name} Composio tool.`,
            parameters: jsonSchema(composioTool.inputSchema || {
                type: 'object',
                properties: {},
            }) as any,
            execute: async args => {
                const proxyUrl = getBrowserProxyUrl();
                if (proxyUrl) {
                    const response = await fetch(proxyUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            apiKey: config.apiKey,
                            userId: config.userId,
                            toolSlug: composioTool.slug,
                            connectedAccountId: composioTool.connectedAccountId,
                            arguments: args,
                        }),
                    });
                    if (!response.ok) {
                        throw new Error(await response.text());
                    }
                    return response.json();
                }
                return executeComposioTool({
                    apiKey: config.apiKey!,
                    userId: config.userId,
                    toolSlug: composioTool.slug,
                    connectedAccountId: composioTool.connectedAccountId,
                    arguments: args as Record<string, any>,
                });
            },
        });
        return acc;
    }, {});
};

export const toComposioToolConfig = (config: ComposioConnectorConfig, tools: ComposioTool[]): ComposioToolConfig => ({
    apiKey: config.apiKey,
    userId: config.userId,
    enabled: config.enabled,
    tools,
});
