import {
    SearchAdapter,
    SearchProviderConfig,
    SearchProviderType,
    SearchRequest,
    SearchResult,
} from './types';

const firstString = (...values: unknown[]) =>
    values.find(value => typeof value === 'string' && value.trim()) as string | undefined;

const normalizeUrl = (value?: string) => {
    if (!value) return undefined;
    try {
        return new URL(value).toString();
    } catch {
        return undefined;
    }
};

const normalizeResult = (provider: SearchProviderType, item: any): SearchResult | null => {
    const link = normalizeUrl(firstString(item?.link, item?.url, item?.href));
    if (!link) return null;
    return {
        title: firstString(item?.title, item?.name, item?.url, link) || link,
        link,
        snippet: firstString(item?.snippet, item?.description, item?.text, item?.summary),
        content: firstString(item?.content, item?.markdown, item?.raw_content, item?.answer),
        publishedDate: firstString(item?.publishedDate, item?.published_date, item?.date),
        provider,
    };
};

const requireApiKey = (config: SearchProviderConfig) => {
    if (!config.apiKey?.trim()) {
        throw new Error(`${config.name} API key is not configured`);
    }
    return config.apiKey.trim();
};

const fetchJson = async (url: string, init: RequestInit) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(url, { ...init, signal: init.signal || controller.signal });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Search API responded with ${response.status}${body ? `: ${body.slice(0, 180)}` : ''}`);
        }
        return response.json();
    } finally {
        clearTimeout(timeout);
    }
};

const flattenResults = (provider: SearchProviderType, values: any[]) =>
    values
        .map(item => normalizeResult(provider, item))
        .filter((item): item is SearchResult => Boolean(item));

const tavilyAdapter: SearchAdapter = {
    test: async config => {
        await tavilyAdapter.search(config, { query: 'test search', mode: 'quick', maxResults: 1 });
        return { ok: true };
    },
    search: async (config, request) => {
        const data = await fetchJson('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${requireApiKey(config)}`,
            },
            body: JSON.stringify({
                query: request.query,
                max_results: request.maxResults || 10,
                search_depth: request.mode === 'deep' ? 'advanced' : 'basic',
                include_answer: false,
                include_raw_content: request.mode !== 'quick',
            }),
        });
        return flattenResults('tavily', data?.results || []).slice(0, request.maxResults || 10);
    },
};

const braveAdapter: SearchAdapter = {
    test: async config => {
        await braveAdapter.search(config, { query: 'test search', mode: 'quick', maxResults: 1 });
        return { ok: true };
    },
    search: async (config, request) => {
        const url = new URL('https://api.search.brave.com/res/v1/web/search');
        url.searchParams.set('q', request.query);
        url.searchParams.set('count', String(Math.min(request.maxResults || 10, 20)));
        if (request.country) url.searchParams.set('country', request.country);
        const data = await fetchJson(url.toString(), {
            headers: {
                Accept: 'application/json',
                'X-Subscription-Token': requireApiKey(config),
            },
        });
        return flattenResults('brave', data?.web?.results || []).slice(0, request.maxResults || 10);
    },
};

const exaAdapter: SearchAdapter = {
    test: async config => {
        await exaAdapter.search(config, { query: 'test search', mode: 'quick', maxResults: 1 });
        return { ok: true };
    },
    search: async (config, request) => {
        const data = await fetchJson('https://api.exa.ai/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': requireApiKey(config),
            },
            body: JSON.stringify({
                query: request.query,
                numResults: request.maxResults || 10,
                type: request.mode === 'deep' ? 'neural' : 'auto',
                contents: request.mode === 'quick' ? undefined : { text: true },
            }),
        });
        return flattenResults('exa', data?.results || []).slice(0, request.maxResults || 10);
    },
};

const perplexityAdapter: SearchAdapter = {
    test: async config => {
        await perplexityAdapter.search(config, { query: 'test search', mode: 'quick', maxResults: 1 });
        return { ok: true };
    },
    search: async (config, request) => {
        const data = await fetchJson('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${requireApiKey(config)}`,
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [{ role: 'user', content: request.query }],
            }),
        });
        const answer = firstString(data?.choices?.[0]?.message?.content);
        const citations = Array.isArray(data?.citations) ? data.citations : [];
        const results = citations
            .map((url: string, index: number) => normalizeResult('perplexity', {
                title: `Perplexity citation ${index + 1}`,
                url,
                snippet: answer,
                content: answer,
            }))
            .filter((item: SearchResult | null): item is SearchResult => Boolean(item));
        return results.slice(0, request.maxResults || 10);
    },
};

const serperAdapter: SearchAdapter = {
    test: async config => {
        await serperAdapter.search(config, { query: 'test search', mode: 'quick', maxResults: 1 });
        return { ok: true };
    },
    search: async (config, request) => {
        const data = await fetchJson('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': requireApiKey(config),
            },
            body: JSON.stringify({
                q: request.query,
                gl: request.country,
                location: request.location,
                num: request.maxResults || 10,
            }),
        });
        return flattenResults('serper', data?.organic || []).slice(0, request.maxResults || 10);
    },
};

const kagiAdapter: SearchAdapter = {
    test: async config => {
        await kagiAdapter.search(config, { query: 'test search', mode: 'quick', maxResults: 1 });
        return { ok: true };
    },
    search: async (config, request) => {
        const url = new URL('https://kagi.com/api/v0/search');
        url.searchParams.set('q', request.query);
        url.searchParams.set('limit', String(request.maxResults || 10));
        const data = await fetchJson(url.toString(), {
            headers: {
                Authorization: `Bot ${requireApiKey(config)}`,
            },
        });
        const values = Array.isArray(data?.data) ? data.data : data?.results || [];
        return flattenResults('kagi', values).slice(0, request.maxResults || 10);
    },
};

const customAdapter: SearchAdapter = {
    test: async config => {
        await customAdapter.search(config, { query: 'test search', mode: 'quick', maxResults: 1 });
        return { ok: true };
    },
    search: async (config, request) => {
        if (!config.baseUrl?.trim()) throw new Error('Custom search base URL is not configured');
        const url = new URL(config.baseUrl);
        url.searchParams.set('q', request.query);
        url.searchParams.set('limit', String(request.maxResults || 10));
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (config.apiKey?.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
        const data = await fetchJson(url.toString(), { headers });
        const values = Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data?.items)
                ? data.items
                : Array.isArray(data)
                    ? data
                    : [];
        return flattenResults('custom', values).slice(0, request.maxResults || 10);
    },
};

export const searchAdapters: Record<SearchProviderType, SearchAdapter> = {
    tavily: tavilyAdapter,
    brave: braveAdapter,
    exa: exaAdapter,
    perplexity: perplexityAdapter,
    serper: serperAdapter,
    kagi: kagiAdapter,
    custom: customAdapter,
};
