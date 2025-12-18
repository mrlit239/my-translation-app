import { Client } from "@gradio/client";

async function run() {
    try {
        console.log("Connecting to Space with BAD token...");
        // Intentionally using a bad token to see if it breaks the public space access
        const client = await Client.connect("https://doof-ferb-hirashiba-mt-zh-vi.hf.space", {
            hf_token: "invalid_token_123"
        });

        console.log("Connected! Calling /translate...");
        const result = await client.predict("/translate", {
            input_text: "Hello world.",
        });

        console.log("Result:", JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

run();
