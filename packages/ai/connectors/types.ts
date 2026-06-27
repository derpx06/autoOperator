export type ConnectorProvider = 'composio';

export type ConnectorAppSlug = 'github' | 'googledrive' | 'gmail' | 'slack' | 'notion' | 'linear' | 'jira';

export type ComposioConnectorApp = {
    slug: ConnectorAppSlug;
    name: string;
    description: string;
    authConfigId?: string;
    connectedAccountId?: string;
    status: 'not-configured' | 'configured' | 'connected' | 'error';
    enabled: boolean;
    toolCount?: number;
    lastSyncedAt?: number;
    error?: string;
};

export type ComposioConnectorConfig = {
    provider: 'composio';
    apiKey?: string;
    userId: string;
    enabled: boolean;
    apps: ComposioConnectorApp[];
    createdAt: number;
    updatedAt: number;
};

export type ComposioTool = {
    slug: string;
    name: string;
    description?: string;
    toolkit?: string;
    appSlug?: string;
    inputSchema?: any;
    connectedAccountId?: string;
    enabled: boolean;
};

export type ComposioToolConfig = {
    apiKey?: string;
    userId: string;
    enabled: boolean;
    tools: ComposioTool[];
};
