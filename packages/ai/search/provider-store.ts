import { searchProviderRegistry } from './registry';
import { SearchProviderConfig, SearchProviderType } from './types';

const STORAGE_KEY = 'byok-search-provider-configs';
const DEFAULT_SEARCH_PROVIDER_KEY = 'byok-default-search-provider';

export const maskApiKey = (key?: string): string => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
};

const createDefaultConfigs = (): SearchProviderConfig[] => {
    return Object.entries(searchProviderRegistry).map(([type, entry]) => {
        const providerType = type as SearchProviderType;
        const now = Date.now();
        return {
            id: providerType,
            type: providerType,
            name: entry.label,
            apiKey: '',
            baseUrl: entry.defaultBaseUrl || '',
            enabled: false,
            isDefault: providerType === 'tavily',
            createdAt: now,
            updatedAt: now,
        };
    });
};

export const getSearchProviderConfigs = (): SearchProviderConfig[] => {
    if (typeof window === 'undefined') return createDefaultConfigs();
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const defaults = createDefaultConfigs();
        if (!stored) {
            saveSearchProviderConfigs(defaults);
            return defaults;
        }
        const parsed = JSON.parse(stored) as SearchProviderConfig[];
        return defaults.map(defaultConfig => {
            const existing = parsed.find(config => config.id === defaultConfig.id);
            return existing
                ? {
                      ...defaultConfig,
                      ...existing,
                      type: defaultConfig.type,
                      name: defaultConfig.name,
                  }
                : defaultConfig;
        });
    } catch (error) {
        console.error('Failed to parse search provider configs', error);
        return createDefaultConfigs();
    }
};

export const saveSearchProviderConfigs = (configs: SearchProviderConfig[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
};

export const saveSearchProviderConfig = (config: SearchProviderConfig) => {
    const configs = getSearchProviderConfigs();
    const updated = configs.map(existing =>
        existing.id === config.id ? { ...config, updatedAt: Date.now() } : existing
    );
    saveSearchProviderConfigs(updated);
};

export const getDefaultSearchProvider = (): string | null => {
    if (typeof window === 'undefined') return 'tavily';
    return localStorage.getItem(DEFAULT_SEARCH_PROVIDER_KEY) || 'tavily';
};

export const setDefaultSearchProvider = (id: string | null) => {
    if (typeof window === 'undefined') return;
    if (id) {
        localStorage.setItem(DEFAULT_SEARCH_PROVIDER_KEY, id);
    } else {
        localStorage.removeItem(DEFAULT_SEARCH_PROVIDER_KEY);
    }
    const configs = getSearchProviderConfigs().map(config => ({
        ...config,
        isDefault: Boolean(id && config.id === id),
    }));
    saveSearchProviderConfigs(configs);
};

export const resolveSearchProviderConfig = (): SearchProviderConfig | undefined => {
    const configs = getSearchProviderConfigs();
    const defaultId = getDefaultSearchProvider();
    return configs.find(config => config.id === defaultId && config.enabled) ||
        configs.find(config => config.enabled);
};
