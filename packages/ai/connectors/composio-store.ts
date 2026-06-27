import { composioPopularApps, DEFAULT_COMPOSIO_USER_ID } from './composio-registry';
import { ComposioConnectorConfig, ComposioToolConfig } from './types';

const STORAGE_KEY = 'composio-connector-config';
const TOOL_STORAGE_KEY = 'composio-tool-config';

export const maskComposioApiKey = (key?: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
};

export const createDefaultComposioConfig = (): ComposioConnectorConfig => {
    const now = Date.now();
    return {
        provider: 'composio',
        apiKey: '',
        userId: DEFAULT_COMPOSIO_USER_ID,
        enabled: false,
        apps: composioPopularApps.map(app => ({
            ...app,
            status: 'not-configured',
            enabled: false,
        })),
        createdAt: now,
        updatedAt: now,
    };
};

export const getComposioConfig = (): ComposioConnectorConfig => {
    if (typeof window === 'undefined') return createDefaultComposioConfig();
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const defaults = createDefaultComposioConfig();
        if (!stored) {
            saveComposioConfig(defaults);
            return defaults;
        }
        const parsed = JSON.parse(stored) as ComposioConnectorConfig;
        return {
            ...defaults,
            ...parsed,
            apps: defaults.apps.map(defaultApp => ({
                ...defaultApp,
                ...(parsed.apps || []).find(app => app.slug === defaultApp.slug),
            })),
        };
    } catch (error) {
        console.error('Failed to read Composio config', error);
        return createDefaultComposioConfig();
    }
};

export const saveComposioConfig = (config: ComposioConnectorConfig) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, updatedAt: Date.now() }));
};

export const getComposioToolConfig = (): ComposioToolConfig | undefined => {
    if (typeof window === 'undefined') return undefined;
    const config = getComposioConfig();
    try {
        const stored = localStorage.getItem(TOOL_STORAGE_KEY);
        const tools = stored ? JSON.parse(stored) : [];
        const enabledApps = new Set(config.apps.filter(app => app.enabled && app.connectedAccountId).map(app => app.slug));
        return {
            apiKey: config.apiKey,
            userId: config.userId,
            enabled: config.enabled,
            tools: tools.filter((tool: any) => tool.enabled && enabledApps.has(tool.appSlug)),
        };
    } catch (error) {
        console.error('Failed to read Composio tools', error);
        return {
            apiKey: config.apiKey,
            userId: config.userId,
            enabled: config.enabled,
            tools: [],
        };
    }
};

export const saveComposioTools = (tools: ComposioToolConfig['tools']) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOOL_STORAGE_KEY, JSON.stringify(tools));
};
