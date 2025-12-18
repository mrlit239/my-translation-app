import express from 'express';
import { translateWithOpenAI } from '../services/openai.js';
import { translateWithDeepSeek } from '../services/deepseek.js';
import { translateWithGrok } from '../services/grok.js';
import { translateWithGemini } from '../services/gemini.js';
import { translateWithAnthropic } from '../services/anthropic.js';
import { translateWithGroq } from '../services/groq.js';
import { translateWithOpenRouter } from '../services/openrouter.js';

const router = express.Router();

// Get available providers
router.get('/providers', (req, res) => {
    const providers = {
        openai: { available: !!process.env.OPENAI_API_KEY, models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
        deepseek: { available: !!process.env.DEEPSEEK_API_KEY, models: ['deepseek-chat', 'deepseek-reasoner'] },
        grok: { available: !!process.env.GROK_API_KEY, models: ['grok-4-1-fast-non-reasoning', 'grok-4-1-fast-reasoning'] },
        gemini: { available: !!process.env.GEMINI_API_KEY, models: ['gemini-2.5-flash', 'gemini-2.5-pro'] },
        anthropic: { available: !!process.env.ANTHROPIC_API_KEY, models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
        groq: { available: !!process.env.GROQ_API_KEY, models: ['llama-3.3-70b-versatile', 'qwen/qwen3-32b'] },
        openrouter: { available: !!process.env.OPENROUTER_API_KEY, models: ['qwen/qwen-2.5-32b-instruct'] }
    };
    res.json(providers);
});

// Unified translate endpoint
router.post('/:provider', async (req, res) => {
    const { provider } = req.params;
    const { model, messages, prompt, text, stream = false } = req.body;

    try {
        let result;

        switch (provider) {
            case 'openai':
                result = await translateWithOpenAI(model, messages || [{ role: 'system', content: prompt }, { role: 'user', content: text }]);
                break;
            case 'deepseek':
                result = await translateWithDeepSeek(model, messages || [{ role: 'system', content: prompt }, { role: 'user', content: text }]);
                break;
            case 'grok':
                result = await translateWithGrok(model, messages || [{ role: 'system', content: prompt }, { role: 'user', content: text }]);
                break;
            case 'gemini':
                result = await translateWithGemini(model, prompt, text);
                break;
            case 'anthropic':
                result = await translateWithAnthropic(model, messages || [{ role: 'user', content: `${prompt}\n\nText to translate:\n${text}` }]);
                break;
            case 'groq':
                result = await translateWithGroq(model, messages || [{ role: 'system', content: prompt }, { role: 'user', content: text }]);
                break;
            case 'openrouter':
                result = await translateWithOpenRouter(model, messages || [{ role: 'system', content: prompt }, { role: 'user', content: text }]);
                break;
            default:
                return res.status(400).json({ error: `Unknown provider: ${provider}` });
        }

        res.json({ translation: result });

    } catch (error) {
        console.error(`[${provider}] Error:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
