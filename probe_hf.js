// import fetch from 'node-fetch'; // Native fetch in Node 22

const BASE_URL = "https://doof-ferb-hirashiba-mt-zh-vi.hf.space";

async function probe(endpoint, payload) {
    try {
        console.log(`Probing ${endpoint}...`);
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`SUCCESS ${endpoint}:`, JSON.stringify(data, null, 2));
            return true;
        } else {
            console.log(`FAILED ${endpoint}: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log(`Response: ${text.slice(0, 200)}`);
        }
    } catch (error) {
        console.error(`ERROR ${endpoint}:`, error.message);
    }
    return false;
}

async function run() {
    // Test 1: /run/predict with data array
    await probe("/run/predict", {
        data: ["Hello world"],
        fn_index: 0
    });

    // Test 2: /api/predict with data array
    await probe("/api/predict", {
        data: ["Hello world"],
        fn_index: 0
    });

    // Test 3: /run/predict without fn_index
    await probe("/run/predict", {
        data: ["Hello world"]
    });

    // Test 4: /api/predict without fn_index
    await probe("/api/predict", {
        data: ["Hello world"]
    });

    // Test 5: /gradio_api/info
    await probe("/gradio_api/info", {});

    // Test 6: /info
    await probe("/info", {});

    // Test fn_index 0-10 on /gradio_api/call/predict
    for (let i = 0; i <= 10; i++) {
        await probe("/gradio_api/call/predict", {
            data: ["Hello world"],
            fn_index: i
        });
    }
}

run();
