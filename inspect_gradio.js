import { Client } from "@gradio/client";

async function run() {
    try {
        console.log("Connecting to Space...");
        const client = await Client.connect("https://doof-ferb-hirashiba-mt-zh-vi.hf.space");

        console.log("Connected!");
        const apiInfo = await client.view_api();
        console.log("Named Endpoints:", JSON.stringify(apiInfo.named_endpoints, null, 2));
        console.log("Unnamed Endpoints:", JSON.stringify(apiInfo.unnamed_endpoints, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

run();
