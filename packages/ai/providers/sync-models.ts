import { providerRegistry } from './provider-registry';
import { ProviderConfig } from './provider-types';

export const syncModels = async (config: ProviderConfig): Promise<string[]> => {
    const type = config.type;
    const registryEntry = providerRegistry[type];
    const baseUrl = config.baseUrl || registryEntry?.defaultBaseUrl;

    if (!baseUrl) {
        throw new Error('Base URL is required to sync models');
    }

    const headers: Record<string, string> = {};
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    try {
        if (type === 'ollama') {
            // Ollama specific tags endpoint
            const cleanBaseUrl = baseUrl.replace(/\/$/, '');
            const response = await fetch(`${cleanBaseUrl}/api/tags`, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`Ollama API responded with status ${response.status}`);
            }

            const data = await response.json();
            if (data && Array.isArray(data.models)) {
                const modelNames = data.models.map((m: any) => m.name as string).filter(Boolean);
                if (modelNames.length > 0) {
                    return modelNames;
                }
            }
            throw new Error('No models found in Ollama response');
        } else {
            // General OpenAI-compatible models endpoint
            const cleanBaseUrl = baseUrl.replace(/\/$/, '');
            // For custom endpoints, check if /models is already in the URL
            const url = cleanBaseUrl.endsWith('/models') ? cleanBaseUrl : `${cleanBaseUrl}/models`;

            const response = await fetch(url, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }

            const data = await response.json();
            if (data && Array.isArray(data.data)) {
                const modelIds = data.data.map((m: any) => m.id as string).filter(Boolean);
                if (modelIds.length > 0) {
                    // Filter or sort them if needed, but return all
                    return modelIds;
                }
            }
            throw new Error('No models found in API response');
        }
    } catch (error) {
        console.error(`Failed to sync models for provider ${config.name}:`, error);
        throw error;
    }
};
