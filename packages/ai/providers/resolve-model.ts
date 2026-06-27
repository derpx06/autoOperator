import { createAnthropic } from '@ai-sdk/anthropic';
import { createCohere } from '@ai-sdk/cohere';
import { createFireworks } from '@ai-sdk/fireworks';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from '@ai-sdk/provider';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { wrapLanguageModel, LanguageModelV1Middleware } from 'ai';
import { providerRegistry } from './provider-registry';
import { ProviderConfig } from './provider-types';
import { ModelEnum, models } from '../models';
import { getProviderConfig } from './provider-store';
import { getRequestContext } from './request-context';

export const resolveModelSync = (
    config: ProviderConfig,
    modelId: string
): LanguageModelV1 => {
    const type = config.type;
    const registryEntry = providerRegistry[type];
    const baseUrl = config.baseUrl || registryEntry?.defaultBaseUrl;

    // Resolve API key: check config first, then fallback to environment variables
    let apiKey = config.apiKey;
    if (!apiKey && typeof process !== 'undefined' && process.env) {
        switch (type) {
            case 'openai':
                apiKey = process.env.OPENAI_API_KEY;
                break;
            case 'anthropic':
                apiKey = process.env.ANTHROPIC_API_KEY;
                break;
            case 'google':
                apiKey = process.env.GEMINI_API_KEY;
                break;
            case 'groq':
                apiKey = process.env.GROQ_API_KEY;
                break;
            case 'mistral':
                apiKey = process.env.MISTRAL_API_KEY;
                break;
            case 'cohere':
                apiKey = process.env.COHERE_API_KEY;
                break;
            case 'xai':
                apiKey = process.env.XAI_API_KEY;
                break;
            case 'deepseek':
                apiKey = process.env.DEEPSEEK_API_KEY;
                break;
            case 'perplexity':
                apiKey = process.env.PERPLEXITY_API_KEY;
                break;
            case 'together':
                apiKey = process.env.TOGETHER_API_KEY;
                break;
            case 'fireworks':
                apiKey = process.env.FIREWORKS_API_KEY;
                break;
            case 'cerebras':
                apiKey = process.env.CEREBRAS_API_KEY;
                break;
            case 'openrouter':
                apiKey = process.env.OPENROUTER_API_KEY;
                break;
        }
    }

    // Support browser direct access headers for Anthropic when in web worker / frontend
    const isBrowser = typeof window !== 'undefined';

    switch (type) {
        case 'openai':
            return createOpenAI({
                apiKey: apiKey || '',
            })(modelId) as any;

        case 'anthropic':
            return createAnthropic({
                apiKey: apiKey || '',
                headers: isBrowser
                    ? { 'anthropic-dangerous-direct-browser-access': 'true' }
                    : undefined,
            })(modelId) as any;

        case 'google':
            return createGoogleGenerativeAI({
                apiKey: apiKey || '',
            })(modelId) as any;

        case 'groq':
            return createGroq({
                apiKey: apiKey || '',
            })(modelId) as any;

        case 'mistral':
            return createMistral({
                apiKey: apiKey || '',
            })(modelId) as any;

        case 'cohere':
            return createCohere({
                apiKey: apiKey || '',
            })(modelId) as any;

        case 'together':
            return createTogetherAI({
                apiKey: apiKey || '',
            })(modelId) as any;

        case 'fireworks':
            return createFireworks({
                apiKey: apiKey || '',
            })(modelId) as any;

        // OpenAI-compatible and local/gateway servers
        case 'xai':
        case 'deepseek':
        case 'perplexity':
        case 'openrouter':
        case 'lmstudio':
        case 'localai':
        case 'vllm':
        case 'llamacpp':
        case 'custom-openai-compatible':
            return createOpenAI({
                baseURL: baseUrl || '',
                apiKey: apiKey || 'stub-key-for-local',
                compatibility: 'compatible',
            })(modelId) as any;

        case 'ollama':
            // Ollama has a standard OpenAI compatibility endpoint under /v1
            // Use /v1 base URL with createOpenAI
            const ollamaBaseUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/v1` : 'http://localhost:11434/v1';
            return createOpenAI({
                baseURL: ollamaBaseUrl,
                apiKey: 'ollama',
                compatibility: 'compatible',
            })(modelId) as any;

        default:
            throw new Error(`Unsupported provider type: ${type}`);
    }
};

export const resolveModel = async (
    config: ProviderConfig,
    modelId: string
): Promise<LanguageModelV1> => {
    return resolveModelSync(config, modelId);
};

export const getCustomLanguageModel = (
    providerId: string,
    modelId: string,
    apiKey?: string,
    baseUrl?: string,
    middleware?: LanguageModelV1Middleware
): LanguageModelV1 => {
    const config: ProviderConfig = {
        id: providerId,
        name: providerId,
        type: providerId as any,
        apiKey: apiKey || '',
        baseUrl: baseUrl || '',
        enabled: true,
        models: [modelId],
        defaultModel: modelId,
        supportsStreaming: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    const selectedModel = resolveModelSync(config, modelId);
    if (middleware) {
        return wrapLanguageModel({ model: selectedModel, middleware }) as LanguageModelV1;
    }
    return selectedModel as LanguageModelV1;
};

export const getLanguageModel = (m: ModelEnum, middleware?: LanguageModelV1Middleware): LanguageModelV1 => {
    const requestContext = getRequestContext();
    if (requestContext?.selectedProviderId && requestContext?.selectedModelId) {
        return getCustomLanguageModel(
            requestContext.selectedProviderId,
            requestContext.selectedModelId,
            requestContext.apiKey,
            requestContext.baseUrl,
            middleware
        );
    }

    const model = models.find(model => model.id === m);
    const provider = model?.provider || 'openai';
    const modelId = model?.id || m;

    let config = getProviderConfig(provider);
    if (!config) {
        config = {
            id: provider,
            name: provider,
            type: provider,
            enabled: true,
            models: [modelId],
            defaultModel: modelId,
            supportsStreaming: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    }

    // Resolve API key: if worker context has key, use it
    if (typeof self !== 'undefined' && (self as any).AI_API_KEYS && (self as any).AI_API_KEYS[provider]) {
        config.apiKey = (self as any).AI_API_KEYS[provider];
    } else if (typeof window !== 'undefined' && window.AI_API_KEYS && window.AI_API_KEYS[provider]) {
        config.apiKey = window.AI_API_KEYS[provider];
    }

    const selectedModel = resolveModelSync(config, modelId);

    if (middleware) {
        return wrapLanguageModel({ model: selectedModel, middleware }) as LanguageModelV1;
    }
    return selectedModel as LanguageModelV1;
};
