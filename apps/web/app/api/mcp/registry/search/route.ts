import { NextRequest, NextResponse } from 'next/server';

const REGISTRY_URL = 'https://registry.modelcontextprotocol.io/v0.1/servers';
const PAGE_LIMIT = 100;
const MAX_PAGES = 20;

type RegistryRemote = {
    type?: string;
    url?: string;
    headers?: Array<{
        name?: string;
        description?: string;
        required?: boolean;
        secret?: boolean;
        isRequired?: boolean;
        isSecret?: boolean;
        placeholder?: string;
    }>;
};

type RegistryEntry = {
    server?: {
        name?: string;
        title?: string;
        description?: string;
        version?: string;
        remotes?: RegistryRemote[];
        packages?: Array<{
            registryType?: string;
            identifier?: string;
            version?: string;
            transport?: { type?: string };
        }>;
    };
    _meta?: {
        'io.modelcontextprotocol.registry/official'?: {
            status?: string;
            isLatest?: boolean;
        };
    };
};

const normalizeRemote = (remote: RegistryRemote) => ({
    type: remote.type === 'sse' ? 'sse' : remote.type === 'streamable-http' ? 'streamable-http' : remote.type,
    url: remote.url || '',
    headers: (remote.headers || []).map(header => ({
        name: header.name || '',
        description: header.description || '',
        required: header.required ?? header.isRequired ?? false,
        secret: header.secret ?? header.isSecret ?? false,
        placeholder: header.placeholder || header.name || '',
    })),
});

const normalizeEntry = (entry: RegistryEntry) => {
    const server = entry.server || {};
    const remotes = (server.remotes || [])
        .map(normalizeRemote)
        .filter(remote => remote.url && (remote.type === 'sse' || remote.type === 'streamable-http'))
        .sort(remote => (remote.type === 'streamable-http' ? -1 : 1));

    return {
        name: server.name || '',
        title: server.title || server.name || 'Untitled MCP Server',
        description: server.description || '',
        version: server.version || '',
        remotes,
        packages: (server.packages || []).map(pkg => ({
            registryType: pkg.registryType || '',
            identifier: pkg.identifier || '',
            version: pkg.version || '',
            transport: pkg.transport?.type || 'stdio',
        })),
        hasRemote: remotes.length > 0,
        hasPackages: Array.isArray(server.packages) && server.packages.length > 0,
        status: entry._meta?.['io.modelcontextprotocol.registry/official']?.status || 'active',
        isLatest: entry._meta?.['io.modelcontextprotocol.registry/official']?.isLatest ?? true,
    };
};

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
    const results = [];
    let cursor: string | undefined;

    try {
        for (let page = 0; page < MAX_PAGES; page++) {
            const url = new URL(REGISTRY_URL);
            url.searchParams.set('limit', String(PAGE_LIMIT));
            if (query) url.searchParams.set('search', query);
            if (cursor) url.searchParams.set('cursor', cursor);

            const response = await fetch(url, {
                next: { revalidate: 3600 },
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                return NextResponse.json(
                    { error: 'Failed to fetch MCP registry' },
                    { status: response.status }
                );
            }

            const data = await response.json();
            const entries = Array.isArray(data.servers) ? data.servers : [];
            results.push(...entries.map(normalizeEntry));

            cursor = data.metadata?.nextCursor;
            if (!cursor) break;
        }

        const deduped = Array.from(
            new Map(results.map(server => [server.name, server])).values()
        );

        const filtered = deduped
            .filter(server => server.status !== 'deleted')
            .filter(server => query ? true : server.isLatest)
            .filter(server => {
                if (!query) return true;
                return [server.name, server.title, server.description]
                    .join(' ')
                    .toLowerCase()
                    .includes(query);
            })
            .sort((a, b) => {
                const remoteSort = Number(b.hasRemote) - Number(a.hasRemote);
                if (remoteSort !== 0) return remoteSort;
                return a.title.localeCompare(b.title);
            })
            .slice(0, 250);

        return NextResponse.json({
            servers: filtered,
            total: filtered.length,
            remoteCount: filtered.filter(server => server.hasRemote).length,
            packageOnlyCount: filtered.filter(server => !server.hasRemote && server.hasPackages).length,
        });
    } catch (error) {
        console.error('Failed to search MCP registry:', error);
        return NextResponse.json({ error: 'Failed to search MCP registry' }, { status: 500 });
    }
}
