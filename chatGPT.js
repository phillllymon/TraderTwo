const openAiKey = "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";
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: openAiKey,
});

function queryChatGPT(queryText) {
    return new Promise((resolve) => {
        const completion = openai.chat.completions.create({
            model: "gpt-4o-mini",
            store: true,
            messages: [
                {
                    "role": "user",
                    "content": queryText
                },
            ],
        });
        
        completion.then((result) => {
            resolve(result.choices[0].message.content);
        });
    });
}

module.exports = { queryChatGPT };