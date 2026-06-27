import { searchAdapters } from './adapters';
import { SearchProviderConfig, SearchRequest, SearchResult } from './types';

const getLegacySerperKey = () => {
    if (typeof process !== 'undefined' && process.env?.SERPER_API_KEY) {
        return process.env.SERPER_API_KEY;
    }
    if (typeof self !== 'undefined' && (self as any).SERPER_API_KEY) {
        return (self as any).SERPER_API_KEY;
    }
    return '';
};

const legacySerperConfig = (): SearchProviderConfig | undefined => {
    const apiKey = getLegacySerperKey();
    if (!apiKey) return undefined;
    const now = Date.now();
    return {
        id: 'serper',
        type: 'serper',
        name: 'Serper',
        apiKey,
        enabled: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
    };
};

const uniqueResults = (results: SearchResult[]) =>
    results.filter((result, index, all) =>
        index === all.findIndex(item => item.link === result.link)
    );

const getBrowserSearchProxyUrl = () => {
    const globalSelf = typeof self !== 'undefined' ? self as any : undefined;
    const isBrowserWindow = typeof window !== 'undefined';
    const isWorker = !isBrowserWindow && Boolean(globalSelf?.location);
    if (!isBrowserWindow && !isWorker) return undefined;
    const origin = globalSelf?.NEXT_PUBLIC_APP_URL || globalSelf?.location?.origin;
    if (!origin || origin === 'null') return undefined;
    return `${origin}/api/search`;
};

export const searchWeb = async (
    request: SearchRequest,
    config?: SearchProviderConfig
): Promise<SearchResult[]> => {
    const proxyUrl = getBrowserSearchProxyUrl();
    if (proxyUrl) {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request, config }),
        });
        if (!response.ok) {
            const error = await response.text().catch(() => 'Search request failed');
            throw new Error(error || 'Search request failed');
        }
        const data = await response.json();
        return data.results || [];
    }

    const provider = config?.enabled !== false ? config : undefined;
    const resolved = provider || legacySerperConfig();

    if (!resolved) {
        throw new Error('No search provider configured. Add one in Settings -> Search.');
    }

    const adapter = searchAdapters[resolved.type];
    if (!adapter) {
        throw new Error(`Search provider "${resolved.name}" is not supported.`);
    }

    const queries = request.queries?.length ? request.queries : [request.query];
    const results = await Promise.all(queries.slice(0, 3).map(query =>
        adapter.search(resolved, {
            ...request,
            query,
            maxResults: request.maxResults || 10,
        })
    ));
    const flattened = uniqueResults(results.flat()).slice(0, request.maxResults || 10);

    if (flattened.length === 0) {
        throw new Error(`No search results found from ${resolved.name}.`);
    }

    return flattened;
};

export const testSearchProvider = async (config: SearchProviderConfig) => {
    const adapter = searchAdapters[config.type];
    if (!adapter) return { ok: false, error: `Search provider "${config.name}" is not supported.` };
    try {
        return await adapter.test(config);
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
};
