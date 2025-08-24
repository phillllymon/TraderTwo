const { CREDS } = require("./CREDS");


const openAiKey = CREDS.openAiKey;
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