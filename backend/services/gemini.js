// Google Gemini API Service

export async function translateWithGemini(model, prompt, text) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `${prompt}\n\nText to translate:\n${text}` }]
            }],
            generationConfig: {
                response_mime_type: 'text/plain',
                max_output_tokens: 65536
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Translate text within an image using Gemini Vision API
 * @param {string} model - Gemini model to use (must support vision, e.g., gemini-2.5-flash)
 * @param {string} prompt - Translation instructions
 * @param {string} imageBase64 - Base64-encoded image data (without data:image prefix)
 * @param {string} mimeType - Image MIME type (e.g., 'image/png', 'image/jpeg')
 * @returns {Promise<{extractedText: string, translatedText: string}>}
 */
export async function translateImageWithGemini(model, prompt, imageBase64, mimeType = 'image/png') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;

    // Build the multimodal request with image
    const requestBody = {
        contents: [{
            parts: [
                {
                    text: `${prompt}

IMPORTANT: You are analyzing an image that may contain text in a foreign language.

1. First, extract ALL text visible in the image exactly as it appears.
2. Then, translate the extracted text according to the instructions above.
3. Format your response EXACTLY like this:

=== ORIGINAL TEXT ===
[Write the exact text found in the image here]

=== TRANSLATED TEXT ===
[Write the translated text here]

If there is no text in the image, respond with:
=== NO TEXT FOUND ===
This image does not contain any readable text.`
                },
                {
                    inline_data: {
                        mime_type: mimeType,
                        data: imageBase64
                    }
                }
            ]
        }],
        generationConfig: {
            response_mime_type: 'text/plain',
            max_output_tokens: 8192
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const fullResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the response to extract original and translated text
    let extractedText = '';
    let translatedText = '';

    if (fullResponse.includes('=== NO TEXT FOUND ===')) {
        return { extractedText: '', translatedText: '', hasText: false };
    }

    const originalMatch = fullResponse.match(/=== ORIGINAL TEXT ===\s*([\s\S]*?)(?:=== TRANSLATED TEXT ===|$)/);
    const translatedMatch = fullResponse.match(/=== TRANSLATED TEXT ===\s*([\s\S]*?)$/);

    if (originalMatch) {
        extractedText = originalMatch[1].trim();
    }
    if (translatedMatch) {
        translatedText = translatedMatch[1].trim();
    }

    return {
        extractedText,
        translatedText,
        hasText: extractedText.length > 0
    };
}
