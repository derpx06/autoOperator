export type ProviderType =
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'groq'
    | 'mistral'
    | 'cohere'
    | 'xai'
    | 'deepseek'
    | 'perplexity'
    | 'together'
    | 'fireworks'
    | 'cerebras'
    | 'openrouter'
    | 'ollama'
    | 'lmstudio'
    | 'localai'
    | 'vllm'
    | 'llamacpp'
    | 'custom-openai-compatible';

export type ProviderConfig = {
    id: string;
    name: string;
    type: ProviderType;
    apiKey?: string;
    baseUrl?: string;
    enabled: boolean;
    models: string[];
    defaultModel?: string;
    supportsStreaming: boolean;
    supportsTools?: boolean;
    supportsVision?: boolean;
    supportsReasoning?: boolean;
    isLocal?: boolean;
    isGateway?: boolean;
    isOpenAICompatible?: boolean;
    createdAt: number;
    updatedAt: number;
};

export type ProviderRegistryEntry = {
    label: string;
    category: 'byok' | 'local';
    requiresApiKey: boolean;
    supportsBaseUrl: boolean;
    supportsModelSync: boolean;
    defaultBaseUrl?: string;
    isOpenAICompatible?: boolean;
    isLocal?: boolean;
    isGateway?: boolean;
    defaultModels: string[];
};

declare global {
    interface Window {
        AI_API_KEYS?: {
            [key in ProviderType]?: string;
        };
        SERPER_API_KEY?: string;
        JINA_API_KEY?: string;
        NEXT_PUBLIC_APP_URL?: string;
    }
}

