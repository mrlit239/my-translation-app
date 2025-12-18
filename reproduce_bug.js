
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
                    onChunk(line);
                }
            }
            buffer = lines[lines.length - 1];
        }
        console.log("Stream done. Remaining buffer:", buffer);
    } catch (error) {
        console.error(error);
    }
};

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
