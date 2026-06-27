import { providerRegistry } from './provider-registry';
import { ProviderConfig, ProviderType } from './provider-types';

const STORAGE_KEY = 'byok-provider-configs';
const DEFAULT_PROVIDER_KEY = 'byok-default-provider';
const DEFAULT_MODEL_KEY = 'byok-default-model';
const SESSION_PROVIDER_KEY = 'byok-session-provider';
const SESSION_MODEL_KEY = 'byok-session-model';

export const maskApiKey = (key?: string): string => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
};

// Generate default configs
const createDefaultConfigs = (): ProviderConfig[] => {
    return Object.entries(providerRegistry).map(([type, entry]) => {
        const pType = type as ProviderType;
        return {
            id: pType,
            name: entry.label,
            type: pType,
            apiKey: '',
            baseUrl: entry.defaultBaseUrl || '',
            enabled: pType === 'google', // Enable Google by default as it is the default provider
            models: entry.defaultModels,
            defaultModel: entry.defaultModels[0] || '',
            supportsStreaming: true,
            supportsTools: true,
            supportsVision: pType === 'openai' || pType === 'anthropic' || pType === 'google',
            supportsReasoning: pType === 'openai' || pType === 'deepseek' || pType === 'together' || pType === 'fireworks',
            isLocal: entry.isLocal || false,
            isGateway: entry.isGateway || false,
            isOpenAICompatible: entry.isOpenAICompatible || false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    });
};

export const getProviderConfigs = (): ProviderConfig[] => {
    if (typeof window === 'undefined') {
        return createDefaultConfigs();
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as ProviderConfig[];
            // Merge defaults in case new ones were added
            const defaults = createDefaultConfigs();
            const merged = defaults.map(def => {
                const existing = parsed.find(p => p.id === def.id);
                if (existing) {
                    return {
                        ...def,
                        ...existing,
                        // Keep type and static attributes from registry
                        type: def.type,
                        name: def.name,
                        isLocal: def.isLocal,
                        isGateway: def.isGateway,
                        isOpenAICompatible: def.isOpenAICompatible,
                    };
                }
                return def;
            });
            return merged;
        }
    } catch (e) {
        console.error('Failed to parse provider configs from localStorage', e);
    }
    const defaults = createDefaultConfigs();
    saveProviderConfigs(defaults);
    return defaults;
};

export const saveProviderConfigs = (configs: ProviderConfig[]): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    } catch (e) {
        console.error('Failed to save provider configs to localStorage', e);
    }
};

export const saveProviderConfig = (config: ProviderConfig): void => {
    const configs = getProviderConfigs();
    const updated = configs.map(c => (c.id === config.id ? { ...config, updatedAt: Date.now() } : c));
    saveProviderConfigs(updated);
};

export const getProviderConfig = (id: string): ProviderConfig | undefined => {
    const configs = getProviderConfigs();
    return configs.find(c => c.id === id);
};

export const getDefaultProvider = (): string | null => {
    if (typeof window === 'undefined') return 'google';
    return localStorage.getItem(DEFAULT_PROVIDER_KEY) || 'google';
};

export const setDefaultProvider = (id: string | null): void => {
    if (typeof window === 'undefined') return;
    if (id) {
        localStorage.setItem(DEFAULT_PROVIDER_KEY, id);
    } else {
        localStorage.removeItem(DEFAULT_PROVIDER_KEY);
    }
};

export const getDefaultModel = (): string | null => {
    if (typeof window === 'undefined') return 'gemini-2.0-flash';
    return localStorage.getItem(DEFAULT_MODEL_KEY) || 'gemini-2.0-flash';
};

export const setDefaultModel = (model: string | null): void => {
    if (typeof window === 'undefined') return;
    if (model) {
        localStorage.setItem(DEFAULT_MODEL_KEY, model);
    } else {
        localStorage.removeItem(DEFAULT_MODEL_KEY);
    }
};

export const getSessionProvider = (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(SESSION_PROVIDER_KEY) || getDefaultProvider();
};

export const setSessionProvider = (id: string | null): void => {
    if (typeof window === 'undefined') return;
    if (id) {
        sessionStorage.setItem(SESSION_PROVIDER_KEY, id);
    } else {
        sessionStorage.removeItem(SESSION_PROVIDER_KEY);
    }
};

export const getSessionModel = (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(SESSION_MODEL_KEY) || getDefaultModel();
};

export const setSessionModel = (model: string | null): void => {
    if (typeof window === 'undefined') return;
    if (model) {
        sessionStorage.setItem(SESSION_MODEL_KEY, model);
    } else {
        sessionStorage.removeItem(SESSION_MODEL_KEY);
    }
};
