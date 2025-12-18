import { Client } from "@gradio/client";

async function run() {
    const text = `云岚宗后山，一个14岁的娇俏少女和一个20多岁的雍容秀美的女子正在练剑，少女手执长剑挥汗如雨，秀美的小脸蛋早已因为热而变得异常红润，香汗浸湿了身上的一群，相比起来，与她对练的青衣女子则要从容得多。
“嫣然，今天就到这儿吧，休息。”青衣女子说罢，收起了手中的剑，那名叫“嫣然”的少女也同样收剑站立。
“嫣然，很好，进步不错，就这样继续努力，一定可以在三年之约立于不败之地。”青衣女子走到少女的身边，摸了摸少女的头道。`;

    try {
        console.log("Connecting to Space...");
        const client = await Client.connect("https://doof-ferb-hirashiba-mt-zh-vi.hf.space");

        console.log("Connected! Translating user text with POSITIONAL args...");
        // Try passing array of arguments instead of object
        const result = await client.predict(1, [text]);

        console.log("Result:", JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

run();
