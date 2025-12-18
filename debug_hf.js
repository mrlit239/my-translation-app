import { Client } from "@gradio/client";

async function checkApi() {
    try {
        const client = await Client.connect("doof-ferb/hirashiba-mt-zh-vi");
        const api_info = await client.view_api();
        console.log("API Info:", JSON.stringify(api_info, null, 2));
    } catch (error) {
        console.error("Error connecting:", error);
    }
}

checkApi();
