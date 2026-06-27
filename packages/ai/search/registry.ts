import { SearchProviderRegistryEntry, SearchProviderType } from './types';

export const searchProviderRegistry: Record<SearchProviderType, SearchProviderRegistryEntry> = {
    tavily: {
        label: 'Tavily',
        description: 'Recommended default for AI search, extraction, and deep research.',
        capabilities: ['Web', 'Extract', 'AI Search'],
        requiresApiKey: true,
        supportsBaseUrl: false,
        recommended: true,
    },
    brave: {
        label: 'Brave Search',
        description: 'Fast raw web search with strong web/news coverage.',
        capabilities: ['Web', 'News'],
        requiresApiKey: true,
        supportsBaseUrl: false,
    },
    exa: {
        label: 'Exa',
        description: 'Semantic and neural search for research-heavy queries.',
        capabilities: ['Web', 'Neural', 'Extract'],
        requiresApiKey: true,
        supportsBaseUrl: false,
    },
    perplexity: {
        label: 'Perplexity',
        description: 'Answer-engine search with citations through Sonar models.',
        capabilities: ['Answer', 'Citations'],
        requiresApiKey: true,
        supportsBaseUrl: false,
    },
    serper: {
        label: 'Serper',
        description: 'Google-style SERP results. Preserves the existing search behavior.',
        capabilities: ['Web', 'SERP'],
        requiresApiKey: true,
        supportsBaseUrl: false,
    },
    kagi: {
        label: 'Kagi',
        description: 'Premium privacy-focused search.',
        capabilities: ['Web', 'Privacy'],
        requiresApiKey: true,
        supportsBaseUrl: false,
    },
    custom: {
        label: 'Custom',
        description: 'Advanced JSON endpoint, including SearxNG-compatible responses.',
        capabilities: ['Web', 'Custom'],
        requiresApiKey: false,
        supportsBaseUrl: true,
        defaultBaseUrl: 'https://search.example.com/search',
    },
};
