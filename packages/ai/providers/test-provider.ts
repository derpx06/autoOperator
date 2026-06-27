import { generateText } from 'ai';
import { ProviderConfig } from './provider-types';
import { resolveModel } from './resolve-model';

export type TestProviderStatus =
    | 'Connected'
    | 'Invalid API key'
    | 'Invalid base URL'
    | 'Model not found'
    | 'Rate limited'
    | 'Provider error'
    | 'Network error';

export const testProvider = async (
    config: ProviderConfig,
    modelId: string
): Promise<TestProviderStatus> => {
    try {
        const model = await resolveModel(config, modelId);

        // Run a small completion with a short timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
            await generateText({
                model,
                prompt: 'Reply with ok.',
                abortSignal: controller.signal,
                maxTokens: 5,
            });
            clearTimeout(timeoutId);
            return 'Connected';
        } catch (genError: any) {
            clearTimeout(timeoutId);

            if (genError.name === 'AbortError') {
                return 'Network error';
            }

            const errorStr = String(genError).toLowerCase();
            const status = genError.status;

            if (status === 401 || errorStr.includes('unauthorized') || errorStr.includes('api key') || errorStr.includes('key invalid')) {
                return 'Invalid API key';
            }
            if (status === 404 || errorStr.includes('not found') || errorStr.includes('no model')) {
                return 'Model not found';
            }
            if (status === 429 || errorStr.includes('rate limit') || errorStr.includes('too many requests')) {
                return 'Rate limited';
            }
            if (errorStr.includes('fetch failed') || errorStr.includes('dns') || errorStr.includes('connection refused') || errorStr.includes('network')) {
                return 'Network error';
            }

            return 'Provider error';
        }
    } catch (err: any) {
        const errorStr = String(err).toLowerCase();
        if (errorStr.includes('url') || errorStr.includes('baseurl')) {
            return 'Invalid base URL';
        }
        return 'Network error';
    }
};
