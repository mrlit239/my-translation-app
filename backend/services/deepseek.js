// DeepSeek API Service

export async function translateWithDeepSeek(model, messages) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured');

    // Add timeout to prevent infinite waits (120 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const startTime = Date.now();
    console.log(`[DeepSeek] Starting API call...`);

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'deepseek-chat',
                messages,
                max_tokens: 8000,
                temperature: 0.3
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);
        console.log(`[DeepSeek] Response received in ${Date.now() - startTime}ms`);

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `DeepSeek API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            throw new Error('DeepSeek request timed out after 120 seconds');
        }
        throw error;
    }
}
