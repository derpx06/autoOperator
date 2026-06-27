export type SearchProviderType =
    | 'tavily'
    | 'brave'
    | 'exa'
    | 'perplexity'
    | 'serper'
    | 'kagi'
    | 'custom';

export type SearchMode = 'quick' | 'pro' | 'deep';

export type SearchProviderConfig = {
    id: string;
    type: SearchProviderType;
    name: string;
    apiKey?: string;
    baseUrl?: string;
    enabled: boolean;
    isDefault: boolean;
    createdAt: number;
    updatedAt: number;
};

export type SearchRequest = {
    query: string;
    queries?: string[];
    maxResults?: number;
    country?: string;
    location?: string;
    mode: SearchMode;
};

export type SearchResult = {
    title: string;
    link: string;
    snippet?: string;
    content?: string;
    publishedDate?: string;
    provider: SearchProviderType;
};

export type SearchAdapter = {
    test: (config: SearchProviderConfig) => Promise<{ ok: boolean; error?: string }>;
    search: (config: SearchProviderConfig, request: SearchRequest) => Promise<SearchResult[]>;
};

export type SearchProviderRegistryEntry = {
    label: string;
    description: string;
    capabilities: string[];
    requiresApiKey: boolean;
    supportsBaseUrl: boolean;
    defaultBaseUrl?: string;
    recommended?: boolean;
};
