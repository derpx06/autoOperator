import { ProviderType } from './provider-types';

export const defaultModels: Record<ProviderType, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'gpt-4-turbo'],
    anthropic: [
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
    ],
    google: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'],
    groq: [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'deepseek-r1-distill-llama-70b',
    ],
    mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'],
    cohere: ['command-r-plus', 'command-r', 'command-light'],
    xai: ['grok-2-1212', 'grok-2-vision-1212'],
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    perplexity: ['sonar', 'sonar-pro', 'sonar-reasoning'],
    together: [
        'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        'deepseek-ai/DeepSeek-R1',
        'deepseek-ai/DeepSeek-V3',
        'Qwen/Qwen2.5-72B-Instruct-Turbo',
    ],
    fireworks: [
        'accounts/fireworks/models/deepseek-r1',
        'accounts/fireworks/models/llama-v3p3-70b-instruct',
        'accounts/fireworks/models/qwen2p5-coder-32b-instruct',
    ],
    cerebras: ['llama3.1-8b', 'llama3.1-70b'],
    openrouter: [
        'google/gemini-2.5-flash',
        'openai/gpt-4o-mini',
        'anthropic/claude-3.5-sonnet',
        'deepseek/deepseek-r1',
    ],
    ollama: ['llama3.3', 'deepseek-r1', 'mistral', 'phi3', 'qwen2.5'],
    lmstudio: ['meta-llama-3-8b-instruct'],
    localai: ['gpt-4'],
    vllm: ['meta-llama/Meta-Llama-3-8B-Instruct'],
    llamacpp: ['meta-llama-3-8b-instruct'],
    'custom-openai-compatible': ['gpt-4o'],
};

export const defaultModelFriendlyNames: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'o1': 'o1',
    'o1-mini': 'o1 Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    'claude-3-opus-20240229': 'Claude 3 Opus',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'llama-3.3-70b-versatile': 'Llama 3.3 70B (Groq)',
    'llama-3.1-8b-instant': 'Llama 3.1 8B (Groq)',
    'deepseek-chat': 'DeepSeek Chat (V3)',
    'deepseek-reasoner': 'DeepSeek Reasoner (R1)',
};
export const getFriendlyModelName = (modelId: string): string => {
    return defaultModelFriendlyNames[modelId] || modelId;
};
