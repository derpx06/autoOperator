export type RequestContextData = {
    selectedProviderId?: string;
    selectedModelId?: string;
    apiKey?: string;
    baseUrl?: string;
};

// Module-level fallback for browser/worker environments
let clientFallbackContext: RequestContextData | null = null;

// AsyncLocalStorage only available in Node.js environments
let _asyncLocalStorage: import('async_hooks').AsyncLocalStorage<RequestContextData> | null = null;

if (typeof window === 'undefined' && typeof process !== 'undefined') {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const asyncHooks = require('async_hooks') as typeof import('async_hooks');
        _asyncLocalStorage = new asyncHooks.AsyncLocalStorage<RequestContextData>();
    } catch {
        // async_hooks not available (edge runtime, etc.)
    }
}

export const runWithRequestContext = <T>(data: RequestContextData, fn: () => T): T => {
    if (_asyncLocalStorage) {
        return _asyncLocalStorage.run(data, fn);
    }
    // Browser/worker fallback: store context in module-level variable
    clientFallbackContext = data;
    const result = fn();
    // Clean up after synchronous use (async is fire-and-forget in workers)
    return result;
};

export const getRequestContext = (): RequestContextData | null => {
    if (_asyncLocalStorage) {
        return _asyncLocalStorage.getStore() || null;
    }
    return clientFallbackContext;
};
