// Backend API URL - set via environment variable or use Render deployment
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://my-translation-backend.onrender.com';

export const apiProviders = {
    openai: {
        name: 'OpenAI',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
        endpoint: 'https://api.openai.com/v1/chat/completions',
        requiresKey: true,
        useBackend: false  // Direct browser call
    },
    gemini: {
        name: 'Google Gemini',
        models: [
            'gemini-3-flash-preview',
            'gemini-3-pro-preview',
            'gemini-2.5-pro-preview-05-06',
            'gemini-2.5-flash-preview-05-20',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite'
        ],
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
        requiresKey: true,
        useBackend: false  // Direct browser call
    },
    deepseek: {
        name: 'DeepSeek',
        models: [
            'deepseek-chat',        // V3.2 chat - best for CN→VN translation
            'deepseek-reasoner'     // V3.2 reasoning - for complex reasoning
        ],
        defaultModel: 'deepseek-chat',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        useBackend: true,  // Use backend (server-side API key)
        supportsCache: true,
        contextWindow: 128000,
        maxOutputTokens: 8000,
        optimizedChunkSize: 10000
    },
    anthropic: {
        name: 'Anthropic',
        models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
        endpoint: 'https://api.anthropic.com/v1/messages',
        useBackend: true  // Use backend (server-side API key)
    },
    openrouter: {
        name: 'OpenRouter',
        models: [
            'qwen/qwen-2.5-32b-instruct',
            'google/gemini-2.0-flash-exp:free',
            'meta-llama/llama-3.3-70b-instruct:free'
        ],
        defaultModel: 'qwen/qwen-2.5-32b-instruct',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        useBackend: true  // Use backend (server-side API key)
    },
    grok: {
        name: 'xAI Grok',
        models: [
            'grok-4-1-fast-reasoning',
            'grok-4-1-fast-non-reasoning',
            'grok-4',
            'grok-3'
        ],
        defaultModel: 'grok-4-1-fast-non-reasoning',
        endpoint: 'https://api.x.ai/v1/chat/completions',
        requiresKey: true,
        useBackend: false,  // Direct browser call - works fine without proxy
        supportsCache: true,
        supportsTools: true
    },
    groq: {
        name: 'Groq',
        models: [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant'
        ],
        defaultModel: 'llama-3.3-70b-versatile',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        requiresKey: true,
        useBackend: false  // Direct browser call
    },
    local: {
        name: 'Local (LM Studio/Ollama)',
        models: [
            'Yi-1.5-9B-Chat',
            'dolphin-2.9.4-llama3.1-8b',
            'local-model'
        ],
        endpoint: 'http://localhost:1234/v1/chat/completions',
        requiresKey: false,
        useBackend: false  // Direct browser call (local)
    }
};

