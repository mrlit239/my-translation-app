// OpenRouter API Service

export async function translateWithOpenRouter(model, messages) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://littranslation.netlify.app',
            'X-Title': 'AI Translation Tool'
        },
        body: JSON.stringify({
            model: model || 'qwen/qwen-2.5-32b-instruct',
            messages,
            max_tokens: 8192,
            temperature: 0.3
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}
