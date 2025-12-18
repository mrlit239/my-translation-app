
const processStream = async (mockReader, onChunk) => {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await mockReader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line) {
                    processLine(line, onChunk);
                }
            }
            buffer = lines[lines.length - 1];
        }

        // Process remaining buffer
        if (buffer.trim()) {
            processLine(buffer.trim(), onChunk);
        }

        console.log("Stream done. Remaining buffer (should be empty/processed):", buffer);
    } catch (error) {
        console.error(error);
    }
};

const processLine = (line, onChunk) => {
    if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
            const parsed = JSON.parse(data);
            let chunk = '';
            if (parsed.choices && parsed.choices[0]?.delta?.content) {
                chunk = parsed.choices[0].delta.content;
            } else if (parsed.delta && parsed.delta.text) {
                chunk = parsed.delta.text;
            } else if (parsed.text) { // For my mock
                chunk = parsed.text;
            }

            if (chunk) {
                onChunk(chunk);
            }
        } catch (e) {
            // Ignore
        }
    }
}

// Mock Reader
const createMockReader = (chunks) => {
    let index = 0;
    return {
        read: async () => {
            if (index < chunks.length) {
                const chunk = chunks[index++];
                return { done: false, value: new TextEncoder().encode(chunk) };
            }
            return { done: true, value: undefined };
        }
    };
};

// Test Case
const runTest = async () => {
    const chunks = [
        "data: {\"text\": \"Hello\"}\n",
        "data: {\"text\": \" World\"}\n",
        "data: {\"text\": \"!\"}" // No newline at the end
    ];

    console.log("Starting test...");
    const received = [];
    await processStream(createMockReader(chunks), (chunk) => {
        received.push(chunk);
    });
    console.log("Received chunks:", received);
};

runTest();
